#!/usr/bin/env node
// Agy Design Studio · 独立项目库 HTTP 服务（仅绑定 127.0.0.1，默认端口 3481）
import { execFile } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { guardPost, MAX_BODY_BYTES } from './post-guard.mjs';
import { buildGalleryHtml } from './gallery-ui.mjs';
import { normalizeGalleryLocale } from './gallery-locales.mjs';

import {
  SKILLS,
  SKILL_BY_ID,
  TITLES,
  TINTS,
  FOLDER,
  RECIPES,
  EDITOR_FILES,
  NOT_CONTENT,
  BUILTIN_EXAMPLES,
  BUILTIN_BY_ID,
  EXAMPLE_TEMPLATES,
  EXAMPLE_INDEX,
  resolveAgyStateDir,
  resolveAgyPluginsDir,
  resolveAgyDesignHome,
  resolveAgyStateFile,
  GALLERY_BUILD_ID,
} from './skills-meta.mjs';

const require = createRequire(import.meta.url);
const {
  isForbiddenWorkspacePath,
  isRemoteWorkspaceUri,
} = require('./workspace-resolver.js');

const __filename = fileURLToPath(import.meta.url);
const pluginRoot = path.dirname(path.dirname(__filename));
const BAOYU_SKILLS_DIR = path.join(pluginRoot, 'vendor', 'baoyu-design', 'skills');
const PORT = Number(process.env.AGY_DESIGN_PORT || process.env.PORT) || 3481;

const OFFICIAL_EXAMPLES = BUILTIN_EXAMPLES
  .filter((item) => Object.hasOwn(SKILL_BY_ID, item.skill))
  .map((item) => ({
    id: item.id,
    skill: item.skill,
    title: item.title,
    titleEn: item.titleEn,
    desc: item.desc,
    descEn: item.descEn,
    points: item.points,
    pointsEn: item.pointsEn,
    label: item.label || '',
    featured: Boolean(item.featured),
    html: item.html || '',
  }));

const TEMPLATES_MAP = Object.fromEntries(Object.keys(EXAMPLE_TEMPLATES).map((id) => [id, true]));

const OPEN_TIMEOUT_MS = 30000;
const TITLE_MAX = 200;
const STAMP_MAX_ENTRIES = 20000;
const TRASH_ID = /^[0-9a-f]{24}-\d+$/;
const EPHEMERAL_TEST_RE = /(?:^|[\\/])(?:ps-gallery-(?:unit|http|smoke)-|agy-design-test-)/;
const IS_CASE_INSENSITIVE_FS = process.platform === 'darwin' || process.platform === 'win32';

// 仅追踪由本插件本次会话新拉起（reused !== true）的编辑器目录，停用时按集合回收，不误杀 Orca 共享实例。
const ownedEditorRoots = new Map(); // root -> skillId

function stateFilePath() {
  return resolveAgyStateFile();
}

function hasCustomDesignHome() {
  return Boolean(process.env.AGY_DESIGN_HOME?.trim());
}

function dshHome() {
  return resolveAgyDesignHome();
}

