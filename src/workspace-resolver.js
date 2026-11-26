'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const url = require('node:url');

const IS_CASE_INSENSITIVE_FS = process.platform === 'darwin' || process.platform === 'win32';
const PERCENT_ENCODED_RE = /%[0-9A-Fa-f]{2}/;
const WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;
const REMOTE_URI_RE = /^(?:(?:vscode-remote|ssh-remote|dev-container|attached-container|vsonline|codespaces|tunnel|remote):|wsl\+)/i;
const GENERIC_SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//;
const WSL_UNC_RE = /^\\\\wsl(?:\$|\.localhost)\\/i;

const GENERIC_HINT_TOKENS = new Set([
  'antigravity',
  'agent manager',
  'inbox',
  'settings',
  'playground',
  'design',
  'agy design studio',
  'new chat',
  'untitled'
]);

function isTestMode() {
  return process.env.AGY_DADDY_TEST_MODE === '1'
    || process.env.NODE_ENV === 'test'
    || Boolean(process.env.NODE_TEST_CONTEXT)
    || (Array.isArray(process.execArgv) && process.execArgv.includes('--test'));
}

function resolveRealPath(targetPath, realpathFn) {
  if (typeof realpathFn === 'function') {
    return realpathFn(targetPath);
  }
  if (typeof fs.realpathSync?.native === 'function') {
    try {
      return fs.realpathSync.native(targetPath);
    } catch {
      return fs.realpathSync(targetPath);
    }
  }
  return fs.realpathSync(targetPath);
}

function safeRealPath(targetPath, realpathFn) {
  try {
    return resolveRealPath(targetPath, realpathFn);
  } catch {
    return '';
  }
}

function getAgyStateDir(options = {}) {
  if (options.stateDir) return path.resolve(options.stateDir);
  if (process.env.AGY_DADDY_STATE_DIR) return path.resolve(process.env.AGY_DADDY_STATE_DIR);
  if (isTestMode()) {
    return path.join(os.tmpdir(), `agy-daddy-test-state-${process.pid}`);
  }
  const home = options.homeDir || os.homedir();
  const platform = options.platform || process.platform;
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'AgyDaddy');
  }
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'AgyDaddy');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'agy-daddy');
}

function getAgyPluginsDir(options = {}) {
  if (options.pluginsDir) return path.resolve(options.pluginsDir);
  if (process.env.AGY_DADDY_PLUGINS_DIR) return path.resolve(process.env.AGY_DADDY_PLUGINS_DIR);
  if (isTestMode()) {
    return path.join(getAgyStateDir(options), 'plugins');
  }
  const home = options.homeDir || os.homedir();
  const platform = options.platform || process.platform;
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'AgyDaddy', 'plugins');
  }
  return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'agy-daddy', 'plugins');
}

function isSameOrInside(targetPath, baseDir) {
  const norm = (val) => {
    let s = String(val || '').replace(/\\/g, '/');
    if (s.length > 1 && !/^[A-Za-z]:\/$/.test(s)) {
      s = s.replace(/\/+$/, '');
    }
    return IS_CASE_INSENSITIVE_FS ? s.toLowerCase() : s;
  };
  const t = norm(targetPath);
  const b = norm(baseDir);
  if (!t || !b) return false;
  if (b === '/') return t === '/';
  return t === b || t.startsWith(b.endsWith('/') ? b : `${b}/`);
}

function isRemoteWorkspaceUri(raw) {
  if (typeof raw !== 'string') return false;
  const s = raw.trim();
  if (!s) return false;
  if (REMOTE_URI_RE.test(s) || WSL_UNC_RE.test(s)) return true;
  const m = s.match(GENERIC_SCHEME_RE);
  if (m && m[1].toLowerCase() !== 'file') return true;
  return false;
}

