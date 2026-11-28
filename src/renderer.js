'use strict';

const { DESIGN_STYLES } = require('./styles');
const { DEFAULT_LOCALE, extractLocaleFromPayload, t: tr } = require('./i18n');

const DEFAULT_SETTINGS = Object.freeze({
  showTopbarButton: true,
  openMode: 'sidebar',
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

function normalizeSettings(raw = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...(raw && typeof raw === 'object' ? raw : {}),
    showTopbarButton: raw?.showTopbarButton !== false,
    openMode: raw?.openMode === 'browser' ? 'browser' : 'sidebar',
    shortcut: typeof raw?.shortcut === 'string' ? raw.shortcut : DEFAULT_SETTINGS.shortcut
  };
}

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
  let settings = normalizeSettings(ctx.settings?.get?.() || {});
  let effectiveScheme = 'dark';
  let activeLocale = DEFAULT_LOCALE;
  let hasExplicitLocale = false;
  let contextCascadeId = '';
  let stopUnit = null;
  let auxHostEl = null;
  let auxStripEl = null;
  let auxObserver = null;
  let sidebarHostEl = null;
  let workbenchEl = null;
  let workbenchBrandEl = null;
  let workbenchWsPill = null;
  let workbenchExternalBtn = null;
  let workbenchCloseBtn = null;
  let workbenchBody = null;
  let workbenchIframe = null;
  let lastErrorRes = null;
  let lastWorkspaceName = '';
  let autoOpenedAuxSidebar = false;
  let isWorkbenchOpen = false;
  let isDisposed = false;
  let inFlightPromise = null;
  let lastSuccessOpenAt = 0;
  let lastReadyUrl = '';
  let lastWorkspaceRoot = '';
  let cspFallbackTimer = null;
  let wsDebounceTimer = null;
  let stopAuxStyle = null;
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

  const stopShadowStyles = ctx.styles?.inject?.(DESIGN_STYLES, {
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
    if (isDisposed || !stopUnit) return;
    try {
      void ctx.topbar.updateUnit('design', {
        label: busy ? tr(activeLocale, 'unit.opening') : tr(activeLocale, 'unit.label'),
        iconSvg: busy ? SPIN_ICON_SVG : DESIGN_ICON_SVG,
        tone: busy ? 'accent' : '',
        title: busy ? tr(activeLocale, 'unit.openingTitle') : tr(activeLocale, 'unit.title')
      }).catch?.(() => {});
    } catch {}
  }

  function getShadowRoot() {
    if (ctx.mountRoot) return ctx.mountRoot;
    const hostEl = doc?.getElementById?.('agy-daddy-host') || doc?.querySelector?.('#agy-daddy-host');
    return hostEl?.shadowRoot || null;
  }

  function appendQueryParams(baseUrl) {
    if (typeof URL !== 'undefined') {
      try {
        const u = new URL(baseUrl);
        u.searchParams.set('scheme', effectiveScheme);
        u.searchParams.set('lang', activeLocale);
        u.searchParams.set('embed', '1');
        return u.href;
      } catch {}
    }
    const sep = String(baseUrl || '').includes('?') ? '&' : '?';
    return `${baseUrl}${sep}scheme=${encodeURIComponent(effectiveScheme)}&lang=${encodeURIComponent(activeLocale)}&embed=1`;
  }

  function findAuxSidebarElements() {
    if (!doc?.querySelector) return { auxRoot: null, stripEl: null };
    let auxRoot = null;
    try {
      auxRoot = doc.querySelector('[data-side-panel-open], [data-aux-pane-open]');
    } catch {}
    const stripEl = auxRoot?.querySelector?.('[data-side-panel-strip="true"]')
      || doc.querySelector('[data-side-panel-strip="true"]')
      || null;
    if (!auxRoot && stripEl?.parentElement) {
      auxRoot = stripEl.parentElement;
    }
    return { auxRoot, stripEl };
  }

  function isAuxCollapsed(root) {
    if (!root || typeof root.getAttribute !== 'function') return false;
    return root.getAttribute('data-side-panel-open') === 'false'
      || root.getAttribute('data-aux-pane-open') === 'false';
  }

  function ensureAuxSidebarExpanded() {
    const { auxRoot } = findAuxSidebarElements();
    if (!auxRoot) return false;
    if (isAuxCollapsed(auxRoot)) {
      const toggleBtn = doc?.querySelector?.('[data-testid="toggle-aux-sidebar"]');
      if (toggleBtn && typeof toggleBtn.click === 'function') {
        autoOpenedAuxSidebar = true;
        toggleBtn.click();
        return true;
      }
    }
    return false;
  }

  function syncSidebarHostBounds() {
    if (!sidebarHostEl || !auxHostEl) return;
    let stripHeight = 40;
    try {
      const rect = auxStripEl?.getBoundingClientRect?.();
      if (rect && Number.isFinite(rect.height) && rect.height >= 16) {
        stripHeight = Math.round(rect.height);
      }
    } catch {}
    sidebarHostEl.style.setProperty('top', `${stripHeight}px`);
  }

  const onStripClick = (ev) => {
    const tab = ev?.target?.closest?.('.agy-aux-tab, [data-testid="side-panel-new-tab-button"]');
    if (tab && isWorkbenchOpen) {
      autoOpenedAuxSidebar = false;
      hideWorkbench({ fromNativeTab: true });
    }
  };

  function cleanupAuxListeners() {
    if (auxObserver) {
      try { auxObserver.disconnect(); } catch {}
      auxObserver = null;
    }
    if (auxStripEl && typeof auxStripEl.removeEventListener === 'function') {
      try { auxStripEl.removeEventListener('click', onStripClick, true); } catch {}
    }
    auxStripEl = null;
    if (auxHostEl && typeof auxHostEl.removeAttribute === 'function') {
      try { auxHostEl.removeAttribute('data-agy-design-aux-host'); } catch {}
    }
    auxHostEl = null;
  }

  function hideWorkbench(opts = {}) {
    isWorkbenchOpen = false;
    lastErrorRes = null;
    clearTrackedTimer(cspFallbackTimer);
    cspFallbackTimer = null;
    if (workbenchEl) {
      workbenchEl.setAttribute('data-hidden', 'true');
    }
    if (sidebarHostEl) {
      sidebarHostEl.style.setProperty('display', 'none');
    }
    if (workbenchIframe) {
      try { workbenchIframe.src = 'about:blank'; } catch {}
      workbenchIframe = null;
    }
    if (!opts.fromAuxCollapse && !opts.fromNativeTab && !opts.disposing && autoOpenedAuxSidebar && auxHostEl) {
      const hasOtherActiveTab = Boolean(
        auxHostEl.querySelector?.('.agy-aux-tab[aria-selected="true"], [data-active="true"]')
      );
      if (!hasOtherActiveTab && !isAuxCollapsed(auxHostEl)) {
        const toggleBtn = doc?.querySelector?.('[data-testid="toggle-aux-sidebar"]');
        if (toggleBtn && typeof toggleBtn.click === 'function') {
          toggleBtn.click();
        }
      }
      autoOpenedAuxSidebar = false;
    }
  }

  function showWorkbench() {
    isWorkbenchOpen = true;
    if (auxHostEl) {
      ensureAuxSidebarExpanded();
      syncSidebarHostBounds();
    }
    if (sidebarHostEl) {
      sidebarHostEl.style.setProperty('display', 'block');
    }
    if (workbenchEl) {
      workbenchEl.setAttribute('data-hidden', 'false');
    }
  }

  function createWorkbenchPanel(surface) {
    const panel = doc.createElement('div');
    panel.id = 'agy-design-workbench';
    panel.className = 'agy-design-workbench';
    panel.setAttribute('data-hidden', 'true');
    panel.setAttribute('data-surface', surface);
    panel.setAttribute('data-agy-design-workbench', 'true');
    if (surface === 'fallback') {
      panel.setAttribute('data-browser-occluder', 'true');
    }

    const header = doc.createElement('div');
    header.className = 'agy-design-header';

    const left = doc.createElement('div');
    left.className = 'agy-design-header-left';
    const brand = doc.createElement('span');
    brand.className = 'agy-design-brand';
    brand.textContent = tr(activeLocale, 'workbench.title');
    const wsPill = doc.createElement('span');
    wsPill.className = 'agy-design-ws-pill';
    wsPill.textContent = tr(activeLocale, 'workbench.wsDefault');
    left.appendChild(brand);
    left.appendChild(wsPill);

    const actions = doc.createElement('div');
    actions.className = 'agy-design-header-actions';

    const externalBtn = doc.createElement('button');
    externalBtn.type = 'button';
    externalBtn.className = 'agy-design-btn';
    externalBtn.setAttribute('data-agy-action', 'open-external');
    externalBtn.textContent = tr(activeLocale, 'workbench.openExternal');
    externalBtn.addEventListener('click', () => {
      if (lastReadyUrl) {
        void invokeBackend('design.openExternal', [appendQueryParams(lastReadyUrl)]).catch?.(() => {});
      } else {
        void invokeBackend('design.openBrowser', [collectWorkspaceContext(ctx, doc, contextCascadeId)]).catch?.(() => {});
      }
    });

    const closeBtn = doc.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'agy-design-btn';
    closeBtn.setAttribute('data-agy-action', 'close');
    closeBtn.textContent = tr(activeLocale, 'workbench.close');
    closeBtn.addEventListener('click', () => hideWorkbench());

    actions.appendChild(externalBtn);
    actions.appendChild(closeBtn);

    header.appendChild(left);
    header.appendChild(actions);

    const body = doc.createElement('div');
    body.className = 'agy-design-body';

    panel.appendChild(header);
    panel.appendChild(body);

    workbenchEl = panel;
    workbenchBrandEl = brand;
    workbenchWsPill = wsPill;
    workbenchExternalBtn = externalBtn;
    workbenchCloseBtn = closeBtn;
    workbenchBody = body;
    return panel;
  }

  function ensureWorkbenchDom() {
    if (isDisposed) return null;
    if (workbenchEl) return workbenchEl;
    if (!doc?.createElement) return null;

    const { auxRoot, stripEl } = findAuxSidebarElements();
    if (auxRoot && typeof auxRoot.appendChild === 'function' && typeof doc.createElement('div').attachShadow === 'function') {
      if (!stopAuxStyle && ctx.styles?.inject) {
        stopAuxStyle = ctx.styles.inject('[data-agy-design-aux-host="true"] { position: relative !important; }', {
          scope: 'document',
          id: 'agy-design-aux-host'
        });
      }
      auxRoot.setAttribute('data-agy-design-aux-host', 'true');
      auxHostEl = auxRoot;
      auxStripEl = stripEl;

      const sidebarHost = doc.createElement('div');
      sidebarHost.id = 'agy-design-sidebar-host';
      sidebarHost.setAttribute('data-browser-occluder', 'true');
      sidebarHost.style.setProperty('position', 'absolute');
      sidebarHost.style.setProperty('top', '40px');
      sidebarHost.style.setProperty('left', '0');
      sidebarHost.style.setProperty('right', '0');
      sidebarHost.style.setProperty('bottom', '0');
      sidebarHost.style.setProperty('z-index', '25');
      sidebarHost.style.setProperty('display', 'none');

      const sr = sidebarHost.attachShadow({ mode: 'open' });
      const styleNode = doc.createElement('style');
      styleNode.textContent = DESIGN_STYLES;
      sr.appendChild(styleNode);

      const panel = createWorkbenchPanel('sidebar');
      sr.appendChild(panel);
      auxRoot.appendChild(sidebarHost);
      sidebarHostEl = sidebarHost;
      syncSidebarHostBounds();

      if (stripEl && typeof stripEl.addEventListener === 'function') {
        stripEl.addEventListener('click', onStripClick, true);
      }
      if (typeof globalThis.MutationObserver === 'function') {
        try {
          auxObserver = new globalThis.MutationObserver(() => {
            if (isAuxCollapsed(auxHostEl) && isWorkbenchOpen) {
              hideWorkbench({ fromAuxCollapse: true });
            }
          });
          auxObserver.observe(auxRoot, {
            attributes: true,
            attributeFilter: ['data-side-panel-open', 'data-aux-pane-open']
          });
        } catch {}
      }
      return panel;
    }

    const shadow = getShadowRoot();
    if (!shadow) return null;
    const panel = createWorkbenchPanel('fallback');
    shadow.appendChild(panel);
    return panel;
  }

  function renderWorkbenchSkeleton() {
    ensureWorkbenchDom();
    if (!workbenchEl || !workbenchBody || !doc?.createElement) return;
    lastErrorRes = null;
    showWorkbench();
    workbenchIframe = null;
    workbenchBody.innerHTML = '';

    const skel = doc.createElement('div');
    skel.className = 'agy-design-skeleton';
    skel.setAttribute('data-agy-design-skeleton', 'true');

    const status = doc.createElement('div');
    status.className = 'agy-design-skel-status';
    status.innerHTML = `${SPIN_ICON_SVG}<span>${tr(activeLocale, 'workbench.loading')}</span>`;

    const bar1 = doc.createElement('div');
    bar1.className = 'agy-design-skel-bar';
    bar1.style.setProperty('width', '42%');

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

  function resolveLocalizedErrorMessage(res) {
    const code = res?.code || '';
    if (code === 'PORT_OCCUPIED_BY_OTHER') {
      return tr(activeLocale, 'error.portInUse');
    }
    if (code === 'START_TIMEOUT') {
      return tr(activeLocale, 'error.startTimeout');
    }
    if (code === 'REMOTE_OR_UNMOUNTED') {
      return tr(activeLocale, 'error.remoteWorkspace');
    }
    if (code === 'FORBIDDEN_WORKSPACE_PATH') {
      return tr(activeLocale, 'error.forbiddenPath');
    }
    if (code === 'NO_WORKSPACE') {
      return tr(activeLocale, 'error.noWorkspace');
    }
    return res?.error || tr(activeLocale, 'error.fallbackMsg');
  }

  function renderWorkbenchError(res) {
    ensureWorkbenchDom();
    if (!workbenchEl || !workbenchBody || !doc?.createElement) return;
    lastErrorRes = res || { code: 'ERROR' };
    showWorkbench();
    workbenchIframe = null;
    workbenchBody.innerHTML = '';

    const card = doc.createElement('div');
    card.className = 'agy-design-error-card';
    card.setAttribute('data-error-code', String(res?.code || 'ERROR'));

    const title = doc.createElement('div');
    title.className = 'agy-design-error-title';
    title.textContent = res?.code === 'PORT_OCCUPIED_BY_OTHER'
      ? tr(activeLocale, 'error.titlePort')
      : (res?.code === 'REMOTE_OR_UNMOUNTED' || res?.code === 'FORBIDDEN_WORKSPACE_PATH'
        ? tr(activeLocale, 'error.titleWorkspace')
        : tr(activeLocale, 'error.titleGeneric'));

    const msg = doc.createElement('div');
    msg.className = 'agy-design-error-msg';
    msg.textContent = resolveLocalizedErrorMessage(res);

    const actions = doc.createElement('div');
    actions.className = 'agy-design-error-actions';

    const retryBtn = doc.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'agy-design-btn agy-design-btn-primary';
    retryBtn.textContent = tr(activeLocale, 'workbench.retry');
    retryBtn.addEventListener('click', () => {
      void triggerOpen({ forceSidebar: true });
    });
    actions.appendChild(retryBtn);

    if (res?.code === 'PORT_OCCUPIED_BY_OTHER' || res?.code === 'START_TIMEOUT') {
      const settingsBtn = doc.createElement('button');
      settingsBtn.type = 'button';
      settingsBtn.className = 'agy-design-btn';
      settingsBtn.textContent = tr(activeLocale, 'workbench.openSettings');
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
    if (!workbenchEl || !workbenchBody || !doc?.createElement) return;
    lastErrorRes = null;
    lastWorkspaceName = workspaceName || '';
    showWorkbench();
    if (workbenchWsPill) {
      workbenchWsPill.textContent = lastWorkspaceName || tr(activeLocale, 'workbench.wsEmpty');
    }
    workbenchBody.innerHTML = '';

    const fullUrl = appendQueryParams(url);
    const frame = doc.createElement('iframe');
    frame.className = 'agy-design-iframe';
    frame.setAttribute('allow', 'clipboard-read; clipboard-write');
    frame.setAttribute('title', tr(activeLocale, 'workbench.title'));
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

  function refreshLocalizedChrome() {
    setCapsuleBusy(Boolean(inFlightPromise));
    if (workbenchBrandEl) {
      workbenchBrandEl.textContent = tr(activeLocale, 'workbench.title');
    }
    if (workbenchExternalBtn) {
      workbenchExternalBtn.textContent = tr(activeLocale, 'workbench.openExternal');
    }
    if (workbenchCloseBtn) {
      workbenchCloseBtn.textContent = tr(activeLocale, 'workbench.close');
    }
    if (workbenchWsPill && !lastWorkspaceName) {
      workbenchWsPill.textContent = isWorkbenchOpen
        ? tr(activeLocale, 'workbench.wsEmpty')
        : tr(activeLocale, 'workbench.wsDefault');
    }
    if (lastErrorRes && isWorkbenchOpen && !workbenchIframe) {
      renderWorkbenchError(lastErrorRes);
    } else if (isWorkbenchOpen && !workbenchIframe && workbenchBody?.querySelector?.('[data-agy-design-skeleton="true"]')) {
      renderWorkbenchSkeleton();
    }
    if (workbenchIframe?.contentWindow) {
      try {
        workbenchIframe.contentWindow.postMessage({
          type: 'agy-design:locale-changed',
          locale: activeLocale
        }, '*');
      } catch {}
    }
  }

  function applyLocalePayload(payload, markExplicit = true) {
    const next = extractLocaleFromPayload(payload);
    if (!next) return;
    if (markExplicit) hasExplicitLocale = true;
    if (next === activeLocale) return;
    activeLocale = next;
    refreshLocalizedChrome();
  }

  async function handlePromptDelivery(starter) {
    if (!starter) return { ok: false, fallback: 'clipboard' };
    const busy = Boolean(ctx.hostDom?.isAssistantBusy?.());
    if (!busy && typeof ctx.hostDom?.sendText === 'function') {
      const sent = ctx.hostDom.sendText(starter);
      if (sent) {
        // Keep right sidebar workbench open alongside left conversation pane
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
    const mode = opts.forceSidebar ? 'sidebar' : settings.openMode;
    if (inFlightPromise) {
      if (mode !== 'browser' && workbenchEl && !isWorkbenchOpen) {
        showWorkbench();
      }
      return inFlightPromise;
    }

    // Success-only 2000ms throttle: immediately focus ready workbench
    if (lastSuccessOpenAt > 0 && (Date.now() - lastSuccessOpenAt) < SUCCESS_THROTTLE_MS && lastReadyUrl) {
      if (mode === 'browser') {
        void invokeBackend('design.openExternal', [appendQueryParams(lastReadyUrl)]).catch?.(() => {});
      } else {
        mountWorkbenchIframe(lastReadyUrl, lastWorkspaceName);
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
                error: tr(activeLocale, 'error.startTimeout')
              });
            }, WORKBENCH_TIMEOUT_MS + 300);
          })
        ]);
        clearTrackedTimer(timerId);

        if (!hasExplicitLocale && res?.hostLocale) {
          applyLocalePayload({ locale: res.hostLocale }, false);
        }

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
          await invokeBackend('design.openExternal', [appendQueryParams(res.url)]);
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
        label: tr(activeLocale, 'unit.label'),
        iconSvg: DESIGN_ICON_SVG,
        title: tr(activeLocale, 'unit.title'),
        onClick() {
          void triggerOpen();
        }
      });
    }
  }

  // Subscribe to host locale + zh-cn plugin locale sticky state first
  const stopHostLocaleSub = ctx.state?.subscribe?.('state:host.locale@1', (val) => {
    applyLocalePayload(val, true);
  });
  const stopZhLangSub = ctx.state?.subscribe?.('state:zh-cn.lang@1', (val) => {
    applyLocalePayload(val, true);
  });

  if (typeof ctx.state?.get === 'function') {
    try {
      applyLocalePayload(ctx.state.get('state:host.locale@1'), true);
      if (!hasExplicitLocale) {
        applyLocalePayload(ctx.state.get('state:zh-cn.lang@1'), true);
      }
    } catch {}
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
    settings = normalizeSettings(nextValues);
    syncTopbarUnit();
  });

  const onMessage = (ev) => {
    const data = ev?.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'agy-design:ready') {
      clearTrackedTimer(cspFallbackTimer);
      cspFallbackTimer = null;
      if (workbenchIframe?.contentWindow) {
        try {
          workbenchIframe.contentWindow.postMessage({
            type: 'agy-design:locale-changed',
            locale: activeLocale
          }, '*');
        } catch {}
      }
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
          lastWorkspaceName = res.workspaceName || '';
          if (workbenchWsPill) {
            workbenchWsPill.textContent = lastWorkspaceName || tr(activeLocale, 'workbench.wsDefault');
          }
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
    stopHostLocaleSub,
    stopZhLangSub,
    stopThemeSub,
    stopContextSub,
    stopOpenEvent,
    stopPromptEvent,
    stopSettingsSub,
    stopShadowStyles,
    () => { if (typeof stopAuxStyle === 'function') stopAuxStyle(); stopAuxStyle = null; },
    () => { if (typeof stopUnit === 'function') stopUnit(); stopUnit = null; },
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
      isDisposed = true;
      hideWorkbench({ disposing: true });
      cleanupAuxListeners();
      if (sidebarHostEl && typeof sidebarHostEl.remove === 'function') {
        sidebarHostEl.remove();
      }
      if (workbenchEl && typeof workbenchEl.remove === 'function') {
        workbenchEl.remove();
      }
      sidebarHostEl = null;
      workbenchEl = null;
      workbenchBrandEl = null;
      workbenchWsPill = null;
      workbenchExternalBtn = null;
      workbenchCloseBtn = null;
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
  normalizeSettings,
  matchesShortcut,
  collectWorkspaceContext
};
