// Small helpers shared by the extension pages.

export const send = (type, data = {}) => browser.runtime.sendMessage({ type, ...data });

export const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];

const svg = path =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const icons = {
  check: svg('<path stroke-width="3" d="M5 12.5l4.5 4.5L19 7.5"/>'),
  sidebar: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
};

export const head = (sub, right = '') =>
  `<div class="ext-head"><img class="logo" src="/icons/logo-inverted.svg" alt="ACAPS"><div class="sub">${esc(sub)}</div><div class="spacer"></div>${right}</div>`;

export const success = (title, text, button = '') => `
  <div class="success">
    <div class="tick">${icons.check}</div>
    <h3>${esc(title)}</h3>
    <p class="small muted">${text}</p>
    ${button}
  </div>`;

// Re-render when the background says something changed.
export function onBroadcast(handlers) {
  browser.runtime.onMessage.addListener(msg => {
    const fn = handlers[msg?.type];
    if (fn) fn(msg);
    return undefined; // never answer: requests are for the background
  });
}

// Opens the sidebar. Firefox only allows this directly inside a click handler on an extension
// page, before any await, so call it first and do the rest afterwards.
export function openSidebar(view, focus = null) {
  browser.sidebarAction.open().catch(() => {});
  return send('open-view', { view, focus });
}
