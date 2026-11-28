// Agy Design Studio (agy-plugin-design) · 工作区画廊界面模块（跟随底座 10 语种、单栏响应式布局）
import { createGalleryStrings, normalizeGalleryLocale } from './gallery-locales.mjs';

export { createGalleryStrings };

export const GALLERY_CSS = `
html[data-i18n-pending] body { visibility: hidden; }
:root {
  color-scheme: light dark;
  --dsw-alias-bg-base: light-dark(#ffffff, #18181b);
  --studio-surface: light-dark(#ffffff, #1f1f23);
  --studio-surface-2: light-dark(#f4f4f5, #27272a);
  --dsw-alias-bg-skeleton: light-dark(#f4f4f5, #27272a);
  --dsw-alias-border-l1: light-dark(#d4d4d8, #3f3f46);
  --dsw-alias-border-l2: light-dark(rgba(24, 24, 27, 0.09), rgba(244, 244, 245, 0.11));
  --dsw-alias-interactive-bg-hover: light-dark(rgba(24, 24, 27, 0.05), rgba(244, 244, 245, 0.07));
  --dsw-alias-label-primary: light-dark(#18181b, #f4f4f5);
  --dsw-alias-label-secondary: light-dark(#52525b, #a1a1aa);
  --dsw-alias-label-tertiary: light-dark(#71717a, #71717a);
  --dsw-alias-label-caption: light-dark(#a1a1aa, #52525b);
  --dsw-alias-state-business-primary: light-dark(#2563eb, #3b82f6);
  --dsw-alias-state-business-soft: light-dark(rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.16));
  --dsw-alias-state-error-primary: light-dark(#dc2626, #f87171);
  --dsw-focus-ring-color: light-dark(#2563eb, #3b82f6);
  --dsw-focus-ring-width: 2px;
  --studio-shadow-sm: light-dark(0 1px 4px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.28));
  --studio-shadow-md: light-dark(0 12px 28px -8px rgba(0, 0, 0, 0.12), 0 16px 36px -10px rgba(0, 0, 0, 0.48));
}
html[data-scheme=dark] { color-scheme: dark; }
html[data-scheme=light] { color-scheme: light; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  height: 100vh;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
button, input { font: inherit; }
.bda-page {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 1.55;
  overflow: hidden;
}

.bda-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scroll-behavior: smooth;
}
.bda-content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px clamp(14px, 2.8vw, 32px) 56px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.bda-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.bda-heading-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.bda-heading-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.bda-heading h1 {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1.25;
}
.bda-ws {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--studio-surface-2);
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bda-subtitle {
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary);
}
.bda-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-left: auto;
}
.bda-tool {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--studio-surface);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background-color .14s, border-color .14s, color .14s;
}
.bda-tool:hover, .bda-tool[aria-expanded=true] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l1);
}
.bda-tool[data-active=true]::after {
  content: "";
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary);
}
.bda-search {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(240px, 52vw);
  height: 32px;
  padding: 0 8px 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--studio-surface);
  color: var(--dsw-alias-label-tertiary);
  transition: border-color .15s, box-shadow .15s;
}
.bda-search:focus-within {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 3px var(--dsw-alias-state-business-soft);
}
.bda-search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: none;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  outline: none;
}
.bda-search input::placeholder { color: var(--dsw-alias-label-caption); }
.bda-search input::-webkit-search-cancel-button { display: none; }
.bda-search button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: -3px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  cursor: pointer;
}
.bda-search button:hover { background: var(--dsw-alias-interactive-bg-hover); }

.studio-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-margin-top: 16px;
}
.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 14px;
}
.bda-section-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--dsw-alias-label-primary);
}
.section-sub {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

.bda-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 11px;
  list-style: none;
}
.bda-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 13px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--studio-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--studio-shadow-sm);
  transition: transform .15s, border-color .15s, box-shadow .15s;
}
.bda-tile:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--bda-tint) 55%, var(--dsw-alias-border-l1));
  box-shadow: var(--studio-shadow-md);
}
.bda-tile:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);
  outline-offset: 2px;
}
.bda-tile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bda-tile-art {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--bda-tint) 16%, var(--studio-surface));
  color: color-mix(in srgb, var(--bda-tint) 82%, var(--dsw-alias-label-primary));
}
.bda-tile-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-soft);
  color: var(--dsw-alias-state-business-primary);
}
.bda-tile-label {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.3;
}
.bda-tile-about {
  font-size: 12px;
  line-height: 1.45;
  color: var(--dsw-alias-label-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.works-head-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.scope-switch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--studio-surface-2);
}
.scope-btn {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .14s, color .14s;
}
.scope-btn[data-on="true"] {
  background: var(--studio-surface);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--studio-shadow-sm);
}
.type-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--studio-surface);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color .14s, color .14s, border-color .14s;
}
.type-pill:hover {
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
}
.type-pill[data-on="true"] {
  background: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-primary);
  color: var(--studio-surface);
}

.bda-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  list-style: none;
}
.bda-item { position: relative; min-width: 0; }
.bda-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  overflow: hidden;
  background: var(--studio-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--studio-shadow-sm);
  transition: transform .16s, border-color .16s, box-shadow .16s;
}
.bda-item:hover .bda-card {
  transform: translateY(-2px);
  border-color: var(--dsw-alias-border-l1);
  box-shadow: var(--studio-shadow-md);
}
.bda-card:disabled { cursor: progress; }
.bda-card:focus-visible, .bda-row:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);
  outline-offset: 2px;
}
.bda-preview {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  background: color-mix(in srgb, var(--bda-tint) 12%, var(--dsw-alias-bg-skeleton));
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.bda-thumb { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; }
.bda-live {
  position: absolute;
  inset: 0;
  width: 1280px;
  height: 800px;
  transform-origin: 0 0;
  border: 0;
  background: #fff;
  pointer-events: none;
  opacity: 0;
  transition: opacity .3s;
  z-index: 1;
}
.bda-live.on { opacity: 1; }
.bda-sheet {
  position: absolute;
  left: 11%;
  right: 11%;
  top: 14%;
  bottom: -8px;
  border-radius: 9px 9px 0 0;
  overflow: hidden;
  background: var(--studio-surface);
  box-shadow: 0 0 0 1px var(--dsw-alias-border-l2), 0 8px 20px -8px rgba(0, 0, 0, .24);
  transition: transform .2s;
}
.bda-item:hover .bda-sheet { transform: translateY(-3px); }
.bda-slide, .bda-film, .bda-paper {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  overflow: hidden;
}
.bda-paper-title, .bda-film-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bda-line {
  margin-top: auto;
  width: 48%;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--bda-tint) 65%, var(--studio-surface));
}
.bda-boards, .bda-swatches, .bda-kpis { display: flex; gap: 6px; margin-top: auto; }
.bda-board { flex: 1; height: 28px; border-radius: 4px; border: 1px dashed var(--dsw-alias-border-l1); background: var(--dsw-alias-interactive-bg-hover); }
.bda-swatch { width: 16px; height: 16px; border-radius: 50%; background: var(--bda-tint); }
.bda-swatch:nth-child(2) { opacity: .6; }
.bda-swatch:nth-child(3) { opacity: .3; }
.bda-kpi { flex: 1; height: 24px; border-radius: 4px; background: var(--dsw-alias-interactive-bg-hover); border: 1px solid var(--dsw-alias-border-l2); }
.bda-film { background: #18181b; color: #fff; align-items: center; justify-content: center; }
.bda-film-title { color: #eee; width: 100%; text-align: center; margin-bottom: 4px; }
.bda-film-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--bda-tint); }
.bda-scope-tag {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 3;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: rgba(24, 24, 27, 0.72);
  color: #fff;
  backdrop-filter: blur(6px);
}
.bda-scope-tag[data-current="true"] {
  background: rgba(37, 99, 235, 0.88);
}
.bda-busy {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(24, 24, 27, .66);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.bda-spinner {
  width: 13px;
  height: 13px;
  border: 1.8px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.bda-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px 12px;
  min-width: 0;
}
.bda-glyph {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bda-tint) 14%, transparent);
  color: var(--bda-tint);
}
.bda-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bda-name {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 19px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bda-meta {
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bda-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity .15s;
}
.bda-item:hover .bda-actions,
.bda-item[data-menu="true"] .bda-actions,
.bda-item:focus-within .bda-actions,
.bda-item[data-pinned="true"] .bda-actions {
  opacity: 1;
}
.bda-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--studio-surface);
  box-shadow: 0 2px 6px rgba(0,0,0,.14);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.bda-act:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l1); }
.bda-act[data-on=true] { color: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }

.bda-list { display: flex; flex-direction: column; gap: 7px; list-style: none; }
.bda-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 88px 10px 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--studio-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color .14s, border-color .14s;
}
.bda-row:hover { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l1); }
.bda-row .bda-name { flex: 1; min-width: 0; }
.bda-row .bda-meta { flex: none; margin-left: 12px; }
.bda-row-tools {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
}

.missing-tray {
  margin-top: 6px;
  border-radius: 14px;
  border: 1px solid light-dark(rgba(220, 38, 38, 0.24), rgba(248, 113, 113, 0.28));
  background: light-dark(#fef2f2, rgba(220, 38, 38, 0.08));
  overflow: hidden;
}
.missing-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 16px;
}
.missing-bar-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.missing-bar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.bda-missing-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--dsw-alias-state-error-primary);
  color: #fff;
}
.missing-bar-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.missing-bar-actions { display: flex; align-items: center; gap: 8px; }
.missing-list {
  list-style: none;
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bda-item.bda-missing {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--studio-surface);
  border: 1px solid var(--dsw-alias-border-l2);
}
.missing-item-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.missing-item-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#examples {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  list-style: none;
}
.bda-example {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  overflow: hidden;
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
  transition: transform .16s, border-color .16s, box-shadow .16s;
}
.bda-example:hover {
  transform: translateY(-2px);
  border-color: var(--dsw-alias-border-l1);
  box-shadow: var(--studio-shadow-md);
}
.bda-example-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  background: var(--dsw-alias-bg-skeleton);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
}
.bda-example-stage iframe {
  position: absolute;
  left: 0;
  top: 0;
  width: 1200px;
  height: 750px;
  border: 0;
  transform-origin: 0 0;
  pointer-events: none;
  opacity: 1;
  background: #fff;
}
.bda-example-label {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 2;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(24, 24, 27, 0.76);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.7px;
  backdrop-filter: blur(4px);
}
.bda-example-body {
  padding: 13px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}
.bda-example-skill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dsw-alias-state-business-primary);
}
.bda-example h3 { font-size: 14.5px; font-weight: 700; letter-spacing: -0.2px; }
.bda-example p { font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.bda-example-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding-top: 6px;
}

#recipes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  list-style: none;
}
.recipe-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--studio-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform .15s, border-color .15s, box-shadow .15s;
}
.recipe-card:hover {
  transform: translateY(-2px);
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: var(--studio-shadow-md);
}
.recipe-step {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--dsw-alias-state-business-primary);
}
.recipe-title { font-size: 14px; font-weight: 700; margin-top: 4px; }
.bda-recipe-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.5; margin-top: 4px; }
.recipe-foot { font-size: 12px; font-weight: 600; color: var(--dsw-alias-state-business-primary); }

.bda-menu {
  position: fixed;
  z-index: 1000;
  min-width: 210px;
  padding: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 13px;
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-md);
  font-size: 13px;
}
.bda-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 5px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--dsw-alias-label-primary);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.bda-menu-item:hover, .bda-menu-item:focus-visible { background: var(--dsw-alias-interactive-bg-hover); outline: none; }
.bda-menu-item[data-danger=true] { color: var(--dsw-alias-state-error-primary); }
.bda-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.bda-menu-value { margin-left: 16px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.bda-menu-count { margin-left: 16px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.bda-menu-key { margin-left: 20px; color: var(--dsw-alias-label-tertiary); font-size: 11.5px; }
.bda-menu-rule { height: 1px; margin: 6px 4px; background: var(--dsw-alias-border-l2); }
.bda-menu-chev { margin-left: 6px; color: var(--dsw-alias-label-tertiary); }
.bda-menu-row { position: relative; }
.bda-submenu {
  position: absolute;
  right: calc(100% + 8px);
  top: -6px;
  z-index: 1001;
  min-width: 185px;
  padding: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 13px;
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-md);
  display: none;
}
.bda-menu-row:hover .bda-submenu { display: block; }
.bda-check {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 5px;
  color: transparent;
}
.bda-check[data-on=true] {
  border-color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-state-business-primary);
  color: #fff;
}
.bda-tick { flex: none; margin-left: 16px; color: var(--dsw-alias-state-business-primary); }

.bda-scrim {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(9, 9, 11, .52);
  backdrop-filter: blur(4px);
}
.bda-scrim p { max-width: 46em; line-height: 1.7; }
.bda-dialog {
  width: min(460px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--studio-surface);
  box-shadow: 0 24px 64px -12px rgba(0,0,0,.45);
}
.bda-dialog.wide { width: min(880px, 100%); }
.bda-dialog h2 { margin: 0 0 10px; font-size: 16.5px; font-weight: 700; line-height: 1.35; }
.bda-dialog p { margin: 0 0 12px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.bda-dialog input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  outline: none;
  margin-bottom: 14px;
}
.bda-dialog input:focus { border-color: var(--dsw-alias-state-business-primary); }
.bda-dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.bda-example-preview {
  overflow: hidden;
  width: 100%;
  background: var(--dsw-alias-bg-skeleton);
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  margin-bottom: 12px;
}
.bda-example-preview iframe { width: 1200px; height: 750px; border: 0; transform-origin: top left; background: #fff; }
.bda-example-skeleton { padding: 24px; background: var(--dsw-alias-bg-skeleton); border-radius: 10px; margin-bottom: 12px; }

.bda-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 31px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--studio-surface-2);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .14s, border-color .14s;
}
.bda-btn:hover { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l1); }
.bda-btn:disabled { opacity: 0.55; cursor: default; }
.bda-btn[data-primary=true] {
  border-color: transparent;
  background: var(--dsw-alias-state-business-primary);
  color: #fff;
}
.bda-btn[data-primary=true]:hover { filter: brightness(1.07); }
.bda-btn[data-danger=true] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, var(--studio-surface));
  color: var(--dsw-alias-state-error-primary);
}

.bda-toast {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(520px, calc(100% - 28px));
  padding: 10px 12px 10px 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-md);
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 500;
}
.bda-toast-undo {
  padding: 3px 9px;
  border: 0;
  border-radius: 6px;
  background: var(--dsw-alias-state-business-soft);
  color: var(--dsw-alias-state-business-primary);
  font-weight: 600;
  cursor: pointer;
}
.bda-toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.bda-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 18px;
  border-radius: 14px;
  border: 1px dashed var(--dsw-alias-border-l1);
  background: color-mix(in srgb, var(--studio-surface) 65%, transparent);
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
}
.bda-empty h2 { font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.bda-empty p { max-width: 420px; font-size: 13px; line-height: 1.65; color: var(--dsw-alias-label-secondary); }
.bda-empty-compact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 13px 15px;
  border-radius: 14px;
  border: 1px dashed var(--dsw-alias-border-l1);
  background: color-mix(in srgb, var(--studio-surface) 72%, transparent);
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.bda-empty-compact-copy { display: flex; align-items: center; gap: 9px; min-width: 0; }
.bda-empty-compact-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

#editorView {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  position: absolute;
  inset: 0;
  z-index: 500;
  background: var(--dsw-alias-bg-base);
}
.editor-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--studio-surface);
  flex: none;
}
.editor-bar .title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
#frame { flex: 1; border: 0; width: 100%; height: 100%; background: var(--dsw-alias-bg-base); }
.hidden { display: none !important; }
`;

function escHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function safeJson(v) {
  return JSON.stringify(v).replace(/</g, '\\u003c');
}

const GALLERY_CLIENT_SCRIPT = String.raw`
function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

const LOCALE_ALIAS_MAP = {
  'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-hans': 'zh-CN', 'cn': 'zh-CN',
  'zh-tw': 'zh-TW', 'zh-hant': 'zh-TW', 'zh-hk': 'zh-TW', 'tw': 'zh-TW', 'hk': 'zh-TW',
  'ja': 'ja', 'ja-jp': 'ja', 'jp': 'ja',
  'ko': 'ko', 'ko-kr': 'ko', 'kr': 'ko',
  'es': 'es', 'es-es': 'es', 'es-419': 'es', 'es-mx': 'es',
  'pt': 'pt', 'pt-br': 'pt', 'pt-pt': 'pt',
  'fr': 'fr', 'fr-fr': 'fr', 'fr-ca': 'fr',
  'ru': 'ru', 'ru-ru': 'ru',
  'it': 'it', 'it-it': 'it',
  'en': 'en', 'en-us': 'en', 'en-gb': 'en'
};

function normalizeLocale(raw, fallback) {
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase().replace(/_/g, '-');
    if (Object.hasOwn(LOCALE_ALIAS_MAP, clean)) return LOCALE_ALIAS_MAP[clean];
    const primary = clean.split('-')[0];
    if (primary && Object.hasOwn(LOCALE_ALIAS_MAP, primary)) return LOCALE_ALIAS_MAP[primary];
  }
  return fallback !== undefined ? fallback : 'zh-CN';
}

const requestedLang = new URLSearchParams(location.search).get('lang');
let lang = normalizeLocale(requestedLang || INITIAL_LANG, 'zh-CN');
if (!Object.hasOwn(STR, lang)) lang = 'zh-CN';

function locale() { return lang; }
function t(key, values = {}) {
  const dict = STR[lang] || STR['zh-CN'] || {};
  const text = dict[key] ?? (STR.en && STR.en[key]) ?? (STR['zh-CN'] && STR['zh-CN'][key]) ?? key;
  return String(text).replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}
function skillText(id, field) { return t('skill.' + id + '.' + field); }
function exampleText(example, field) { return t('example.' + example.id + '.' + field) || example[field] || ''; }

const SKILL_MAP = Object.fromEntries(SKILLS_CONFIG.map((s) => [s.id, s]));

function currentEffectiveScheme() {
  const explicit = document.documentElement.dataset.scheme;
  if (explicit === 'dark' || explicit === 'light') return explicit;
  const host = document.documentElement.dataset.hostScheme;
  if (host === 'dark' || host === 'light') return host;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

(() => {
  try {
    const q = new URLSearchParams(location.search).get('scheme');
    const s = q === 'dark' || q === 'light' ? q : '';
    if (s) { localStorage.setItem('agy-design-scheme', s); localStorage.setItem('agy-design-scheme-manual', '1'); }
    const saved = s || (localStorage.getItem('agy-design-scheme-manual') ? localStorage.getItem('agy-design-scheme') : '');
    const host = document.documentElement.dataset.hostScheme || '';
    const resolved = saved || (host === 'dark' || host === 'light' ? host : '');
    if (resolved) document.documentElement.dataset.scheme = resolved;
  } catch {}
})();

const SVG_ICONS = {
  search: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>',
  filter: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/></svg>',
  grid: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/></svg>',
  list: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5.75 4h7.75M5.75 8h7.75M5.75 12h7.75"/><path d="M2.5 4h.01M2.5 8h.01M2.5 12h.01" stroke-width="1.8"/></svg>',
  pin: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><path d="M9.75 2.25 13.75 6.25M10.75 3.25 7 6.25 4.5 6.5 9.5 11.5 9.75 9 12.75 5.25M7 9l-4 4"/></svg>',
  pinFilled: '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"><path d="M9.75 2.25 13.75 6.25M10.75 3.25 7 6.25 4.5 6.5 9.5 11.5 9.75 9 12.75 5.25M7 9l-4 4"/></svg>',
  more: '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><circle cx="3.5" cy="8" r=".9"/><circle cx="8" cy="8" r=".9"/><circle cx="12.5" cy="8" r=".9"/></svg>',
  rename: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35"><path d="M10.5 3 13 5.5 5.5 13 2.5 13.5 3 10.5 10.5 3Z"/></svg>',
  copy: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35"><path d="M6.75 9.25a2.5 2.5 0 0 0 3.54 0l2.25-2.25a2.5 2.5 0 0 0-3.54-3.54L8.25 4.2M9.25 6.75a2.5 2.5 0 0 0-3.54 0L3.46 9a2.5 2.5 0 0 0 3.54 3.54l.75-.75"/></svg>',
  trash: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35"><path d="M2.75 4.25h10.5M6.25 4.25V3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75v1.25M4 4.25l.6 8.6a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.6M6.75 7v4M9.25 7v4"/></svg>',
  tick: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m3 8.5 3.25 3.25L13 4.75"/></svg>',
  chevron: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>',
  info: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 7.5v3.25M8 5.25h.01"/></svg>',
  sun: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M12.4 3.6l-1.05 1.05M4.65 11.35 3.6 12.4"/></svg>',
  moon: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M13.2 10.1A5.5 5.5 0 0 1 5.9 2.8a5.6 5.6 0 1 0 7.3 7.3Z"/></svg>',
  spark: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M8 2l1.3 3.4L12.7 6.7 9.3 8 8 11.4 6.7 8 3.3 6.7l3.4-1.3L8 2z"/><path d="M12.5 10.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5z"/></svg>',
};

function typeIconSvg(skill, size = 18) {
  const p = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  let inner = '';
  switch (skill) {
    case 'claude-slides':
      inner = '<path d="M2.75 3.5h14.5M4 3.5v8.25a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3.5M7.25 16.75 10 12.75l2.75 4" ' + p + '/>';
      break;
    case 'claude-design':
      inner = '<path d="M10 2.75a7.25 7.25 0 1 0 0 14.5c1.1 0 1.75-.8 1.75-1.7 0-.5-.2-.9-.45-1.25-.25-.35-.45-.7-.45-1.15 0-.95.75-1.65 1.7-1.65h1.6a3.1 3.1 0 0 0 3.1-3.1c0-3.1-3.2-5.65-7.25-5.65Z" ' + p + '/><circle cx="6.4" cy="9.4" r=".9" fill="currentColor"/><circle cx="8.8" cy="6.3" r=".9" fill="currentColor"/><circle cx="12.5" cy="6.8" r=".9" fill="currentColor"/>';
      break;
    case 'claude-design-system':
      inner = '<circle cx="6.5" cy="6.5" r="3.25" ' + p + '/><circle cx="13.5" cy="6.5" r="3.25" ' + p + '/><circle cx="10" cy="13" r="3.25" ' + p + '/>';
      break;
    case 'claude-dashboard':
      inner = '<rect x="2.75" y="10" width="4.5" height="7.25" rx="1" ' + p + '/><rect x="7.75" y="2.75" width="4.5" height="14.5" rx="1" ' + p + '/><rect x="12.75" y="7" width="4.5" height="10.25" rx="1" ' + p + '/>';
      break;
    case 'claude-motion':
      inner = '<rect x="2.75" y="4" width="14.5" height="12" rx="2" ' + p + '/><path d="m8.5 7.75 4 2.25-4 2.25v-4.5Z" ' + p + '/>';
      break;
    default:
      inner = '<rect x="3" y="3" width="14" height="14" rx="2" ' + p + '/>';
  }
  return '<svg viewBox="0 0 20 20" width="' + size + '" height="' + size + '" fill="none" style="display:block;flex:none">' + inner + '</svg>';
}

function drawnHtml(skill, title) {
  const escTitle = esc(title);
  switch (skill) {
    case 'claude-slides':
      return '<div class="bda-slide"><div class="bda-paper-title">' + escTitle + '</div><div class="bda-line"></div></div>';
    case 'claude-design':
      return '<div class="bda-paper"><div class="bda-paper-title">' + escTitle + '</div><div class="bda-boards"><div class="bda-board"></div><div class="bda-board"></div></div></div>';
    case 'claude-design-system':
      return '<div class="bda-paper"><div class="bda-paper-title">' + escTitle + '</div><div class="bda-swatches"><span class="bda-swatch"></span><span class="bda-swatch"></span><span class="bda-swatch"></span></div></div>';
    case 'claude-dashboard':
      return '<div class="bda-paper"><div class="bda-paper-title">' + escTitle + '</div><div class="bda-kpis"><span class="bda-kpi"></span><span class="bda-kpi"></span></div></div>';
    case 'claude-motion':
      return '<div class="bda-film"><div class="bda-film-title">' + escTitle + '</div><svg viewBox="0 0 20 20" width="22" height="22" style="display:block;margin:auto"><path d="M7 5.5v9l7.5-4.5L7 5.5Z" fill="currentColor"/></svg><div class="bda-film-bar"></div></div>';
    default:
      return '<div class="bda-paper"><div class="bda-paper-title">' + escTitle + '</div></div>';
  }
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function ago(iso) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.round((then - Date.now()) / 1000);
  if (seconds > -60) return t('justOpened');
  const steps = [['minute', 60], ['hour', 3600], ['day', 86400], ['week', 604800], ['month', 2629800], ['year', 31557600]];
  let unit = 'minute', size = 60;
  for (const [u, s] of steps) if (-seconds >= s) [unit, size] = [u, s];
  let time;
  try {
    time = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' }).format(Math.round(seconds / size), unit);
  } catch {
    const key = unit === 'week' ? 'weekUnit' : unit === 'month' ? 'monthUnit' : unit;
    time = t('relativeFallback', { count: Math.abs(Math.round(seconds / size)), unit: t(key) });
  }
  return t('openedRelative', { time });
}

function localizedMeta(item) {
  const match = /^(\d+) /.exec(item.meta || '');
  const keys = { 'claude-design': 'boards', 'claude-slides': 'pages', 'claude-motion': 'scenes', 'claude-design-system': 'components', 'claude-dashboard': 'sheets' };
  if (match && keys[item.skill]) return t(keys[item.skill], { count: match[1] });
  return item.skill === 'claude-dashboard' && item.meta ? t('dashboard') : item.meta || '';
}

const state = {
  artifacts: [],
  workspaceName: '',
  workspaceRoot: '',
  scope: 'workspace',
  search: '',
  viewMode: readPreference('agy-design-view-mode') || 'grid',
  filters: {
    sort: 'opened',
    types: [],
    date: 'any',
    sharing: 'any',
    pinned: false,
  },
  openingRoot: null,
  showMissingDetails: false,
};

function setLocale(nextLang) {
  const norm = normalizeLocale(nextLang, '');
  if (!norm || !Object.hasOwn(STR, norm) || norm === lang) return;
  lang = norm;
  closeMenu();
  closeDialog();
  renderAll();
}

async function api(route, opts) {
  const r = await fetch(route, opts);
  return r.json();
}

const pendingParentPrompts = new Map();
let parentPromptSeq = 0;

window.addEventListener('message', (ev) => {
  const d = ev && ev.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'agy-design:locale-changed' && d.locale) {
    setLocale(d.locale);
    return;
  }
  if (d.type === 'agy-design:workspace-changed') {
    reload();
    return;
  }
  if (d.type === 'agy-design:prompt-reply' && pendingParentPrompts.has(d.reqId)) {
    const resolver = pendingParentPrompts.get(d.reqId);
    pendingParentPrompts.delete(d.reqId);
    resolver(d);
  }
});

async function startPromptWithFallback(payload) {
  const res = await api('/api/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, locale: lang }),
  });
  if (res.ok) return res;
  if (res.starter && window.parent && window.parent !== window) {
    const reqId = 'p-' + (++parentPromptSeq);
    const parentReply = await new Promise((resolve) => {
      const tid = setTimeout(() => {
        pendingParentPrompts.delete(reqId);
        resolve(null);
      }, 1200);
      pendingParentPrompts.set(reqId, (msg) => {
        clearTimeout(tid);
        resolve(msg);
      });
      try {
        window.parent.postMessage({ type: 'agy-design:prompt-request', reqId, starter: res.starter }, '*');
      } catch {
        clearTimeout(tid);
        pendingParentPrompts.delete(reqId);
        resolve(null);
      }
    });
    if (parentReply && parentReply.ok) return parentReply;
  }
  return res;
}

function showToast(msg, undoTrashId) {
  const toast = document.getElementById('toast');
  toast.innerHTML = '<span style="display:inline-flex;align-items:center">' + SVG_ICONS.info + '</span><span class="bda-toast-text">' + esc(msg) + '</span>' +
    (undoTrashId ? ('<button type="button" class="bda-toast-undo" id="toastUndoBtn">' + esc(t('undo')) + '</button>') : '') +
    '<button type="button" class="bda-toast-close" id="toastCloseBtn"><svg viewBox="0 0 16 16" width="12" height="12" stroke="currentColor" stroke-width="1.3"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg></button>';
  toast.className = 'bda-toast';
  document.getElementById('toastCloseBtn').onclick = () => { toast.className = 'hidden'; };
  if (undoTrashId) {
    document.getElementById('toastUndoBtn').onclick = async () => {
      toast.className = 'hidden';
      const r = await api('/api/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: undoTrashId }) });
      if (r.ok) {
        showToast(t('restored'));
        await reload();
      } else {
        showToast(t('restoreFailed') + (r.error || ''));
      }
    };
  }
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'hidden'; }, undoTrashId ? 10000 : 3500);
}

function closeDialog() {
  const scrim = document.getElementById('dialogScrim');
  scrim.className = 'bda-scrim hidden';
  scrim.innerHTML = '';
}

function openDialog(html, wide = false) {
  const scrim = document.getElementById('dialogScrim');
  scrim.innerHTML = '<div class="bda-dialog' + (wide ? ' wide' : '') + '">' + html + '</div>';
  scrim.className = 'bda-scrim';
  scrim.onclick = (e) => { if (e.target === scrim) closeDialog(); };
}

function closeMenu() {
  document.getElementById('menuLayer').innerHTML = '';
  document.querySelectorAll('.bda-item[data-menu="true"]').forEach((el) => el.removeAttribute('data-menu'));
}
window.addEventListener('click', (e) => {
  if (!e.target.closest('.bda-menu') && !e.target.closest('.bda-tool') && !e.target.closest('.bda-act')) {
    closeMenu();
  }
});

function validArtifacts() {
  return state.artifacts.filter((a) => !a.missing);
}
function workspaceArtifacts() {
  const all = validArtifacts();
  return state.workspaceRoot ? all.filter((a) => a.inCurrentWorkspace) : all;
}
function scopedArtifacts() {
  const all = validArtifacts();
  if (state.workspaceRoot && state.scope === 'workspace') {
    return all.filter((a) => a.inCurrentWorkspace);
  }
  return all;
}
function missingArtifacts() {
  return state.artifacts.filter((a) => a.missing);
}

function matchesFilter(item) {
  if (item.missing) return false;
  if (state.workspaceRoot && state.scope === 'workspace' && !item.inCurrentWorkspace) return false;
  const q = state.search.trim().toLowerCase();
  if (q) {
    const hay = (item.title + ' ' + (item.tail || '') + ' ' + item.skill).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (state.filters.pinned && !item.pinned) return false;
  if (state.filters.types.length && !state.filters.types.includes(item.skill)) return false;
  if (state.filters.sharing !== 'any') {
    if (state.filters.sharing === 'shared' && !item.shared) return false;
    if (state.filters.sharing === 'private' && item.shared) return false;
  }
  if (state.filters.date !== 'any') {
    const then = Date.parse(item.openedAt);
    if (!Number.isFinite(then)) return false;
    const now = Date.now();
    const day = new Date(now);
    const today = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const DAY = 86400000;
    if (state.filters.date === 'today' && then < today) return false;
    if (state.filters.date === 'yesterday' && (then < today - DAY || then >= today)) return false;
    if (state.filters.date === 'week' && then < now - 7 * DAY) return false;
    if (state.filters.date === 'month' && then < now - 30 * DAY) return false;
  }
  return true;
}

function getSortedList() {
  const list = validArtifacts().filter(matchesFilter);
  const sort = state.filters.sort;
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === 'name') return a.title.localeCompare(b.title, locale());
    const key = sort === 'updated' ? 'updatedAt' : (sort === 'created' ? 'firstOpenedAt' : 'openedAt');
    return (b[key] || '').localeCompare(a[key] || '');
  });
  return list;
}

function isFilterActive() {
  return state.filters.sort !== 'opened' || state.filters.types.length > 0 ||
    state.filters.date !== 'any' || state.filters.sharing !== 'any' || state.filters.pinned;
}

function renderSchemeButton() {
  const btn = document.getElementById('schemeBtn');
  if (!btn) return;
  const dark = currentEffectiveScheme() === 'dark';
  btn.innerHTML = dark ? SVG_ICONS.sun : SVG_ICONS.moon;
}

function renderTypePills() {
  const valid = scopedArtifacts();
  const counts = new Map();
  valid.forEach((a) => counts.set(a.skill, (counts.get(a.skill) || 0) + 1));
  const allOn = state.filters.types.length === 0;
  const pillsEl = document.getElementById('typePills');
  if (!pillsEl) return;
  pillsEl.innerHTML =
    '<button type="button" class="type-pill" data-skill-pill="" data-on="' + allOn + '">' +
    esc(t('allTypes')) + ' · ' + valid.length + '</button>' +
    SKILLS_CONFIG.map((s) =>
      '<button type="button" class="type-pill" data-skill-pill="' + esc(s.id) + '" data-on="' + state.filters.types.includes(s.id) + '">' +
      typeIconSvg(s.id, 13) +
      '<span>' + esc(skillText(s.id, 'name')) + '</span>' +
      '<span style="opacity:.7">' + (counts.get(s.id) || 0) + '</span></button>'
    ).join('');
}

async function instantiateTemplate(templateId, openAfter = true) {
  try {
    const res = await api('/api/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skill: templateId }),
    });
    if (res.ok && res.root) {
      await reload();
      const created = state.artifacts.find((a) => a.root === res.root);
      showToast(t('exampleCreatedToast', { title: created ? created.title : templateId }));
      if (openAfter && created) await openItem(created);
    } else {
      showToast(t('createFailed') + (res.error || t('unknownError')));
    }
  } catch (err) {
    showToast(t('createFailed') + err.message);
  }
}

function renderTiles() {
  const ul = document.getElementById('tiles');
  ul.innerHTML = SKILLS_CONFIG.map((s) => {
    const featured = s.id === 'claude-design-system';
    return '<li style="--bda-tint:' + s.tint + '">' +
      '<button type="button" class="bda-tile" data-skill="' + esc(s.id) + '">' +
      '<span class="bda-tile-top">' +
      '<span class="bda-tile-art">' + typeIconSvg(s.id, 20) + '</span>' +
      (featured ? ('<span class="bda-tile-pill">' + esc(t('recommendedFoundation')) + '</span>') : '') +
      '</span>' +
      '<span class="bda-tile-label">' + esc(skillText(s.id, 'name')) + '</span>' +
      '<span class="bda-tile-about">' + esc(skillText(s.id, 'about')) + '</span>' +
      '</button>' +
      '</li>';
  }).join('');
}

function renderMissingTray() {
  const tray = document.getElementById('missingTray');
  if (!tray) return;
  const missing = missingArtifacts();
  if (!missing.length) {
    tray.className = 'missing-tray hidden';
    tray.innerHTML = '';
    return;
  }
  tray.className = 'missing-tray';
  tray.innerHTML =
    '<div class="missing-bar">' +
    '<div class="missing-bar-copy">' +
    '<div class="missing-bar-title"><span class="bda-missing-badge">' + esc(t('missing')) + ' · ' + missing.length + '</span>' +
    '<span>' + esc(t('missingBannerTitle', { count: missing.length })) + '</span></div>' +
    '<div class="missing-bar-desc">' + esc(t('missingBannerDesc')) + '</div>' +
    '</div>' +
    '<div class="missing-bar-actions">' +
    '<button type="button" class="bda-btn" id="toggleMissingDetailsBtn">' + esc(state.showMissingDetails ? t('missingHide') : t('missingShow')) + '</button>' +
    '<button type="button" class="bda-btn" data-danger="true" id="clearAllMissingBtn">' + esc(t('missingClearAll', { count: missing.length })) + '</button>' +
    '</div>' +
    '</div>' +
    (state.showMissingDetails
      ? '<ul class="missing-list">' + missing.map((it) => {
          const reason = it.missingReason === 'marker_missing' ? t('missingReasonMarker') : t('missingReasonDir');
          return '<li class="bda-item bda-missing" data-root="' + esc(it.root) + '">' +
            '<div class="missing-item-main">' +
            '<span class="bda-glyph" style="--bda-tint:' + (TINTS[it.skill] || '#888') + '">' + typeIconSvg(it.skill, 16) + '</span>' +
            '<div style="min-width:0">' +
            '<div style="display:flex;align-items:center;gap:8px"><strong style="font-size:13px">' + esc(it.title) + '</strong><span style="font-size:11px;color:var(--dsw-alias-label-tertiary)">' + esc(reason) + '</span></div>' +
            '<div class="missing-item-path" title="' + esc(it.root) + '">' + esc(it.root) + '</div>' +
            '</div>' +
            '</div>' +
            '<button type="button" class="bda-btn" data-forget-root="' + esc(it.root) + '">' + esc(t('forget')) + '</button>' +
            '</li>';
        }).join('') + '</ul>'
      : '');

  document.getElementById('toggleMissingDetailsBtn').onclick = () => {
    state.showMissingDetails = !state.showMissingDetails;
    renderMissingTray();
  };
  document.getElementById('clearAllMissingBtn').onclick = async () => {
    const res = await api('/api/forget', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allMissing: true }),
    });
    if (res.ok) {
      state.showMissingDetails = false;
      showToast(t('missingClearedAll', { count: res.removed ?? missing.length }));
      await reload();
    } else {
      showToast(t('forgetFailed') + (res.error || ''));
    }
  };
  tray.querySelectorAll('[data-forget-root]').forEach((btn) => {
    btn.onclick = async () => {
      const root = btn.getAttribute('data-forget-root');
      const res = await api('/api/forget', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ root }),
      });
      showToast(res.ok ? t('forgotten') : t('forgetFailed') + (res.error || ''));
      if (res.ok) await reload();
    };
  });
}

function syncSectionOrder() {
  const wsItems = workspaceArtifacts();
  const hasActiveWorks = wsItems.length > 0 || (state.scope === 'all' && validArtifacts().length > 0);
  const desired = hasActiveWorks
    ? ['sec-works', 'sec-new', 'sec-examples', 'sec-workflows']
    : ['sec-examples', 'sec-new', 'sec-works', 'sec-workflows'];

  desired.forEach((id, idx) => {
    const order = String(idx + 1);
    const sec = document.getElementById(id);
    if (sec && sec.style.order !== order) sec.style.order = order;
  });
}

function renderScopeSwitch() {
  const wrap = document.getElementById('scopeSwitch');
  if (!wrap) return;
  const allCount = validArtifacts().length;
  const wsCount = workspaceArtifacts().length;
  if (!state.workspaceRoot || allCount === 0) {
    wrap.className = 'scope-switch hidden';
    wrap.innerHTML = '';
    return;
  }
  wrap.className = 'scope-switch';
  wrap.innerHTML =
    '<button type="button" class="scope-btn" data-scope="workspace" data-on="' + (state.scope === 'workspace') + '">' +
    esc(t('scopeWorkspace', { count: wsCount })) + '</button>' +
    '<button type="button" class="scope-btn" data-scope="all" data-on="' + (state.scope === 'all') + '">' +
    esc(t('scopeAll', { count: allCount })) + '</button>';
  wrap.onclick = (e) => {
    const btn = e.target.closest('[data-scope]');
    if (!btn) return;
    state.scope = btn.getAttribute('data-scope');
    renderItems();
  };
}

function renderItems() {
  syncSectionOrder();
  renderTypePills();
  renderMissingTray();
  renderScopeSwitch();

  const container = document.getElementById('container');
  const items = getSortedList();
  const isGrid = state.viewMode === 'grid';
  document.getElementById('viewModeIcon').innerHTML = isGrid ? SVG_ICONS.list : SVG_ICONS.grid;
  document.getElementById('viewModeBtn').title = isGrid ? t('listView') : t('gridView');
  document.getElementById('filterBtn').setAttribute('data-active', isFilterActive() ? 'true' : 'false');
  document.getElementById('listHeading').textContent = t('allWorksCount', { count: items.length });

  if (!items.length) {
    const filtered = Boolean(state.search || isFilterActive());
    if (filtered) {
      container.innerHTML = '<div class="bda-empty">' +
        SVG_ICONS.info +
        '<h2>' + esc(t('noMatches')) + '</h2>' +
        '<p>' + esc(t('clearHint')) + '</p>' +
        '<button type="button" class="bda-btn" id="clearFilterBtn" style="margin-top:10px">' + esc(t('clearFilters')) + '</button>' +
        '</div>';
      const clearBtn = document.getElementById('clearFilterBtn');
      if (clearBtn) {
        clearBtn.onclick = () => {
          state.filters = { sort: 'opened', types: [], date: 'any', sharing: 'any', pinned: false };
          state.search = '';
          document.getElementById('q').value = '';
          document.getElementById('clearSearch').className = 'hidden';
          renderItems();
        };
      }
      return;
    }

    const otherCount = Math.max(0, validArtifacts().length - workspaceArtifacts().length);
    container.innerHTML = '<div class="bda-empty-compact">' +
      '<div class="bda-empty-compact-copy">' + SVG_ICONS.info + '<span>' + esc(t('emptyCompactText')) + '</span></div>' +
      '<div class="bda-empty-compact-actions">' +
      (otherCount > 0 && state.scope === 'workspace'
        ? ('<button type="button" class="bda-btn" id="emptyShowAllBtn">' + esc(t('emptyShowOtherWs', { count: otherCount })) + '</button>')
        : '') +
      '<button type="button" class="bda-btn" data-primary="true" id="emptyCreateSampleBtn">' + esc(t('emptyCreateSample')) + '</button>' +
      '</div></div>';
    const showAllBtn = document.getElementById('emptyShowAllBtn');
    if (showAllBtn) {
      showAllBtn.onclick = () => {
        state.scope = 'all';
        renderItems();
      };
    }
    const sampleBtn = document.getElementById('emptyCreateSampleBtn');
    if (sampleBtn) sampleBtn.onclick = () => instantiateTemplate('claude-design', true);
    return;
  }

  if (isGrid) {
    container.innerHTML = '<ul class="bda-grid">' + items.map((it) => {
      const isOpening = state.openingRoot === it.root;
      const scopeLabel = state.workspaceRoot ? (it.inCurrentWorkspace ? t('currentWsBadge') : t('otherWsBadge')) : '';
      return '<li class="bda-item" data-root="' + esc(it.root) + '" data-skill="' + esc(it.skill) + '" data-pinned="' + Boolean(it.pinned) + '" style="--bda-tint:' + (TINTS[it.skill] || '#2563eb') + '">' +
        '<button type="button" class="bda-card" data-act="open" ' + (isOpening ? 'disabled' : '') + '>' +
        '<span class="bda-preview">' +
        '<span class="bda-sheet">' + drawnHtml(it.skill, it.title) + '</span>' +
        (it.preview ? '<iframe class="bda-live" data-src="/api/preview?skill=' + encodeURIComponent(it.skill) + '&root=' + encodeURIComponent(it.root) + '" tabindex="-1" sandbox="allow-scripts" title="' + esc(t('projectPreview')) + '"></iframe>' : '') +
        (it.thumb ? '<img class="bda-thumb" src="/api/thumb?root=' + encodeURIComponent(it.root) + '" alt="" onerror="this.remove()">' : '') +
        (scopeLabel ? '<span class="bda-scope-tag" data-current="' + Boolean(it.inCurrentWorkspace) + '">' + esc(scopeLabel) + '</span>' : '') +
        (isOpening ? ('<span class="bda-busy"><span class="bda-spinner"></span>' + esc(t('opening')) + '</span>') : '') +
        '</span>' +
        '<span class="bda-info">' +
        '<span class="bda-glyph">' + typeIconSvg(it.skill, 18) + '</span>' +
        '<span class="bda-text">' +
        '<span class="bda-name" title="' + esc(it.title) + '">' + esc(it.title) + '</span>' +
        '<span class="bda-meta">' + esc(localizedMeta(it) ? localizedMeta(it) + ' · ' : '') + esc(ago(it.openedAt)) + (it.note ? ' · ' + esc(it.note) : '') + '</span>' +
        '</span>' +
        '</span>' +
        '</button>' +
        '<div class="bda-actions">' +
        '<button type="button" class="bda-act" data-act="more" title="' + esc(t('more')) + '">' + SVG_ICONS.more + '</button>' +
        '<button type="button" class="bda-act" data-act="pin" data-on="' + Boolean(it.pinned) + '" title="' + esc(it.pinned ? t('unpin') : t('pin')) + '">' +
        (it.pinned ? SVG_ICONS.pinFilled : SVG_ICONS.pin) +
        '</button>' +
        '</div>' +
        '</li>';
    }).join('') + '</ul>';
  } else {
    container.innerHTML = '<ul class="bda-list">' + items.map((it) => {
      const isOpening = state.openingRoot === it.root;
      return '<li class="bda-item" data-root="' + esc(it.root) + '" data-skill="' + esc(it.skill) + '" style="--bda-tint:' + (TINTS[it.skill] || '#2563eb') + '">' +
        '<button type="button" class="bda-row" data-act="open" ' + (isOpening ? 'disabled' : '') + '>' +
        '<span class="bda-glyph">' + (isOpening ? '<span class="bda-spinner"></span>' : typeIconSvg(it.skill, 18)) + '</span>' +
        '<span class="bda-name">' + esc(it.title) + '</span>' +
        '<span class="bda-meta">' + esc(localizedMeta(it) ? localizedMeta(it) + ' · ' : '') + esc(ago(it.openedAt)) + (it.note ? ' · ' + esc(it.note) : '') + '</span>' +
        '</button>' +
        '<div class="bda-row-tools">' +
        '<button type="button" class="bda-act" data-act="pin" data-on="' + Boolean(it.pinned) + '" title="' + esc(it.pinned ? t('unpin') : t('pin')) + '">' +
        (it.pinned ? SVG_ICONS.pinFilled : SVG_ICONS.pin) +
        '</button>' +
        '<button type="button" class="bda-act" data-act="more" title="' + esc(t('more')) + '">' + SVG_ICONS.more + '</button>' +
        '</div>' +
        '</li>';
    }).join('') + '</ul>';
  }

  activateLivePreviews(container);
}

function rescaleStageFrames() {
  document.querySelectorAll('[data-stage-example]').forEach((stage) => {
    const f = stage.querySelector('iframe');
    if (!f) return;
    const w = stage.clientWidth || 320;
    f.style.transform = 'scale(' + (w / 1200) + ')';
  });
  document.querySelectorAll('.bda-live.on').forEach((f) => {
    const w = (f.parentElement && f.parentElement.clientWidth) || 320;
    f.style.transform = 'scale(' + (w / 1280) + ')';
  });
}

const stageResizeObserver = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver(() => rescaleStageFrames())
  : null;
window.addEventListener('resize', rescaleStageFrames, { passive: true });

function activateLivePreviews(container) {
  const scrollRoot = document.getElementById('mainScroll');
  const mount = (f) => {
    if (f.dataset.mounted === '1') return;
    f.dataset.mounted = '1';
    const w = (f.parentElement && f.parentElement.clientWidth) || 320;
    f.style.transform = 'scale(' + (w / 1280) + ')';
    f.addEventListener('load', () => f.classList.add('on'), { once: true });
    f.src = f.getAttribute('data-src');
    setTimeout(() => f.classList.add('on'), 600);
    if (stageResizeObserver && f.parentElement) stageResizeObserver.observe(f.parentElement);
  };
  if (typeof IntersectionObserver === 'undefined') {
    container.querySelectorAll('.bda-live[data-src]').forEach(mount);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      mount(e.target);
    }
  }, { root: scrollRoot, rootMargin: '260px' });
  container.querySelectorAll('.bda-live[data-src]').forEach((f) => io.observe(f));
}

function activateExampleStages(container) {
  container.querySelectorAll('[data-stage-example]').forEach((stage) => {
    const exId = stage.getAttribute('data-stage-example');
    const ex = OFFICIAL_EXAMPLES.find((x) => x.id === exId);
    if (!ex || !ex.html) return;
    const f = stage.querySelector('iframe');
    if (!f) return;
    const w = stage.clientWidth || 320;
    f.style.transform = 'scale(' + (w / 1200) + ')';
    f.srcdoc = ex.html;
    if (stageResizeObserver) stageResizeObserver.observe(stage);
  });
}

async function openItem(item) {
  state.openingRoot = item.root;
  renderItems();
  try {
    const res = await api('/api/open', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skill: item.skill, root: item.root }),
    });
    if (!res.ok) {
      showToast(t('cannotOpen') + (res.error || t('unknownError')));
      return;
    }
    const frame = document.getElementById('frame');
    document.getElementById('editorTitle').textContent = item.title + ' · ' + skillText(item.skill, 'name');
    frame.src = res.url;
    document.getElementById('popBtn').onclick = () => window.open(res.url, '_blank');
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('editorView').classList.remove('hidden');
    history.pushState({ editor: true }, '', '#editor');
  } catch (err) {
    showToast(t('openFailed') + err.message);
  } finally {
    state.openingRoot = null;
    renderItems();
  }
}

function backToGallery() {
  document.getElementById('editorView').classList.add('hidden');
  document.getElementById('listView').classList.remove('hidden');
  document.getElementById('frame').src = 'about:blank';
  if (location.hash) history.replaceState({}, '', location.pathname + location.search);
  reload();
}
window.addEventListener('popstate', () => {
  if (!document.getElementById('editorView').classList.contains('hidden')) backToGallery();
});
document.getElementById('backBtn').onclick = backToGallery;

function showActionsMenu(item, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const layer = document.getElementById('menuLayer');
  anchorEl.closest('.bda-item')?.setAttribute('data-menu', 'true');
  layer.innerHTML = '<div class="bda-menu" style="left:' + Math.min(rect.left, Math.max(8, window.innerWidth - 220)) + 'px;top:' + (rect.bottom + 6) + 'px">' +
    '<button type="button" class="bda-menu-item" data-menu-action="pin">' +
    SVG_ICONS.pin + '<span class="bda-menu-label">' + esc(item.pinned ? t('unpin') : t('pin')) + '</span><kbd class="bda-menu-key">P</kbd>' +
    '</button>' +
    '<button type="button" class="bda-menu-item" data-menu-action="rename">' +
    SVG_ICONS.rename + '<span class="bda-menu-label">' + esc(t('rename')) + '</span><kbd class="bda-menu-key">R</kbd>' +
    '</button>' +
    '<button type="button" class="bda-menu-item" data-menu-action="recreate">' +
    SVG_ICONS.spark + '<span class="bda-menu-label">' + esc(t('recreate')) + '</span><kbd class="bda-menu-key">S</kbd>' +
    '</button>' +
    '<button type="button" class="bda-menu-item" data-menu-action="copy">' +
    SVG_ICONS.copy + '<span class="bda-menu-label">' + esc(t('copyLink')) + '</span><kbd class="bda-menu-key">C</kbd>' +
    '</button>' +
    '<div class="bda-menu-rule"></div>' +
    '<button type="button" class="bda-menu-item" data-menu-action="delete" data-danger="true">' +
    SVG_ICONS.trash + '<span class="bda-menu-label">' + esc(t('delete')) + '</span><kbd class="bda-menu-key">Del</kbd>' +
    '</button>' +
    '</div>';

  const menu = layer.querySelector('.bda-menu');
  menu.onclick = async (e) => {
    const btn = e.target.closest('[data-menu-action]');
    if (!btn) return;
    const act = btn.getAttribute('data-menu-action');
    closeMenu();
    if (act === 'pin') {
      await api('/api/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: item.root, pinned: !item.pinned }) });
      await reload();
    } else if (act === 'rename') {
      openRenameDialog(item);
    } else if (act === 'recreate') {
      const res = await startPromptWithFallback({ root: item.root });
      if (res.ok) showToast(t('remixSent', { outcome: res.outcome || 'chat' }));
      else {
        try { await navigator.clipboard.writeText(res.starter || ''); showToast(t('draftCopied') + (res.error || '')); }
        catch { showToast(t('remixFailed') + (res.error || '')); }
      }
    } else if (act === 'copy') {
      const res = await api('/api/open', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skill: item.skill, root: item.root }) });
      if (res.ok && res.url) {
        await navigator.clipboard.writeText(res.url);
        showToast(t('linkCopied'));
      } else {
        showToast(t('linkFailed'));
      }
    } else if (act === 'delete') {
      openDeleteDialog(item);
    }
  };
}

function openRenameDialog(item) {
  openDialog(
    '<h2>' + esc(t('renameTitle')) + '</h2>' +
    '<p>' + esc(t('renameDescription', { title: item.title })) + '</p>' +
    '<input id="renameInput" value="' + esc(item.title) + '" maxlength="200" autofocus>' +
    '<div class="bda-dialog-actions">' +
    '<button type="button" class="bda-btn" id="renameCancel">' + esc(t('cancel')) + '</button>' +
    '<button type="button" class="bda-btn" data-primary="true" id="renameSave">' + esc(t('save')) + '</button>' +
    '</div>'
  );
  const input = document.getElementById('renameInput');
  input.focus();
  input.select();
  document.getElementById('renameCancel').onclick = closeDialog;
  document.getElementById('renameSave').onclick = async () => {
    const val = input.value.trim();
    if (!val || val === item.title) return closeDialog();
    closeDialog();
    const res = await api('/api/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: item.root, title: val, skill: item.skill }) });
    if (res.ok) {
      showToast(t('renamed', { title: val }));
      await reload();
    } else {
      showToast(t('renameFailed') + (res.error || ''));
    }
  };
}

function openDeleteDialog(item) {
  const desc = item.deletable ? t('deleteMove') : t('deleteKeep') + item.root;
  openDialog(
    '<h2>' + esc(t('deleteTitle', { title: item.title })) + '</h2>' +
    '<p>' + esc(desc) + '</p>' +
    '<div class="bda-dialog-actions">' +
    '<button type="button" class="bda-btn" id="deleteCancel">' + esc(t('cancel')) + '</button>' +
    '<button type="button" class="bda-btn" data-danger="true" id="deleteConfirm">' + esc(t('delete')) + '</button>' +
    '</div>'
  );
  document.getElementById('deleteCancel').onclick = closeDialog;
  document.getElementById('deleteConfirm').onclick = async () => {
    closeDialog();
    const res = await api('/api/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: item.root }) });
    if (res.ok) {
      showToast(item.deletable ? t('deleted', { title: item.title }) : t('removed', { title: item.title }), res.trash);
      await reload();
    } else {
      showToast(t('deleteFailed') + (res.error || ''));
    }
  };
}

function openCreateDialog(skillId) {
  const s = SKILL_MAP[skillId];
  if (!s) return;
  const canScaffold = Boolean(EXAMPLE_TEMPLATES[skillId]);
  openDialog(
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;color:' + (TINTS[s.id] || 'inherit') + '">' +
    typeIconSvg(s.id, 24) +
    '<h2 style="margin:0;color:var(--dsw-alias-label-primary)">' + esc(t('createTitle', { title: skillText(s.id, 'name') })) + '</h2>' +
    '</div>' +
    '<p>' + esc(skillText(s.id, 'about')) + '</p>' +
    '<div class="bda-dialog-actions">' +
    '<button type="button" class="bda-btn" id="createCancel">' + esc(t('cancel')) + '</button>' +
    '<button type="button" class="bda-btn" id="copyPromptBtn">' + esc(t('copyPrompt')) + '</button>' +
    (!canScaffold ? ('<button type="button" class="bda-btn" data-primary="true" id="sendAgentPromptBtn">' + esc(t('sendToAgent')) + '</button>') : '') +
    (canScaffold ? ('<button type="button" class="bda-btn" data-primary="true" id="createScaffoldBtn">' + esc(t('createBlank')) + '</button>') : '') +
    '</div>'
  );
  document.getElementById('createCancel').onclick = closeDialog;
  document.getElementById('copyPromptBtn').onclick = async () => {
    try {
      await navigator.clipboard.writeText(skillText(s.id, 'prompt'));
      closeDialog();
      showToast(t('promptCopied'));
    } catch {
      showToast(t('copyFailed') + skillText(s.id, 'prompt'));
    }
  };
  if (!canScaffold) {
    document.getElementById('sendAgentPromptBtn').onclick = async () => {
      closeDialog();
      const res = await startPromptWithFallback({ skill: s.id });
      if (res.ok) showToast(t('exampleStarted'));
      else {
        try { await navigator.clipboard.writeText(res.starter || skillText(s.id, 'prompt')); showToast(t('promptCopied')); }
        catch { showToast(t('copyFailed') + (res.starter || skillText(s.id, 'prompt'))); }
      }
    };
  }
  if (canScaffold) {
    document.getElementById('createScaffoldBtn').onclick = async () => {
      closeDialog();
      await instantiateTemplate(skillId, true);
    };
  }
}

function showFilterMenu(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const layer = document.getElementById('menuLayer');
  const typeCounts = new Map();
  validArtifacts().forEach((a) => typeCounts.set(a.skill, (typeCounts.get(a.skill) || 0) + 1));
  const sortLabels = { opened: t('sortOpened'), updated: t('sortUpdated'), created: t('sortCreated'), name: t('sortName') };
  const dateLabels = { any: t('any'), today: t('today'), yesterday: t('yesterday'), week: t('week'), month: t('month') };
  const shareLabels = { any: t('any'), shared: t('shared'), private: t('private') };

  layer.innerHTML = '<div class="bda-menu" style="right:' + Math.max(8, window.innerWidth - rect.right) + 'px;top:' + (rect.bottom + 6) + 'px">' +
    '<div class="bda-menu-row">' +
    '<button type="button" class="bda-menu-item">' +
    '<span class="bda-menu-label">' + esc(t('sortBy')) + '</span><span class="bda-menu-value">' + esc(sortLabels[state.filters.sort]) + '</span><span class="bda-menu-chev">' + SVG_ICONS.chevron + '</span>' +
    '</button>' +
    '<div class="bda-submenu">' +
    Object.entries(sortLabels).map(([k, v]) =>
      '<button type="button" class="bda-menu-item" data-set-sort="' + k + '"><span class="bda-menu-label">' + esc(v) + '</span>' +
      (state.filters.sort === k ? '<span class="bda-tick">' + SVG_ICONS.tick + '</span>' : '') + '</button>'
    ).join('') +
    '</div></div>' +
    '<div class="bda-menu-rule"></div>' +
    '<div class="bda-menu-row">' +
    '<button type="button" class="bda-menu-item">' +
    '<span class="bda-menu-label">' + esc(t('type')) + '</span><span class="bda-menu-value">' + esc(state.filters.types.length ? state.filters.types.length + t('selectedSuffix') : t('any')) + '</span><span class="bda-menu-chev">' + SVG_ICONS.chevron + '</span>' +
    '</button>' +
    '<div class="bda-submenu">' +
    SKILLS_CONFIG.map((s) => {
      const on = state.filters.types.includes(s.id);
      return '<button type="button" class="bda-menu-item" data-toggle-type="' + s.id + '">' +
        '<span class="bda-check" data-on="' + on + '">' + (on ? SVG_ICONS.tick : '') + '</span>' +
        '<span class="bda-menu-label">' + esc(skillText(s.id, 'name')) + '</span>' +
        '<span class="bda-menu-count">' + (typeCounts.get(s.id) || 0) + '</span></button>';
    }).join('') +
    '</div></div>' +
    '<div class="bda-menu-row">' +
    '<button type="button" class="bda-menu-item">' +
    '<span class="bda-menu-label">' + esc(t('openedAt')) + '</span><span class="bda-menu-value">' + esc(dateLabels[state.filters.date]) + '</span><span class="bda-menu-chev">' + SVG_ICONS.chevron + '</span>' +
    '</button>' +
    '<div class="bda-submenu">' +
    Object.entries(dateLabels).map(([k, v]) =>
      '<button type="button" class="bda-menu-item" data-set-date="' + k + '"><span class="bda-menu-label">' + esc(v) + '</span>' +
      (state.filters.date === k ? '<span class="bda-tick">' + SVG_ICONS.tick + '</span>' : '') + '</button>'
    ).join('') +
    '</div></div>' +
    '<div class="bda-menu-row">' +
    '<button type="button" class="bda-menu-item">' +
    '<span class="bda-menu-label">' + esc(t('sharing')) + '</span><span class="bda-menu-value">' + esc(shareLabels[state.filters.sharing]) + '</span><span class="bda-menu-chev">' + SVG_ICONS.chevron + '</span>' +
    '</button>' +
    '<div class="bda-submenu">' +
    Object.entries(shareLabels).map(([k, v]) =>
      '<button type="button" class="bda-menu-item" data-set-share="' + k + '"><span class="bda-menu-label">' + esc(v) + '</span>' +
      (state.filters.sharing === k ? '<span class="bda-tick">' + SVG_ICONS.tick + '</span>' : '') + '</button>'
    ).join('') +
    '</div></div>' +
    '<div class="bda-menu-rule"></div>' +
    '<button type="button" class="bda-menu-item" data-toggle-pinned="true">' +
    '<span class="bda-menu-label">' + esc(t('pinned')) + '</span>' + (state.filters.pinned ? '<span class="bda-tick">' + SVG_ICONS.tick + '</span>' : '') +
    '</button>' +
    (isFilterActive() ? ('<button type="button" class="bda-menu-item" data-clear-filters="true"><span class="bda-menu-label">' + esc(t('clearFilters')) + '</span></button>') : '') +
    '</div>';

  const menu = layer.querySelector('.bda-menu');
  menu.onclick = (e) => {
    const tSort = e.target.closest('[data-set-sort]');
    if (tSort) { state.filters.sort = tSort.getAttribute('data-set-sort'); closeMenu(); renderItems(); return; }
    const tType = e.target.closest('[data-toggle-type]');
    if (tType) {
      const sk = tType.getAttribute('data-toggle-type');
      if (state.filters.types.includes(sk)) state.filters.types = state.filters.types.filter((x) => x !== sk);
      else state.filters.types.push(sk);
      closeMenu(); renderItems(); return;
    }
    const tDate = e.target.closest('[data-set-date]');
    if (tDate) { state.filters.date = tDate.getAttribute('data-set-date'); closeMenu(); renderItems(); return; }
    const tShare = e.target.closest('[data-set-share]');
    if (tShare) { state.filters.sharing = tShare.getAttribute('data-set-share'); closeMenu(); renderItems(); return; }
    if (e.target.closest('[data-toggle-pinned]')) { state.filters.pinned = !state.filters.pinned; closeMenu(); renderItems(); return; }
    if (e.target.closest('[data-clear-filters]')) {
      state.filters = { sort: 'opened', types: [], date: 'any', sharing: 'any', pinned: false };
      closeMenu(); renderItems();
    }
  };
}

function openExamplePreviewModal(example) {
  openDialog(
    '<h2>' + esc(exampleText(example, 'title')) + '</h2>' +
    '<p>' + esc(exampleText(example, 'desc')) + '</p>' +
    (example.html
      ? '<div class="bda-example-preview" id="examplePreview"><iframe sandbox="" title="' + esc(t('previewTitle', { title: exampleText(example, 'title') })) + '"></iframe></div>'
      : '<div class="bda-example-skeleton">' + drawnHtml(example.skill, exampleText(example, 'title')) + '<p>' + esc(t('exampleSkeleton')) + '</p></div>') +
    '<p>' + esc(exampleText(example, 'points')) + '</p>' +
    '<div class="bda-dialog-actions">' +
    '<button type="button" class="bda-btn" id="exampleClose">' + esc(t('close')) + '</button>' +
    '<button type="button" class="bda-btn" data-primary="true" id="exampleInstantiateBtn">' + esc(t('useTemplate')) + '</button>' +
    '</div>',
    true
  );
  document.getElementById('exampleClose').onclick = closeDialog;
  document.getElementById('exampleInstantiateBtn').onclick = async () => {
    closeDialog();
    await instantiateTemplate(example.id, true);
  };
  if (example.html) {
    const preview = document.getElementById('examplePreview');
    const frame = preview.querySelector('iframe');
    const scale = Math.min(1, (preview.clientWidth || 820) / 1200);
    preview.style.height = Math.round(750 * scale) + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    frame.srcdoc = example.html;
  }
}

function renderExamples() {
  const ul = document.getElementById('examples');
  ul.innerHTML = OFFICIAL_EXAMPLES.map((example) =>
    '<li class="bda-example">' +
    '<div class="bda-example-stage" data-stage-example="' + esc(example.id) + '" data-act="preview" data-example="' + esc(example.id) + '">' +
    (example.label ? '<span class="bda-example-label">' + esc(example.label) + '</span>' : '') +
    '<iframe sandbox="" tabindex="-1" title="' + esc(exampleText(example, 'title')) + '"></iframe>' +
    '</div>' +
    '<div class="bda-example-body">' +
    '<span class="bda-example-skill">' + typeIconSvg(example.skill, 15) + esc(skillText(example.skill, 'name')) + '</span>' +
    '<h3>' + esc(exampleText(example, 'title')) + '</h3>' +
    '<p>' + esc(exampleText(example, 'desc')) + '</p>' +
    '<div class="bda-example-actions">' +
    '<button type="button" class="bda-btn" data-primary="true" data-act="instantiate" data-example="' + esc(example.id) + '">' + esc(t('useTemplate')) + '</button>' +
    '<button type="button" class="bda-btn" data-act="preview" data-example="' + esc(example.id) + '">' + esc(t('preview')) + '</button>' +
    '<button type="button" class="bda-btn" data-act="start" data-example="' + esc(example.id) + '">' + esc(t('recreate')) + '</button>' +
    '</div>' +
    '</div>' +
    '</li>'
  ).join('');
  activateExampleStages(ul);
}

function renderRecipes() {
  const ul = document.getElementById('recipes');
  ul.innerHTML = RECIPES.map((r, idx) =>
    '<li><button type="button" class="recipe-card" data-recipe="' + esc(r.id) + '">' +
    '<div><div class="recipe-step">WORKFLOW 0' + (idx + 1) + '</div>' +
    '<div class="recipe-title">' + esc(t('recipe.' + r.id + '.title')) + '</div>' +
    '<div class="bda-recipe-desc">' + esc(t('recipe.' + r.id + '.desc')) + '</div></div>' +
    '<div class="recipe-foot">' + esc(t('runWorkflow')) + '</div>' +
    '</button></li>'
  ).join('');
}

function updateWorkspaceBadge() {
  const el = document.getElementById('wsLabel');
  if (!el) return;
  el.textContent = state.workspaceName ? state.workspaceName : t('noWorkspace');
  el.title = state.workspaceRoot || '';
}

function renderAll() {
  document.documentElement.lang = locale();
  document.title = t('works') + ' · Agy Design Studio';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  updateWorkspaceBadge();
  renderSchemeButton();
  renderTiles();
  renderExamples();
  renderRecipes();
  renderItems();
  document.documentElement.removeAttribute('data-i18n-pending');
}

document.getElementById('typePills').onclick = (e) => {
  const btn = e.target.closest('[data-skill-pill]');
  if (!btn) return;
  const sk = btn.getAttribute('data-skill-pill');
  if (!sk) state.filters.types = [];
  else if (state.filters.types.length === 1 && state.filters.types[0] === sk) state.filters.types = [];
  else state.filters.types = [sk];
  renderItems();
};

document.getElementById('tiles').onclick = (e) => {
  const btn = e.target.closest('.bda-tile');
  if (btn && btn.getAttribute('data-skill')) openCreateDialog(btn.getAttribute('data-skill'));
};

document.getElementById('examples').onclick = async (e) => {
  const target = e.target.closest('[data-act][data-example]');
  if (!target) return;
  const example = OFFICIAL_EXAMPLES.find((x) => x.id === target.getAttribute('data-example'));
  if (!example) return;
  const act = target.getAttribute('data-act');
  if (act === 'preview') {
    openExamplePreviewModal(example);
    return;
  }
  if (act === 'instantiate') {
    target.disabled = true;
    try { await instantiateTemplate(example.id, true); }
    finally { target.disabled = false; }
    return;
  }
  if (act === 'start') {
    target.disabled = true;
    try {
      const res = await startPromptWithFallback({ example: example.id });
      if (res.ok) showToast(t('exampleStarted'));
      else if (res.starter) {
        try { await navigator.clipboard.writeText(res.starter); showToast(t('draftCopied') + (res.error || '')); }
        catch { showToast(t('startFailed') + (res.error || '') + t('draftPrefix') + res.starter); }
      } else showToast(t('startFailed') + (res.error || t('unknownError')));
    } catch (err) {
      showToast(t('startFailed') + err.message);
    } finally {
      target.disabled = false;
    }
  }
};

document.getElementById('recipes').onclick = async (e) => {
  const btn = e.target.closest('[data-recipe]');
  if (!btn) return;
  const res = await startPromptWithFallback({ recipe: btn.getAttribute('data-recipe') });
  if (res.ok) showToast(t('workflowSent', { outcome: res.outcome || 'chat' }));
  else {
    try { await navigator.clipboard.writeText(res.starter || ''); showToast(t('draftCopied') + (res.error || '')); }
    catch { showToast(t('workflowFailed') + (res.error || '')); }
  }
};

document.getElementById('container').onclick = async (e) => {
  const itemEl = e.target.closest('.bda-item');
  if (!itemEl) return;
  const root = itemEl.getAttribute('data-root');
  const item = state.artifacts.find((a) => a.root === root);
  if (!item) return;

  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const act = btn.getAttribute('data-act');
  if (act === 'open') await openItem(item);
  else if (act === 'pin') {
    await api('/api/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: item.root, pinned: !item.pinned }) });
    await reload();
  } else if (act === 'more') {
    showActionsMenu(item, btn);
  }
};

const qInput = document.getElementById('q');
const clearSearchBtn = document.getElementById('clearSearch');
qInput.oninput = () => {
  state.search = qInput.value;
  clearSearchBtn.className = state.search ? '' : 'hidden';
  renderItems();
};
clearSearchBtn.onclick = () => {
  qInput.value = '';
  state.search = '';
  clearSearchBtn.className = 'hidden';
  qInput.focus();
  renderItems();
};
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== qInput && !document.querySelector('.bda-scrim:not(.hidden)')) {
    e.preventDefault();
    qInput.focus();
  } else if (e.key === 'Escape') {
    if (!document.getElementById('dialogScrim').classList.contains('hidden')) closeDialog();
    else if (document.getElementById('menuLayer').innerHTML) closeMenu();
    else if (qInput.value) clearSearchBtn.click();
  }
});

document.getElementById('viewModeBtn').onclick = () => {
  state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
  writePreference('agy-design-view-mode', state.viewMode);
  renderItems();
};
document.getElementById('filterBtn').onclick = (e) => showFilterMenu(e.currentTarget);

document.getElementById('schemeBtn').onclick = () => {
  const next = currentEffectiveScheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.scheme = next;
  writePreference('agy-design-scheme', next);
  writePreference('agy-design-scheme-manual', '1');
  renderSchemeButton();
};

document.getElementById('reloadBtn').onclick = async () => {
  await reload();
  showToast(t('refreshed'));
};

window.addEventListener('focus', () => {
  void reload();
});

async function reload() {
  try {
    const res = await api('/api/list');
    if (res.ok) {
      state.artifacts = res.artifacts || [];
      state.workspaceName = res.workspaceName || '';
      state.workspaceRoot = res.workspaceRoot || '';
      if (res.hostLocale) {
        const nextLocale = normalizeLocale(res.hostLocale, '');
        if (nextLocale && Object.hasOwn(STR, nextLocale) && nextLocale !== lang) {
          lang = nextLocale;
          renderAll();
          return;
        }
      }
      updateWorkspaceBadge();
      renderItems();
    }
  } catch (err) {
    showToast(t('loadFailed') + err.message);
  }
}

renderAll();
reload();
try {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'agy-design:ready' }, '*');
  }
} catch {}
`;