function artifactsDir() { return path.join(dshHome(), 'artifacts'); }
function trashDir() { return path.join(dshHome(), 'trash'); }
function dismissedDir() { return path.join(dshHome(), 'dismissed'); }
function thumbsDir() {
  const dir = path.join(dshHome(), 'thumbs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const folderHash = (root) => crypto.createHash('sha256').update(root).digest('hex').slice(0, 24);
function recordFile(root) { return path.join(artifactsDir(), `${folderHash(root)}.json`); }
function dismissedFile(root) { return path.join(dismissedDir(), `${folderHash(root)}.json`); }
function thumbPath(root) { return path.join(thumbsDir(), `${folderHash(root)}.png`); }
function isDismissed(root) { return fs.existsSync(dismissedFile(root)); }
function markDismissed(root) { writeWhole(dismissedFile(root), `${JSON.stringify({ root, at: new Date().toISOString() })}\n`); }
function clearDismissed(root) { try { fs.rmSync(dismissedFile(root), { force: true }); } catch {} }

function resolveRealPath(targetPath) {
  if (typeof fs.realpathSync?.native === 'function') {
    try {
      return fs.realpathSync.native(targetPath);
    } catch {
      return fs.realpathSync(targetPath);
    }
  }
  return fs.realpathSync(targetPath);
}

function isInsideDir(targetPath, baseDir) {
  const norm = (val) => {
    const s = String(val || '').replace(/\\/g, '/');
    return IS_CASE_INSENSITIVE_FS ? s.toLowerCase() : s;
  };
  const rel = path.relative(norm(baseDir), norm(targetPath));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function isSameOrInside(targetPath, baseDir) {
  const norm = (val) => {
    const s = String(val || '').replace(/\\/g, '/');
    return IS_CASE_INSENSITIVE_FS ? s.toLowerCase() : s;
  };
  const rel = path.relative(norm(baseDir), norm(targetPath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function artifactStatus(skill, root) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) return { valid: false, reason: 'dir_missing' };
  try {
    if (!fs.statSync(root).isDirectory()) return { valid: false, reason: 'dir_missing' };
  } catch {
    return { valid: false, reason: 'dir_missing' };
  }
  const marker = SKILL_BY_ID[skill]?.marker;
  if (marker && !fs.existsSync(path.join(root, marker))) {
    return { valid: false, reason: 'marker_missing' };
  }
  return { valid: true, reason: '' };
}

function hasValidArtifact(skill, root) {
  return artifactStatus(skill, root).valid;
}

function isEphemeralTestRoot(root) {
  if (typeof root !== 'string' || !EPHEMERAL_TEST_RE.test(root)) return false;
  const tmpRoots = [os.tmpdir(), '/tmp', '/private/tmp', '/var/folders', '/private/var/folders']
    .filter(Boolean)
    .map((p) => path.resolve(p));
  const resolved = path.resolve(root);
  return tmpRoots.some((base) => resolved.startsWith(base + path.sep));
}

const pendingThumbs = new Set();
function ensureThumb(rec) {
  try {
    if (!server?.listening) return;
    if (pendingThumbs.has(rec.root) || fs.existsSync(thumbPath(rec.root)) || !previewEntry(rec.root, rec.skill)) return;
    const addr = server.address();
    const activePort = (addr && typeof addr === 'object' && addr.port) ? addr.port : PORT;
    const url = new URL(`http://127.0.0.1:${activePort}/api/preview`);
    url.searchParams.set('skill', rec.skill);
    url.searchParams.set('root', rec.root);
    pendingThumbs.add(rec.root);
    execFile(process.execPath, [path.join(pluginRoot, 'tools/thumb.mjs'), url.href, thumbPath(rec.root)],
      { timeout: 30000 }, (err, stdout, stderr) => {
        pendingThumbs.delete(rec.root);
        if (err) console.error(`thumbnail: ${String(stderr?.trim() || err.message).split(/\r?\n/)[0]}`);
      });
  } catch (err) {
    pendingThumbs.delete(rec.root);
    console.error(`thumbnail: ${String(err.message).split(/\r?\n/)[0]}`);
  }
}

function isRecord(v) {
  return typeof v === 'object' && v !== null && v.v === 1 &&
    typeof v.root === 'string' && typeof v.skill === 'string' &&
    typeof v.title === 'string' && typeof v.openedAt === 'string';
}

function readRecord(file) {
  try {
    const val = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isRecord(val) ? val : null;
  } catch { return null; }
}

function writeWhole(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function writeRecord(record) {
  writeWhole(recordFile(record.root), `${JSON.stringify(record, null, 2)}\n`);
}

function findArtifact(root) {
  const r = readRecord(recordFile(root));
  return r?.root === root ? r : null;
}

function removeArtifactIndex(root) {
  fs.rmSync(recordFile(root), { force: true });
  try {
    const tp = path.join(dshHome(), 'thumbs', `${folderHash(root)}.png`);
    fs.rmSync(tp, { force: true });
  } catch {}
}

function forgetArtifact(root) {
  const rec = findArtifact(String(root || ''));
  if (!rec) return { ok: false, error: '未找到记录' };
  try {
    removeArtifactIndex(rec.root);
    return { ok: true, root: rec.root };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function forgetMissingArtifacts() {
  let names = [];
  try { names = fs.readdirSync(artifactsDir()); } catch {}
  let removed = 0;
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(artifactsDir(), name);
    const rec = readRecord(file);
    if (!rec) continue;
    if (!hasValidArtifact(rec.skill, rec.root)) {
      try {
        fs.rmSync(file, { force: true });
        const tp = path.join(dshHome(), 'thumbs', `${folderHash(rec.root)}.png`);
        fs.rmSync(tp, { force: true });
        removed++;
      } catch {}
    }
  }
  return { ok: true, removed };
}

function isInstalledPluginPath(target) {
  if (typeof target !== 'string' || !target.trim()) return true;
  const resolved = path.resolve(target);
  const realTarget = (() => {
    try { return resolveRealPath(resolved); } catch { return resolved; }
  })();
  const forbiddenBases = [pluginRoot, resolveAgyPluginsDir(), resolveAgyStateDir()];
  for (const base of forbiddenBases) {
    const realBase = (() => {
      try { return resolveRealPath(base); } catch { return path.resolve(base); }
    })();
    if (isSameOrInside(realTarget, realBase)) return true;
  }
  return isForbiddenWorkspacePath(realTarget, { pluginRoot });
}

// 预览、打开与登记共用同一根目录边界；使用 realpathSync.native 阻断 ../ 与 .design 内外指软链逃逸。
function allowedArtifactRoot(root) {
  if (typeof root !== 'string' || !root.trim() || root.includes('\0') || !path.isAbsolute(root)) return false;

  const existingRec = findArtifact(root);
  let lstat;
  try {
    lstat = fs.lstatSync(root);
  } catch {
    return false;
  }

  let realTarget;
  try {
    realTarget = resolveRealPath(root);
    if (!fs.statSync(realTarget).isDirectory()) return false;
  } catch {
    return false;
  }

  if (isInstalledPluginPath(realTarget)) return false;

  // 若已登记，仍须确保其真实路径与登记路径一致（或均位于合法工作区内且非软链外逃）
  if (existingRec) {
    try {
      if (lstat.isSymbolicLink()) {
        const ws = readState().workspaceRoot;
        if (!ws) return false;
        const realWs = resolveRealPath(ws);
        if (!isInsideDir(realTarget, realWs)) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  const ws = readState().workspaceRoot;
  if (!ws) return false;
  try {
    const realWs = resolveRealPath(ws);
    const designDir = path.join(ws, '.design');
    const realDesignDir = resolveRealPath(designDir);
    if (!isInsideDir(realDesignDir, realWs)) return false;
    const candidate = path.resolve(root);
    if (!isInsideDir(candidate, path.resolve(designDir))) return false;
    return isInsideDir(realTarget, realDesignDir);
  } catch {
    return false;
  }
}

function registerArtifact(input) {
  if (!input || typeof input !== 'object' || typeof input.skill !== 'string' || !Object.hasOwn(SKILL_BY_ID, input.skill)) {
    return { ok: false, error: '未知技能' };
  }
  if (!validWsRoot(input.root)) return { ok: false, error: 'root 必须是存在的绝对目录路径' };
  if (!allowedArtifactRoot(input.root)) return { ok: false, error: 'root 不在工作区 .design/ 内且尚未登记' };
  const root = resolveRealPath(path.resolve(input.root));
  for (const key of ['title', 'note']) {
    if (input[key] !== undefined && typeof input[key] !== 'string') {
      return { ok: false, error: `${key} 必须是字符串` };
    }
  }
  const before = findArtifact(root);
  const record = before ? { ...before } : {
    v: 1, root, skill: input.skill,
    title: input.title?.trim() || path.basename(root), openedAt: new Date().toISOString(),
  };
  if (input.title !== undefined) record.title = input.title.trim().slice(0, TITLE_MAX) || path.basename(root);
  if (input.note !== undefined) record.note = input.note.trim().slice(0, 2000);
  delete record.missing;
  clearDismissed(root);
  try {
    writeRecord(record);
    return { ok: true, record };
  } catch (err) { return { ok: false, error: err.message }; }
}

function artifactTitle(skill, root) {
  const at = TITLES[skill];
  if (!at) return '';
  try {
    const val = JSON.parse(fs.readFileSync(path.join(root, at[0]), 'utf8'))[at[1]];
    const title = typeof val === 'string' ? val.trim() : '';
    if (title && title !== 'project') return title;
  } catch {}
  return '';
}

function recordOpened(skill, root, now = new Date()) {
  const file = recordFile(root);
  const before = readRecord(file);
  const mine = before?.root === root ? before : null;
  const s = SKILL_BY_ID[skill];
  const record = {
    v: 1,
    root,
    skill,
    plugin: s?.plugin || `dsh-${skill}`,
    sessionId: mine?.sessionId || '',
    title: artifactTitle(skill, root) || before?.title || path.basename(root),
    openedAt: now.toISOString(),
    firstOpenedAt: mine ? (mine.firstOpenedAt || mine.openedAt) : now.toISOString(),
    ...(mine?.pinned ? { pinned: true } : {}),
    ...(mine?.note !== undefined ? { note: mine.note } : {}),
    ...(mine?.id !== undefined ? { id: mine.id } : {}),
  };
  writeRecord(record);
  ensureThumb(record);
  return record;
}

function contentStamp(root) {
  let newest = 0;
  let entries = 0;
  const walk = (dir, top) => {
    let names;
    try { names = fs.readdirSync(dir); } catch { return; }
    for (const name of names) {
      if (++entries > STAMP_MAX_ENTRIES) return;
      if (name.endsWith('.tmp') || (top && NOT_CONTENT.has(name))) continue;
      const p = path.join(dir, name);
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) walk(p, false);
        else if (stat.mtimeMs > newest) newest = stat.mtimeMs;
      } catch {}
    }
  };
  walk(root, true);
  return newest > 0 ? new Date(newest).toISOString() : '';
}

function isShared(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, '.sharing.json'), 'utf8')).lan === true;
  } catch { return false; }
}

function isDeletable(skill, root) {
  const own = FOLDER[skill];
  if (!own) return false;
  const home = process.env.HOME || os.homedir();
  if (root === home || root === path.parse(root).root) return false;
  try {
    return fs.readdirSync(root).every((name) =>
      own.includes(name) || EDITOR_FILES.includes(name) || name.endsWith('.tmp')
    );
  } catch { return false; }
}

function moveFolder(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    fs.cpSync(from, to, { recursive: true, preserveTimestamps: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}

function trashArtifact(record) {
  const id = `${folderHash(record.root)}-${Date.now()}`;
  const entry = path.join(trashDir(), id);
  try {
    for (const name of fs.readdirSync(trashDir())) {
      if (TRASH_ID.test(name) && !fs.existsSync(path.join(trashDir(), name, 'folder'))) {
        fs.rmSync(path.join(trashDir(), name), { recursive: true, force: true });
      }
    }
  } catch {}
  fs.mkdirSync(entry, { recursive: true });
  fs.writeFileSync(path.join(entry, 'record.json'), `${JSON.stringify(record, null, 2)}\n`);
  const moved = isDeletable(record.skill, record.root);
  const p = path.join(entry, 'folder', path.basename(record.root));
  if (moved) moveFolder(record.root, p);
  else markDismissed(record.root);
  fs.rmSync(recordFile(record.root), { force: true });
  ownedEditorRoots.delete(record.root);
  return { trash: id, moved, path: moved ? p : record.root };
}

function restoreArtifact(id) {
  if (!TRASH_ID.test(id)) throw new Error('not a trash entry');
  const entry = path.join(trashDir(), id);
  const record = readRecord(path.join(entry, 'record.json'));
  if (record === null) throw new Error('nothing to put back');
  const folder = path.join(entry, 'folder', path.basename(record.root));
  if (fs.existsSync(folder)) {
    if (fs.existsSync(record.root)) throw new Error(`${record.root} is taken`);
    moveFolder(folder, record.root);
  }
  clearDismissed(record.root);
  delete record.missing;
  writeRecord(record);
  fs.rmSync(entry, { recursive: true, force: true });
  return record;
}

function cleanTitle(raw) {
  if (typeof raw !== 'string') return null;
  const title = raw.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
  return title || null;
}

function sanitizeDirSlug(title) {
  return String(title || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function renameArtifact(skill, root, title) {
  if (!allowedArtifactRoot(root)) throw new Error('目标目录不在允许的工作区边界内');
  const resolvedSkill = skill || findArtifact(root)?.skill || '';
  const at = TITLES[resolvedSkill];
  if (!at) throw new Error(`no title to change for ${resolvedSkill}`);
  if (resolvedSkill === 'claude-dashboard' || resolvedSkill === 'claude-motion') {
    const metaPath = path.join(root, at[0]);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        meta[at[1]] = title;
        writeWhole(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
      } catch {}
    }
  } else {
    const file = path.join(root, at[0]);
    if (fs.existsSync(file)) {
      const idx = JSON.parse(fs.readFileSync(file, 'utf8'));
      writeWhole(file, `${JSON.stringify({ ...idx, [at[1]]: title }, null, 2)}\n`);
    }
  }

  let finalRoot = root;
  const parentDir = path.dirname(root);
  const slug = sanitizeDirSlug(title);
  if (path.basename(parentDir) === '.design' && slug && slug !== '.' && slug !== '..' && slug !== path.basename(root)) {
    let targetName = slug;
    let suffix = 2;
    while (fs.existsSync(path.join(parentDir, targetName)) && path.join(parentDir, targetName) !== root) {
      targetName = `${slug}-${suffix++}`;
    }
    const nextRoot = path.join(parentDir, targetName);
    if (nextRoot !== root) {
      try {
        await stopSkillEditor(resolvedSkill, root);
        moveFolder(root, nextRoot);
        finalRoot = nextRoot;
        if (ownedEditorRoots.has(root)) {
          ownedEditorRoots.delete(root);
          ownedEditorRoots.set(finalRoot, resolvedSkill);
        }
      } catch {}
    }
  }

  const oldRec = findArtifact(root);
  if (finalRoot !== root) {
    removeArtifactIndex(root);
    const nextRec = oldRec
      ? { ...oldRec, root: finalRoot, title }
      : {
          v: 1,
          root: finalRoot,
          skill: resolvedSkill,
          plugin: SKILL_BY_ID[resolvedSkill]?.plugin || `dsh-${resolvedSkill}`,
          title,
          openedAt: new Date().toISOString(),
        };
    writeRecord(nextRec);
    return { root: finalRoot, title, record: nextRec };
  }
  if (oldRec) {
    oldRec.title = title;
    writeRecord(oldRec);
    return { root: finalRoot, title, record: oldRec };
  }
  return { root: finalRoot, title, record: null };
}

function validWsRoot(p) {
  if (typeof p !== 'string' || !path.isAbsolute(p) || isRemoteWorkspaceUri(p)) return false;
  try {
    if (!fs.statSync(p).isDirectory()) return false;
    return !isInstalledPluginPath(p);
  } catch {
    return false;
  }
}

function readRawStateFile() {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath(), 'utf8')) || {};
  } catch {
    return {};
  }
}

function hostScheme() {
  const explicit = readRawStateFile();
  if (explicit.hostScheme === 'dark' || explicit.hostScheme === 'light') {
    return explicit.hostScheme;
  }
  const envScheme = process.env.AGY_HOST_SCHEME?.trim();
  if (envScheme === 'dark' || envScheme === 'light') return envScheme;
  return '';
}

function hostLocale() {
  const explicit = readRawStateFile();
  if (explicit.hostLocale) {
    return normalizeGalleryLocale(explicit.hostLocale);
  }
  const envLocale = process.env.AGY_HOST_LOCALE?.trim();
  if (envLocale) return normalizeGalleryLocale(envLocale);
  return 'zh-CN';
}

function readState() {
  const explicit = readRawStateFile();
  if (validWsRoot(explicit.workspaceRoot)) {
    const realWs = resolveRealPath(explicit.workspaceRoot);
    return {
      workspaceRoot: realWs,
      workspaceName: explicit.workspaceName || path.basename(realWs) || '',
    };
  }
  return { workspaceRoot: '', workspaceName: '' };
}

function artifactCli(skillId) { return path.join(BAOYU_SKILLS_DIR, skillId, 'scripts', 'artifact.mjs'); }
function runNode(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { timeout: OPEN_TIMEOUT_MS }, (err, stdout, stderr) =>
      resolve({ err, stdout: String(stdout || ''), stderr: String(stderr || '') }));
  });
}

