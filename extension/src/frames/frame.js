// Helpers for the frames injected into article pages.
export const tabId = Number(new URLSearchParams(location.search).get('tab'));

// Tell the content script how big the frame should be, now and whenever the content changes size.
function post() {
  const el = document.body;
  window.parent.postMessage({ acaps: true, width: Math.ceil(el.offsetWidth), height: Math.ceil(el.offsetHeight) }, '*');
}
let observing = false;
export function reportSize() {
  post();
  if (!observing) {
    observing = true;
    new ResizeObserver(post).observe(document.body);
  }
}
