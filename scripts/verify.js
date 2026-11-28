#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(process.argv[2] || path.resolve(__dirname, '..'));

const SUPPORTED_LOCALES = [
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'es',
  'pt',
  'fr',
  'ru',
  'it',
  'en'
];

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

const FORBIDDEN_BRAND_RE = new RegExp(`${['la', 'kala'].join('')}|\\u62c9\\u5361\\u62c9`, 'i');

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

function assertRelativeAssetPath(rootDir, relPath, label) {
  assert(typeof relPath === 'string' && relPath.trim().length > 0, `${label} must be a non-empty relative path`);
  assert(!path.isAbsolute(relPath) && !relPath.startsWith('/'), `${label} must be a relative path: ${relPath}`);
  assert(!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(relPath), `${label} must not be a URL or URI: ${relPath}`);
  assert(!relPath.split(/[\\/]/).includes('..'), `${label} must not contain parent traversal: ${relPath}`);
  const rootPrefix = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
  const resolved = path.resolve(rootDir, relPath);
  assert(resolved.startsWith(rootPrefix), `${label} escapes plugin root: ${relPath}`);
  assert(fs.existsSync(resolved) && fs.statSync(resolved).isFile(), `${label} file does not exist: ${relPath}`);
}

function assertLocaleMap10(obj, label) {
  assert(obj && typeof obj === 'object' && !Array.isArray(obj), `${label} must be a 10-locale map`);
  for (const loc of SUPPORTED_LOCALES) {
    assert(typeof obj[loc] === 'string' && obj[loc].trim().length > 0, `${label} missing translation for ${loc}`);
  }
}

function scanNoForbiddenBrand(rootDir) {
  const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'dist', 'assets']);
  const TEXT_EXTS = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.sh', '.txt']);
  const hits = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) continue;
      const text = fs.readFileSync(full, 'utf8');
      if (FORBIDDEN_BRAND_RE.test(text)) {
        hits.push(path.relative(rootDir, full));
      }
    }
  }
  walk(rootDir);
  assert(hits.length === 0, `Forbidden brand reference found in non-vendor files: ${hits.join(', ')}`);
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
  assert(!manifest.contributes?.['topbar.popovers'], 'agy-plugin.json must not declare topbar.popovers');
  assert(Boolean(manifest.consumes?.['zh-cn']), 'agy-plugin.json must declare optional consumes["zh-cn"]');
  assertLocaleMap10(manifest.displayName, 'agy-plugin.json displayName');
  assertLocaleMap10(manifest.description, 'agy-plugin.json description');
  for (const cmd of manifest.contributes?.commands || []) {
    assertLocaleMap10(cmd.title, `agy-plugin.json command ${cmd.id} title`);
  }
  for (const perm of manifest.permissions || []) {
    assert(!FORBIDDEN_PERMS.has(perm), `Forbidden permission declared: ${perm}`);
  }
  assertRelativeAssetPath(ROOT, manifest.icon, 'agy-plugin.json icon');
  assertRelativeAssetPath(ROOT, manifest.cover, 'agy-plugin.json cover');
  assert(Array.isArray(manifest.screenshots) && manifest.screenshots.length > 0, 'agy-plugin.json screenshots must be a non-empty array');
  manifest.screenshots.forEach((shot, idx) => {
    assertRelativeAssetPath(ROOT, shot, `agy-plugin.json screenshots[${idx}]`);
  });

  // 3. Settings schema validation
  const schemaPath = path.join(ROOT, manifest.contributes?.settings?.schema || 'settings.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert(Array.isArray(schema.fields) && schema.fields.length >= 4, 'settings.schema.json must declare fields');
  assertLocaleMap10(schema.title, 'settings.schema.json title');
  const openModeField = schema.fields.find((f) => f.key === 'openMode');
  assert(openModeField && openModeField.default === 'sidebar', 'openMode default must be "sidebar"');
  assert.deepEqual?.(openModeField.options.map((o) => o.value), ['sidebar', 'browser']);
  assert(
    JSON.stringify(openModeField.options.map((o) => o.value)) === JSON.stringify(['sidebar', 'browser']),
    'openMode options must strictly be ["sidebar", "browser"]'
  );
  for (const field of schema.fields) {
    assertLocaleMap10(field.label, `settings field ${field.key} label`);
    assertLocaleMap10(field.description, `settings field ${field.key} description`);
    for (const opt of field.options || []) {
      assertLocaleMap10(opt.label, `settings field ${field.key} option ${opt.value} label`);
    }
  }
  for (const act of schema.actions || []) {
    assertLocaleMap10(act.label, `settings action ${act.id} label`);
  }

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
    assert(!text.includes('registerPopover'), `Forbidden API "registerPopover" in src/${name}`);
  }

  // 5. Required runtime & compliance files (including all 10 locales)
  const requiredFiles = [
    'LICENSE',
    'NOTICE.md',
    'README.md',
    'vendor-rewrites.json',
    'vendor/manifest.json',
    ...SUPPORTED_LOCALES.map((loc) => `locales/${loc}.json`),
    'src/i18n.js',
    'src/node.js',
    'src/renderer.js',
    'src/styles.js',
    'src/workspace-resolver.js',
    'src/gallery-server.mjs',
    'src/gallery-ui.mjs',
    'src/gallery-locales.mjs',
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

  // 5b. Validate all 10 locale files share identical keys & non-empty values
  const enLocale = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'en.json'), 'utf8'));
  const expectedKeys = Object.keys(enLocale).sort();
  assert(expectedKeys.length >= 13, 'locales/en.json must declare host UI keys');
  for (const loc of SUPPORTED_LOCALES) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', `${loc}.json`), 'utf8'));
    const keys = Object.keys(data).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify(expectedKeys),
      `locales/${loc}.json keys mismatch against en.json`
    );
    for (const k of expectedKeys) {
      assert(!k.startsWith('popover.') && k !== 'workbench.toggleExpand', `Obsolete key in locales/${loc}.json: ${k}`);
      assert(typeof data[k] === 'string' && data[k].trim().length > 0, `Empty translation ${k} in locales/${loc}.json`);
    }
  }

  // 6. Verify NOTICE.md three-tier licensing disclosure & zero forbidden brand leftovers
  const notice = fs.readFileSync(path.join(ROOT, 'NOTICE.md'), 'utf8');
  assert(/Anthropic/i.test(notice) && /NOT.*MIT/i.test(notice), 'NOTICE.md must explicitly state Anthropic assets are NOT MIT');
  scanNoForbiddenBrand(ROOT);

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
    localesChecked: SUPPORTED_LOCALES.length,
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