function projectMeta(skillId, root) {
  const read = (rel) => { try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { return null; } };
  if (skillId === 'claude-design') {
    const c = read('project/canvas.json');
    return c ? `${Object.keys(c.boards || {}).length} 画板` : '';
  }
  if (skillId === 'claude-slides') {
    const d = read('project/deck.json');
    return d ? `${(d.order || []).length} 页` : '';
  }
  if (skillId === 'claude-motion') {
    const sc = read('db/film/meta.json') || read('project/scenes.json');
    if (!sc) return '';
    const count = Array.isArray(sc) ? sc.length : (sc.scenes ? (Array.isArray(sc.scenes) ? sc.scenes.length : Object.keys(sc.scenes).length) : Object.keys(sc).length);
    return count ? `${count} 场景` : '';
  }
  if (skillId === 'claude-design-system') {
    try {
      return `${fs.readdirSync(path.join(root, 'project', 'components'), { withFileTypes: true }).filter((e) => e.isDirectory()).length} 组件`;
    } catch { return ''; }
  }
  if (skillId === 'claude-dashboard') {
    try {
      const meta = read('db/dash/meta.json');
      return meta?.sheets ? `${Object.keys(meta.sheets).length} 报表` : '看板';
    } catch { return ''; }
  }
  return '';
}

