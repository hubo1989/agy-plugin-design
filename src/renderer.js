'use strict';

const { DESIGN_STYLES } = require('./styles');

const DEFAULT_SETTINGS = Object.freeze({
  showTopbarButton: true,
  openMode: 'embedded',
  shortcut: 'Mod+Alt+P',
  port: 3481,
  prewarmOnStartup: true
});

const DESIGN_ICON_SVG = '<svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<polygon points="12 2 2 7 12 12 22 7 12 2"/>'
  + '<polyline points="2 17 12 22 22 17"/>'
  + '<polyline points="2 12 12 17 22 12"/>'
  + '</svg>';

const SPIN_ICON_SVG = '<svg class="agy-design-spin" width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
  + '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'
  + '</svg>';

const WORKBENCH_TIMEOUT_MS = 8000;
const SUCCESS_THROTTLE_MS = 2000;
const CSP_HANDSHAKE_TIMEOUT_MS = 1500;

let disposers = [];

function isAbsoluteWorkspaceHint(raw) {
  const s = String(raw || '').trim();
  if (!s || s.length > 512) return false;
  if (/^file:\/\//i.test(s)) return true;
  if (/^(?:vscode-remote|ssh-remote|dev-container|attached-container|wsl\+):/i.test(s)) return true;
  if (/^[A-Za-z]:[\\/]/.test(s)) return true;
  if (s.startsWith('/') && !s.startsWith('//') && s.length > 1) return true;
  return false;
}

function collectWorkspaceContext(ctx, docRef, contextCascadeId = '') {
  const doc = docRef || globalThis.document;
  const cascadeId = String(ctx?.hostDom?.getSessionId?.() || '').trim();
  const ctxCid = String(contextCascadeId || '').trim();
  const pageUrl = String((globalThis.location && globalThis.location.href) || doc?.URL || '').trim();
  const pageTitle = String(doc?.title || '').trim();

  let activeConversationTitle = '';
  const sidebarRows = [];
  try {
    const fromHostDom = ctx?.hostDom?.getSidebarRows?.();
    if (Array.isArray(fromHostDom)) sidebarRows.push(...fromHostDom);
  } catch {}
  if (sidebarRows.length === 0 && typeof doc?.querySelectorAll === 'function') {
    try {
      const queried = doc.querySelectorAll('[data-testid="conversation-row-sidebar"]');
      if (queried) sidebarRows.push(...Array.from(queried));
    } catch {}
  }
  for (const row of sidebarRows) {
    if (!row || typeof row.getAttribute !== 'function') continue;
    const isActive = row.getAttribute('aria-selected') === 'true'
      || row.getAttribute('aria-current') === 'true'
      || row.getAttribute('data-active') === 'true'
      || row.getAttribute('data-selected') === 'true'
      || row.getAttribute('data-state') === 'active';
    if (!isActive) continue;
    const txt = String(row.textContent || '').trim().split(/\r?\n/).map((l) => l.trim()).find(Boolean) || '';
    if (txt) {
      activeConversationTitle = txt.slice(0, 200);
      break;
    }
  }

  const domPaths = [];
  const pushDomPath = (raw) => {
    const s = String(raw || '').trim();
    if (!isAbsoluteWorkspaceHint(s) || domPaths.includes(s)) return;
    if (domPaths.length < 8) domPaths.push(s);
  };

  if (typeof doc?.querySelectorAll === 'function') {
    try {
      const wsNodes = doc.querySelectorAll('[data-workspace-path], [data-workspace-uri], [data-project-path], [data-cwd]');
      for (const el of Array.from(wsNodes || [])) {
        for (const attr of ['data-workspace-path', 'data-workspace-uri', 'data-project-path', 'data-cwd']) {
          pushDomPath(el?.getAttribute?.(attr));
        }
      }
    } catch {}
    try {
      const titlebarEls = doc.querySelectorAll('[class*="@container/titlebar"] [title], [class*="@container/titlebar"] [aria-label]');
      for (const el of Array.from(titlebarEls || [])) {
        if (typeof el?.closest === 'function' && el.closest('#agy-daddy-host')) continue;
        pushDomPath(el?.getAttribute?.('title'));
        pushDomPath(el?.getAttribute?.('aria-label'));
      }
    } catch {}
  }

  const titlebarTexts = [];
  const pushTitlebarText = (raw) => {
    const s = String(raw || '').trim();
    if (!s || s.length > 120 || titlebarTexts.includes(s)) return;
    if (titlebarTexts.length < 12) titlebarTexts.push(s);
  };

  if (typeof doc?.querySelectorAll === 'function') {
    try {
      const bars = doc.querySelectorAll('[class*="@container/titlebar"]');
      for (const bar of Array.from(bars || [])) {
        if (typeof bar?.closest === 'function' && bar.closest('#agy-daddy-host')) continue;
        const leafCandidates = typeof bar.querySelectorAll === 'function'
          ? Array.from(bar.querySelectorAll('span, div, button, a, h1, h2'))
          : [];
        for (const node of leafCandidates) {
          if (typeof node?.closest === 'function' && node.closest('#agy-daddy-host')) continue;
          if (Array.isArray(node.children) && node.children.length > 0) continue;
          const txt = String(node.textContent || '').trim();
          if (txt && txt.length >= 2) pushTitlebarText(txt);
        }
      }
    } catch {}
  }

  const workspaceNameHints = [];
  const pushWsName = (raw) => {
    const s = String(raw || '').trim();
    if (!s || s.length < 2 || s.length > 120 || workspaceNameHints.includes(s)) return;
    if (workspaceNameHints.length < 12) workspaceNameHints.push(s);
  };
  for (const t of titlebarTexts) pushWsName(t);
  if (pageTitle) {
    for (const seg of pageTitle.split(/\s+[—–\-|·]\s+|\s+-\s+/)) {
      pushWsName(seg);
    }
  }

  return {
    cascadeId: cascadeId || undefined,
    contextCascadeId: ctxCid || undefined,
    workspaceHints: {
      pageUrl,
      pageTitle,
      activeConversationTitle,
      domPaths,
      titlebarTexts,
      workspaceNameHints
    }
  };
}

function matchesShortcut(ev, shortcutStr) {
  const raw = String(shortcutStr || '').trim();
  if (!raw || !ev) return false;
  const parts = raw.split('+').map((p) => p.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return false;

  const keyToken = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));

  const needMod = mods.has('mod');
  const needMeta = mods.has('cmd') || mods.has('meta');
  const needCtrl = mods.has('ctrl') || mods.has('control');
  const needAlt = mods.has('alt') || mods.has('option');
  const needShift = mods.has('shift');

  if (needMod) {
    if (!ev.metaKey && !ev.ctrlKey) return false;
  } else {
    if (Boolean(ev.metaKey) !== needMeta) return false;
    if (Boolean(ev.ctrlKey) !== needCtrl) return false;
  }
  if (Boolean(ev.altKey) !== needAlt) return false;
  if (Boolean(ev.shiftKey) !== needShift) return false;

  const evKey = String(ev.key || '').toLowerCase();
  const evCode = String(ev.code || '').toLowerCase();
  if (evKey === keyToken) return true;
  if (keyToken.length === 1 && evCode === `key${keyToken}`) return true;
  if (/^\d$/.test(keyToken) && evCode === `digit${keyToken}`) return true;
  return false;
}

