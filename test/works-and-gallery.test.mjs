import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-test-works-'));
const wsA = path.join(tmpDir, 'workspace-a');
const wsB = path.join(tmpDir, 'workspace-b');
const designHome = path.join(tmpDir, 'agy-design-home');
const stateFile = path.join(tmpDir, 'runtime-state.json');

fs.mkdirSync(wsA, { recursive: true });
fs.mkdirSync(wsB, { recursive: true });
fs.mkdirSync(designHome, { recursive: true });

process.env.AGY_DESIGN_HOME = designHome;
process.env.AGY_DESIGN_STATE_FILE = stateFile;
process.env.ORCA_DESIGN_HOME = path.join(tmpDir, 'orca-home-ignored');
process.env.ORCA_STATE_FILE = path.join(tmpDir, 'orca-state-ignored.json');

function setActiveWorkspace(wsRoot, scheme = 'dark') {
  fs.writeFileSync(stateFile, JSON.stringify({
    workspaceRoot: wsRoot,
    workspaceName: path.basename(wsRoot),
    hostScheme: scheme,
    updatedAt: Date.now(),
  }));
}

setActiveWorkspace(wsA, 'dark');

const {
  server,
  galleryHtml,
  createExample,
  listArtifactsViews,
  openSkillEditor,
  stopSkillEditor,
  renameArtifact,
  trashArtifact,
  restoreArtifact,
  findArtifact,
} = await import('../src/gallery-server.mjs');

const port = 42000 + Math.floor(Math.random() * 2000);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});

const base = `http://127.0.0.1:${port}`;
const postHeaders = {
  'content-type': 'application/json',
  origin: base,
  host: `127.0.0.1:${port}`,
};

