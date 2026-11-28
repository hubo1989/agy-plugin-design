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

test('verify.js passes manifest, settings, 9-color gate, 10 locales, neutral brand gate, license notices, and vendor integrity', () => {
  const out = execFileSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts', 'verify.js')], {
    cwd: PLUGIN_ROOT,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(out);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.id, 'hubo1989.design');
  assert.equal(parsed.version, '0.2.0');
  assert.equal(parsed.localesChecked, 10);
  assert.equal(
    parsed.manifestSha512,
    'sha512-N+NgwiuwzNmt8xsZNPRrjplGK81h+3hBtMaFsDBy3MGeIqkc1GBGmwf4R/IQiIDp5QySVYCNc8DaBz58kdcg3A=='
  );
});

test('v0.2.0 contract: two openModes (sidebar/browser), no popover, consumes zh-cn, and 10-locale normalization', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'agy-plugin.json'), 'utf8'));
  assert.equal(manifest.version, '0.2.0');
  assert.equal(manifest.contributes['topbar.popovers'], undefined);
  assert.deepEqual(manifest.consumes['zh-cn'], { version: '^1.0.0', optional: true });

  const schema = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'settings.schema.json'), 'utf8'));
  const openMode = schema.fields.find((f) => f.key === 'openMode');
  assert.equal(openMode.default, 'sidebar');
  assert.deepEqual(openMode.options.map((o) => o.value), ['sidebar', 'browser']);

  const nodeMod = require(path.join(PLUGIN_ROOT, 'src', 'node.js'));
  const rendererMod = require(path.join(PLUGIN_ROOT, 'src', 'renderer.js'));
  for (const mod of [nodeMod, rendererMod]) {
    assert.equal(mod.normalizeSettings({}).openMode, 'sidebar');
    assert.equal(mod.normalizeSettings({ openMode: 'embedded' }).openMode, 'sidebar');
    assert.equal(mod.normalizeSettings({ openMode: 'popover' }).openMode, 'sidebar');
    assert.equal(mod.normalizeSettings({ openMode: 'sidebar' }).openMode, 'sidebar');
    assert.equal(mod.normalizeSettings({ openMode: 'browser' }).openMode, 'browser');
  }

  const i18n = require(path.join(PLUGIN_ROOT, 'src', 'i18n.js'));
  assert.deepEqual(i18n.SUPPORTED_LOCALES, ['zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'pt', 'fr', 'ru', 'it', 'en']);
  assert.equal(i18n.normalizeLocale('zh'), 'zh-CN');
  assert.equal(i18n.normalizeLocale('zh-hk'), 'zh-TW');
  assert.equal(i18n.normalizeLocale('ja-JP'), 'ja');
  assert.equal(i18n.normalizeLocale('ko_KR'), 'ko');
  assert.equal(i18n.normalizeLocale('es-419'), 'es');
  assert.equal(i18n.normalizeLocale('pt-BR'), 'pt');
  assert.equal(i18n.normalizeLocale('fr-CA'), 'fr');
  assert.equal(i18n.normalizeLocale('ru-RU'), 'ru');
  assert.equal(i18n.normalizeLocale('it-IT'), 'it');
  assert.equal(i18n.normalizeLocale('en-US'), 'en');
  assert.equal(i18n.extractLocaleFromPayload({ enabled: false, lang: 'zh' }), 'en');
  for (const loc of i18n.SUPPORTED_LOCALES) {
    assert.ok(i18n.t(loc, 'workbench.openExternal').length > 0);
    assert.ok(i18n.t(loc, 'workbench.close').length > 0);
  }
});

test('marketplace metadata in agy-plugin.json and package.json matches registry contract', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'agy-plugin.json'), 'utf8'));
  assert.equal(manifest.category, 'design');
  assert.deepEqual(manifest.tags, ['design', 'slides', 'canvas', 'design-system', 'dashboard', 'motion']);
  assert.equal(manifest.icon, './assets/icon.png');
  assert.equal(manifest.cover, './assets/cover.png');
  assert.deepEqual(manifest.screenshots, ['./assets/cover.png', './assets/gallery.png', './assets/editor.png']);
  assert.equal(manifest.repository, 'https://github.com/hubo1989/agy-plugin-design.git');
  assert.equal(manifest.homepage, 'https://github.com/hubo1989/agy-plugin-design#readme');

  const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.type, undefined);
  assert.deepEqual(pkg.dependencies, {});
  assert.equal(pkg.homepage, 'https://github.com/hubo1989/agy-plugin-design#readme');
  assert.deepEqual(pkg.keywords, ['antigravity', 'agy-daddy', 'design', 'slides', 'canvas', 'design-system', 'dashboard', 'motion']);
  assert.deepEqual(pkg.publishConfig, { access: 'public' });
  assert.equal(pkg.files.length, 14);
  assert.equal(pkg.files.includes('test/'), false);
});