export function buildGalleryHtml({
  requestedLang = 'zh-CN',
  requestedScheme = '',
  resolvedHostScheme = '',
  skills,
  tints,
  recipes,
  examples,
  templatesMap,
}) {
  const initialLang = normalizeGalleryLocale(requestedLang || 'zh-CN');
  const hostSchemeValue = requestedScheme === 'dark' || requestedScheme === 'light'
    ? requestedScheme
    : resolvedHostScheme;
  const galleryStr = createGalleryStrings(skills, recipes, examples);
  const dict = galleryStr[initialLang] || galleryStr['zh-CN'];
  const text = (key) => escHtml(dict[key] ?? galleryStr.en[key] ?? galleryStr['zh-CN'][key] ?? key);

  return `<!doctype html>
<html data-i18n-pending lang="${initialLang}" data-initial-lang="${initialLang}"${hostSchemeValue ? ` data-host-scheme="${hostSchemeValue}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${text('works')} · Agy Design Studio</title>
<script>
try {
  const requested = new URLSearchParams(location.search).get('lang');
  if (requested) document.documentElement.lang = requested;
} catch {}
</script>
<style>${GALLERY_CSS}</style>
</head>
<body>

<div class="bda-page" id="listView">
  <div class="bda-scroll" id="mainScroll">
    <div class="bda-content">
      <header class="bda-heading">
        <div class="bda-heading-title">
          <div class="bda-heading-row">
            <h1 data-i18n="works">${text('works')}</h1>
            <span class="bda-ws" id="wsLabel">${text('noWorkspace')}</span>
          </div>
          <p class="bda-subtitle" data-i18n="studioSubtitle">${text('studioSubtitle')}</p>
        </div>
        <div class="bda-tools">
          <div class="bda-search">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>
            <input id="q" data-i18n-placeholder="searchPlaceholder" placeholder="${text('searchPlaceholder')}" data-i18n-label="search" aria-label="${text('search')}">
            <button type="button" id="clearSearch" class="hidden" data-i18n-title="clearSearch" title="${text('clearSearch')}" data-i18n-label="clearSearch" aria-label="${text('clearSearch')}">
              <svg viewBox="0 0 16 16" width="12" height="12" stroke="currentColor" stroke-width="1.4"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg>
            </button>
          </div>
          <button type="button" class="bda-tool" id="filterBtn" data-i18n-title="sortFilter" title="${text('sortFilter')}" data-i18n-label="sortFilter" aria-label="${text('sortFilter')}">
            <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" stroke-width="1.4"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/></svg>
          </button>
          <button type="button" class="bda-tool" id="viewModeBtn" data-i18n-title="switchView" title="${text('switchView')}" data-i18n-label="switchView" aria-label="${text('switchView')}">
            <svg id="viewModeIcon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"></svg>
          </button>
          <button type="button" class="bda-tool" id="schemeBtn" data-i18n-title="schemeToggle" title="${text('schemeToggle')}" data-i18n-label="schemeToggle" aria-label="${text('schemeToggle')}"></button>
          <button type="button" class="bda-tool" id="reloadBtn" data-i18n-title="refresh" title="${text('refresh')}" data-i18n-label="refresh" aria-label="${text('refresh')}">
            <svg viewBox="0 0 16 16" width="15" height="15" stroke="currentColor" stroke-width="1.4" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9L14 6m0-4v4h-4"/></svg>
          </button>
        </div>
      </header>

      <section class="studio-section" id="sec-works">
        <div class="section-head">
          <div class="works-head-left">
            <h2 class="bda-section-title" id="listHeading" data-i18n="allWorks">${text('allWorks')}</h2>
            <div id="scopeSwitch" class="scope-switch hidden"></div>
          </div>
          <div class="type-pills" id="typePills"></div>
        </div>
        <div id="container"></div>
        <div id="missingTray" class="missing-tray hidden"></div>
      </section>

      <section class="studio-section" id="sec-new">
        <div class="section-head">
          <h2 class="bda-section-title" data-i18n="new">${text('new')}</h2>
          <span class="section-sub" data-i18n="newSubtitle">${text('newSubtitle')}</span>
        </div>
        <ul class="bda-tiles" id="tiles"></ul>
      </section>

      <section class="studio-section" id="sec-examples">
        <div class="section-head">
          <h2 class="bda-section-title" data-i18n="examples">${text('examples')}</h2>
          <span class="section-sub" data-i18n="examplesSubtitle">${text('examplesSubtitle')}</span>
        </div>
        <ul id="examples"></ul>
      </section>

      <section class="studio-section" id="sec-workflows">
        <div class="section-head">
          <h2 class="bda-section-title" data-i18n="workflows">${text('workflows')}</h2>
          <span class="section-sub" data-i18n="workflowsSubtitle">${text('workflowsSubtitle')}</span>
        </div>
        <ul id="recipes"></ul>
      </section>
    </div>
  </div>
</div>

<div id="editorView" class="hidden">
  <div class="editor-bar">
    <button type="button" class="bda-btn" id="backBtn" data-i18n="back">${text('back')}</button>
    <span class="title" id="editorTitle"></span>
    <button type="button" class="bda-btn" id="popBtn" data-i18n="popOut">${text('popOut')}</button>
  </div>
  <iframe id="frame" allow="clipboard-read; clipboard-write"></iframe>
</div>

<div id="dialogScrim" class="bda-scrim hidden"></div>
<div id="toast" class="hidden"></div>
<div id="menuLayer"></div>

<script>
const STR = ${safeJson(galleryStr)};
const INITIAL_LANG = ${safeJson(initialLang)};
const TINTS = ${safeJson(tints)};
const SKILLS_CONFIG = ${safeJson(skills)};
const RECIPES = ${safeJson(recipes)};
const OFFICIAL_EXAMPLES = ${safeJson(examples)};
const EXAMPLE_TEMPLATES = ${safeJson(templatesMap)};
${GALLERY_CLIENT_SCRIPT}
</script>
</body>
</html>`;
}