function normalizeWorkspaceUri(raw, options = {}) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  if (!s || s.includes('\0')) return '';
  if (isRemoteWorkspaceUri(s)) return '';

  const existsFn = typeof options.existsSync === 'function' ? options.existsSync : fs.existsSync;

  let fromFileUrl = false;
  if (/^file:\/\//i.test(s)) {
    fromFileUrl = true;
    try {
      s = url.fileURLToPath(s);
    } catch {
      s = s.replace(/^file:\/\//i, '');
      if (/^localhost\//i.test(s)) s = s.slice('localhost'.length);
      if (PERCENT_ENCODED_RE.test(s)) {
        try { s = decodeURIComponent(s); } catch {}
      }
    }
  }

  if (!fromFileUrl && PERCENT_ENCODED_RE.test(s)) {
    try {
      if (!existsFn(s)) {
        const decoded = decodeURIComponent(s);
        if (decoded && !decoded.includes('\0')) s = decoded;
      }
    } catch {}
  }

  const home = options.homeDir || os.homedir();
  if (s === '~') s = home;
  else if (s.startsWith('~/') || s.startsWith('~\\')) s = path.join(home, s.slice(2));

  if (!s || s.includes('\0')) return '';
  if (WINDOWS_DRIVE_RE.test(s) && (options.platform || process.platform) !== 'win32') {
    const slashed = s.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    return slashed.length > 3 ? slashed.replace(/\/+$/, '') : slashed;
  }
  return path.resolve(s);
}

function isForbiddenWorkspacePath(targetPath, options = {}) {
  if (typeof targetPath !== 'string' || !targetPath.trim() || targetPath.includes('\0')) {
    return true;
  }
  const trimmed = targetPath.trim();
  const winSlashed = trimmed.replace(/\\/g, '/');
  if (winSlashed === '/' || /^[A-Za-z]:\/?$/.test(winSlashed)) return true;
  if (/^c:\/windows(?:\/|$)/i.test(winSlashed)) return true;

  const resolved = path.resolve(trimmed);
  const real = safeRealPath(resolved, options.realpathSync) || resolved;
  const candidates = real === resolved ? [resolved] : [resolved, real];

  const home = options.homeDir || os.homedir();
  const realHome = safeRealPath(home, options.realpathSync) || home;
  const exactForbidden = new Set([
    '/',
    path.resolve(home),
    path.resolve(realHome),
    '/Applications',
    '/var',
    '/private/var'
  ].map((p) => (IS_CASE_INSENSITIVE_FS ? p.toLowerCase() : p)));

  const prefixForbidden = [
    '/System',
    '/etc',
    '/private/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var/root',
    '/private/var/root',
    path.join(home, '.ssh'),
    path.join(home, '.aws'),
    path.join(home, '.gnupg'),
    options.pluginRoot ? path.resolve(options.pluginRoot) : '',
    getAgyPluginsDir(options),
    getAgyStateDir(options)
  ].filter(Boolean);

  const expandedPrefixes = [];
  for (const p of prefixForbidden) {
    expandedPrefixes.push(p);
    const rp = safeRealPath(p, options.realpathSync);
    if (rp && rp !== p) expandedPrefixes.push(rp);
  }

  for (const cand of candidates) {
    const key = IS_CASE_INSENSITIVE_FS ? cand.toLowerCase() : cand;
    if (exactForbidden.has(key)) return true;
    const candSlashed = cand.replace(/\\/g, '/');
    if (candSlashed === '/' || /^[A-Za-z]:\/?$/.test(candSlashed)) return true;
    if (/^c:\/windows(?:\/|$)/i.test(candSlashed)) return true;
    for (const prefix of expandedPrefixes) {
      if (isSameOrInside(cand, prefix)) return true;
    }
  }
  return false;
}

function validateWorkspacePath(rawInput, options = {}) {
  const raw = String(rawInput || '').trim();
  if (!raw) {
    return {
      ok: false,
      reason: 'NO_WORKSPACE',
      workspaceRoot: '',
      workspaceName: '',
      message: '当前未检测到已打开的本机工作区，请在 Antigravity 中打开本地项目文件夹后重试。'
    };
  }

  if (isRemoteWorkspaceUri(raw)) {
    return {
      ok: false,
      reason: 'REMOTE_OR_UNMOUNTED',
      path: raw,
      workspaceRoot: '',
      workspaceName: '',
      message: `工作区路径在本机不可见（远程工作区或未挂载）：${raw}。设计工作台当前仅支持本机工作区。`
    };
  }

  const normalized = normalizeWorkspaceUri(raw, options);
  if (!normalized) {
    return {
      ok: false,
      reason: 'REMOTE_OR_UNMOUNTED',
      path: raw,
      workspaceRoot: '',
      workspaceName: '',
      message: `工作区路径在本机不可见（远程工作区或未挂载）：${raw}。设计工作台当前仅支持本机工作区。`
    };
  }

  const existsFn = typeof options.existsSync === 'function' ? options.existsSync : fs.existsSync;
  const statFn = typeof options.statSync === 'function' ? options.statSync : fs.statSync;
  let isDir = false;
  try {
    isDir = Boolean(existsFn(normalized) && statFn(normalized).isDirectory());
  } catch {
    isDir = false;
  }

  if (!isDir) {
    return {
      ok: false,
      reason: 'REMOTE_OR_UNMOUNTED',
      path: normalized,
      workspaceRoot: '',
      workspaceName: '',
      message: `工作区路径在本机不可见（远程工作区或未挂载）：${normalized}。设计工作台当前仅支持本机工作区。`
    };
  }

  const realRoot = safeRealPath(normalized, options.realpathSync) || normalized;
  if (isForbiddenWorkspacePath(realRoot, options)) {
    return {
      ok: false,
      reason: 'FORBIDDEN_WORKSPACE_PATH',
      path: realRoot,
      workspaceRoot: '',
      workspaceName: '',
      message: `当前工作区为插件安装目录或受保护系统路径（${realRoot}），请切换到业务项目工作区后再创建设计作品。`
    };
  }

  return {
    ok: true,
    reason: '',
    workspaceRoot: realRoot,
    workspaceName: path.basename(realRoot) || realRoot
  };
}

function extractRawWorkspaceCandidates(traj) {
  const rawList = [];
  const push = (v) => {
    if (typeof v === 'string' && v.trim() && !rawList.includes(v.trim())) {
      rawList.push(v.trim());
    }
  };
  if (!traj || typeof traj !== 'object') return rawList;

  const collections = [
    traj.workspaces,
    traj.metadata?.workspaces,
    traj.trajectory?.workspaces
  ];
  for (const col of collections) {
    if (!Array.isArray(col)) continue;
    for (const item of col) {
      if (typeof item === 'string') {
        push(item);
      } else if (item && typeof item === 'object') {
        push(item.workspaceFolderAbsoluteUri);
        push(item.workspacePath);
        push(item.rootUri);
        push(item.uri);
        push(item.path);
        if (Array.isArray(item.workspaceUris)) {
          for (const u of item.workspaceUris) push(u);
        }
      }
    }
  }
  if (Array.isArray(traj.workspaceUris)) {
    for (const u of traj.workspaceUris) push(u);
  }
  push(traj.workspaceFolderAbsoluteUri);
  push(traj.workspacePath);
  push(traj.cwd);
  return rawList;
}

function getTrajectoryTimestamps(summary) {
  const parseTs = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = Date.parse(v);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };
  return {
    viewTs: parseTs(summary?.lastUserViewTime || summary?.lastAccessedTime || summary?.updatedAt),
    modTs: parseTs(summary?.lastModifiedTime || summary?.createdAt)
  };
}

