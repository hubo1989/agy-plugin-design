#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(process.argv[2] || path.resolve(__dirname, '..'));

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

const FORBIDDEN_PERMS = new Set([
  'page:main-world',
  'host:launch-args',
  'host:control',
  'rpc:write',
  'bridge:route',
  'fs:brain-read'
]);

function locateHostDir() {
  const candidates = [
    process.env.AGY_DADDY_HOST_DIR ? path.resolve(process.env.AGY_DADDY_HOST_DIR) : '',
    path.resolve(ROOT, '..', 'agy-daddy', 'agy-daddy-host'),
    path.resolve(ROOT, '..', 'agy-daddy-host')
  ].filter(Boolean);
  return candidates.find((d) => fs.existsSync(path.join(d, 'src', 'contracts', 'manifest-validator.js'))) || null;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function verify() {
  // 1. Package dependencies check
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert(pkg.type !== 'module', 'package.json must remain CommonJS default (do not set "type": "module")');
  assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'Zero runtime dependencies required in package.json');

  // 2. Manifest validation
  const manPath = path.join(ROOT, 'agy-plugin.json');
  const manRaw = fs.readFileSync(manPath);
  const manifest = JSON.parse(manRaw.toString('utf8'));
  assert(manifest.schemaVersion === 1, 'agy-plugin.json schemaVersion must be 1');
  assert(manifest.id === 'hubo1989.design', 'agy-plugin.json id must be hubo1989.design');
  assert(manifest.publisher === 'hubo1989', 'agy-plugin.json publisher must be hubo1989');
  assert(manifest.world === 'isolated', 'agy-plugin.json world must be isolated');
  for (const perm of manifest.permissions || []) {
    assert(!FORBIDDEN_PERMS.has(perm), `Forbidden permission declared: ${perm}`);
  }

  // 3. Settings schema validation
  const schemaPath = path.join(ROOT, manifest.contributes?.settings?.schema || 'settings.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert(Array.isArray(schema.fields) && schema.fields.length >= 4, 'settings.schema.json must declare fields');

  // Cross-check with agy-daddy-host validator when available
  const hostDir = locateHostDir();
  if (hostDir) {
    const { validateManifest, validateSettingsSchema } = require(path.join(hostDir, 'src', 'contracts', 'manifest-validator.js'));
    const mRes = validateManifest(manifest);
    assert(mRes.ok, `Host validateManifest failed: ${(mRes.errors || []).join('; ')}`);
    const sRes = validateSettingsSchema(schema);
    assert(sRes.ok, `Host validateSettingsSchema failed: ${(sRes.errors || []).join('; ')}`);
  }

  // 4. Static color gate & forbidden API check across src/
  const srcDir = path.join(ROOT, 'src');
  for (const name of fs.readdirSync(srcDir)) {
    const p = path.join(srcDir, name);
    if (!fs.statSync(p).isFile()) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const re of FORBIDDEN_COLOR_PATTERNS) {
      assert(!re.test(text), `Theme color gate violation in src/${name}: matched ${re}`);
    }
    assert(!text.includes('registerSection'), `Forbidden API "registerSection" in src/${name}`);
  }

  // 5. Required runtime & compliance files
  const requiredFiles = [
    'LICENSE',
    'NOTICE.md',
    'README.md',
    'vendor-rewrites.json',
    'vendor/manifest.json',
    'locales/zh-CN.json',
    'locales/en.json',
    'src/node.js',
    'src/renderer.js',
    'src/styles.js',
    'src/workspace-resolver.js',
    'src/gallery-server.mjs',
    'src/gallery-ui.mjs',
    'src/builtin-library.mjs',
    'src/post-guard.mjs',
    'src/skills-meta.mjs',
    'src/examples.json',
    'tools/thumb.mjs',
    'tools/vendor-baoyu.mjs',
    'tools/layout-check.mjs',
    'templates/starter.proto.html',
    'references/layouts.json',
    'assets/icon.png',
    'assets/cover.png',
    'assets/gallery.png',
    'assets/editor.png'
  ];
  for (const skill of ['claude-slides', 'claude-design', 'claude-design-system', 'claude-dashboard', 'claude-motion']) {
    requiredFiles.push(`vendor/baoyu-design/skills/${skill}/scripts/artifact.mjs`);
  }
  for (const rel of requiredFiles) {
    assert(fs.existsSync(path.join(ROOT, rel)) && fs.statSync(path.join(ROOT, rel)).isFile(), `Missing required file: ${rel}`);
  }

  // 6. Verify NOTICE.md three-tier licensing disclosure
  const notice = fs.readFileSync(path.join(ROOT, 'NOTICE.md'), 'utf8');
  assert(/Anthropic/i.test(notice) && /NOT.*MIT/i.test(notice), 'NOTICE.md must explicitly state Anthropic assets are NOT MIT');

  // 7. Vendor integrity check
  const vendorOut = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'vendor-baoyu.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const vendorReport = JSON.parse(vendorOut);
  assert(vendorReport.ok === true, `vendor-baoyu.mjs --check failed: ${vendorOut}`);

  // 8. Compute manifestSha512
  const manifestSha512 = `sha512-${crypto.createHash('sha512').update(manRaw).digest('base64')}`;
  return {
    ok: true,
    id: manifest.id,
    version: manifest.version,
    hostValidated: Boolean(hostDir),
    runtimeFilesChecked: requiredFiles.length,
    vendorFiles: vendorReport.actual,
    manifestSha512
  };
}

try {
  const report = verify();
  console.log(JSON.stringify(report, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
  process.exitCode = 1;
}