function scanDesignProjects(rootDir) {
  const found = [];
  if (!rootDir || !fs.existsSync(rootDir) || isInstalledPluginPath(rootDir)) return found;
  const SKIP = new Set(['.git', 'node_modules', '.orca', '.agy-daddy', '.agents', 'vendor', 'dist', '.venv', '__pycache__', 'build']);
  const realBase = resolveRealPath(rootDir);
  (function walk(dir, depth) {
    if (depth > 3) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      let realP;
      try {
        realP = resolveRealPath(p);
      } catch {
        continue;
      }
      if (!isInsideDir(realP, realBase) || isInstalledPluginPath(realP)) continue;
      let matched = false;
      for (const s of SKILLS) {
        if (fs.existsSync(path.join(realP, s.marker))) {
          found.push({ skill: s.id, root: realP, title: artifactTitle(s.id, realP) || e.name });
          matched = true;
          break;
        }
      }
      if (!matched) walk(realP, depth + 1);
    }
  })(realBase, 0);
  return found;
}

function previewEntry(root, skill) {
  if (!hasValidArtifact(skill, root)) return null;
  if (skill === 'claude-design-system') {
    const cover = path.join(root, 'project', 'components', 'Cover', 'preview.html');
    if (fs.existsSync(cover)) return cover;
    try {
      const compsDir = path.join(root, 'project', 'components');
      for (const entry of fs.readdirSync(compsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(compsDir, entry.name, 'preview.html');
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch {}
    return null;
  }
  if (skill === 'claude-slides') {
    try {
      const deck = JSON.parse(fs.readFileSync(path.join(root, 'project', 'deck.json'), 'utf8'));
      const preferred = [deck.cover, ...(Array.isArray(deck.order) ? deck.order : [])].filter(Boolean);
      for (const id of preferred) {
        const candidate = path.join(root, 'project', 'slides', `${String(id).replace(/\.html$/, '')}.html`);
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch {}
    try {
      const files = fs.readdirSync(path.join(root, 'project', 'slides')).filter((f) => f.endsWith('.html')).sort();
      if (files.length) return path.join(root, 'project', 'slides', files[0]);
    } catch {}
  }
  if (skill === 'claude-design') {
    try {
      const canvas = JSON.parse(fs.readFileSync(path.join(root, 'project', 'canvas.json'), 'utf8'));
      for (const board of canvas.order || Object.keys(canvas.boards || {})) {
        const candidate = path.join(root, 'project', board);
        if (fs.existsSync(candidate) && candidate.endsWith('.html')) return candidate;
      }
    } catch {}
  }
  try {
    const files = fs.readdirSync(path.join(root, 'project')).filter((f) => f.endsWith('.html')).sort();
    if (files.length) return path.join(root, 'project', files[0]);
  } catch {}
  return null;
}

function renderPreviewDocument(file, skill) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^<!--\s*@dsCard[^>]*-->\s*\r?\n?/, '');
  if (skill === 'claude-slides' && !/<!doctype|<html\b/i.test(raw)) {
    return Buffer.from(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;width:1280px;height:800px;overflow:hidden;background:#1e293b;font-family:Inter,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.slide-stage{width:1920px;height:1080px;transform:scale(0.666667);transform-origin:0 0;position:relative;overflow:hidden}
.slide-stage > section{width:1920px;height:1080px;position:relative;overflow:hidden}
x-shape{display:block;pointer-events:none}
x-shape[kind="ellipse"]{border-radius:50%}
</style></head><body><div class="slide-stage">${raw}</div></body></html>`, 'utf8');
  }
  if (skill === 'claude-design' && raw.includes('<x-dc')) {
    const cleaned = raw
      .replace(/<script\b[^>]*src=["']\.\/support\.js["'][^>]*><\/script>/gi, '')
      .replace('</head>', '<style>html,body{margin:0;padding:0;overflow:hidden}x-dc,helmet{display:contents}</style></head>');
    return Buffer.from(cleaned, 'utf8');
  }
  return Buffer.from(raw, 'utf8');
}

function listArtifactsViews() {
  const state = readState();
  const workspaceRoot = state.workspaceRoot ? resolveRealPath(state.workspaceRoot) : '';
  const map = new Map();
  const pruneEphemeral = !hasCustomDesignHome();

  let names = [];
  try { names = fs.readdirSync(artifactsDir()); } catch {}
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(artifactsDir(), name);
    const rec = readRecord(file);
    if (rec === null) continue;
    const status = artifactStatus(rec.skill, rec.root);
    if (!status.valid) {
      if (pruneEphemeral && isEphemeralTestRoot(rec.root)) {
        removeArtifactIndex(rec.root);
        continue;
      }
      rec.missing = true;
      rec._missingReason = status.reason;
    } else if (rec.missing) {
      delete rec.missing;
      writeRecord(rec);
    }
    map.set(rec.root, rec);
  }

  if (workspaceRoot) {
    const scanned = scanDesignProjects(workspaceRoot);
    for (const item of scanned) {
      if (isDismissed(item.root)) continue;
      const existing = map.get(item.root);
      if (!existing) {
        const rec = recordOpened(item.skill, item.root, new Date());
        map.set(item.root, rec);
      } else if (existing.missing) {
        delete existing.missing;
        delete existing._missingReason;
        writeRecord(existing);
      }
    }
  }

  const views = [];
  for (const [root, rec] of map.entries()) {
    const s = SKILL_BY_ID[rec.skill];
    if (!s) continue;
    const isMissing = rec.missing === true;
    const resolvedRoot = path.resolve(root);
    const inCurrentWorkspace = Boolean(
      workspaceRoot && (resolvedRoot === workspaceRoot || resolvedRoot.startsWith(workspaceRoot + path.sep)),
    );
    const title = (isMissing ? '' : artifactTitle(rec.skill, root)) || rec.title || path.basename(root);
    const mtime = isMissing ? '' : contentStamp(root);
    views.push({
      root,
      skill: rec.skill,
      plugin: rec.plugin,
      sessionId: rec.sessionId || '',
      title,
      openedAt: rec.openedAt,
      firstOpenedAt: rec.firstOpenedAt || rec.openedAt,
      updatedAt: mtime || rec.openedAt,
      pinned: rec.pinned === true,
      shared: isMissing ? false : isShared(root),
      deletable: isMissing ? false : isDeletable(rec.skill, root),
      meta: isMissing ? '' : projectMeta(rec.skill, root),
      note: typeof rec.note === 'string' ? rec.note : '',
      tail: root.split(/[\\/]/).filter(Boolean).slice(-2).join('/'),
      openable: !isMissing,
      missing: isMissing,
      missingReason: isMissing ? (rec._missingReason || 'dir_missing') : '',
      inCurrentWorkspace,
      preview: isMissing ? false : Boolean(previewEntry(root, rec.skill)),
      thumb: isMissing ? false : fs.existsSync(thumbPath(root)),
    });
  }

  views.sort((a, b) => {
    if (a.missing !== b.missing) return a.missing ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.openedAt.localeCompare(a.openedAt);
  });

  return {
    ok: true,
    app: 'agy-plugin-design',
    buildId: GALLERY_BUILD_ID,
    pluginRoot,
    hostLocale: hostLocale(),
    artifacts: views,
    workspaceName: state.workspaceName || '',
    workspaceRoot,
  };
}

async function openSkillEditor(skillId, rootInput) {
  const meta = SKILL_BY_ID[skillId];
  if (!meta) return { ok: false, error: `unknown skill: ${skillId}` };
  let root = rootInput;
  if (!root) {
    const roots = listArtifactsViews().artifacts.filter((i) => i.skill === skillId && !i.missing);
    if (!roots.length) return { ok: false, error: `no ${skillId} project` };
    root = roots[0].root;
  }
  if (!allowedArtifactRoot(root)) {
    return { ok: false, code: 'PATH_OUTSIDE_WORKSPACE', error: '项目目录不在当前工作区安全边界内' };
  }
  root = resolveRealPath(root);
  if (!hasValidArtifact(skillId, root)) {
    return { ok: false, error: '项目目录或索引文件已不在原路径' };
  }
  // 严禁传硬编码 --port，完整保留 baoyu-design 的 .artifact-server.json 复用与 +99 端口顺延机制。
  const r = await runNode([artifactCli(skillId), 'open', root]);
  if (r.err) return { ok: false, error: `artifact open failed: ${r.stderr || r.err.message}` };
  const m = r.stdout.match(/\{[\s\S]*"url"[\s\S]*\}/);
  if (!m) return { ok: false, error: `no url in artifact output: ${r.stdout.slice(0, 200)}` };
  try {
    const parsed = JSON.parse(m[0]);
    const reused = parsed.reused === true;
    if (!reused) {
      ownedEditorRoots.set(root, skillId);
    }
    recordOpened(skillId, root);
    return { ok: true, url: parsed.url, reused, root };
  } catch {
    return { ok: false, error: 'unparsable artifact output' };
  }
}

async function stopSkillEditor(skillId, root) {
  if (!root || !path.isAbsolute(root)) return { ok: false, error: 'invalid root' };
  const r = await runNode([artifactCli(skillId), 'stop', root]);
  ownedEditorRoots.delete(root);
  return r.err ? { ok: false, error: r.stderr || r.err.message } : { ok: true };
}

async function stopOwnedEditors() {
  const entries = Array.from(ownedEditorRoots.entries());
  ownedEditorRoots.clear();
  for (const [root, skillId] of entries) {
    try {
      await runNode([artifactCli(skillId), 'stop', root]);
    } catch {}
  }
}

async function restartEditor(skillId, root) {
  await stopSkillEditor(skillId, root);
  return await openSkillEditor(skillId, root);
}

async function createExample(templateId, nameInput) {
  const tpl = EXAMPLE_TEMPLATES[templateId];
  if (!tpl) return { ok: false, error: `${templateId} 项目由 agent 创建（无静态示例模板）` };
  const skillId = tpl.skill || templateId;
  const base = readState().workspaceRoot || '';
  if (!base) return { ok: false, code: 'NO_WORKSPACE', error: '当前未检测到已打开的本机工作区，请在 Antigravity 中打开本地项目文件夹后重试。' };
  if (isInstalledPluginPath(base)) {
    return { ok: false, code: 'FORBIDDEN_WORKSPACE_PATH', error: '当前工作区为插件安装目录或受保护路径，请切换到业务项目工作区后再创建设计作品。' };
  }

  // 单工作区默认唯一设计系统约束 (AC-3)
  if (skillId === 'claude-design-system') {
    const existing = scanDesignProjects(base).find((item) => item.skill === 'claude-design-system');
    if (existing) {
      return {
        ok: false,
        code: 'DESIGN_SYSTEM_EXISTS',
        root: existing.root,
        error: `当前工作区已存在统一设计系统「${existing.title}」；如需更换请打开编辑或先删除现有设计系统。`,
      };
    }
  }

  const safe = String(nameInput || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const baseName = safe || tpl.dirName;
  const designDir = path.join(base, '.design');
  let name = baseName, i = 2;
  while (fs.existsSync(path.join(designDir, name))) name = `${baseName}-${i++}`;
  const root = path.join(designDir, name);
  const displayTitle = safe || tpl.title || name;
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  for (const [rel, content] of Object.entries(tpl.files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (content === '__INDEX__') {
      const idx = {
        ...(EXAMPLE_INDEX[templateId] || tpl.index),
        createdOnFiles: { v: 1, at: now },
        title: displayTitle,
        lastChange: { by: 'agy-plugin-design', at: now, via: 'Antigravity plugin', note: 'Built-in template' },
      };
      fs.writeFileSync(p, `${JSON.stringify(idx, null, 2)}\n`);
    } else {
      fs.writeFileSync(p, content, 'utf8');
    }
  }
  recordOpened(skillId, root);
  const chk = await runNode([artifactCli(skillId), 'check', root]);
  let problems = null;
  try { problems = JSON.parse(chk.stdout).problems ?? null; } catch {}
  return { ok: true, root, skill: skillId, problems };
}

function galleryHtml(requestedLang = '', requestedScheme = '') {
  return buildGalleryHtml({
    requestedLang: normalizeGalleryLocale(requestedLang || hostLocale()),
    requestedScheme,
    resolvedHostScheme: hostScheme(),
    skills: SKILLS,
    tints: TINTS,
    recipes: RECIPES,
    examples: OFFICIAL_EXAMPLES,
    templatesMap: TEMPLATES_MAP,
  });
}

function buildStarter(rec, skill) {
  return `${skill.prompt}与「${rec.title}」同款的新作。`
    + `请先查看参考项目 ${rec.root} 的主题、版式与风格，沿用同一套设计语言，仅替换为新内容。`
    + `新内容：`;
}

let promptSeq = 0;
const pendingPromptReplies = new Map();

if (typeof process.on === 'function') {
  process.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'prompt-reply' && pendingPromptReplies.has(msg.reqId)) {
      const entry = pendingPromptReplies.get(msg.reqId);
      pendingPromptReplies.delete(msg.reqId);
      clearTimeout(entry.timer);
      entry.resolve(msg);
    }
  });
}

async function dispatchPromptToHost(starter) {
  const ws = readState().workspaceRoot;
  if (!ws) {
    return { ok: false, fallback: 'clipboard', error: '当前未检测到已打开的本机工作区', starter };
  }
  if (typeof process.send !== 'function') {
    return { ok: false, fallback: 'clipboard', error: '请将提示词粘贴发送给 Antigravity 对话框', starter };
  }
  const reqId = `prompt-${++promptSeq}`;
  const res = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingPromptReplies.delete(reqId);
      resolve({ ok: false, fallback: 'clipboard', error: '已复制提示词草稿，请粘贴发送给 Antigravity 对话框', starter });
    }, 1500);
    pendingPromptReplies.set(reqId, { resolve, timer });
    try {
      process.send({ type: 'prompt-request', reqId, starter, workspaceRoot: ws });
    } catch {
      pendingPromptReplies.delete(reqId);
      clearTimeout(timer);
      resolve({ ok: false, fallback: 'clipboard', error: 'IPC 发送失败', starter });
    }
  });
  return {
    ok: Boolean(res?.ok),
    outcome: res?.outcome || (res?.ok ? 'chat' : ''),
    fallback: res?.ok ? undefined : 'clipboard',
    error: res?.ok ? undefined : (res?.error || '提示词草稿已复制，请直接粘贴发送给 Antigravity 对话框'),
    starter,
  };
}

async function startFromArtifact(input) {
  if (input.skill) {
    const skill = SKILL_BY_ID[String(input.skill)];
    if (!skill) return { ok: false, error: '未知技能' };
    return dispatchPromptToHost(skill.prompt);
  }
  if (input.example) {
    const example = OFFICIAL_EXAMPLES.find((x) => x.id === String(input.example));
    if (!example) return { ok: false, error: '未知官方示例' };
    const starter = `${SKILL_BY_ID[example.skill].prompt}${example.desc}\n参考示例要素：${example.points}。请在当前工作区 .design/ 内创建新项目。`;
    return dispatchPromptToHost(starter);
  }
  if (input.recipe) {
    const r = RECIPES.find((x) => x.id === String(input.recipe));
    if (!r) return { ok: false, error: '未知工作流' };
    return dispatchPromptToHost(r.template);
  }
  const root = String(input.root || '');
  const rec = findArtifact(root);
  if (!rec) return { ok: false, error: '未找到该作品的记录' };
  const skill = SKILL_BY_ID[rec.skill];
  if (!skill) return { ok: false, error: `未知技能: ${rec.skill}` };
  return dispatchPromptToHost(buildStarter(rec, skill));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  res.setHeader('content-type', url.pathname === '/' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8');
  const allowedGet = ['/', '/api/health', '/api/list', '/api/preview', '/api/thumb'];
  const allowedPost = ['/api/open', '/api/open-url', '/api/update', '/api/delete', '/api/restore', '/api/create', '/api/rename', '/api/stop', '/api/restart', '/api/restart-editor', '/api/shutdown', '/api/start', '/api/register', '/api/forget'];
  if (!((req.method === 'GET' && allowedGet.includes(url.pathname)) || (req.method === 'POST' && allowedPost.includes(url.pathname)))) {
    res.statusCode = 404; return res.end('{}');
  }
  if (req.method === 'POST') {
    const g = guardPost(req);
    if (g) { res.statusCode = g; return res.end('{}'); }
  }
  const finish = (v) => res.end(JSON.stringify(v));

  if (req.method === 'GET') {
    if (url.pathname === '/') return res.end(galleryHtml(url.searchParams.get('lang'), url.searchParams.get('scheme')));
    if (url.pathname === '/api/health') {
      const addr = server.address();
      const activePort = (addr && typeof addr === 'object' && addr.port) ? addr.port : PORT;
      const st = readState();
      return finish({
        ok: true,
        app: 'agy-plugin-design',
        buildId: GALLERY_BUILD_ID,
        pid: process.pid,
        port: activePort,
        workspaceRoot: st.workspaceRoot || '',
        workspaceName: st.workspaceName || '',
      });
    }
    if (url.pathname === '/api/list') return finish(listArtifactsViews());
    const skill = url.searchParams.get('skill') || '';
    const root = url.searchParams.get('root') || '';
    if (url.pathname === '/api/preview' || url.pathname === '/api/thumb') {
      const allowed = allowedArtifactRoot(root);
      const isThumb = url.pathname === '/api/thumb';
      const file = allowed ? (isThumb ? thumbPath(root) : previewEntry(root, skill)) : null;
      if (!file) { res.statusCode = 404; return res.end(); }
      try {
        const content = isThumb ? fs.readFileSync(file) : renderPreviewDocument(file, skill);
        res.setHeader('content-type', isThumb ? 'image/png' : 'text/html; charset=utf-8');
        return res.end(content);
      } catch { res.statusCode = 404; return res.end(); }
    }
    return finish({ ok: false, error: 'unknown GET route' });
  }

  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    req.resume();
    res.statusCode = 413; return res.end('{}');
  }
  let body = '';
  let tooLarge = false;
  req.on('data', (c) => {
    if (tooLarge) return;
    body += c;
    if (body.length > MAX_BODY_BYTES) tooLarge = true;
  });
  req.on('end', async () => {
    if (tooLarge) { res.statusCode = 413; return res.end('{}'); }
    let input = {};
    try {
      const parsed = JSON.parse(body || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) input = parsed;
    } catch {}
    const skill = input.skill || '', root = input.root || '';

    if (url.pathname === '/api/register') {
      const result = registerArtifact(input);
      if (!result.ok) res.statusCode = 400;
      return finish(result);
    }
    if (url.pathname === '/api/open-url') {
      const r = await openSkillEditor(skill, root);
      if (!r.ok) { res.statusCode = 400; return finish(r); }
      res.statusCode = 302; res.setHeader('location', r.url); return res.end();
    }
    if (url.pathname === '/api/open') {
      const r = await openSkillEditor(skill, root);
      if (!r.ok) res.statusCode = 400;
      return finish(r);
    }
    if (url.pathname === '/api/start') return finish(await startFromArtifact(input));
    if (url.pathname === '/api/forget') {
      if (input.allMissing === true) return finish(forgetMissingArtifacts());
      return finish(forgetArtifact(input.root));
    }
    if (url.pathname === '/api/update') {
      const rec = findArtifact(root);
      if (!rec) return finish({ ok: false, error: 'not recorded' });
      if (typeof input.pinned === 'boolean') rec.pinned = input.pinned;
      let latestRec = rec;
      if (input.title) {
        const clean = cleanTitle(input.title);
        if (clean) {
          const renamed = await renameArtifact(rec.skill, root, clean);
          if (renamed?.record) latestRec = { ...renamed.record, pinned: rec.pinned };
        }
      }
      writeRecord(latestRec);
      return finish({ ok: true, record: latestRec, root: latestRec.root });
    }
    if (url.pathname === '/api/delete') {
      const rec = findArtifact(root);
      if (!rec) return finish({ ok: false, error: 'not recorded' });
      if (!allowedArtifactRoot(root)) {
        res.statusCode = 403;
        return finish({ ok: false, error: 'PATH_OUTSIDE_WORKSPACE' });
      }
      try {
        await stopSkillEditor(rec.skill, root);
        const out = trashArtifact(rec);
        return finish({ ok: true, ...out });
      } catch (e) {
        return finish({ ok: false, error: e.message });
      }
    }
    if (url.pathname === '/api/restore') {
      try {
        const rec = restoreArtifact(input.id || '');
        return finish({ ok: true, record: rec });
      } catch (e) {
        return finish({ ok: false, error: e.message });
      }
    }
    if (url.pathname === '/api/create') return finish(await createExample(skill, input.name));
    if (url.pathname === '/api/rename') {
      const clean = cleanTitle(input.name || input.title);
      if (!clean) return finish({ ok: false, error: 'invalid title' });
      try {
        const renamed = await renameArtifact(skill, root, clean);
        return finish({ ok: true, ...renamed });
      } catch (e) {
        res.statusCode = 400;
        return finish({ ok: false, error: e.message });
      }
    }
    if (url.pathname === '/api/stop') return finish(await stopSkillEditor(skill, root));
    if (url.pathname === '/api/restart-editor') return finish(await restartEditor(skill, root));
    if (url.pathname === '/api/shutdown') {
      await stopOwnedEditors();
      finish({ ok: true, shuttingDown: true });
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 250).unref?.();
      return;
    }
    if (url.pathname === '/api/restart') {
      await stopOwnedEditors();
      finish({ ok: true, restarting: true });
      server.close(() => {
        try {
          const child = execFile(process.execPath, [__filename], {
            detached: true,
            stdio: 'ignore',
            env: process.env,
          });
          child.unref();
        } catch {}
        setTimeout(() => process.exit(0), 250);
      });
      return;
    }
  });
});

export {
  listArtifactsViews,
  openSkillEditor,
  stopSkillEditor,
  stopOwnedEditors,
  trashArtifact,
  restoreArtifact,
  renameArtifact,
  createExample,
  galleryHtml,
  findArtifact,
  writeRecord,
  forgetArtifact,
  forgetMissingArtifacts,
  hasValidArtifact,
  previewEntry,
  allowedArtifactRoot,
  ownedEditorRoots,
  server,
};

function isDirectEntry() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename);
  } catch {
    return path.resolve(process.argv[1]) === path.resolve(__filename);
  }
}

if (isDirectEntry()) {
  const shutdownGracefully = async () => {
    await stopOwnedEditors();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 250).unref?.();
  };
  process.on('SIGTERM', () => void shutdownGracefully());
  process.on('SIGINT', () => void shutdownGracefully());
  server.on('error', (e) => console.error('gallery server error:', e.message));
  server.listen(PORT, '127.0.0.1', () => console.log(`gallery listening on ${PORT}`));
}
