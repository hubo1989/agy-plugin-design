'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

function locateHostDir() {
  const candidates = [
    process.env.AGY_DADDY_HOST_DIR ? path.resolve(process.env.AGY_DADDY_HOST_DIR) : '',
    path.resolve(PLUGIN_ROOT, '..', 'agy-daddy', 'agy-daddy-host'),
    path.resolve(PLUGIN_ROOT, '..', 'agy-daddy-host')
  ].filter(Boolean);
  return candidates.find((d) => fs.existsSync(path.join(d, 'sdk', 'mock-harness.js'))) || null;
}

const HOST_DIR = locateHostDir();

async function listenWithFallback(srv, preferredPort) {
  return await new Promise((resolve, reject) => {
    srv.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && preferredPort !== 0) {
        srv.listen(0, '127.0.0.1', () => resolve(srv.address().port));
      } else {
        reject(err);
      }
    });
    srv.listen(preferredPort, '127.0.0.1', () => resolve(srv.address().port));
  });
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

test('AC-10: Dual-host coexistence (Orca 3480/ORCA_DESIGN_HOME vs Agy 3481/AGY_DESIGN_HOME), shared .design/ R/W, editor port reuse/+99 offset, and non-destructive shutdown', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-dual-host-'));
  const wsDir = path.join(tempRoot, 'shared-workspace');
  const orcaHome = path.join(tempRoot, 'orca-baoyu-design');
  const orcaStateFile = path.join(tempRoot, 'orca-state.json');
  const agyHome = path.join(tempRoot, 'agy-baoyu-design');
  const agyStateFile = path.join(tempRoot, 'agy-state.json');

  fs.mkdirSync(path.join(orcaHome, 'artifacts'), { recursive: true });
  fs.mkdirSync(path.join(orcaHome, 'trash'), { recursive: true });
  fs.mkdirSync(agyHome, { recursive: true });

  // Seed a valid Orca-created canvas project inside shared <workspace>/.design/
  const { pathToFileURL } = require('node:url');
  const { EXAMPLE_TEMPLATES, EXAMPLE_INDEX } = await import(pathToFileURL(path.join(PLUGIN_ROOT, 'src', 'skills-meta.mjs')).href);
  const orcaCanvasRoot = path.join(wsDir, '.design', 'orca-seeded-board');
  const tpl = EXAMPLE_TEMPLATES['claude-design'];
  for (const [rel, content] of Object.entries(tpl.files)) {
    const dest = path.join(orcaCanvasRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (content === '__INDEX__') {
      fs.writeFileSync(dest, JSON.stringify({
        ...EXAMPLE_INDEX['claude-design'],
        createdOnFiles: { v: 1, at: new Date().toISOString() },
        title: 'Orca Seeded Canvas',
        lastChange: { by: 'orca-plugin-design', at: new Date().toISOString(), via: 'Orca plugin' }
      }, null, 2));
    } else {
      fs.writeFileSync(dest, content, 'utf8');
    }
  }

  // Record index inside ORCA_DESIGN_HOME to assert Agy never modifies or deletes it
  const orcaRecordPath = path.join(orcaHome, 'artifacts', 'orca-index.json');
  const orcaIndexSnapshot = JSON.stringify({ v: 1, root: orcaCanvasRoot, skill: 'claude-design', title: 'Orca Seeded Canvas' });
  fs.writeFileSync(orcaRecordPath, orcaIndexSnapshot);
  fs.writeFileSync(orcaStateFile, JSON.stringify({ workspaceRoot: wsDir, workspaceName: 'shared-workspace' }));
  fs.writeFileSync(agyStateFile, JSON.stringify({ workspaceRoot: wsDir, workspaceName: 'shared-workspace', hostScheme: 'dark' }));

  // Verify default port separation: Agy defaults to 3481 (not Orca's 3480)
  const nodeMod = require(path.join(PLUGIN_ROOT, 'src', 'node.js'));
  assert.equal(nodeMod.normalizeSettings({}).port, 3481);

  // Start simulated Orca Gallery server (3480 if free, else ephemeral)
  const orcaServer = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('content-type', 'application/json');
    if (u.pathname === '/api/health') {
      return res.end(JSON.stringify({ ok: true, app: 'orca-plugin-design', port: orcaServer.address().port }));
    }
    if (u.pathname === '/api/list') {
      const designDir = path.join(wsDir, '.design');
      const items = fs.existsSync(designDir)
        ? fs.readdirSync(designDir).map((d) => {
            const r = path.join(designDir, d);
            const canvasFile = path.join(r, 'project', 'canvas.json');
            const deckFile = path.join(r, 'project', 'deck.json');
            if (fs.existsSync(canvasFile)) {
              const meta = JSON.parse(fs.readFileSync(canvasFile, 'utf8'));
              return { root: fs.realpathSync.native(r), skill: 'claude-design', title: meta.title };
            }
            if (fs.existsSync(deckFile)) {
              const meta = JSON.parse(fs.readFileSync(deckFile, 'utf8'));
              return { root: fs.realpathSync.native(r), skill: 'claude-slides', title: meta.title };
            }
            return null;
          }).filter(Boolean)
        : [];
      return res.end(JSON.stringify({ ok: true, artifacts: items }));
    }
    res.statusCode = 404;
    res.end('{}');
  });

  const orcaPort = await listenWithFallback(orcaServer, 3480);

  // Determine free port for Agy (prefer 3481)
  const probeSrv = http.createServer();
  const agyPort = await listenWithFallback(probeSrv, 3481);
  await new Promise((r) => probeSrv.close(r));

  // Spawn real agy-plugin-design gallery-server.mjs with BOTH ORCA_* and AGY_* env vars
  const agyChild = spawn(process.execPath, [path.join(PLUGIN_ROOT, 'src', 'gallery-server.mjs')], {
    cwd: PLUGIN_ROOT,
    env: {
      ...process.env,
      AGY_DESIGN_PORT: String(agyPort),
      AGY_DESIGN_HOME: agyHome,
      AGY_DESIGN_STATE_FILE: agyStateFile,
      ORCA_DESIGN_HOME: orcaHome,
      ORCA_STATE_FILE: orcaStateFile
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const canvasCli = path.join(PLUGIN_ROOT, 'vendor', 'baoyu-design', 'skills', 'claude-design', 'scripts', 'artifact.mjs');
  let dummyPortBlocker = null;
  let agyCreatedCanvasRoot = '';

  try {
    // Wait for Agy server
    const agyBase = `http://127.0.0.1:${agyPort}`;
    let agyReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetch(`${agyBase}/api/health`);
        if (r.status === 200) {
          const h = await r.json();
          if (h.app === 'agy-plugin-design') { agyReady = true; break; }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 80));
    }
    assert.equal(agyReady, true, 'Agy Gallery server must start alongside Orca server');

    const postHeaders = { 'content-type': 'application/json', origin: agyBase, host: `127.0.0.1:${agyPort}` };

    // 1. Agy discovers Orca-created project in shared .design/
    const agyList1 = await (await fetch(`${agyBase}/api/list`)).json();
    const realOrcaRoot = fs.realpathSync.native(orcaCanvasRoot);
    assert.ok(agyList1.artifacts.some((a) => a.root === realOrcaRoot && a.title === 'Orca Seeded Canvas'));

    // 2. Agy creates a new slides project in shared .design/, and Orca reads it cleanly
    const agyCreate = await (await fetch(`${agyBase}/api/create`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({ skill: 'claude-slides', name: 'agy-shared-deck' })
    })).json();
    assert.equal(agyCreate.ok, true);

    const orcaList = await (await fetch(`http://127.0.0.1:${orcaPort}/api/list`)).json();
    assert.ok(orcaList.artifacts.some((a) => a.root === agyCreate.root && a.skill === 'claude-slides'));

    // 3. Agy deletes the newly created slides project into AGY_DESIGN_HOME/trash (ORCA_DESIGN_HOME untouched)
    const delAgy = await (await fetch(`${agyBase}/api/delete`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({ root: agyCreate.root })
    })).json();
    assert.equal(delAgy.ok, true);
    assert.ok(delAgy.path.startsWith(path.join(agyHome, 'trash')));
    assert.equal(fs.readFileSync(orcaRecordPath, 'utf8'), orcaIndexSnapshot);
    assert.equal(fs.readdirSync(path.join(orcaHome, 'trash')).length, 0);

    // 4. Editor port reuse & +99 offset & Orca editor non-termination on Agy shutdown
    // Orca opens orcaCanvasRoot editor first (creates .artifact-server.json)
    const orcaOpenRaw = execFileSync(process.execPath, [canvasCli, 'open', realOrcaRoot], { encoding: 'utf8' });
    const orcaOpenInfo = JSON.parse(orcaOpenRaw.match(/\{[\s\S]*"url"[\s\S]*\}/)[0]);
    const orcaEditorState = JSON.parse(fs.readFileSync(path.join(realOrcaRoot, '.artifact-server.json'), 'utf8'));
    assert.ok(isPidAlive(orcaEditorState.pid));

    // Agy opens the SAME project -> must reuse Orca's editor (reused: true)
    const agyOpenSame = await (await fetch(`${agyBase}/api/open`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({ skill: 'claude-design', root: realOrcaRoot })
    })).json();
    assert.equal(agyOpenSame.ok, true);
    assert.equal(agyOpenSame.reused, true);
    assert.equal(agyOpenSame.url, orcaOpenInfo.url);

    // Create a second canvas in Agy while base port 4720 is occupied by an external listener -> +99 auto-offset
    dummyPortBlocker = http.createServer((_q, s) => { s.statusCode = 404; s.end(); });
    await new Promise((resolve, reject) => {
      dummyPortBlocker.once('error', () => resolve());
      dummyPortBlocker.listen(4720, '127.0.0.1', resolve);
    });

    const agyCreateCanvas = await (await fetch(`${agyBase}/api/create`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({ skill: 'claude-design', name: 'agy-offset-canvas' })
    })).json();
    assert.equal(agyCreateCanvas.ok, true);
    agyCreatedCanvasRoot = agyCreateCanvas.root;

    const agyOpenSecond = await (await fetch(`${agyBase}/api/open`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({ skill: 'claude-design', root: agyCreatedCanvasRoot })
    })).json();
    assert.equal(agyOpenSecond.ok, true);
    const secondPort = Number(new URL(agyOpenSecond.url).port);
    assert.ok(secondPort >= 4720 && secondPort <= 4819, `Expected port in 4720..4819 (+99 range), got ${secondPort}`);
    const agyEditorState = JSON.parse(fs.readFileSync(path.join(agyCreatedCanvasRoot, '.artifact-server.json'), 'utf8'));
    assert.ok(isPidAlive(agyEditorState.pid));

    // Shutdown Agy: Agy-owned second editor must stop (if not shared hub), Orca-owned first editor must remain alive!
    await fetch(`${agyBase}/api/shutdown`, { method: 'POST', headers: postHeaders, body: '{}' });
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(isPidAlive(orcaEditorState.pid), true, 'Agy shutdown must NOT kill Orca-owned editor process');
    if (agyEditorState.pid !== orcaEditorState.pid) {
      assert.equal(isPidAlive(agyEditorState.pid), false, 'Agy shutdown must terminate Agy-owned editor process');
    }
  } finally {
    try { execFileSync(process.execPath, [canvasCli, 'stop', orcaCanvasRoot]); } catch {}
    if (agyCreatedCanvasRoot) {
      try { execFileSync(process.execPath, [canvasCli, 'stop', agyCreatedCanvasRoot]); } catch {}
    }
    if (dummyPortBlocker && dummyPortBlocker.listening) {
      await new Promise((r) => dummyPortBlocker.close(r));
    }
    try { agyChild.kill('SIGTERM'); } catch {}
    await new Promise((r) => orcaServer.close(r));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('AC-14 & AC-15: abnormal state barriers (no workspace, remote URI, plugin dir, external port busy) and MockHostHarness clean dispose', { skip: !HOST_DIR }, async () => {
  const { createMockHostHarness } = require(path.join(HOST_DIR, 'sdk', 'mock-harness'));
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-abnormal-'));
  const designHome = path.join(tempRoot, 'agy-home');
  const stateFile = path.join(tempRoot, 'runtime-state.json');
  fs.mkdirSync(designHome, { recursive: true });

  const prevHome = process.env.AGY_DESIGN_HOME;
  const prevState = process.env.AGY_DESIGN_STATE_FILE;
  process.env.AGY_DESIGN_HOME = designHome;
  process.env.AGY_DESIGN_STATE_FILE = stateFile;

  // Third-party blocker on port
  const thirdParty = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ app: 'external-dev-server' }));
  });
  await new Promise((r) => thirdParty.listen(0, '127.0.0.1', r));
  const blockedPort = thirdParty.address().port;

  let scenario = 'remote';
  const harness = createMockHostHarness({
    onRpc: async (method) => {
      if (method !== 'GetAllCascadeTrajectories') return {};
      if (scenario === 'empty') return { trajectorySummaries: {} };
      if (scenario === 'remote') {
        return {
          trajectorySummaries: {
            s1: { workspaces: [{ workspaceFolderAbsoluteUri: 'vscode-remote://ssh-remote+prod/srv/app' }] }
          }
        };
      }
      if (scenario === 'plugin-dir') {
        return {
          trajectorySummaries: {
            s1: { workspaces: [{ workspaceFolderAbsoluteUri: `file://${PLUGIN_ROOT}` }] }
          }
        };
      }
      return {
        trajectorySummaries: {
          s1: { workspaces: [{ workspaceFolderAbsoluteUri: `file://${tempRoot}` }] }
        }
      };
    }
  });

  try {
    const { port: bridgePort } = await harness.bridge.start(0);
    harness.rendererHost.configure({ bridgePort, hostToken: harness.bridge.hostToken });
    await harness.updatePluginSettings('hubo1989.design', { port: blockedPort, prewarmOnStartup: false });

    const loaded = await harness.loadAndRunPlugin(PLUGIN_ROOT, {
      trustLevel: 'T1',
      grantedPermissions: ['dom:read', 'dom:write', 'rpc:read', 'fs:user-files', 'net:listen', 'process:spawn']
    });
    assert.equal(loaded.trust.world, 'isolated');

    // (a) Remote URI must be blocked with zero shadow .design created
    scenario = 'remote';
    const rRemote = await harness.executeCommand('design.prepareWorkbench', [{ cascadeId: 's1' }]);
    assert.equal(rRemote.ok, false);
    assert.equal(rRemote.code, 'REMOTE_OR_UNMOUNTED');
    assert.equal(fs.existsSync(path.join(tempRoot, '.design')), false);

    // (b) Plugin install dir must be blocked
    scenario = 'plugin-dir';
    const rPluginDir = await harness.executeCommand('design.prepareWorkbench', [{ cascadeId: 's1' }]);
    assert.equal(rPluginDir.ok, false);
    assert.equal(rPluginDir.code, 'FORBIDDEN_WORKSPACE_PATH');
    assert.equal(fs.existsSync(path.join(PLUGIN_ROOT, '.design')), false);

    // (c) Empty workspace returns warning & blocks write
    scenario = 'empty';
    const rEmpty = await harness.executeCommand('design.resolveWorkspace', [{}]);
    assert.equal(rEmpty.ok, false);
    assert.equal(rEmpty.reason, 'NO_WORKSPACE');

    // (d) Valid local workspace + occupied port must return PORT_OCCUPIED_BY_OTHER without killing thirdParty
    scenario = 'valid';
    const rPort = await harness.executeCommand('design.prepareWorkbench', [{ cascadeId: 's1' }]);
    assert.equal(rPort.ok, false);
    assert.equal(rPort.code, 'PORT_OCCUPIED_BY_OTHER');
    assert.equal(thirdParty.listening, true, 'Third-party listener must remain alive');

    // Verify renderer shows error card with port settings button on click
    const hostEl = harness.mockDoc.getElementById('agy-daddy-host');
    const unitSlot = hostEl.shadowRoot.querySelector('[data-agy-slot="unit:hubo1989.design:design"]');
    unitSlot.click();
    await new Promise((r) => setTimeout(r, 120));
    const errCard = hostEl.shadowRoot.querySelector('#agy-design-workbench .agy-design-error-card');
    assert.ok(errCard);
    assert.equal(errCard.getAttribute('data-error-code'), 'PORT_OCCUPIED_BY_OTHER');

    // AC-15: Full clean dispose verification
    await harness.unloadPlugin('hubo1989.design');
    harness.assertCleanDispose('hubo1989.design');
  } finally {
    await harness.cleanup();
    await new Promise((r) => thirdParty.close(r));
    if (prevHome === undefined) delete process.env.AGY_DESIGN_HOME; else process.env.AGY_DESIGN_HOME = prevHome;
    if (prevState === undefined) delete process.env.AGY_DESIGN_STATE_FILE; else process.env.AGY_DESIGN_STATE_FILE = prevState;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
