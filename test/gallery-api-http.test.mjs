import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-test-http-'));
const wsDir = path.join(tmpDir, 'workspace');
const outsideDir = path.join(tmpDir, 'outside-secret');
const designHome = path.join(tmpDir, 'agy-baoyu-design');
const stateFile = path.join(tmpDir, 'runtime-state.json');

fs.mkdirSync(wsDir, { recursive: true });
fs.mkdirSync(outsideDir, { recursive: true });
fs.mkdirSync(designHome, { recursive: true });
fs.writeFileSync(path.join(outsideDir, 'secret.html'), '<h1>secret</h1>');

process.env.AGY_DESIGN_HOME = designHome;
process.env.AGY_DESIGN_STATE_FILE = stateFile;
// Ensure Orca env vars do NOT affect agy-plugin-design
process.env.ORCA_DESIGN_HOME = path.join(tmpDir, 'orca-should-be-ignored');
process.env.ORCA_STATE_FILE = path.join(tmpDir, 'orca-state-should-be-ignored.json');

fs.writeFileSync(stateFile, JSON.stringify({
  workspaceRoot: wsDir,
  workspaceName: 'workspace',
  hostScheme: 'dark',
  updatedAt: Date.now(),
}));

const {
  server,
  galleryHtml,
  createExample,
  listArtifactsViews,
  renameArtifact,
  trashArtifact,
  restoreArtifact,
  findArtifact,
} = await import('../src/gallery-server.mjs');

const port = 41000 + Math.floor(Math.random() * 2000);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});

const base = `http://127.0.0.1:${port}`;
const hit = async (route, { method = 'GET', headers = {}, body = '' } = {}) => {
  const r = await fetch(base + route, { method, headers, body: method === 'GET' ? undefined : body });
  return { status: r.status, text: await r.text() };
};
const postHeaders = (extra = {}) => ({
  'content-type': 'application/json',
  origin: base,
  host: `127.0.0.1:${port}`,
  ...extra,
});

test('Gallery HTML renders Agy Design Studio brand, Zero-FOUC dark scheme, and valid inline JS', () => {
  const html = galleryHtml('zh');
  assert.match(html, /Agy Design Studio/);
  assert.match(html, /data-host-scheme="dark"/);
  assert.match(html, /agy-design-scheme/);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2);
  for (const code of scripts) {
    assert.doesNotThrow(() => new Function(code), 'Inline gallery script must compile cleanly');
  }
});

test('GET /api/health returns agy-plugin-design identity', async () => {
  const res = await hit('/api/health');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.text);
  assert.equal(json.ok, true);
  assert.equal(json.app, 'agy-plugin-design');
  assert.ok(json.buildId);
});

test('HTTP security guard blocks GET mutations, text/plain, cross-origin POST, >64KiB body, and symlink escape', async () => {
  assert.equal((await hit('/api/delete?root=/tmp')).status, 404);
  assert.equal((await hit('/api/open?skill=claude-design')).status, 404);
  assert.equal((await hit('/api/delete', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', origin: 'https://evil.example' },
    body: JSON.stringify({ root: wsDir }),
  })).status, 415);
  assert.equal((await hit('/api/delete', {
    method: 'POST',
    headers: { ...postHeaders(), origin: 'https://evil.example' },
    body: JSON.stringify({ root: wsDir }),
  })).status, 403);
  assert.equal((await hit('/api/create', {
    method: 'POST',
    headers: postHeaders(),
    body: JSON.stringify({ skill: 'claude-design', name: 'x'.repeat(70000) }),
  })).status, 413);

  // Symlink inside .design pointing outside workspace must be rejected
  const designDir = path.join(wsDir, '.design');
  fs.mkdirSync(designDir, { recursive: true });
  const escapeLink = path.join(designDir, 'escaped-link');
  fs.symlinkSync(outsideDir, escapeLink);
  const openEscaped = await hit('/api/open', {
    method: 'POST',
    headers: postHeaders(),
    body: JSON.stringify({ skill: 'claude-design', root: escapeLink }),
  });
  assert.equal(openEscaped.status, 400);
  assert.equal(fs.existsSync(path.join(tmpDir, 'orca-should-be-ignored')), false);
});

test('Single design-system uniqueness, dashboard/motion no-scaffold rule, rename sync, and mixed-file safe delete', async () => {
  const ds1 = await createExample('claude-design-system');
  assert.equal(ds1.ok, true);
  const ds2 = await createExample('claude-design-system');
  assert.equal(ds2.ok, false);
  assert.equal(ds2.code, 'DESIGN_SYSTEM_EXISTS');

  const dash = await createExample('claude-dashboard', 'empty-dash');
  assert.equal(dash.ok, false);
  const motion = await createExample('claude-motion', 'empty-motion');
  assert.equal(motion.ok, false);

  const canvas = await createExample('claude-design', 'alpha-board');
  assert.equal(canvas.ok, true);
  const renamed = await renameArtifact('claude-design', canvas.root, 'Beta Board');
  assert.notEqual(renamed.root, canvas.root);
  assert.ok(fs.existsSync(path.join(renamed.root, 'project', 'canvas.json')));
  const canvasJson = JSON.parse(fs.readFileSync(path.join(renamed.root, 'project', 'canvas.json'), 'utf8'));
  assert.equal(canvasJson.title, 'Beta Board');

  // Clean trash + undo restore
  const recClean = findArtifact(renamed.root);
  const trashed = trashArtifact(recClean);
  assert.equal(trashed.moved, true);
  assert.equal(fs.existsSync(renamed.root), false);
  const restored = restoreArtifact(trashed.trash);
  assert.equal(restored.root, renamed.root);
  assert.equal(fs.existsSync(renamed.root), true);

  // Mixed directory protection: custom notes.txt prevents folder move/deletion
  fs.writeFileSync(path.join(renamed.root, 'notes.txt'), 'keep me');
  const recMixed = findArtifact(renamed.root);
  const deletedMixed = trashArtifact(recMixed);
  assert.equal(deletedMixed.moved, false);
  assert.equal(fs.existsSync(path.join(renamed.root, 'notes.txt')), true);
  assert.equal(listArtifactsViews().artifacts.some((a) => a.root === renamed.root), false);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