async function apiJson(route, method = 'GET', bodyObj = null) {
  const res = await fetch(base + route, {
    method,
    headers: method === 'POST' ? postHeaders : undefined,
    body: bodyObj !== null ? JSON.stringify(bodyObj) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

test('AC-1: slides creation, collision suffixing (-2/-3), editor HTTP 200, disk edit, archive/export, and list meta', async () => {
  const s1 = await apiJson('/api/create', 'POST', { skill: 'claude-slides', name: 'q4-review' });
  assert.equal(s1.status, 200);
  assert.equal(s1.json.ok, true);
  assert.ok(s1.json.root.endsWith(path.join('.design', 'q4-review')));
  assert.ok(fs.existsSync(path.join(s1.json.root, 'project', 'deck.json')));
  const slidesDir = path.join(s1.json.root, 'project', 'slides');
  const slideFiles = fs.readdirSync(slidesDir).filter((f) => f.endsWith('.html'));
  assert.ok(slideFiles.length >= 1, 'Expected built-in slides HTML files');
  assert.equal(s1.json.problems, 0, 'Built-in slides scaffold must pass artifact.mjs check');

  // Same name must create -2 and -3 without silent overwrite
  const s2 = await apiJson('/api/create', 'POST', { skill: 'claude-slides', name: 'q4-review' });
  const s3 = await apiJson('/api/create', 'POST', { skill: 'claude-slides', name: 'q4-review' });
  assert.equal(s2.json.ok, true);
  assert.equal(s3.json.ok, true);
  assert.ok(s2.json.root.endsWith(path.join('.design', 'q4-review-2')));
  assert.ok(s3.json.root.endsWith(path.join('.design', 'q4-review-3')));

  // Open slides editor and verify it serves HTTP 200
  const opened = await apiJson('/api/open', 'POST', { skill: 'claude-slides', root: s1.json.root });
  assert.equal(opened.status, 200);
  assert.equal(opened.json.ok, true);
  assert.match(opened.json.url, /^http:\/\/127\.0\.0\.1:\d+/);

  try {
    const editorResp = await fetch(opened.json.url);
    assert.equal(editorResp.status, 200);
    const firstSlidePath = path.join(slidesDir, slideFiles[0]);
    const originalSlide = fs.readFileSync(firstSlidePath, 'utf8');
    fs.writeFileSync(firstSlidePath, `${originalSlide}\n<!-- QA已编辑 -->`, 'utf8');
    assert.ok(fs.readFileSync(firstSlidePath, 'utf8').includes('QA已编辑'));

    // Verify archive/export artifact generation works cleanly
    const exportDir = path.join(s1.json.root, 'exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const zipPath = path.join(exportDir, 'q4-review.zip');
    const artifactScript = path.resolve('vendor/baoyu-design/skills/claude-slides/scripts/artifact.mjs');
    const archiveOut = execFileSync(process.execPath, [artifactScript, 'archive', s1.json.root, '--out', zipPath], {
      encoding: 'utf8',
    });
    assert.ok(fs.existsSync(zipPath), `Expected archive zip in exports/: ${archiveOut}`);
  } finally {
    await stopSkillEditor('claude-slides', s1.json.root);
  }

  const list = await apiJson('/api/list');
  const found = list.json.artifacts.find((a) => a.root === s1.json.root);
  assert.ok(found);
  assert.match(found.meta, /^\d+ 页$/);
});

test('AC-2: infinite canvas (claude-design) generic scaffold creation, editor URL, disk edit, and return refresh', async () => {
  const c1 = await apiJson('/api/create', 'POST', { skill: 'claude-design', name: 'brand-canvas' });
  assert.equal(c1.json.ok, true);
  assert.equal(c1.json.problems, 0, 'Built-in canvas scaffold must pass artifact.mjs check');
  assert.ok(fs.existsSync(path.join(c1.json.root, 'project', 'canvas.json')));

  const canvasMeta = JSON.parse(fs.readFileSync(path.join(c1.json.root, 'project', 'canvas.json'), 'utf8'));
  const boardRel = canvasMeta.order?.[0] || Object.keys(canvasMeta.boards || {})[0];
  assert.ok(boardRel && boardRel.endsWith('.html'));
  const boardPath = path.join(c1.json.root, 'project', boardRel);
  assert.ok(fs.existsSync(boardPath));

  const opened = await apiJson('/api/open', 'POST', { skill: 'claude-design', root: c1.json.root });
  assert.equal(opened.json.ok, true);
  try {
    const resp = await fetch(opened.json.url);
    assert.equal(resp.status, 200);
    const html = fs.readFileSync(boardPath, 'utf8');
    fs.writeFileSync(boardPath, `${html}\n<!-- canvas-qa-edit -->`, 'utf8');
  } finally {
    await stopSkillEditor('claude-design', c1.json.root);
  }

  const list = await apiJson('/api/list');
  const item = list.json.artifacts.find((a) => a.root === c1.json.root);
  assert.ok(item);
  assert.match(item.meta, /^\d+ 画板$/);
});

test('AC-3: design-system generic scaffold initialization, editor open, and single-workspace uniqueness guard', async () => {
  const html = galleryHtml('zh-CN', 'dark');
  const brandGateRe = new RegExp(`languageBtn|agy-design-lang|${['la', 'kala'].join('')}|\\u62c9\\u5361\\u62c9`, 'i');
  assert.equal(brandGateRe.test(html), false, 'Gallery HTML must have zero manual lang switch or third-party branding');

  const ds1 = await apiJson('/api/create', 'POST', { skill: 'claude-design-system' });
  assert.equal(ds1.json.ok, true);
  assert.equal(ds1.json.problems, 0, 'Built-in design-system scaffold must pass artifact.mjs check');
  assert.ok(fs.existsSync(path.join(ds1.json.root, 'project', 'design-system.json')));
  assert.ok(fs.existsSync(path.join(ds1.json.root, 'project', 'tokens.json')));

  const opened = await apiJson('/api/open', 'POST', { skill: 'claude-design-system', root: ds1.json.root });
  assert.equal(opened.json.ok, true);
  try {
    const resp = await fetch(opened.json.url);
    assert.equal(resp.status, 200);
  } finally {
    await stopSkillEditor('claude-design-system', ds1.json.root);
  }

  // Duplicate initialization in same workspace must be blocked
  const ds2 = await apiJson('/api/create', 'POST', { skill: 'claude-design-system' });
  assert.equal(ds2.json.ok, false);
  assert.equal(ds2.json.code, 'DESIGN_SYSTEM_EXISTS');
  assert.match(ds2.json.error, /已存在统一设计系统/);
});

test('AC-4 & AC-5: dashboard and motion discovery, editor launch, and agent-only creation rule (no empty scaffolds)', async () => {
  // Seed valid dashboard project inside wsA/.design/
  const dashRoot = path.join(wsA, '.design', 'sales-dashboard');
  fs.mkdirSync(path.join(dashRoot, 'db', 'dash'), { recursive: true });
  fs.writeFileSync(path.join(dashRoot, 'db', 'dash', 'meta.json'), JSON.stringify({
    title: 'Sales KPI Board',
    sheets: { overview: { title: 'Overview' }, revenue: { title: 'Revenue' } },
  }, null, 2));

  // Seed valid motion project inside wsA/designs/ (depth <= 3)
  const motionRoot = path.join(wsA, 'designs', 'brand-film');
  fs.mkdirSync(path.join(motionRoot, 'db', 'film'), { recursive: true });
  fs.writeFileSync(path.join(motionRoot, 'db', 'film', 'meta.json'), JSON.stringify({
    title: 'Brand Launch Film',
    scenes: [{ id: 's1', duration: 3 }, { id: 's2', duration: 4 }],
  }, null, 2));

  const list = await apiJson('/api/list');
  const dashItem = list.json.artifacts.find((a) => a.root === fs.realpathSync.native(dashRoot));
  const motionItem = list.json.artifacts.find((a) => a.root === fs.realpathSync.native(motionRoot));
  assert.ok(dashItem, 'Dashboard inside .design/ must be discovered');
  assert.equal(dashItem.skill, 'claude-dashboard');
  assert.equal(dashItem.meta, '2 报表');

  assert.ok(motionItem, 'Motion inside designs/ (depth <= 3) must be discovered');
  assert.equal(motionItem.skill, 'claude-motion');
  assert.equal(motionItem.meta, '2 场景');

  // Open dashboard and motion editors
  const dashOpen = await apiJson('/api/open', 'POST', { skill: 'claude-dashboard', root: dashItem.root });
  assert.equal(dashOpen.json.ok, true);
  try {
    assert.equal((await fetch(dashOpen.json.url)).status, 200);
  } finally {
    await stopSkillEditor('claude-dashboard', dashItem.root);
  }

  const motionOpen = await apiJson('/api/open', 'POST', { skill: 'claude-motion', root: motionItem.root });
  assert.equal(motionOpen.json.ok, true);
  try {
    assert.equal((await fetch(motionOpen.json.url)).status, 200);
  } finally {
    await stopSkillEditor('claude-motion', motionItem.root);
  }

  // Must refuse creating empty dashboard/motion scaffolds and guide via /api/start prompt
  const dashCreate = await apiJson('/api/create', 'POST', { skill: 'claude-dashboard', name: 'empty-dash' });
  assert.equal(dashCreate.json.ok, false);
  assert.equal(fs.existsSync(path.join(wsA, '.design', 'empty-dash')), false);

  const motionCreate = await apiJson('/api/create', 'POST', { skill: 'claude-motion', name: 'empty-motion' });
  assert.equal(motionCreate.json.ok, false);
  assert.equal(fs.existsSync(path.join(wsA, '.design', 'empty-motion')), false);

  const dashStart = await apiJson('/api/start', 'POST', { skill: 'claude-dashboard' });
  assert.equal(dashStart.json.fallback, 'clipboard');
  assert.ok(dashStart.json.starter.includes('数据看板'));

  const motionStart = await apiJson('/api/start', 'POST', { skill: 'claude-motion' });
  assert.equal(motionStart.json.fallback, 'clipboard');
  assert.ok(motionStart.json.starter.includes('动画'));
});

test('AC-8, AC-9 & AC-11: Gallery client script search (/), filter, view toggle, pin, rename, 10s trash undo, mixed-file guard, workspace switch, and no-Chrome preview fallback', async () => {
  // Set up Workspace B with 1 artifact so workspace A vs B isolation is tested end-to-end
  setActiveWorkspace(wsB, 'dark');
  const bDesign = await apiJson('/api/create', 'POST', { skill: 'claude-design', name: 'wsb-only-card' });
  assert.equal(bDesign.json.ok, true);

  // Switch back to wsA first and verify scope & inCurrentWorkspace
  setActiveWorkspace(wsA, 'dark');
  const listA = await apiJson('/api/list');
  assert.equal(listA.json.workspaceName, 'workspace-a');
  const inA = listA.json.artifacts.filter((a) => a.inCurrentWorkspace);
  const inB = listA.json.artifacts.filter((a) => !a.inCurrentWorkspace);
  assert.ok(inA.length >= 4);
  assert.equal(inB.length, 1);
  assert.equal(inB[0].root, bDesign.json.root);

  // AC-11: Ensure thumbs/ has no cached PNG -> /api/thumb returns 404, /api/preview returns 200 HTML (non-blocking fallback)
  fs.rmSync(path.join(designHome, 'thumbs'), { recursive: true, force: true });
  const listNoThumb = await apiJson('/api/list');
  const previewTarget = listNoThumb.json.artifacts.find((a) => a.inCurrentWorkspace && a.preview);
  assert.ok(previewTarget);
  assert.equal(previewTarget.thumb, false);
  const thumbResp = await fetch(`${base}/api/thumb?root=${encodeURIComponent(previewTarget.root)}`);
  assert.equal(thumbResp.status, 404);
  const prevResp = await fetch(`${base}/api/preview?skill=${encodeURIComponent(previewTarget.skill)}&root=${encodeURIComponent(previewTarget.root)}`);
  assert.equal(prevResp.status, 200);
  assert.match(await prevResp.text(), /<!doctype|<html/i);

  // Run the actual inline GALLERY_CLIENT_SCRIPT in a mock DOM VM to verify UI state & `/` shortcut
  const html = galleryHtml('zh', 'dark');
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scriptMatches.length, 2);
  const clientCode = scriptMatches[1];

  const storage = new Map();
  const elements = new Map();
  const docListeners = new Map();
  const winListeners = new Map();
  let focusedId = '';

  function makeEl(id = '', initialHtml = '') {
    const el = {
      id,
      innerHTML: initialHtml,
      textContent: '',
      value: '',
      className: '',
      title: '',
      placeholder: '',
      style: {},
      disabled: false,
      dataset: {},
      attributes: new Map(),
      classList: {
        set: new Set(),
        add(c) { this.set.add(c); },
        remove(c) { this.set.delete(c); },
        contains(c) { return this.set.has(c); },
      },
      setAttribute(k, v) { this.attributes.set(k, String(v)); },
      getAttribute(k) { return this.attributes.get(k) ?? null; },
      removeAttribute(k) { this.attributes.delete(k); },
      addEventListener() {},
      closest() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      focus() { focusedId = id; },
      scrollIntoView() {},
      getBoundingClientRect() { return { left: 10, right: 100, bottom: 40 }; },
    };
    if (id) elements.set(id, el);
    return el;
  }

  for (const id of [
    'listView', 'wsLabel', 'schemeBtn', 'reloadBtn', 'mainScroll', 'q', 'clearSearch', 'filterBtn',
    'viewModeBtn', 'viewModeIcon', 'examples', 'listHeading', 'scopeSwitch', 'typePills', 'container',
    'missingTray', 'tiles', 'recipes', 'editorView', 'backBtn', 'editorTitle', 'popBtn', 'frame',
    'dialogScrim', 'toast', 'toastCloseBtn', 'toastUndoBtn', 'menuLayer',
  ]) {
    makeEl(id);
  }

  const docObj = {
    documentElement: { lang: 'zh-CN', dataset: { hostScheme: 'dark' }, removeAttribute() {} },
    activeElement: null,
    getElementById(id) { return elements.get(id) || null; },
    querySelector(sel) {
      if (sel === '.bda-scrim:not(.hidden)') return null;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { docListeners.set(type, fn); },
  };
  const winObj = {
    innerWidth: 1280,
    parent: null,
    location: { href: `${base}/?lang=zh&scheme=dark`, search: '?lang=zh&scheme=dark', pathname: '/', hash: '' },
    history: { state: {}, replaceState() {}, pushState() {} },
    matchMedia: () => ({ matches: true }),
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    open() {},
  };
  winObj.parent = winObj;

  const clientCtx = vm.createContext({
    document: docObj,
    window: winObj,
    location: winObj.location,
    history: winObj.history,
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
    },
    navigator: { clipboard: { writeText: async () => {} } },
    fetch: (route, opts) => fetch(String(route).startsWith('http') ? route : `${base}${route}`, opts),
    URL,
    URLSearchParams,
    Intl,
    setTimeout,
    clearTimeout,
    console,
  });
  vm.runInContext(clientCode, clientCtx);
  await new Promise((r) => setTimeout(r, 150));

  // Verify `/` key focuses search input `#q`
  for (const fn of winListeners.get('keydown') || []) {
    fn({ key: '/', preventDefault() {} });
  }
  assert.equal(focusedId, 'q', 'Pressing / must focus search input');

  // Verify agy-design-lang is never persisted to localStorage, and all 10 locales switch live via postMessage
  assert.equal(storage.has('agy-design-lang'), false, 'Manual language storage agy-design-lang must not exist');
  for (const targetLoc of ['zh-TW', 'ja', 'ko', 'es', 'pt', 'fr', 'ru', 'it', 'en', 'zh-CN']) {
    for (const fn of winListeners.get('message') || []) {
      fn({ data: { type: 'agy-design:locale-changed', locale: targetLoc } });
    }
    assert.equal(docObj.documentElement.lang, targetLoc);
    assert.equal(vm.runInContext('lang', clientCtx), targetLoc);
    assert.notEqual(elements.get('tiles').innerHTML, '');
  }
  assert.equal(storage.has('agy-design-lang'), false);

  // Verify grid/list view mode toggle persists to agy-design-view-mode
  assert.equal(vm.runInContext('state.viewMode', clientCtx), 'grid');
  elements.get('viewModeBtn').onclick();
  assert.equal(vm.runInContext('state.viewMode', clientCtx), 'list');
  assert.equal(storage.get('agy-design-view-mode'), 'list');
  assert.match(elements.get('container').innerHTML, /class="bda-list"/);

  // Verify search filtering & type/date/pinned filtering
  elements.get('q').value = 'q4-review';
  elements.get('q').oninput();
  const matched = vm.runInContext('getSortedList()', clientCtx);
  assert.ok(matched.length >= 1 && matched.every((m) => m.root.includes('q4-review')));

  elements.get('clearSearch').onclick();
  assert.equal(vm.runInContext('state.search', clientCtx), '');

  // Verify type + date ('today') filtering
  vm.runInContext('state.filters.types = ["claude-slides"]; state.filters.date = "today";', clientCtx);
  const slidesToday = vm.runInContext('getSortedList()', clientCtx);
  assert.ok(slidesToday.length >= 1 && slidesToday.every((m) => m.skill === 'claude-slides'));
  vm.runInContext('state.filters.types = []; state.filters.date = "any";', clientCtx);

  // Verify no-Chrome fallback renders .bda-live iframe + .bda-sheet vector placeholder without <img>
  elements.get('viewModeBtn').onclick(); // back to grid
  const gridHtml = elements.get('container').innerHTML;
  assert.match(gridHtml, /class="bda-sheet"/);
  assert.match(gridHtml, /class="bda-live"/);
  assert.equal(/class="bda-thumb"/.test(gridHtml), false);

  // Verify scope switch: workspace vs all
  assert.ok(vm.runInContext('workspaceArtifacts().length < validArtifacts().length', clientCtx));
  vm.runInContext('state.scope = "all"; renderItems();', clientCtx);
  assert.ok(vm.runInContext('getSortedList().some((a) => !a.inCurrentWorkspace)', clientCtx));

  // Switch focus to Workspace B and verify backend reflects Workspace B
  setActiveWorkspace(wsB, 'dark');
  await vm.runInContext('reload()', clientCtx);
  assert.equal(vm.runInContext('state.workspaceName', clientCtx), 'workspace-b');
  vm.runInContext('state.scope = "workspace"; renderItems();', clientCtx);
  const wsBOnly = vm.runInContext('getSortedList()', clientCtx);
  assert.equal(wsBOnly.length, 1);
  assert.equal(wsBOnly[0].root, bDesign.json.root);

  // Switch back to Workspace A for pin/rename/trash/undo/mixed-file checks
  setActiveWorkspace(wsA, 'dark');
  const targetA = listA.json.artifacts.find((a) => a.root.endsWith('q4-review-2'));
  assert.ok(targetA);

  // Pin
  const pinRes = await apiJson('/api/update', 'POST', { root: targetA.root, pinned: true });
  assert.equal(pinRes.json.ok, true);
  assert.equal(pinRes.json.record.pinned, true);

  // Rename syncs disk folder + deck.json title
  const renRes = await apiJson('/api/update', 'POST', { root: targetA.root, title: 'Board Renamed Sync' });
  assert.equal(renRes.json.ok, true);
  assert.notEqual(renRes.json.root, targetA.root);
  assert.equal(fs.existsSync(targetA.root), false);
  assert.ok(fs.existsSync(renRes.json.root));
  const deckJson = JSON.parse(fs.readFileSync(path.join(renRes.json.root, 'project', 'deck.json'), 'utf8'));
  assert.equal(deckJson.title, 'Board Renamed Sync');

  // Clean delete moves to <AGY_DESIGN_HOME>/trash/ + 10s Toast Undo restores it
  const delRes = await apiJson('/api/delete', 'POST', { root: renRes.json.root });
  assert.equal(delRes.json.ok, true);
  assert.equal(delRes.json.moved, true);
  assert.ok(delRes.json.path.startsWith(path.join(designHome, 'trash')));
  assert.equal(fs.existsSync(renRes.json.root), false);

  // Trigger UI toast with 10s undo button and click undo via UI handler
  let capturedUndoToastDelay = 0;
  clientCtx.setTimeout = (fn, ms) => {
    if (ms === 10000) capturedUndoToastDelay = ms;
    return setTimeout(fn, ms);
  };
  clientCtx.showToast('已删除', delRes.json.trash);
  assert.equal(capturedUndoToastDelay, 10000, 'Undo toast must stay visible for 10 seconds');
  assert.ok(elements.get('toast').innerHTML.includes('toastUndoBtn'));
  await elements.get('toastUndoBtn').onclick();
  assert.equal(fs.existsSync(renRes.json.root), true);

  // Mixed-file directory protection: custom notes.txt keeps folder on disk, removes index
  fs.writeFileSync(path.join(renRes.json.root, 'notes.txt'), 'business notes');
  const delMixed = await apiJson('/api/delete', 'POST', { root: renRes.json.root });
  assert.equal(delMixed.json.ok, true);
  assert.equal(delMixed.json.moved, false);
  assert.equal(fs.existsSync(path.join(renRes.json.root, 'notes.txt')), true);
  const afterMixed = await apiJson('/api/list');
  assert.equal(afterMixed.json.artifacts.some((a) => a.root === renRes.json.root), false);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