function evaluateCandidateList(rawCandidates, options = {}, source = 'rpc') {
  let firstError = null;
  const nameHints = new Set(
    (options.workspaceNameHints || []).map((n) => String(n || '').trim().toLowerCase()).filter(Boolean)
  );
  const validResults = [];
  for (const raw of rawCandidates) {
    const check = validateWorkspacePath(raw, options);
    if (check.ok) {
      validResults.push({ ...check, source });
    } else if (!firstError) {
      firstError = { ...check, source };
    }
  }
  if (validResults.length > 0) {
    if (nameHints.size > 0) {
      const hinted = validResults.find((r) => nameHints.has(path.basename(r.workspaceRoot).toLowerCase()));
      if (hinted) return hinted;
    }
    return validResults[0];
  }
  return firstError;
}

function extractTitleCandidates(hints = {}) {
  const out = [];
  const push = (s) => {
    const t = String(s || '').trim();
    if (t && t.length >= 2 && !GENERIC_HINT_TOKENS.has(t.toLowerCase()) && !out.includes(t)) {
      out.push(t);
    }
  };
  if (hints.activeConversationTitle) push(hints.activeConversationTitle);
  if (Array.isArray(hints.titlebarTexts)) {
    for (const t of hints.titlebarTexts) push(t);
  }
  if (typeof hints.pageTitle === 'string') {
    for (const seg of hints.pageTitle.split(/\s+[—–\-|·]\s+|\s+-\s+/)) {
      push(seg);
    }
  }
  return out;
}