async function mount(ctx, mountOptions = {}) {
  const doc = globalThis.document;
  let settings = {
    ...DEFAULT_SETTINGS,
    ...(ctx.settings?.get?.() || {})
  };
  let effectiveScheme = 'dark';
  let contextCascadeId = '';
  let stopUnit = null;
  let popoverHandle = null;
  let popoverBodyNode = null;
  let workbenchBackdrop = null;
  let workbenchDrawer = null;
  let workbenchWsPill = null;
  let workbenchBody = null;
  let workbenchIframe = null;
  let isExpanded = false;
  let isWorkbenchOpen = false;
  let inFlightPromise = null;
  let lastSuccessOpenAt = 0;
  let lastReadyUrl = '';
  let lastWorkspaceRoot = '';
  let cspFallbackTimer = null;
  let wsDebounceTimer = null;
  const activeTimers = new Set();

  function trackTimer(fn, ms) {
    const tid = setTimeout(() => {
      activeTimers.delete(tid);
      fn();
    }, ms);
    activeTimers.add(tid);
    return tid;
  }

  function clearTrackedTimer(tid) {
    if (!tid) return;
    clearTimeout(tid);
    activeTimers.delete(tid);
  }

  const stopStyles = ctx.styles?.inject?.(DESIGN_STYLES, {
    scope: 'shadow',
    id: 'agy-design-styles'
  });

  async function invokeBackend(commandName, args = []) {
    if (typeof ctx.commands?.execute === 'function') {
      const res = await ctx.commands.execute(commandName, args);
      if (res && typeof res === 'object' && 'result' in res && res.ok === true) {
        return res.result;
      }
      return res;
    }
    const method = commandName.replace(/^design\./, '');
    return await ctx.services.call('design', method, args);
  }

  function setCapsuleBusy(busy) {
    if (!stopUnit) return;
    try {
      void ctx.topbar.updateUnit('design', {
        label: busy ? '打开中…' : 'Design',
        iconSvg: busy ? SPIN_ICON_SVG : DESIGN_ICON_SVG,
        tone: busy ? 'accent' : '',
        title: busy ? '正在打开 Agy Design Studio…' : '打开 Agy Design Studio 设计工作台'
      }).catch?.(() => {});
    } catch {}
  }

  function getShadowRoot() {
    const hostEl = doc?.getElementById?.('agy-daddy-host') || doc?.querySelector?.('#agy-daddy-host');
    return hostEl?.shadowRoot || null;
  }

  function appendSchemeParams(baseUrl) {
    try {
      const u = new URL(baseUrl);
      u.searchParams.set('scheme', effectiveScheme);
      u.searchParams.set('embed', '1');
      return u.href;
    } catch {
      const sep = String(baseUrl || '').includes('?') ? '&' : '?';
      return `${baseUrl}${sep}scheme=${encodeURIComponent(effectiveScheme)}&embed=1`;
    }
  }

  function hideWorkbench() {
    isWorkbenchOpen = false;
    clearTrackedTimer(cspFallbackTimer);
    cspFallbackTimer = null;
    if (workbenchBackdrop) {
      workbenchBackdrop.setAttribute('data-hidden', 'true');
    }
    if (workbenchIframe) {
      try { workbenchIframe.src = 'about:blank'; } catch {}
      workbenchIframe = null;
    }
  }

  function ensureWorkbenchDom() {
    if (workbenchBackdrop) return workbenchBackdrop;
    const shadow = getShadowRoot();
    if (!shadow || !doc?.createElement) return null;

    const backdrop = doc.createElement('div');
    backdrop.id = 'agy-design-workbench';
    backdrop.className = 'agy-design-backdrop';
    backdrop.setAttribute('data-hidden', 'true');
    backdrop.setAttribute('data-agy-design-workbench', 'true');

    const drawer = doc.createElement('div');
    drawer.className = 'agy-design-drawer';
    drawer.setAttribute('data-expanded', isExpanded ? 'true' : 'false');

    const header = doc.createElement('div');
    header.className = 'agy-design-header';

    const left = doc.createElement('div');
    left.className = 'agy-design-header-left';
    const brand = doc.createElement('span');
    brand.className = 'agy-design-brand';
    brand.textContent = 'Agy Design Studio';
    const wsPill = doc.createElement('span');
    wsPill.className = 'agy-design-ws-pill';
    wsPill.textContent = '本机工作区';
    left.appendChild(brand);
    left.appendChild(wsPill);

    const actions = doc.createElement('div');
    actions.className = 'agy-design-header-actions';

    const expandBtn = doc.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'agy-design-btn';
    expandBtn.textContent = '全屏切换';
    expandBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      drawer.setAttribute('data-expanded', isExpanded ? 'true' : 'false');
    });

    const externalBtn = doc.createElement('button');
    externalBtn.type = 'button';
    externalBtn.className = 'agy-design-btn';
    externalBtn.textContent = '浏览器打开 ↗';
    externalBtn.addEventListener('click', () => {
      if (lastReadyUrl) {
        void invokeBackend('design.openExternal', [appendSchemeParams(lastReadyUrl)]).catch?.(() => {});
      }
    });

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'agy-design-btn';
    closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', hideWorkbench);

    actions.appendChild(expandBtn);
    actions.appendChild(externalBtn);
    actions.appendChild(closeBtn);

    header.appendChild(left);
    header.appendChild(actions);

    const body = doc.createElement('div');
    body.className = 'agy-design-body';

    drawer.appendChild(header);
    drawer.appendChild(body);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', (ev) => {
      if (ev.target === backdrop) hideWorkbench();
    });

    shadow.appendChild(backdrop);
    workbenchBackdrop = backdrop;
    workbenchDrawer = drawer;
    workbenchWsPill = wsPill;
    workbenchBody = body;
    return backdrop;
  }

  function renderWorkbenchSkeleton() {
    ensureWorkbenchDom();
    if (!workbenchBackdrop || !workbenchBody || !doc?.createElement) return;
    isWorkbenchOpen = true;
    workbenchBackdrop.setAttribute('data-hidden', 'false');
    workbenchIframe = null;
    workbenchBody.innerHTML = '';

    const skel = doc.createElement('div');
    skel.className = 'agy-design-skeleton';
    skel.setAttribute('data-agy-design-skeleton', 'true');

    const status = doc.createElement('div');
    status.className = 'agy-design-skel-status';
    status.innerHTML = `${SPIN_ICON_SVG}<span>正在准备本机工作区与设计工作台…</span>`;

    const bar1 = doc.createElement('div');
    bar1.className = 'agy-design-skel-bar';
    bar1.style.width = '42%';

    const grid = doc.createElement('div');
    grid.className = 'agy-design-skel-grid';
    for (let i = 0; i < 6; i++) {
      const card = doc.createElement('div');
      card.className = 'agy-design-skel-card';
      grid.appendChild(card);
    }

    skel.appendChild(status);
    skel.appendChild(bar1);
    skel.appendChild(grid);
    workbenchBody.appendChild(skel);
  }

  function renderWorkbenchError(res) {
    ensureWorkbenchDom();
    if (!workbenchBackdrop || !workbenchBody || !doc?.createElement) return;
    isWorkbenchOpen = true;
    workbenchBackdrop.setAttribute('data-hidden', 'false');
    workbenchIframe = null;
    workbenchBody.innerHTML = '';

    const card = doc.createElement('div');
    card.className = 'agy-design-error-card';
    card.setAttribute('data-error-code', String(res?.code || 'ERROR'));

    const title = doc.createElement('div');
    title.className = 'agy-design-error-title';
    title.textContent = res?.code === 'PORT_OCCUPIED_BY_OTHER'
      ? '本地端口已被其他程序占用'
      : (res?.code === 'REMOTE_OR_UNMOUNTED' || res?.code === 'FORBIDDEN_WORKSPACE_PATH'
        ? '工作区路径受限'
        : '无法启动 Agy Design Studio');

    const msg = doc.createElement('div');
    msg.className = 'agy-design-error-msg';
    msg.textContent = res?.error || '设计工作台本地服务未响应，请重试或检查端口设置。';

    const actions = doc.createElement('div');
    actions.className = 'agy-design-error-actions';

    const retryBtn = doc.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'agy-design-btn agy-design-btn-primary';
    retryBtn.textContent = '重试启动';
    retryBtn.addEventListener('click', () => {
      void triggerOpen({ forceEmbedded: true });
    });
    actions.appendChild(retryBtn);

    if (res?.code === 'PORT_OCCUPIED_BY_OTHER' || res?.code === 'START_TIMEOUT') {
      const settingsBtn = doc.createElement('button');
      settingsBtn.type = 'button';
      settingsBtn.className = 'agy-design-btn';
      settingsBtn.textContent = '修改端口设置';
      settingsBtn.addEventListener('click', () => {
        void ctx.settings?.open?.('plugins').catch?.(() => {});
      });
      actions.appendChild(settingsBtn);
    }

    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(actions);
    workbenchBody.appendChild(card);
  }

  function mountWorkbenchIframe(url, workspaceName) {
    ensureWorkbenchDom();
    if (!workbenchBackdrop || !workbenchBody || !doc?.createElement) return;
    isWorkbenchOpen = true;
    workbenchBackdrop.setAttribute('data-hidden', 'false');
    if (workbenchWsPill) {
      workbenchWsPill.textContent = workspaceName || '未打开本机工作区';
    }
    workbenchBody.innerHTML = '';

    const fullUrl = appendSchemeParams(url);
    const frame = doc.createElement('iframe');
    frame.className = 'agy-design-iframe';
    frame.setAttribute('allow', 'clipboard-read; clipboard-write');
    frame.setAttribute('title', 'Agy Design Studio');
    frame.src = fullUrl;
    workbenchIframe = frame;
    workbenchBody.appendChild(frame);

    // 1.5s CSP / iframe handshake fallback to system browser (real browser DOM only)
    clearTrackedTimer(cspFallbackTimer);
    if (typeof globalThis.window !== 'undefined' && mountOptions.disableCspFallback !== true) {
      cspFallbackTimer = trackTimer(() => {
        cspFallbackTimer = null;
        if (isWorkbenchOpen && workbenchIframe === frame) {
          void invokeBackend('design.openExternal', [fullUrl]).catch?.(() => {});
        }
      }, CSP_HANDSHAKE_TIMEOUT_MS);
    }
  }

  async function handlePromptDelivery(starter) {
    if (!starter) return { ok: false, fallback: 'clipboard' };
    const busy = Boolean(ctx.hostDom?.isAssistantBusy?.());
    if (!busy && typeof ctx.hostDom?.sendText === 'function') {
      const sent = ctx.hostDom.sendText(starter);
      if (sent) {
        if (isWorkbenchOpen) hideWorkbench();
        return { ok: true, outcome: 'chat' };
      }
    }
    if (typeof globalThis.navigator?.clipboard?.writeText === 'function') {
      try {
        await globalThis.navigator.clipboard.writeText(starter);
      } catch {}
    }
    return { ok: false, fallback: 'clipboard', starter };
  }

  async function triggerOpen(opts = {}) {
    const mode = opts.forceEmbedded ? 'embedded' : settings.openMode;
    if (inFlightPromise) {
      if (mode !== 'browser' && workbenchBackdrop && !isWorkbenchOpen) {
        isWorkbenchOpen = true;
        workbenchBackdrop.setAttribute('data-hidden', 'false');
      }
      return inFlightPromise;
    }

    if (!opts.forceEmbedded && mode === 'popover' && popoverHandle?.toggle) {
      await popoverHandle.toggle();
      return { ok: true, mode: 'popover' };
    }

    // Success-only 2000ms throttle: immediately focus ready workbench
    if (lastSuccessOpenAt > 0 && (Date.now() - lastSuccessOpenAt) < SUCCESS_THROTTLE_MS && lastReadyUrl) {
      if (mode === 'browser') {
        void invokeBackend('design.openExternal', [appendSchemeParams(lastReadyUrl)]).catch?.(() => {});
      } else {
        mountWorkbenchIframe(lastReadyUrl, workbenchWsPill?.textContent || '');
      }
      return { ok: true, throttled: true, url: lastReadyUrl };
    }

    // Immediate <=16ms synchronous visual feedback
    setCapsuleBusy(true);
    if (mode !== 'browser') {
      renderWorkbenchSkeleton();
    }

    const clickCtx = collectWorkspaceContext(ctx, doc, contextCascadeId);

    inFlightPromise = (async () => {
      let timerId = null;
      try {
        const res = await Promise.race([
          invokeBackend('design.prepareWorkbench', [clickCtx]),
          new Promise((resolve) => {
            timerId = trackTimer(() => {
              resolve({
                ok: false,
                code: 'START_TIMEOUT',
                error: `设计工作台本地服务启动超时或未响应（端口 ${settings.port}），请点击重试或检查插件日志。`
              });
            }, WORKBENCH_TIMEOUT_MS + 300);
          })
        ]);
        clearTrackedTimer(timerId);

        if (!res || !res.ok || !res.url) {
          lastSuccessOpenAt = 0;
          if (mode !== 'browser') {
            renderWorkbenchError(res);
          }
          return res || { ok: false, code: 'UNKNOWN_ERROR' };
        }

        lastReadyUrl = res.url;
        lastWorkspaceRoot = res.workspaceRoot || '';
        lastSuccessOpenAt = Date.now();

        if (mode === 'browser') {
          await invokeBackend('design.openExternal', [appendSchemeParams(res.url)]);
        } else {
          mountWorkbenchIframe(res.url, res.workspaceName || '');
        }
        return res;
      } catch (err) {
        clearTrackedTimer(timerId);
        lastSuccessOpenAt = 0;
        const failRes = {
          ok: false,
          code: 'OPEN_FAILED',
          error: err?.message || String(err)
        };
        if (mode !== 'browser') {
          renderWorkbenchError(failRes);
        }
        return failRes;
      } finally {
        inFlightPromise = null;
        setCapsuleBusy(false);
      }
    })();

    return inFlightPromise;
  }

  function renderPopoverContent(bodyNode) {
    if (!bodyNode || !doc?.createElement) return;
    bodyNode.innerHTML = '';
    const card = doc.createElement('div');
    card.className = 'agy-design-pop-card';

    const list = doc.createElement('div');
    list.className = 'agy-design-pop-list';
    const placeholder = doc.createElement('div');
    placeholder.className = 'agy-design-pop-meta';
    placeholder.textContent = '正在读取工作区作品…';
    list.appendChild(placeholder);

    const openAllBtn = doc.createElement('button');
    openAllBtn.type = 'button';
    openAllBtn.className = 'agy-design-btn agy-design-btn-primary';
    openAllBtn.textContent = '打开完整工作台';
    openAllBtn.addEventListener('click', () => {
      void popoverHandle?.toggle?.(false);
      void triggerOpen({ forceEmbedded: true });
    });

    card.appendChild(list);
    card.appendChild(openAllBtn);
    bodyNode.appendChild(card);

    const clickCtx = collectWorkspaceContext(ctx, doc, contextCascadeId);
    void invokeBackend('design.listRecentProjects', [clickCtx]).then((res) => {
      if (!popoverBodyNode || popoverBodyNode !== bodyNode) return;
      list.innerHTML = '';
      const items = Array.isArray(res?.items) ? res.items : [];
      if (!items.length) {
        const empty = doc.createElement('div');
        empty.className = 'agy-design-pop-meta';
        empty.textContent = '当前工作区暂无设计作品';
        list.appendChild(empty);
        return;
      }
      for (const it of items) {
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'agy-design-pop-item';
        btn.textContent = it.title || it.root;
        btn.addEventListener('click', () => {
          void popoverHandle?.toggle?.(false);
          void triggerOpen({ forceEmbedded: true });
        });
        list.appendChild(btn);
      }
    }).catch(() => {});
  }

  popoverHandle = ctx.topbar.registerPopover({
    id: 'design-quick',
    anchorId: 'design',
    title: '最近设计作品',
    render(bodyNode) {
      popoverBodyNode = bodyNode;
      renderPopoverContent(bodyNode);
    },
    onToggle(open) {
      if (open && popoverBodyNode) {
        renderPopoverContent(popoverBodyNode);
      }
    }
  });

  function syncTopbarUnit() {
    if (!settings.showTopbarButton) {
      if (typeof stopUnit === 'function') {
        try { stopUnit(); } catch {}
        stopUnit = null;
      }
      return;
    }
    if (!stopUnit) {
      stopUnit = ctx.topbar.registerUnit({
        id: 'design',
        order: 48,
        label: 'Design',
        iconSvg: DESIGN_ICON_SVG,
        title: '打开 Agy Design Studio 设计工作台',
        onClick() {
          void triggerOpen();
        }
      });
    }
  }

  syncTopbarUnit();

  // Subscriptions: host theme, context cascadeId, prompt/workbench events, settings
  const stopThemeSub = ctx.state?.subscribe?.('state:host.theme@1', (val) => {
    if (val?.effectiveMode === 'dark' || val?.effectiveMode === 'light') {
      effectiveScheme = val.effectiveMode;
    }
  });

  const stopContextSub = ctx.state?.subscribe?.('state:context.snapshot@1', (snap) => {
    const cid = typeof snap?.cascadeId === 'string' ? snap.cascadeId.trim() : '';
    if (cid) contextCascadeId = cid;
  });

  const stopOpenEvent = ctx.events?.on?.('design:open-workbench@1', (payload) => {
    if (settings.openMode !== 'browser' && payload?.url) {
      lastReadyUrl = payload.url;
      mountWorkbenchIframe(payload.url, payload.workspaceName || '');
    }
  });

  const stopPromptEvent = ctx.events?.on?.('design:prompt-request@1', (payload) => {
    if (payload?.starter) {
      void handlePromptDelivery(payload.starter);
    }
  });

  const stopSettingsSub = ctx.settings?.onChange?.((nextValues) => {
    settings = { ...DEFAULT_SETTINGS, ...(nextValues || {}) };
    syncTopbarUnit();
  });

  const onMessage = (ev) => {
    const data = ev?.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'agy-design:ready') {
      clearTrackedTimer(cspFallbackTimer);
      cspFallbackTimer = null;
      return;
    }
    if (data.type === 'agy-design:prompt-request' && data.starter) {
      void handlePromptDelivery(data.starter).then((res) => {
        try {
          workbenchIframe?.contentWindow?.postMessage?.({
            type: 'agy-design:prompt-reply',
            reqId: data.reqId,
            ...res
          }, '*');
        } catch {}
      });
    }
  };

  const onKeyDown = (ev) => {
    if (ev?.key === 'Escape' && isWorkbenchOpen) {
      ev.preventDefault?.();
      hideWorkbench();
      return;
    }
    if (settings.shortcut && matchesShortcut(ev, settings.shortcut)) {
      ev.preventDefault?.();
      if (isWorkbenchOpen) hideWorkbench();
      else void triggerOpen();
    }
  };

  const scheduleWorkspaceRefresh = () => {
    clearTrackedTimer(wsDebounceTimer);
    wsDebounceTimer = trackTimer(() => {
      wsDebounceTimer = null;
      const clickCtx = collectWorkspaceContext(ctx, doc, contextCascadeId);
      void invokeBackend('design.resolveWorkspace', [clickCtx]).then((res) => {
        if (res?.ok && res.workspaceRoot !== lastWorkspaceRoot) {
          lastWorkspaceRoot = res.workspaceRoot;
          if (workbenchWsPill) workbenchWsPill.textContent = res.workspaceName || '本机工作区';
          try {
            workbenchIframe?.contentWindow?.postMessage?.({
              type: 'agy-design:workspace-changed',
              workspaceRoot: res.workspaceRoot,
              workspaceName: res.workspaceName
            }, '*');
          } catch {}
        }
      }).catch?.(() => {});
    }, 300);
  };

  const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('message', onMessage);
    win.addEventListener('focus', scheduleWorkspaceRefresh);
  }
  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('keydown', onKeyDown, true);
  }

  disposers.push(
    stopThemeSub,
    stopContextSub,
    stopOpenEvent,
    stopPromptEvent,
    stopSettingsSub,
    stopStyles,
    () => { if (typeof stopUnit === 'function') stopUnit(); stopUnit = null; },
    () => { popoverHandle?.dispose?.(); popoverHandle = null; popoverBodyNode = null; },
    () => {
      if (win && typeof win.removeEventListener === 'function') {
        win.removeEventListener('message', onMessage);
        win.removeEventListener('focus', scheduleWorkspaceRefresh);
      }
      if (doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('keydown', onKeyDown, true);
      }
    },
    () => {
      for (const tid of Array.from(activeTimers)) {
        clearTimeout(tid);
      }
      activeTimers.clear();
      cspFallbackTimer = null;
      wsDebounceTimer = null;
    },
    () => {
      hideWorkbench();
      if (workbenchBackdrop && typeof workbenchBackdrop.remove === 'function') {
        workbenchBackdrop.remove();
      }
      workbenchBackdrop = null;
      workbenchDrawer = null;
      workbenchWsPill = null;
      workbenchBody = null;
      workbenchIframe = null;
    }
  );
}

function dispose() {
  for (const fn of disposers.splice(0)) {
    try { if (typeof fn === 'function') fn(); } catch {}
  }
}

module.exports = {
  mount,
  dispose,
  matchesShortcut,
  collectWorkspaceContext
};
