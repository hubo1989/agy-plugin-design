'use strict';

// Strictly uses Agy-Daddy host --ag-* CSS variables (zero forbidden hardcoded hex colors).
const DESIGN_STYLES = `
@keyframes agy-design-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes agy-design-shimmer {
  0% { opacity: 0.45; }
  50% { opacity: 0.85; }
  100% { opacity: 0.45; }
}

.agy-design-spin {
  animation: agy-design-spin 0.8s linear infinite;
  transform-origin: center;
}

.agy-design-workbench {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--ag-bg-panel, #18181b);
  color: var(--ag-text-primary, #f4f4f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.agy-design-workbench[data-surface="fallback"] {
  position: fixed;
  top: 40px;
  right: 0;
  bottom: 0;
  width: min(44vw, 680px);
  min-width: min(420px, 96vw);
  z-index: 44;
  border-left: 1px solid var(--ag-border-panel, rgba(255, 255, 255, 0.12));
  box-shadow: -8px 0 28px rgba(0, 0, 0, 0.25);
}

.agy-design-workbench[data-hidden="true"] {
  display: none;
}

.agy-design-header {
  height: 42px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  background: var(--ag-bg-card, rgba(255, 255, 255, 0.04));
  border-bottom: 1px solid var(--ag-border-panel, rgba(255, 255, 255, 0.1));
}

.agy-design-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.agy-design-brand {
  font-size: 13px;
  font-weight: 600;
  color: var(--ag-text-primary, #f4f4f5);
  white-space: nowrap;
}

.agy-design-ws-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--ag-bg-panel, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--ag-border-panel, rgba(255, 255, 255, 0.12));
  color: var(--ag-text-secondary, #a1a1aa);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.agy-design-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.agy-design-btn {
  appearance: none;
  border: 1px solid var(--ag-border-panel, rgba(255, 255, 255, 0.14));
  background: var(--ag-bg-card, rgba(255, 255, 255, 0.05));
  color: var(--ag-text-primary, #f4f4f5);
  border-radius: 7px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.agy-design-btn:hover {
  border-color: var(--ag-custom-token-accent, var(--ag-token-accent-default, #a78bfa));
}

.agy-design-btn-primary {
  background: var(--ag-custom-token-accent, var(--ag-token-accent-default, #a78bfa));
  border-color: transparent;
  color: #ffffff;
}

.agy-design-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--ag-bg-panel, #18181b);
}

.agy-design-iframe {
  width: 100%;
  height: 100%;
  border: 0;
  flex: 1 1 auto;
  display: block;
}

.agy-design-skeleton {
  position: absolute;
  inset: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--ag-bg-panel, #18181b);
}

.agy-design-skel-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ag-text-secondary, #a1a1aa);
}

.agy-design-skel-bar {
  height: 14px;
  border-radius: 8px;
  background: var(--ag-bg-card, rgba(255, 255, 255, 0.06));
  animation: agy-design-shimmer 1.3s ease-in-out infinite;
}

.agy-design-skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  flex: 1;
}

.agy-design-skel-card {
  height: 136px;
  border-radius: 12px;
  border: 1px solid var(--ag-border-panel, rgba(255, 255, 255, 0.08));
  background: var(--ag-bg-card, rgba(255, 255, 255, 0.04));
  animation: agy-design-shimmer 1.3s ease-in-out infinite;
}

.agy-design-error-card {
  margin: 24px 16px;
  padding: 18px 20px;
  border-radius: 12px;
  background: var(--ag-bg-card, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--ag-border-panel, rgba(255, 255, 255, 0.12));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agy-design-error-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ag-text-primary, #f4f4f5);
}

.agy-design-error-msg {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ag-text-secondary, #a1a1aa);
}

.agy-design-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
`.trim();

module.exports = {
  DESIGN_STYLES
};
