'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const {
  resolveWorkspace,
  getAgyStateDir,
  isTestMode
} = require('./workspace-resolver');

const PLUGIN_ID = 'hubo1989.design';
const APP_MARKER = 'agy-plugin-design';
const DEFAULT_PORT = 3481;
const STARTUP_TIMEOUT_MS = 8000;
const HEALTH_POLL_INTERVAL_MS = 200;

const DEFAULT_SETTINGS = Object.freeze({
  showTopbarButton: true,
  openMode: 'embedded',
  shortcut: 'Mod+Alt+P',
  port: DEFAULT_PORT,
  prewarmOnStartup: true
});

let activeRuntime = null;

function normalizeSettings(raw = {}) {
  const openMode = ['embedded', 'browser', 'popover'].includes(raw.openMode)
    ? raw.openMode
    : DEFAULT_SETTINGS.openMode;
  const rawPort = Number(raw.port);
  const port = Number.isInteger(rawPort) && rawPort >= 1024 && rawPort <= 65535
    ? rawPort
    : DEFAULT_SETTINGS.port;
  return {
    showTopbarButton: raw.showTopbarButton !== false,
    openMode,
    shortcut: typeof raw.shortcut === 'string' ? raw.shortcut : DEFAULT_SETTINGS.shortcut,
    port,
    prewarmOnStartup: raw.prewarmOnStartup !== false
  };
}

function computeGalleryBuildId(pluginRoot) {
  const hash = crypto.createHash('sha256');
  hash.update(String(pluginRoot));
  for (const rel of ['src/gallery-server.mjs', 'src/gallery-ui.mjs', 'src/builtin-library.mjs', 'src/skills-meta.mjs']) {
    try {
      hash.update(fs.readFileSync(path.join(pluginRoot, rel)));
    } catch {}
  }
  return hash.digest('hex').slice(0, 16);
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
}

function readJsonSafe(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || fallback;
  } catch {
    return fallback;
  }
}

function httpRequestJson(port, method, reqPath, bodyObj = null, timeoutMs = 800) {
  return new Promise((resolve) => {
    const payload = bodyObj !== null ? JSON.stringify(bodyObj) : null;
    const headers = payload !== null
      ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Origin: `http://127.0.0.1:${port}`,
          Host: `127.0.0.1:${port}`
        }
      : { Host: `127.0.0.1:${port}` };

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers,
      timeout: timeoutMs
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({ ok: true, statusCode: res.statusCode || 0, json, raw });
      });
    });

    req.on('timeout', () => {
      try { req.destroy(); } catch {}
      resolve({ ok: false, code: 'TIMEOUT', error: 'Request timed out' });
    });
    req.on('error', (err) => {
      resolve({ ok: false, code: err?.code || 'ERR_HTTP', error: err?.message || String(err) });
    });
    if (payload !== null) req.write(payload);
    req.end();
  });
}

async function probeGalleryHealth(port, timeoutMs = 600) {
  const res = await httpRequestJson(port, 'GET', '/api/health', null, timeoutMs);
  if (!res.ok) {
    return { alive: false, mine: false, code: res.code };
  }
  if (res.statusCode === 200 && res.json && res.json.app === APP_MARKER) {
    return {
      alive: true,
      mine: true,
      buildId: res.json.buildId || '',
      pid: res.json.pid || null,
      port: res.json.port || port,
      workspaceRoot: res.json.workspaceRoot || ''
    };
  }
  return {
    alive: true,
    mine: false,
    statusCode: res.statusCode,
    raw: (res.raw || '').slice(0, 120)
  };
}