function resolveWorkspaceFromSummaries(summaries, options = {}) {
  const hints = options.workspaceHints && typeof options.workspaceHints === 'object'
    ? options.workspaceHints
    : {};
  const evalOpts = {
    ...options,
    workspaceNameHints: [
      ...(Array.isArray(hints.workspaceNameHints) ? hints.workspaceNameHints : []),
      ...(Array.isArray(hints.titlebarTexts) ? hints.titlebarTexts : [])
    ]
  };

  const cascadeId = typeof options.cascadeId === 'string' ? options.cascadeId.trim() : '';
  const contextCascadeId = typeof options.contextCascadeId === 'string' ? options.contextCascadeId.trim() : '';

  // L1: Exact active cascadeId match
  if (cascadeId && summaries && summaries[cascadeId]) {
    const rawCands = extractRawWorkspaceCandidates(summaries[cascadeId]);
    if (rawCands.length > 0) {
      const res = evaluateCandidateList(rawCands, evalOpts, 'L1-rpc-cascade');
      if (res) return { ...res, matchedCascadeId: cascadeId };
    }
  }

  // L2: Explicit DOM paths ([data-workspace-path], [data-workspace-uri], [data-project-path], [data-cwd])
  if (Array.isArray(hints.domPaths) && hints.domPaths.length > 0) {
    const res = evaluateCandidateList(hints.domPaths, evalOpts, 'L2-dom-path');
    if (res) return { ...res, matchedCascadeId: cascadeId || null };
  }

  if (!summaries || typeof summaries !== 'object') {
    return null;
  }

  const entries = Object.entries(summaries)
    .map(([id, summary]) => ({
      id,
      summary: summary || {},
      rawCandidates: extractRawWorkspaceCandidates(summary),
      ...getTrajectoryTimestamps(summary)
    }))
    .filter((item) => item.rawCandidates.length > 0);

  if (entries.length === 0) return null;

  const sortByRecency = (a, b) => (b.viewTs - a.viewTs) || (b.modTs - a.modTs);

  // L3a: Active conversation title / titlebar text cross-match against trajectory title/summary
  const titleCandidates = extractTitleCandidates(hints);
  if (titleCandidates.length > 0) {
    const scored = [];
    for (const item of entries) {
      const rpcTitles = [item.summary?.annotations?.title, item.summary?.summary, item.summary?.title]
        .map((t) => String(t || '').trim())
        .filter(Boolean);
      let bestScore = 0;
      for (const dt of titleCandidates) {
        const dl = dt.toLowerCase();
        for (const rt of rpcTitles) {
          const rl = rt.toLowerCase();
          if (dl === rl) bestScore = Math.max(bestScore, 2);
          else if (dl.length >= 4 && rl.length >= 4 && (dl.includes(rl) || rl.includes(dl))) {
            bestScore = Math.max(bestScore, 1);
          }
        }
      }
      if (bestScore > 0) scored.push({ item, score: bestScore });
    }
    if (scored.length > 0) {
      scored.sort((a, b) => (b.score - a.score) || sortByRecency(a.item, b.item));
      const best = scored[0].item;
      const res = evaluateCandidateList(best.rawCandidates, evalOpts, 'L3-dom-title');
      if (res) return { ...res, matchedCascadeId: best.id };
    }
  }

  // L3b: Titlebar / workspaceNameHints basename match
  const lowerNames = new Set(evalOpts.workspaceNameHints.map((n) => String(n || '').trim().toLowerCase()).filter(Boolean));
  if (lowerNames.size > 0) {
    const matched = entries.filter((item) =>
      item.rawCandidates.some((raw) => {
        const base = path.basename(String(raw).replace(/\/+$/, '')).toLowerCase();
        return base && lowerNames.has(base);
      })
    );
    if (matched.length > 0) {
      matched.sort(sortByRecency);
      const best = matched[0];
      const res = evaluateCandidateList(best.rawCandidates, evalOpts, 'L3-workspace-name');
      if (res) return { ...res, matchedCascadeId: best.id };
    }
  }

  // L4a: contextCascadeId fallback
  if (contextCascadeId && summaries[contextCascadeId]) {
    const rawCands = extractRawWorkspaceCandidates(summaries[contextCascadeId]);
    if (rawCands.length > 0) {
      const res = evaluateCandidateList(rawCands, evalOpts, 'L4-context-cascade');
      if (res) return { ...res, matchedCascadeId: contextCascadeId };
    }
  }

  // L4b: Single unambiguous active workspace across all trajectories
  const uniqueRaw = [];
  for (const item of entries) {
    for (const raw of item.rawCandidates) {
      if (!uniqueRaw.includes(raw)) uniqueRaw.push(raw);
    }
  }
  const uniqueKeys = new Set(uniqueRaw.map((r) => {
    const norm = normalizeWorkspaceUri(r, options);
    return (norm || r).toLowerCase();
  }));
  if (uniqueKeys.size === 1) {
    const res = evaluateCandidateList(uniqueRaw, evalOpts, 'L4-single-active');
    if (res) return { ...res, matchedCascadeId: entries[0].id };
  }

  return null;
}