test('verify.js rejects missing or escaping marketplace asset paths', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-verify-assets-'));
  try {
    for (const rel of ['package.json', 'agy-plugin.json', 'settings.schema.json', 'LICENSE', 'NOTICE.md', 'README.md', 'vendor-rewrites.json']) {
      fs.copyFileSync(path.join(PLUGIN_ROOT, rel), path.join(tempRoot, rel));
    }
    for (const dir of ['locales', 'src', 'tools', 'templates', 'references', 'assets', 'vendor']) {
      fs.cpSync(path.join(PLUGIN_ROOT, dir), path.join(tempRoot, dir), { recursive: true });
    }
    const manPath = path.join(tempRoot, 'agy-plugin.json');
    const baseManifest = JSON.parse(fs.readFileSync(manPath, 'utf8'));

    fs.writeFileSync(manPath, JSON.stringify({ ...baseManifest, icon: './assets/missing.png' }, null, 2) + '\n');
    assert.throws(() => execFileSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts', 'verify.js'), tempRoot], { stdio: 'pipe' }));

    fs.writeFileSync(manPath, JSON.stringify({ ...baseManifest, screenshots: ['../escape.png'] }, null, 2) + '\n');
    assert.throws(() => execFileSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts', 'verify.js'), tempRoot], { stdio: 'pipe' }));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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

test('Right aux sidebar mounting, 10-locale sticky state sync, non-dismissing prompt delivery, and browser openMode', { skip: !HOST_DIR }, async () => {
  const { createMockHostHarness } = require(path.join(HOST_DIR, 'sdk', 'mock-harness'));
  const tempWs = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-aux-sidebar-'));
  const port = 35000 + Math.floor(Math.random() * 4000);

  const harness = createMockHostHarness({
    onRpc: async (method) => {
      if (method === 'GetAllCascadeTrajectories') {
        return {
          trajectorySummaries: {
            'aux-conv-1': {
              workspaces: [{ workspaceFolderAbsoluteUri: `file://${tempWs}` }],
              annotations: { title: 'Aux Sidebar Test' }
            }
          }
        };
      }
      return {};
    }
  });

  try {
    // Attach simulated Antigravity right aux sidebar chrome
    const auxRoot = harness.mockDoc.createElement('div');
    auxRoot.setAttribute('data-side-panel-open', 'false');
    auxRoot.setAttribute('data-aux-pane-open', 'false');
    const strip = harness.mockDoc.createElement('div');
    strip.setAttribute('data-side-panel-strip', 'true');
    strip.getBoundingClientRect = () => ({ top: 0, left: 1000, right: 1920, bottom: 40, width: 920, height: 40 });
    const nativeTab = harness.mockDoc.createElement('button');
    nativeTab.className = 'agy-aux-tab';
    strip.appendChild(nativeTab);
    auxRoot.appendChild(strip);

    let toggleCount = 0;
    const toggleBtn = harness.mockDoc.querySelector('[data-testid="toggle-aux-sidebar"]');
    assert.ok(toggleBtn);
    toggleBtn.addEventListener('click', () => {
      toggleCount += 1;
      const next = auxRoot.getAttribute('data-side-panel-open') === 'true' ? 'false' : 'true';
      auxRoot.setAttribute('data-side-panel-open', next);
      auxRoot.setAttribute('data-aux-pane-open', next);
    });
    harness.mockDoc.body.appendChild(auxRoot);

    const setBothStickyState = (key, value) => {
      harness.bus.setState('agy-daddy.zh-cn', key, value);
      harness.mockDoc.dispatchEvent({
        type: harness.xworldChannelName,
        detail: {
          direction: 'to-main',
          requestId: `test-${Date.now()}-${Math.random()}`,
          pluginId: 'agy-daddy.zh-cn',
          action: 'state.set',
          key,
          value
        }
      });
    };

    const { port: bridgePort } = await harness.bridge.start(0);
    harness.rendererHost.configure({ bridgePort, hostToken: harness.bridge.hostToken });
    await harness.updatePluginSettings('hubo1989.design', { port, openMode: 'sidebar', prewarmOnStartup: false });
    setBothStickyState('state:host.locale@1', { bcp47: 'ja', locale: 'ja', lang: 'ja' });

    await harness.loadAndRunPlugin(PLUGIN_ROOT, {
      trustLevel: 'T1',
      grantedPermissions: ['dom:read', 'dom:write', 'rpc:read', 'fs:user-files', 'net:listen', 'process:spawn']
    });

    const hostEl = harness.mockDoc.getElementById('agy-daddy-host');
    const unitSlot = hostEl.shadowRoot.querySelector('[data-agy-slot="unit:hubo1989.design:design"]');
    assert.ok(unitSlot);
    unitSlot.click();

    // Aux sidebar should have auto-expanded and mounted #agy-design-sidebar-host with data-browser-occluder="true"
    assert.equal(auxRoot.getAttribute('data-side-panel-open'), 'true');
    assert.equal(toggleCount, 1);
    const sidebarHost = auxRoot.querySelector('#agy-design-sidebar-host');
    assert.ok(sidebarHost, '#agy-design-sidebar-host must mount inside auxRoot');
    assert.equal(sidebarHost.getAttribute('data-browser-occluder'), 'true');
    assert.ok(sidebarHost.shadowRoot, 'Sidebar host must use open Shadow DOM');
    const wb = sidebarHost.shadowRoot.querySelector('#agy-design-workbench');
    assert.ok(wb);
    assert.equal(wb.getAttribute('data-surface'), 'sidebar');
    assert.equal(wb.getAttribute('data-hidden'), 'false');

    // Verify Japanese translation applied via state:host.locale@1
    const closeBtn = wb.querySelector('[data-agy-action="close"]');
    assert.equal(closeBtn.textContent, '閉じる');

    // Switch sticky state to Korean via state:zh-cn.lang@1
    setBothStickyState('state:zh-cn.lang@1', { lang: 'ko', bcp47: 'ko' });
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(closeBtn.textContent, '닫기');

    // Wait for iframe mount and verify lang=ko parameter
    let iframe = null;
    for (let i = 0; i < 30; i++) {
      iframe = wb.querySelector('iframe.agy-design-iframe');
      if (iframe) break;
      await new Promise((r) => setTimeout(r, 60));
    }
    assert.ok(iframe);
    assert.ok(iframe.src.includes('lang=ko'), `Expected iframe URL to include lang=ko, got ${iframe.src}`);

    // Sending prompt via design:prompt-request@1 must keep sidebar open
    harness.mockDoc.dispatchEvent({
      type: harness.xworldChannelName,
      detail: {
        direction: 'to-main',
        requestId: `ev-${Date.now()}`,
        pluginId: 'hubo1989.design',
        action: 'events.emit',
        topic: 'design:prompt-request@1',
        payload: { starter: 'Create slides' }
      }
    });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(wb.getAttribute('data-hidden'), 'false', 'Prompt delivery must keep right sidebar open');

    // Clicking a native aux tab hides Design sidebar host without collapsing auxRoot
    strip.dispatchEvent({ type: 'click', target: nativeTab });
    assert.equal(wb.getAttribute('data-hidden'), 'true');
    assert.equal(auxRoot.getAttribute('data-side-panel-open'), 'true');

    // Verify browser mode runs without mounting sidebar workbench
    await harness.updatePluginSettings('hubo1989.design', { openMode: 'browser' });
    await new Promise((r) => setTimeout(r, 20));
    const browserOpenRes = await harness.executeCommand('design.open', [{ cascadeId: 'aux-conv-1' }]);
    assert.equal(browserOpenRes.ok, true);
    assert.equal(wb.getAttribute('data-hidden'), 'true');

    await harness.unloadPlugin('hubo1989.design');
    assert.equal(auxRoot.querySelector('#agy-design-sidebar-host'), null);
    assert.equal(auxRoot.getAttribute('data-agy-design-aux-host'), null);
    harness.assertCleanDispose('hubo1989.design');
  } finally {
    await harness.cleanup();
    fs.rmSync(tempWs, { recursive: true, force: true });
  }
});