function defaultOpenExternalUrl(targetUrl) {
  try {
    const parsed = new URL(String(targetUrl || ''));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'Unsupported URL protocol' };
    }
    const spec = process.platform === 'darwin'
      ? { bin: 'open', args: [parsed.href] }
      : (process.platform === 'win32'
        ? { bin: 'cmd', args: ['/c', 'start', '', parsed.href], windowsHide: true }
        : { bin: 'xdg-open', args: [parsed.href] });
    const child = spawn(spec.bin, spec.args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: Boolean(spec.windowsHide)
    });
    child.unref();
    return { ok: true, url: parsed.href };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function activate(host, options = {}) {
  if (activeRuntime) {
    await deactivate();
  }

  const pluginRoot = path.resolve(__dirname, '..');
  const galleryServerPath = path.join(pluginRoot, 'src', 'gallery-server.mjs');
  const expectedBuildId = computeGalleryBuildId(pluginRoot);

  const pluginDataDir = host?.storage?.dir
    ? path.resolve(host.storage.dir)
    : path.join(getAgyStateDir(), 'plugins-data', PLUGIN_ID);

  const resolveDesignHome = () => {
    const envHome = process.env.AGY_DESIGN_HOME?.trim();
    return envHome ? path.resolve(envHome) : path.join(pluginDataDir, 'baoyu-design');
  };
  const resolveStateFile = () => {
    const envState = process.env.AGY_DESIGN_STATE_FILE?.trim();
    return envState ? path.resolve(envState) : path.join(pluginDataDir, 'runtime-state.json');
  };

  let settings = normalizeSettings(host?.settings?.get?.() || {});
  let currentHostScheme = '';
  let lastWorkspace = { workspaceRoot: '', workspaceName: '' };
  let galleryChild = null;
  let galleryChildPort = null;
  let ensurePromise = null;
  let prewarmTimer = null;
  let disposed = false;
  const disposers = [];

  function syncRuntimeStateFile(patch = {}) {
    const stateFile = resolveStateFile();
    const prev = readJsonSafe(stateFile, {});
    const next = {
      ...prev,
      ...patch,
      updatedAt: Date.now()
    };
    writeJsonAtomic(stateFile, next);
    return next;
  }

  // Subscribe to host theme state for Zero-FOUC first-paint scheme sync
  if (host?.state && typeof host.state.subscribe === 'function') {
    try {
      const stopThemeSub = await host.state.subscribe('state:host.theme@1', (val) => {
        const mode = val?.effectiveMode === 'dark' || val?.effectiveMode === 'light'
          ? val.effectiveMode
          : '';
        if (mode && mode !== currentHostScheme) {
          currentHostScheme = mode;
          try { syncRuntimeStateFile({ hostScheme: mode }); } catch {}
        }
      });
      if (typeof stopThemeSub === 'function') disposers.push(stopThemeSub);
    } catch {}
  }

  function killManagedChild() {
    const child = galleryChild;
    galleryChild = null;
    galleryChildPort = null;
    if (!child) return;
    const pid = child.pid;
    if (pid && isPidAlive(pid)) {
      try { child.kill('SIGTERM'); } catch {}
    }
  }

  async function stopManagedGallery(portOverride = null) {
    const targetPort = portOverride || galleryChildPort || settings.port;
    const child = galleryChild;
    const childPid = child?.pid || null;

    const health = await probeGalleryHealth(targetPort, 400);
    if (health.alive && health.mine) {
      await httpRequestJson(targetPort, 'POST', '/api/shutdown', {}, 1200);
      const deadline = Date.now() + 300;
      while (Date.now() < deadline) {
        if (!childPid || !isPidAlive(childPid)) break;
        await sleep(50);
      }
    }

    if (child && childPid && isPidAlive(childPid)) {
      try { child.kill('SIGTERM'); } catch {}
    }
    galleryChild = null;
    galleryChildPort = null;
  }

  async function ensureGalleryRunning(opts = {}) {
    if (disposed) {
      return { ok: false, code: 'PLUGIN_DISPOSED', error: '插件已停用' };
    }
    if (ensurePromise) return ensurePromise;

    ensurePromise = (async () => {
      const targetPort = Number(opts.port || settings.port) || DEFAULT_PORT;
      const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : STARTUP_TIMEOUT_MS;
      const startAt = Date.now();

      // 1. Probe existing listener on targetPort
      const existing = await probeGalleryHealth(targetPort, 500);
      if (existing.alive) {
        if (existing.mine) {
          if (!opts.forceRestart && existing.buildId === expectedBuildId) {
            return {
              ok: true,
              port: targetPort,
              url: `http://127.0.0.1:${targetPort}`,
              buildId: existing.buildId,
              warm: true
            };
          }
          // Hot-upgrade stale agy-plugin-design instance
          await httpRequestJson(targetPort, 'POST', '/api/shutdown', {}, 1200);
          await sleep(150);
        } else {
          // Port is occupied by a third-party process (e.g. Orca or user app). Never force-kill it!
          return {
            ok: false,
            code: 'PORT_OCCUPIED_BY_OTHER',
            port: targetPort,
            error: `设计工作台端口 ${targetPort} 已被其他程序占用，请在插件设置中修改端口后重试。`
          };
        }
      }

      // 2. Spawn controlled gallery-server.mjs child process
      const serverEntry = options.galleryServerPath || galleryServerPath;
      const env = {
        ...process.env,
        AGY_DESIGN_PORT: String(targetPort),
        AGY_DESIGN_HOME: resolveDesignHome(),
        AGY_DESIGN_STATE_FILE: resolveStateFile(),
        ...(currentHostScheme ? { AGY_HOST_SCHEME: currentHostScheme } : {})
      };

      let spawnErr = null;
      let exitedEarly = false;
      let exitInfo = '';
      let stderrBuf = '';

      const child = spawn(process.execPath, [serverEntry], {
        cwd: pluginRoot,
        env,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        windowsHide: true
      });
      galleryChild = child;
      galleryChildPort = targetPort;

      child.stderr?.on('data', (chunk) => {
        if (stderrBuf.length < 2048) stderrBuf += String(chunk);
      });
      child.on('error', (err) => {
        spawnErr = err;
      });
      child.on('exit', (code, signal) => {
        exitedEarly = true;
        exitInfo = `code=${code}, signal=${signal}`;
        if (galleryChild === child) {
          galleryChild = null;
          galleryChildPort = null;
        }
      });
      child.on('message', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'prompt-request' && msg.starter) {
          try {
            host?.events?.emit?.('design:prompt-request@1', {
              reqId: msg.reqId,
              starter: msg.starter,
              workspaceRoot: msg.workspaceRoot || ''
            });
          } catch {}
          try {
            child.send({
              type: 'prompt-reply',
              reqId: msg.reqId,
              ok: false,
              fallback: 'clipboard',
              error: '提示词草稿已复制，请直接粘贴发送给 Antigravity 对话框'
            });
          } catch {}
        }
      });

      // 3. Poll /api/health until ready or 8.0s hard timeout
      while (Date.now() - startAt < timeoutMs) {
        if (disposed) {
          killManagedChild();
          return { ok: false, code: 'PLUGIN_DISPOSED', error: '插件已停用' };
        }
        if (spawnErr) {
          killManagedChild();
          return {
            ok: false,
            code: 'SPAWN_FAILED',
            port: targetPort,
            error: `设计工作台本地服务启动失败：${spawnErr.message}`
          };
        }
        if (exitedEarly) {
          if (/EADDRINUSE/i.test(stderrBuf)) {
            return {
              ok: false,
              code: 'PORT_OCCUPIED_BY_OTHER',
              port: targetPort,
              error: `设计工作台端口 ${targetPort} 已被其他程序占用，请在插件设置中修改端口后重试。`
            };
          }
          return {
            ok: false,
            code: 'SERVER_EXITED',
            port: targetPort,
            error: `设计工作台本地服务异常退出 (${exitInfo})：${stderrBuf.trim() || '未知错误'}`
          };
        }

        const health = await probeGalleryHealth(targetPort, 300);
        if (health.alive) {
          if (health.mine) {
            return {
              ok: true,
              port: targetPort,
              url: `http://127.0.0.1:${targetPort}`,
              buildId: health.buildId,
              warm: false
            };
          }
          killManagedChild();
          return {
            ok: false,
            code: 'PORT_OCCUPIED_BY_OTHER',
            port: targetPort,
            error: `设计工作台端口 ${targetPort} 已被其他程序占用，请在插件设置中修改端口后重试。`
          };
        }

        await sleep(HEALTH_POLL_INTERVAL_MS);
      }

      // Timeout reached: terminate only our stalled child, never third-party processes
      killManagedChild();
      return {
        ok: false,
        code: 'START_TIMEOUT',
        port: targetPort,
        error: `设计工作台本地服务启动超时或未响应（端口 ${targetPort}），请点击重试或检查插件日志。`
      };
    })();

    try {
      return await ensurePromise;
    } finally {
      ensurePromise = null;
    }
  }

  async function resolveAndPersistWorkspace(clickCtx = {}) {
    const resolved = await resolveWorkspace({
      ...(clickCtx && typeof clickCtx === 'object' ? clickCtx : {}),
      rpc: host?.rpc,
      pluginRoot
    });

    if (resolved.ok) {
      const changed = resolved.workspaceRoot !== lastWorkspace.workspaceRoot;
      lastWorkspace = {
        workspaceRoot: resolved.workspaceRoot,
        workspaceName: resolved.workspaceName
      };
      syncRuntimeStateFile({
        workspaceRoot: resolved.workspaceRoot,
        workspaceName: resolved.workspaceName,
        ...(currentHostScheme ? { hostScheme: currentHostScheme } : {})
      });
      try {
        host?.state?.set?.('state:design.workspace@1', {
          ok: true,
          workspaceRoot: resolved.workspaceRoot,
          workspaceName: resolved.workspaceName,
          source: resolved.source
        });
        if (changed) {
          host?.events?.emit?.('design:workspace-changed@1', {
            workspaceRoot: resolved.workspaceRoot,
            workspaceName: resolved.workspaceName
          });
        }
      } catch {}
    } else {
      // 严禁写入远程路径、插件安装目录或系统根目录；清理活动焦点防止误写入旧目录
      lastWorkspace = { workspaceRoot: '', workspaceName: '' };
      syncRuntimeStateFile({
        workspaceRoot: '',
        workspaceName: '',
        ...(currentHostScheme ? { hostScheme: currentHostScheme } : {})
      });
      try {
        host?.state?.set?.('state:design.workspace@1', {
          ok: false,
          reason: resolved.reason,
          workspaceRoot: '',
          workspaceName: ''
        });
      } catch {}
    }

    return resolved;
  }

  const serviceMethods = {
    async resolveWorkspace(clickCtx = {}) {
      return await resolveAndPersistWorkspace(clickCtx);
    },

    async prepareWorkbench(clickCtx = {}) {
      const ws = await resolveAndPersistWorkspace(clickCtx);
      // 远程工作区与受保护路径明确拦截，绝不进入可创建/写盘流程
      if (!ws.ok && (ws.reason === 'REMOTE_OR_UNMOUNTED' || ws.reason === 'FORBIDDEN_WORKSPACE_PATH')) {
        return {
          ok: false,
          code: ws.reason,
          reason: ws.reason,
          path: ws.path || '',
          error: ws.message,
          workspaceRoot: '',
          workspaceName: ''
        };
      }

      const srv = await ensureGalleryRunning({ port: settings.port });
      if (!srv.ok) {
        try {
          host?.state?.set?.('state:design.status@1', {
            ready: false,
            port: settings.port,
            code: srv.code,
            error: srv.error
          });
        } catch {}
        return {
          ok: false,
          code: srv.code,
          port: settings.port,
          error: srv.error,
          workspaceRoot: ws.workspaceRoot || '',
          workspaceName: ws.workspaceName || ''
        };
      }

      try {
        host?.state?.set?.('state:design.status@1', {
          ready: true,
          port: srv.port,
          url: srv.url,
          buildId: srv.buildId
        });
      } catch {}

      return {
        ok: true,
        url: srv.url,
        port: srv.port,
        warm: srv.warm,
        workspaceRoot: ws.workspaceRoot || '',
        workspaceName: ws.workspaceName || '',
        ...(ws.ok ? {} : { warning: { code: ws.reason, message: ws.message } })
      };
    },

    async getStatus() {
      const health = await probeGalleryHealth(settings.port, 400);
      return {
        ok: true,
        port: settings.port,
        running: health.alive && health.mine,
        occupiedByOther: health.alive && !health.mine,
        workspaceRoot: lastWorkspace.workspaceRoot,
        workspaceName: lastWorkspace.workspaceName,
        settings: { ...settings }
      };
    },

    async restartServer() {
      await stopManagedGallery(settings.port);
      const srv = await ensureGalleryRunning({ port: settings.port, forceRestart: true });
      return srv;
    },

    async openExternal(targetUrl) {
      const urlToOpen = targetUrl || `http://127.0.0.1:${settings.port}`;
      if (typeof options.openExternalFn === 'function') {
        return await options.openExternalFn(urlToOpen);
      }
      if (isTestMode() && options.allowExternalInTest !== true) {
        return { ok: true, url: urlToOpen, mocked: true };
      }
      return defaultOpenExternalUrl(urlToOpen);
    },

    async dispatchPrompt(payload = {}) {
      const starter = String(payload?.starter || '');
      if (!starter) return { ok: false, error: 'Empty prompt' };
      try {
        host?.events?.emit?.('design:prompt-request@1', {
          starter,
          workspaceRoot: lastWorkspace.workspaceRoot || ''
        });
      } catch {}
      return { ok: true, starter };
    },

    async listRecentProjects(clickCtx = {}) {
      const ws = await resolveAndPersistWorkspace(clickCtx);
      const srv = await ensureGalleryRunning({ port: settings.port });
      if (!srv.ok) return { ok: false, code: srv.code, error: srv.error, items: [] };
      const listRes = await httpRequestJson(srv.port, 'GET', '/api/list', null, 1500);
      const all = Array.isArray(listRes?.json?.artifacts) ? listRes.json.artifacts : [];
      const items = all
        .filter((item) => !item.missing && (!ws.workspaceRoot || item.inCurrentWorkspace))
        .slice(0, 5);
      return {
        ok: true,
        url: srv.url,
        workspaceRoot: ws.workspaceRoot || '',
        workspaceName: ws.workspaceName || '',
        items
      };
    }
  };

  // Register Node service + internal commands for isolated renderer + 8 declarative commands
  if (host?.services?.provide) {
    const stopSvc = await host.services.provide('design', serviceMethods, {
      realm: 'node',
      version: '1.0.0'
    });
    if (typeof stopSvc === 'function') disposers.push(stopSvc);
  }

  const commandMap = {
    'design.prepareWorkbench': (clickCtx) => serviceMethods.prepareWorkbench(clickCtx),
    'design.getStatus': () => serviceMethods.getStatus(),
    'design.resolveWorkspace': (clickCtx) => serviceMethods.resolveWorkspace(clickCtx),
    'design.openExternal': (targetUrl) => serviceMethods.openExternal(targetUrl),
    'design.dispatchPrompt': (payload) => serviceMethods.dispatchPrompt(payload),
    'design.listRecentProjects': (clickCtx) => serviceMethods.listRecentProjects(clickCtx),
    'design.open': async (clickCtx = {}) => {
      const res = await serviceMethods.prepareWorkbench(clickCtx);
      if (res.ok) {
        try {
          host?.events?.emit?.('design:open-workbench@1', { url: res.url, workspaceRoot: res.workspaceRoot });
        } catch {}
        if (settings.openMode === 'browser') {
          await serviceMethods.openExternal(res.url);
        }
      }
      return res;
    },
    'design.openBrowser': async (clickCtx = {}) => {
      const res = await serviceMethods.prepareWorkbench(clickCtx);
      if (res.ok) {
        await serviceMethods.openExternal(res.url);
      }
      return res;
    },
    'design.restartServer': () => serviceMethods.restartServer()
  };

  for (const skillId of ['claude-slides', 'claude-design', 'claude-design-system', 'claude-dashboard', 'claude-motion']) {
    commandMap[`design.skill.${skillId}`] = async (clickCtx = {}) => {
      const prep = await serviceMethods.prepareWorkbench(clickCtx);
      if (!prep.ok) return prep;
      const openRes = await httpRequestJson(prep.port, 'POST', '/api/open', { skill: skillId }, 15000);
      if (openRes.ok && openRes.json?.ok && openRes.json?.url) {
        await serviceMethods.openExternal(openRes.json.url);
        return { ok: true, url: openRes.json.url, skill: skillId };
      }
      // Fallback: open gallery filtered/focused when no project of this skill exists yet
      await serviceMethods.openExternal(prep.url);
      return { ok: true, url: prep.url, skill: skillId, fallback: 'gallery' };
    };
  }

  if (host?.commands?.register) {
    for (const [cmdId, handler] of Object.entries(commandMap)) {
      const stopCmd = await host.commands.register(cmdId, handler);
      if (typeof stopCmd === 'function') disposers.push(stopCmd);
    }
  }

  if (host?.settings?.onChange) {
    const stopSettings = host.settings.onChange(async (nextValues, changedKeys = []) => {
      const prevPort = settings.port;
      settings = normalizeSettings(nextValues || {});
      if (Array.isArray(changedKeys) && changedKeys.includes('port') && settings.port !== prevPort) {
        await stopManagedGallery(prevPort);
        if (settings.prewarmOnStartup) {
          void ensureGalleryRunning({ port: settings.port });
        }
      }
    });
    if (typeof stopSettings === 'function') disposers.push(stopSettings);
  }

  // Non-blocking onStartup prewarm (activate returns < 20ms)
  if (settings.prewarmOnStartup && options.disablePrewarm !== true) {
    prewarmTimer = setTimeout(() => {
      prewarmTimer = null;
      if (!disposed) {
        void ensureGalleryRunning({ port: settings.port });
      }
    }, 50);
    if (typeof prewarmTimer.unref === 'function') prewarmTimer.unref();
  }

  activeRuntime = {
    async dispose() {
      disposed = true;
      if (prewarmTimer) {
        clearTimeout(prewarmTimer);
        prewarmTimer = null;
      }
      for (const fn of disposers.splice(0)) {
        try { if (typeof fn === 'function') await fn(); } catch {}
      }
      await stopManagedGallery();
    }
  };
}

async function deactivate() {
  if (!activeRuntime) return;
  const rt = activeRuntime;
  activeRuntime = null;
  await rt.dispose();
}

module.exports = {
  activate,
  deactivate,
  normalizeSettings,
  probeGalleryHealth,
  computeGalleryBuildId
};
