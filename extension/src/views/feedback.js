// Feedback on the article open in the active tab: Agree / Disagree, highlighted passages, comments.
import { $, $$, esc, head, icons, send, success } from '../lib/ui.js';

let sentFor = null; // url of the article just sent, to show the thank-you screen

/**
 * data          { article, draft } from the background, for the active tab
 * opts.tabId    the active tab
 * opts.focus    id of a highlight whose comment box should get the cursor
 * opts.close()  back to home (or close the in-page panel)
 * opts.closeLabel  text for the close button, instead of Back
 */
export function renderFeedback(root, data, opts) {
  const back = opts.closeLabel
    ? `<button class="icon-btn" data-close>${esc(opts.closeLabel)}</button>`
    : `<button class="icon-btn" data-close title="Back">${icons.back} Back</button>`;
  const { article, draft } = data;
  // On a re-render (e.g. a new highlight arrived), keep the cursor in the box the expert is using.
  const active = document.activeElement;
  const keepComment = !!active?.matches?.('[data-comment]');
  const focusId = active?.closest?.('.highlight')?.dataset.id || opts.focus;

  if (article && sentFor === article.url) {
    root.innerHTML = head('Share your view', back) + `<div class="ext-body">${success('Sent to ACAPS',
      'Thank you. Your view was sent with the article link.',
      '<button class="btn secondary sm" data-close>Close</button>')}</div>`;
    $$(root, '[data-close]').forEach(b => { b.onclick = () => { sentFor = null; opts.close(); }; });
    return;
  }

  if (!article) {
    root.innerHTML = head('Share your view', back) + `
      <div class="ext-body"><p class="muted">Open a news article about a crisis you follow to share your view on it.
      ACAPS recognises articles on major news sites.</p></div>`;
    $(root, '[data-close]').onclick = opts.close;
    return;
  }

  const source = [article.source, article.published && new Date(article.published).toLocaleDateString()]
    .filter(Boolean).join(' · ');
  const highlights = draft.highlights.map(h => `
    <div class="card highlight" data-id="${esc(h.id)}">
      ${h.stance ? `<span class="stance-tag ${h.stance}">${h.stance === 'agree' ? 'Agree' : 'Disagree'}</span>` : ''}
      <div class="quote">${esc(h.text.length > 200 ? h.text.slice(0, 200) + '…' : h.text)}</div>
      <textarea data-hl-comment placeholder="Comment (optional)"></textarea>
      <button class="link remove" data-remove title="Remove">&times;</button>
    </div>`).join('');

  root.innerHTML = head('Share your view', back) + `
    <div class="ext-body stack">
      <div class="card info" style="margin:0">
        <div class="label">Source attached</div>
        <div style="font-weight:700; font-size:14px">${esc(article.title)}</div>
        <div class="small muted">${esc(source)}</div>
      </div>
      <div>
        <div class="label">Does this article match what you're seeing?</div>
        <div class="stance">
          <button class="agree ${draft.stance === 'agree' ? 'on' : ''}" data-stance="agree">Agree</button>
          <button class="disagree ${draft.stance === 'disagree' ? 'on' : ''}" data-stance="disagree">Disagree</button>
        </div>
      </div>
      <div>
        <div class="label">Your highlights (${draft.highlights.length})</div>
        ${highlights || '<p class="small muted" style="margin:0">Select text in the article to agree, disagree or comment on it.</p>'}
      </div>
      <div>
        <div class="label">Comments</div>
        <textarea data-comment placeholder="What does the article miss or get wrong? What are your sources saying?"></textarea>
      </div>
      <p class="error" data-error hidden></p>
    </div>
    <div class="ext-foot">
      <span class="small muted" style="flex:1">Draft saved</span>
      <button class="btn sm" data-send>Send to ACAPS</button>
    </div>`;

  const save = () => send('update-feedback', { url: article.url, draft });
  const sendBtn = $(root, '[data-send]');
  const canSend = () => !!draft.stance || draft.highlights.length > 0 || draft.comment.trim().length > 0;
  const syncSend = () => { sendBtn.disabled = !canSend(); };
  syncSend();

  $(root, '[data-close]').onclick = opts.close;

  $$(root, '[data-stance]').forEach(b => {
    b.onclick = () => {
      draft.stance = draft.stance === b.dataset.stance ? null : b.dataset.stance; // tap again to clear
      $$(root, '[data-stance]').forEach(x => x.classList.toggle('on', x.dataset.stance === draft.stance));
      syncSend();
      save();
    };
  });

  const comment = $(root, '[data-comment]');
  comment.value = draft.comment;
  if (keepComment) comment.focus();
  comment.oninput = () => { draft.comment = comment.value; syncSend(); save(); };

  $$(root, '.highlight').forEach(card => {
    const h = draft.highlights.find(x => x.id === card.dataset.id);
    const box = $(card, '[data-hl-comment]');
    box.value = h.comment || '';
    box.oninput = () => { h.comment = box.value; save(); };
    $(card, '[data-remove]').onclick = async () => {
      await send('remove-highlight', { tabId: opts.tabId, id: h.id });
      opts.rerender();
    };
    if (!keepComment && focusId === h.id) {
      // In a just-loaded frame the first focus() can be ignored, so try again on the next frame.
      window.focus();
      box.focus();
      requestAnimationFrame(() => { if (document.activeElement !== box && opts.focus === h.id) box.focus(); });
    }
  });

  sendBtn.onclick = async () => {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    const res = await send('send-feedback', { tabId: opts.tabId });
    if (!res?.ok) {
      const err = $(root, '[data-error]');
      err.textContent = res?.error || 'Could not send. Try again.';
      err.hidden = false;
      sendBtn.textContent = 'Send to ACAPS';
      syncSend();
      return;
    }
    sentFor = article.url;
    opts.rerender();
  };
}
