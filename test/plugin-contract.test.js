'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

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

test('verify.js passes manifest, settings, 9-color gate, license notices, and vendor integrity', () => {
  const out = execFileSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts', 'verify.js')], {
    cwd: PLUGIN_ROOT,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(out);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.id, 'hubo1989.design');
  assert.match(parsed.manifestSha512, /^sha512-[A-Za-z0-9+/=]{86,88}$/);
});

test('manifest declares minimal isolated-world permissions without privileged entitlements', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'agy-plugin.json'), 'utf8'));
  assert.equal(manifest.world, 'isolated');
  assert.deepEqual(manifest.permissions, [
    'dom:read',
    'dom:write',
    'rpc:read',
    'fs:user-files',
    'net:listen',
    'process:spawn'
  ]);
  for (const forbidden of ['page:main-world', 'host:launch-args', 'host:control', 'rpc:write', 'bridge:route', 'fs:brain-read']) {
    assert.equal(manifest.permissions.includes(forbidden), false, `Must not request ${forbidden}`);
  }
});

test('node.js detects third-party port occupation without killing external processes', async () => {
  const blocker = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ app: 'some-other-service' }));
  });
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  const blockedPort = blocker.address().port;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-test-port-'));
  const wsDir = path.join(tempDir, 'ws');
  fs.mkdirSync(wsDir, { recursive: true });
  const nodeMod = require(path.join(PLUGIN_ROOT, 'src', 'node.js'));

  try {
    await nodeMod.activate({
      storage: { dir: path.join(tempDir, 'plugin-data') },
      settings: { get: () => ({ port: blockedPort, prewarmOnStartup: false }) },
      rpc: {
        call: async () => ({
          trajectorySummaries: {
            c1: { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsDir}` }] }
          }
        })
      },
      services: { provide: async () => () => {} },
      commands: { register: async () => () => {} },
      state: { set: () => {}, subscribe: async () => () => {} },
      events: { emit: () => {} }
    }, { disablePrewarm: true });

    const status = await nodeMod.probeGalleryHealth(blockedPort);
    assert.equal(status.alive, true);
    assert.equal(status.mine, false);

    // Invoke prepareWorkbench via a mocked command registry
    const commands = new Map();
    await nodeMod.deactivate();
    await nodeMod.activate({
      storage: { dir: path.join(tempDir, 'plugin-data') },
      settings: { get: () => ({ port: blockedPort, prewarmOnStartup: false }) },
      rpc: {
        call: async () => ({
          trajectorySummaries: {
            c1: { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsDir}` }] }
          }
        })
      },
      services: { provide: async () => () => {} },
      commands: {
        register: async (id, fn) => {
          commands.set(id, fn);
          return () => commands.delete(id);
        }
      },
      state: { set: () => {}, subscribe: async () => () => {} },
      events: { emit: () => {} }
    }, { disablePrewarm: true });

    const prep = await commands.get('design.prepareWorkbench')({ cascadeId: 'c1' });
    assert.equal(prep.ok, false);
    assert.equal(prep.code, 'PORT_OCCUPIED_BY_OTHER');
    assert.equal(blocker.listening, true, 'External process must remain untouched');
  } finally {
    await nodeMod.deactivate();
    await new Promise((resolve) => blocker.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('MockHostHarness lifecycle: isolated mount, immediate feedback, rapid click dedup, shortcut, hot settings, and clean dispose', { skip: !HOST_DIR }, async () => {
  const { createMockHostHarness } = require(path.join(HOST_DIR, 'sdk', 'mock-harness'));
  const tempWs = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-test-harness-'));
  const port = 34000 + Math.floor(Math.random() * 4000);

  const harness = createMockHostHarness({
    onRpc: async (method) => {
      if (method === 'GetAllCascadeTrajectories') {
        return {
          trajectorySummaries: {
            '11111111-2222-3333-4444-555555555555': {
              workspaces: [{ workspaceFolderAbsoluteUri: `file://${tempWs}` }],
              annotations: { title: 'Test Session' }
            }
          }
        };
      }
      return {};
    }
  });

  try {
    const { port: bridgePort } = await harness.bridge.start(0);
    harness.rendererHost.configure({ bridgePort, hostToken: harness.bridge.hostToken });
    await harness.updatePluginSettings('hubo1989.design', { port, prewarmOnStartup: false });

    const loaded = await harness.loadAndRunPlugin(PLUGIN_ROOT, {
      trustLevel: 'T1',
      grantedPermissions: [
        'dom:read',
        'dom:write',
        'rpc:read',
        'fs:user-files',
        'net:listen',
        'process:spawn'
      ]
    });
    assert.equal(loaded.trust.world, 'isolated');
    assert.ok(harness.isolatedWorlds.has('hubo1989.design'));

    const hostEl = harness.mockDoc.getElementById('agy-daddy-host');
    assert.ok(hostEl?.shadowRoot);
    assert.ok(hostEl.shadowRoot.querySelector('[data-agy-style="hubo1989.design"]'));
    const unitSlot = hostEl.shadowRoot.querySelector('[data-agy-slot="unit:hubo1989.design:design"]');
    assert.ok(unitSlot, 'Topbar Design capsule must be mounted');

    // Click topbar capsule 3 times rapidly: must produce immediate skeleton & deduplicate backend calls
    const t0 = Date.now();
    unitSlot.click();
    unitSlot.click();
    unitSlot.click();
    const clickFeedbackMs = Date.now() - t0;
    assert.ok(clickFeedbackMs <= 100, `Immediate click feedback took ${clickFeedbackMs}ms`);

    const wb = hostEl.shadowRoot.querySelector('#agy-design-workbench');
    assert.ok(wb, 'Shadow DOM workbench drawer must mount synchronously on click');
    assert.equal(wb.getAttribute('data-hidden'), 'false');

    // Wait for Gallery server readiness and verify /api/health
    let healthJson = null;
    for (let i = 0; i < 25; i++) {
      try {
        const healthResp = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (healthResp.status === 200) {
          healthJson = await healthResp.json();
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(healthJson, 'Expected Gallery server to respond on /api/health');
    assert.equal(healthJson.app, 'agy-plugin-design');

    // Wait for renderer to mount the embedded iframe inside Shadow DOM workbench
    let iframe = null;
    for (let i = 0; i < 20; i++) {
      iframe = wb.querySelector('iframe.agy-design-iframe');
      if (iframe) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(iframe, 'Embedded Gallery iframe must be mounted inside Shadow DOM workbench');

    // Verify Escape closes workbench, Mod+Alt+P toggles it back
    harness.mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
    assert.equal(wb.getAttribute('data-hidden'), 'true');
    harness.mockDoc.dispatchEvent({ type: 'keydown', key: 'p', code: 'KeyP', metaKey: true, altKey: true, preventDefault() {} });
    assert.equal(wb.getAttribute('data-hidden'), 'false');

    // Settings hot-update: hide & show topbar capsule
    await harness.updatePluginSettings('hubo1989.design', { showTopbarButton: false });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(hostEl.shadowRoot.querySelector('[data-agy-slot="unit:hubo1989.design:design"]'), null);

    await harness.updatePluginSettings('hubo1989.design', { showTopbarButton: true });
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(hostEl.shadowRoot.querySelector('[data-agy-slot="unit:hubo1989.design:design"]'));

    // Unload & assert zero resource leaks (DOM, timers, observers, events, services, child process)
    await harness.unloadPlugin('hubo1989.design');
    assert.equal(hostEl.shadowRoot.querySelector('#agy-design-workbench'), null);
    assert.equal(hostEl.shadowRoot.querySelector('[data-agy-style="hubo1989.design"]'), null);
    harness.assertCleanDispose('hubo1989.design');

    await new Promise((r) => setTimeout(r, 400));
    const afterUnload = await require(path.join(PLUGIN_ROOT, 'src', 'node.js')).probeGalleryHealth(port, 300);
    assert.equal(afterUnload.alive, false, 'Managed Gallery server must terminate cleanly on unload');
  } finally {
    await harness.cleanup();
    fs.rmSync(tempWs, { recursive: true, force: true });
  }
});
