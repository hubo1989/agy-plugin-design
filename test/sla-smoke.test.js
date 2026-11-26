'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

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

function seedFiveHistoricalProjects(wsDir) {
  const specs = [
    { dir: 'hist-slides-1', marker: 'project/deck.json', data: { title: 'Deck One', order: ['s1'] } },
    { dir: 'hist-canvas-2', marker: 'project/canvas.json', data: { title: 'Canvas Two', boards: { 'b1.dc.html': {} }, order: ['b1.dc.html'] } },
    { dir: 'hist-ds-3', marker: 'project/design-system.json', data: { title: 'Design System Three' } },
    { dir: 'hist-dash-4', marker: 'db/dash/meta.json', data: { title: 'Dashboard Four', sheets: { a: {} } } },
    { dir: 'hist-motion-5', marker: 'db/film/meta.json', data: { title: 'Motion Five', scenes: [{ id: 's1' }] } }
  ];
  for (const s of specs) {
    const markerPath = path.join(wsDir, '.design', s.dir, s.marker);
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, JSON.stringify(s.data, null, 2));
  }
}

async function waitForHealth(port, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (resp.status === 200) return await resp.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 40));
  }
  return null;
}

test('AC-6 & AC-7: <=100ms click feedback, 500ms 3-click dedup, failure instant reset, <1s warm open, <1s skeleton / <3s cold open with >=5 projects', { skip: !HOST_DIR }, async () => {
  const { createMockHostHarness } = require(path.join(HOST_DIR, 'sdk', 'mock-harness'));
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-sla-'));
  const tempWs = path.join(tempRoot, 'ws');
  const designHome = path.join(tempRoot, 'agy-home');
  const stateFile = path.join(tempRoot, 'runtime-state.json');
  fs.mkdirSync(tempWs, { recursive: true });
  fs.mkdirSync(designHome, { recursive: true });
  seedFiveHistoricalProjects(tempWs);

  const prevHome = process.env.AGY_DESIGN_HOME;
  const prevState = process.env.AGY_DESIGN_STATE_FILE;
  process.env.AGY_DESIGN_HOME = designHome;
  process.env.AGY_DESIGN_STATE_FILE = stateFile;

  const port = 36000 + Math.floor(Math.random() * 4000);
  const harness = createMockHostHarness({
    onRpc: async (method) => {
      if (method === 'GetAllCascadeTrajectories') {
        return {
          trajectorySummaries: {
            'sla-conv-1': {
              workspaces: [{ workspaceFolderAbsoluteUri: `file://${tempWs}` }],
              annotations: { title: 'SLA Bench Session' }
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

    await harness.loadAndRunPlugin(PLUGIN_ROOT, {
      trustLevel: 'T1',
      grantedPermissions: ['dom:read', 'dom:write', 'rpc:read', 'fs:user-files', 'net:listen', 'process:spawn']
    });

    // Spy on service prepareWorkbench calls
    let prepareCalls = 0;
    const origService = harness.bus.services.get('design');
    assert.ok(origService);
    const origPrepare = origService.methods.prepareWorkbench;
    origService.methods.prepareWorkbench = async (...args) => {
      prepareCalls += 1;
      return await origPrepare(...args);
    };

    const hostEl = harness.mockDoc.getElementById('agy-daddy-host');
    const unitSlot = hostEl.shadowRoot.querySelector('[data-agy-slot="unit:hubo1989.design:design"]');
    assert.ok(unitSlot);

    // 1. Cold open + 3 rapid clicks within 500ms (0ms, 100ms, 250ms)
    const coldT0 = performance.now();
    unitSlot.click();
    const feedbackMs = performance.now() - coldT0;
    assert.ok(feedbackMs <= 100, `Immediate click feedback took ${feedbackMs.toFixed(2)}ms (expected <= 100ms)`);

    const wb = hostEl.shadowRoot.querySelector('#agy-design-workbench');
    assert.ok(wb);
    assert.equal(wb.getAttribute('data-hidden'), 'false');
    assert.ok(wb.querySelector('[data-agy-design-skeleton="true"]'), 'Skeleton frame must appear synchronously');
    const skeletonFirstFrameMs = performance.now() - coldT0;
    assert.ok(skeletonFirstFrameMs < 1000, `Cold skeleton first frame took ${skeletonFirstFrameMs.toFixed(2)}ms`);

    setTimeout(() => unitSlot.click(), 100);
    setTimeout(() => unitSlot.click(), 250);

    // Wait for Gallery HTTP server readiness & iframe mount
    const health = await waitForHealth(port, 3000);
    assert.ok(health && health.app === 'agy-plugin-design', 'Cold start /api/health must respond < 3.0s');
    const listResp = await fetch(`http://127.0.0.1:${port}/api/list`);
    const listJson = await listResp.json();
    assert.ok(listJson.artifacts.length >= 5, `Expected >= 5 artifacts, got ${listJson.artifacts.length}`);

    let iframe = null;
    const iframeDeadline = Date.now() + 2500;
    while (Date.now() < iframeDeadline) {
      iframe = wb.querySelector('iframe.agy-design-iframe');
      if (iframe) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    const coldReadyMs = performance.now() - coldT0;
    assert.ok(iframe, 'Cold open must mount iframe');
    assert.ok(coldReadyMs < 3000, `Cold open ready took ${coldReadyMs.toFixed(2)}ms (expected < 3000ms)`);
    assert.equal(prepareCalls, 1, `3 clicks in 500ms must trigger only 1 prepareWorkbench (got ${prepareCalls})`);

    // 2. Warm open (close workbench, wait past 2s success throttle so backend probe runs, then measure click -> ready)
    harness.mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
    assert.equal(wb.getAttribute('data-hidden'), 'true');
    await new Promise((r) => setTimeout(r, 2100));

    const warmT0 = performance.now();
    unitSlot.click();
    let warmIframe = null;
    const warmDeadline = Date.now() + 1000;
    while (Date.now() < warmDeadline) {
      warmIframe = wb.querySelector('iframe.agy-design-iframe');
      if (warmIframe) break;
      await new Promise((r) => setTimeout(r, 15));
    }
    const warmReadyMs = performance.now() - warmT0;
    assert.ok(warmIframe, 'Warm open must mount iframe');
    assert.ok(warmReadyMs < 1000, `Warm open ready took ${warmReadyMs.toFixed(2)}ms (expected < 1000ms)`);

    // 3. Failure instant reset: simulate failed prepareWorkbench -> must NOT trigger 2s throttle on immediate retry
    harness.mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
    await new Promise((r) => setTimeout(r, 2100));

    let failOnce = true;
    origService.methods.prepareWorkbench = async (...args) => {
      prepareCalls += 1;
      if (failOnce) {
        failOnce = false;
        return { ok: false, code: 'PORT_OCCUPIED_BY_OTHER', error: '端口被占用测试' };
      }
      return await origPrepare(...args);
    };

    const beforeFailCalls = prepareCalls;
    unitSlot.click();
    await new Promise((r) => setTimeout(r, 80));
    const errCard = wb.querySelector('.agy-design-error-card');
    assert.ok(errCard, 'Error card must appear on failure');
    assert.equal(prepareCalls, beforeFailCalls + 1);

    // Immediate retry (0ms delay) must not be throttled
    unitSlot.click();
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(prepareCalls, beforeFailCalls + 2, 'Failed open must reset immediately for retry');
    assert.ok(wb.querySelector('iframe.agy-design-iframe'), 'Retry after failure must recover cleanly');

    console.log(JSON.stringify({
      slaMetrics: {
        clickFeedbackMs: Number(feedbackMs.toFixed(2)),
        coldSkeletonFirstFrameMs: Number(skeletonFirstFrameMs.toFixed(2)),
        coldReadyMs: Number(coldReadyMs.toFixed(2)),
        warmReadyMs: Number(warmReadyMs.toFixed(2)),
        rapidThreeClickPrepareCalls: 1
      }
    }));

    await harness.unloadPlugin('hubo1989.design');
    harness.assertCleanDispose('hubo1989.design');
  } finally {
    await harness.cleanup();
    if (prevHome === undefined) delete process.env.AGY_DESIGN_HOME; else process.env.AGY_DESIGN_HOME = prevHome;
    if (prevState === undefined) delete process.env.AGY_DESIGN_STATE_FILE; else process.env.AGY_DESIGN_STATE_FILE = prevState;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('AC-7 timeout: stalled Gallery server closes cleanly at 8.0s with START_TIMEOUT and kills hanging child', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-timeout-'));
  const wsDir = path.join(tempRoot, 'ws');
  const hangScript = path.join(tempRoot, 'hang-server.mjs');
  const pidFile = path.join(tempRoot, 'hang.pid');
  fs.mkdirSync(wsDir, { recursive: true });
  fs.writeFileSync(hangScript, `
    import fs from 'node:fs';
    fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
    setInterval(() => {}, 1000);
  `);

  const nodeMod = require(path.join(PLUGIN_ROOT, 'src', 'node.js'));
  const unusedPort = 39000 + Math.floor(Math.random() * 3000);
  const commands = new Map();

  try {
    await nodeMod.activate({
      storage: { dir: path.join(tempRoot, 'plugin-data') },
      settings: { get: () => ({ port: unusedPort, prewarmOnStartup: false }) },
      rpc: {
        call: async () => ({
          trajectorySummaries: {
            t1: { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsDir}` }] }
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
    }, { disablePrewarm: true, galleryServerPath: hangScript });

    const t0 = performance.now();
    const res = await commands.get('design.prepareWorkbench')({ cascadeId: 't1' });
    const elapsedMs = performance.now() - t0;

    assert.equal(res.ok, false);
    assert.equal(res.code, 'START_TIMEOUT');
    assert.ok(elapsedMs >= 7800 && elapsedMs <= 9500, `Expected ~8.0s timeout, got ${elapsedMs.toFixed(0)}ms`);

    // Ensure hanging child was terminated
    await new Promise((r) => setTimeout(r, 150));
    const hangPid = Number(fs.readFileSync(pidFile, 'utf8'));
    let alive = false;
    try { process.kill(hangPid, 0); alive = true; } catch {}
    assert.equal(alive, false, 'Timed-out child process must be killed');

    console.log(JSON.stringify({ timeoutElapsedMs: Number(elapsedMs.toFixed(2)) }));
  } finally {
    await nodeMod.deactivate();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
