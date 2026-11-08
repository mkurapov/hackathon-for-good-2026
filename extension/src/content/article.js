// Content script for news sites. On the sites listed in the background (NEWS_SITES), it shows a
// toast and lets the expert agree, disagree or comment on selected passages.
//
// The toast, the selection bar and the panel are iframes of extension pages (src/frames), which
// keeps the page's CSS out. Firefox does not let those frames open the sidebar, so the feedback
// and survey views open in an in-page panel instead, unless the sidebar is already open.
(() => {
  if (window.top !== window) return;

  const FRAMES = browser.runtime.getURL('src/frames/');
  const FRAME_ORIGIN = new URL(FRAMES).origin;
  const TOAST_DELAY = 1500; // ms after the article is recognised
  const TOAST_FADE = 700; // ms
  let tabId = null;
  let toast = null;
  let toastShown = false;
  let bar = null;
  let panel = null;
  let range = null;

  // ---------- article ----------
  function extract() {
    const meta = name => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;
    const container = document.querySelector('article') || document.querySelector('main') || document.body;
    const paragraphs = [...container.querySelectorAll('p')]
      .map(p => p.innerText.trim())
      .filter(t => t.length > 40);
    return {
      url: location.href,
      title: (meta('og:title') || document.querySelector('h1')?.innerText || document.title || '').trim(),
      published: meta('article:published_time') || document.querySelector('time[datetime]')?.getAttribute('datetime') || null,
      source: location.hostname.replace(/^www\./, ''),
      text: paragraphs.join('\n\n').slice(0, 20000),
    };
  }

  async function check() {
    const article = extract();
    const res = await browser.runtime.sendMessage({ type: 'article-detected', article });
    if (!res?.matched) return;
    tabId = res.tabId;
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideBar(); });
    // Let the expert start reading before the toast fades in.
    setTimeout(showToast, TOAST_DELAY);
  }

  // ---------- frames ----------
  function frame(name, style, params = {}) {
    const f = document.createElement('iframe');
    f.src = frameUrl(name, params);
    f.title = 'ACAPS';
    f.setAttribute('allowtransparency', 'true');
    f.style.cssText = 'border:0; margin:0; padding:0; background:transparent; color-scheme:light; z-index:2147483647; display:block;';
    Object.assign(f.style, style);
    document.documentElement.appendChild(f);
    return f;
  }

  function frameUrl(name, params) {
    const query = new URLSearchParams({ tab: tabId, ...params });
    return `${FRAMES}${name}?${query}`;
  }

  // Frames report their size so the iframe fits the card exactly. The panel asks to be closed.
  window.addEventListener('message', e => {
    if (e.origin !== FRAME_ORIGIN || !e.data?.acaps) return;
    if (panel && e.source === panel.contentWindow && e.data.close) return closePanel();
    if (toast && e.source === toast.contentWindow && e.data.ready) return fadeInToast();
    const f = [toast, bar].find(x => x && x.contentWindow === e.source);
    if (!f || !e.data.width || !e.data.height) return; // not laid out yet
    f.style.width = e.data.width + 'px';
    f.style.height = e.data.height + 'px';
    if (f === bar) positionBar();
  });

  function showToast() {
    if (toast) return;
    toastShown = false;
    // The frame includes clear space for the card's shadow (see toast.html), so it sits past the
    // corner a little: the card itself ends up 20px from the edges. It stays hidden until the card
    // has drawn and reported its size, so the fade does not start on a blank or wrongly sized frame.
    toast = frame('toast.html', {
      position: 'fixed', right: '-4px', bottom: '-14px', width: '384px', height: '220px',
      opacity: '0', transform: 'translateY(16px)', pointerEvents: 'none',
    });
  }

  // Fades the toast in while it rises slightly. Runs once the card has drawn with its fonts and
  // reported its final size, so nothing moves during the fade.
  function fadeInToast() {
    if (toastShown) return;
    toastShown = true;
    toast.style.opacity = '1';
    toast.style.transform = 'none';
    toast.style.pointerEvents = '';
    // With "reduce motion" on it still fades, just without the rise.
    const rise = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    toast.animate(
      [{ opacity: 0, transform: rise ? 'translateY(16px)' : 'none' }, { opacity: 1, transform: 'none' }],
      { duration: TOAST_FADE, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }

  function openPanel(view, focus) {
    const params = { view, ...(focus ? { focus } : {}) };
    if (panel) {
      panel.src = frameUrl('panel.html', params);
      return;
    }
    panel = frame('panel.html', {
      position: 'fixed', top: '0', right: '0', width: '380px', maxWidth: '100vw', height: '100vh',
      background: '#fff', boxShadow: '-6px 0 24px rgba(0,0,0,.18)',
    }, params);
  }

  function closePanel() {
    panel?.remove();
    panel = null;
  }

  // ---------- selection ----------
  function onMouseDown(e) {
    if (bar && e.target !== bar) hideBar();
  }

  function onMouseUp(e) {
    if (e.target === bar || e.target === toast) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed || sel.toString().trim().length < 3) return hideBar();
      const node = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
      if (node?.closest('input, textarea, [contenteditable=""], [contenteditable="true"]')) return hideBar();
      range = sel.getRangeAt(0).cloneRange();
      if (!bar) bar = frame('selbar.html', { position: 'absolute', width: '340px', height: '74px', left: '0', top: '0' });
      bar.style.visibility = 'visible';
      positionBar();
    }, 0);
  }

  // Clear space around the bar's card for its shadow, as set in selbar.html.
  const BAR_PAD = { side: 12, bottom: 14 };

  function positionBar() {
    if (!bar || !range) return;
    const r = range.getBoundingClientRect();
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    // Centre the card on the selection and keep it on screen; the shadow space may go past the edge.
    const left = Math.min(Math.max(8 - BAR_PAD.side, r.left + r.width / 2 - w / 2),
      document.documentElement.clientWidth - w + BAR_PAD.side - 8);
    // The card's bottom (not the frame's) sits 10px above the selection.
    const top = Math.max(4, r.top - (h - BAR_PAD.bottom) - 10);
    bar.style.left = window.scrollX + left + 'px';
    bar.style.top = window.scrollY + top + 'px';
  }

  function hideBar() {
    if (bar) bar.style.visibility = 'hidden';
  }

  // Wrap every text node inside the range, so selections across paragraphs work too.
  function markRange(r, id, stance) {
    const root = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (r.intersectsNode(n) && n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (let node of nodes) {
      const start = node === r.startContainer ? r.startOffset : 0;
      const end = node === r.endContainer ? r.endOffset : node.textContent.length;
      if (end <= start) continue;
      if (start > 0) node = node.splitText(start);
      if (end - start < node.textContent.length) node.splitText(end - start);
      const mark = document.createElement('mark');
      mark.className = 'acaps-hl' + (stance ? ' ' + stance : '');
      mark.dataset.acapsId = id;
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
    }
  }

  // ---------- messages from the background ----------
  browser.runtime.onMessage.addListener(msg => {
    if (msg.type === 'mark-selection') {
      if (!range) return Promise.resolve({});
      const text = range.toString().trim();
      const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      try { markRange(range, id, msg.stance); } catch (_) { /* keep the quote even if marking fails */ }
      window.getSelection().removeAllRanges();
      range = null;
      hideBar();
      return Promise.resolve({ id, text });
    }
    if (msg.type === 'unmark') {
      document.querySelectorAll(`mark.acaps-hl[data-acaps-id="${CSS.escape(msg.id)}"]`).forEach(m => m.replaceWith(...m.childNodes));
      return undefined;
    }
    if (msg.type === 'remove-toast') {
      toast?.remove();
      toast = null;
    }
    if (msg.type === 'open-panel') openPanel(msg.view, msg.focus);
    return undefined;
  });

  check();
})();
