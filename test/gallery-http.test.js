'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { pathToFileURL } = require('node:url');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_COLOR_PATTERNS = [
  /#10b981/i,
  /#34d399/i,
  /#059669/i,
  /#38bdf8/i,
  /#7dd3fc/i,
  /#0369a1/i,
  /#0c4a6e/i,
  /#fb923c/i,
  /#c2410c/i
];

let mod;
let port;
let tmpDir;
let wsDir;
let outsideDir;

test.before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-http-sec-'));
  wsDir = path.join(tmpDir, 'ws');
  outsideDir = path.join(tmpDir, 'outside');
  const designHome = path.join(tmpDir, 'agy-home');
  const stateFile = path.join(tmpDir, 'runtime-state.json');

  fs.mkdirSync(path.join(wsDir, '.design'), { recursive: true });
  fs.mkdirSync(outsideDir, { recursive: true });
  fs.mkdirSync(designHome, { recursive: true });
  fs.writeFileSync(path.join(outsideDir, 'leak.html'), '<h1>outside</h1>');

  process.env.AGY_DESIGN_HOME = designHome;
  process.env.AGY_DESIGN_STATE_FILE = stateFile;
  fs.writeFileSync(stateFile, JSON.stringify({
    workspaceRoot: wsDir,
    workspaceName: 'ws',
    hostScheme: 'dark',
    updatedAt: Date.now()
  }));

  mod = await import(pathToFileURL(path.join(PLUGIN_ROOT, 'src', 'gallery-server.mjs')).href);
  await new Promise((resolve, reject) => {
    mod.server.once('error', reject);
    mod.server.listen(0, '127.0.0.1', resolve);
  });
  port = mod.server.address().port;
});

test('AC-12: Gallery HTTP server binds 127.0.0.1 and enforces method/content-type/Origin/64KiB/path-traversal guards', async () => {
  const addr = mod.server.address();
  assert.equal(addr.address, '127.0.0.1', 'Server must strictly bind 127.0.0.1');

  const base = `http://127.0.0.1:${port}`;
  const validHeaders = {
    'content-type': 'application/json',
    origin: base,
    host: `127.0.0.1:${port}`
  };

  // (a) GET on all mutation/control routes must be rejected (404)
  for (const route of ['/api/delete', '/api/open', '/api/create', '/api/restore', '/api/rename', '/api/update', '/api/shutdown']) {
    const r = await fetch(`${base}${route}?root=${encodeURIComponent(wsDir)}`);
    assert.equal(r.status, 404, `GET ${route} must return 404`);
  }

  // (b) text/plain POST must return 415
  const rText = await fetch(`${base}/api/create`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', origin: base },
    body: JSON.stringify({ skill: 'claude-design', name: 'blocked' })
  });
  assert.equal(rText.status, 415);
  assert.equal(fs.existsSync(path.join(wsDir, '.design', 'blocked')), false);

  // (c) Forged cross-site Origin must return 403
  const rOrigin = await fetch(`${base}/api/create`, {
    method: 'POST',
    headers: { ...validHeaders, origin: 'https://evil.example' },
    body: JSON.stringify({ skill: 'claude-design', name: 'evil-create' })
  });
  assert.equal(rOrigin.status, 403);
  assert.equal(fs.existsSync(path.join(wsDir, '.design', 'evil-create')), false);

  // (d) > 65536 bytes payload (both declared Content-Length and chunked stream) must return 413
  const oversized = JSON.stringify({ skill: 'claude-design', name: 'a'.repeat(70000) });
  const rLargeDeclared = await fetch(`${base}/api/create`, {
    method: 'POST',
    headers: validHeaders,
    body: oversized
  });
  assert.equal(rLargeDeclared.status, 413);

  const chunkedStatus = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/create',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: base,
        host: `127.0.0.1:${port}`,
        'transfer-encoding': 'chunked'
      }
    }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write('{"skill":"claude-design","name":"');
    req.write('b'.repeat(66000));
    req.end('"}');
  });
  assert.equal(chunkedStatus, 413);

  // (e) Lexical ../ traversal and outward symlink inside .design must be blocked
  const traversalRoot = path.join(wsDir, '.design', '..', '..', 'outside');
  const rTraversal = await fetch(`${base}/api/open`, {
    method: 'POST',
    headers: validHeaders,
    body: JSON.stringify({ skill: 'claude-design', root: traversalRoot })
  });
  assert.equal(rTraversal.status, 400);

  const escapeSymlink = path.join(wsDir, '.design', 'escape-symlink');
  fs.symlinkSync(outsideDir, escapeSymlink);
  const rSymlink = await fetch(`${base}/api/open`, {
    method: 'POST',
    headers: validHeaders,
    body: JSON.stringify({ skill: 'claude-design', root: escapeSymlink })
  });
  assert.equal(rSymlink.status, 400);
});

test('AC-13: Zero-FOUC dark/light scheme SSR injection, --ag-* CSS variables, and static 9-color gate', () => {
  const darkHtml = mod.galleryHtml('zh', 'dark');
  const lightHtml = mod.galleryHtml('zh', 'light');
  assert.match(darkHtml, /<html[^>]*data-host-scheme="dark"/);
  assert.match(lightHtml, /<html[^>]*data-host-scheme="light"/);
  assert.match(darkHtml, /agy-design-scheme/);
  assert.match(darkHtml, /schemeBtn/);

  // Stylesheet uses --ag-* host tokens and zero forbidden colors across src/
  const { DESIGN_STYLES } = require(path.join(PLUGIN_ROOT, 'src', 'styles.js'));
  assert.match(DESIGN_STYLES, /--ag-bg-panel/);
  assert.match(DESIGN_STYLES, /--ag-text-primary/);
  assert.match(DESIGN_STYLES, /--ag-custom-token-accent/);

  const srcDir = path.join(PLUGIN_ROOT, 'src');
  for (const file of fs.readdirSync(srcDir)) {
    const p = path.join(srcDir, file);
    if (!fs.statSync(p).isFile()) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const re of FORBIDDEN_COLOR_PATTERNS) {
      assert.equal(re.test(text), false, `Forbidden color ${re} found in src/${file}`);
    }
    assert.equal(text.includes('registerSection'), false, `Forbidden API registerSection in src/${file}`);
  }
});

test.after(async () => {
  if (mod?.server?.listening) {
    await new Promise((resolve) => mod.server.close(resolve));
  }
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});