async function resolveWorkspace(opts = {}) {
  const hints = opts.workspaceHints && typeof opts.workspaceHints === 'object'
    ? opts.workspaceHints
    : {};

  // Explicit workspace override (only when caller explicitly passes cwd)
  if (typeof opts.cwd === 'string' && opts.cwd.trim()) {
    return {
      ...validateWorkspacePath(opts.cwd, opts),
      source: 'explicit',
      matchedCascadeId: opts.cascadeId || null
    };
  }

  let summaries = opts.trajectorySummaries && typeof opts.trajectorySummaries === 'object'
    ? opts.trajectorySummaries
    : null;

  if (!summaries && opts.rpc && typeof opts.rpc.call === 'function') {
    try {
      const allResp = await opts.rpc.call('GetAllCascadeTrajectories', {
        metadata: { ideName: 'antigravity', extensionName: 'antigravity' }
      });
      summaries = allResp?.trajectorySummaries || {};
    } catch {
      summaries = {};
    }
  }

  const fromSummaries = resolveWorkspaceFromSummaries(summaries, opts);
  if (fromSummaries) return fromSummaries;

  // Fallback L1/L4 single trajectory RPC query if summaries didn't include the target cascadeId
  const targetCascadeId = String(opts.cascadeId || opts.contextCascadeId || '').trim();
  if (targetCascadeId && opts.rpc && typeof opts.rpc.call === 'function') {
    try {
      const trajResp = await opts.rpc.call('GetCascadeTrajectory', { cascadeId: targetCascadeId });
      const rawCands = extractRawWorkspaceCandidates(trajResp);
      if (rawCands.length > 0) {
        const res = evaluateCandidateList(rawCands, {
          ...opts,
          workspaceNameHints: hints.workspaceNameHints
        }, 'L1-rpc-trajectory');
        if (res) return { ...res, matchedCascadeId: targetCascadeId };
      }
    } catch {}
  }

  return {
    ok: false,
    reason: 'NO_WORKSPACE',
    workspaceRoot: '',
    workspaceName: '',
    source: 'none',
    matchedCascadeId: null,
    message: '当前未检测到已打开的本机工作区，请在 Antigravity 中打开本地项目文件夹后重试。'
  };
}

module.exports = {
  isTestMode,
  resolveRealPath,
  getAgyStateDir,
  getAgyPluginsDir,
  isRemoteWorkspaceUri,
  normalizeWorkspaceUri,
  isForbiddenWorkspacePath,
  validateWorkspacePath,
  extractRawWorkspaceCandidates,
  resolveWorkspaceFromSummaries,
  resolveWorkspace
};
