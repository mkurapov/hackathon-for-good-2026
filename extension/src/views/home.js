// Home: the waiting survey, a box to share information, and the contact request.
// Used by the toolbar popup and by the sidebar.
import { $, esc, head, icons, send, success } from '../lib/ui.js';

const CONTACT_SHOWN_FOR = 7 * 24 * 60 * 60 * 1000; // show "requested" for a week, then allow again

let noteSent = false;
let contactForm = false;
let contactNote = '';

/**
 * opts.inSidebar   rendered in the sidebar (shows Settings instead of "open in sidebar")
 * opts.article     the matched article in the active tab, if any (sidebar only)
 * opts.go(view)    navigate to another view: 'survey', 'feedback' or 'settings'
 * opts.rerender()  render again with the latest state
 */
export function renderHome(root, state, opts) {
  const { profile, survey, answered, offline } = state;
  const total = survey ? survey.binary.length + survey.likert.length : 0;
  const headRight = opts.inSidebar
    ? `<button class="icon-btn" data-settings title="Settings">${icons.settings}</button>`
    : `<button class="icon-btn" data-to-sidebar title="Open in sidebar">${icons.sidebar}</button>`;

  const surveyCard = survey ? `
    <div class="card invite">
      <div class="label" style="color:var(--cyan); margin-bottom:2px">Your view is wanted</div>
      <div style="font-weight:700">${esc(survey.risk_title)}</div>
      <div class="small muted" style="margin:2px 0 8px">Help shape ACAPS's next analysis.</div>
      <div class="mini-progress"><div style="width:${(answered / total) * 100}%"></div></div>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px">
        <span class="small muted">${answered} of ${total} answered</span>
        <button class="btn cyan sm" data-survey>${answered ? 'Continue' : 'Start'} &rarr;</button>
      </div>
    </div>` : '';

  const articleCard = opts.article ? `
    <div class="card info">
      <div class="label">This article</div>
      <div style="font-weight:700; font-size:14px">${esc(opts.article.title)}</div>
      <div class="small muted" style="margin:2px 0 8px">Relates to ${esc(opts.article.risk_title || opts.article.risk_id)}</div>
      <button class="btn sm" data-feedback>Share your view &rarr;</button>
    </div>` : '';

  const shareBox = noteSent
    ? success('Sent to ACAPS', 'Thank you. Analysts review submissions daily.',
        '<button class="btn secondary sm" data-again>Share something else</button>')
    : `
      <div class="label">Share information with ACAPS</div>
      <textarea data-note placeholder="What are you seeing on the ground? Rumours, incidents, access changes…"></textarea>
      <div style="display:flex; gap:8px; margin-top:8px; align-items:center">
        <span class="small muted" style="flex:1">${profile?.risk_title ? 'About ' + esc(profile.risk_title) : ''}</span>
        <button class="btn" data-send disabled>Send</button>
      </div>
      <p class="error" data-note-error hidden></p>`;

  root.innerHTML = head(profile?.group_name || 'Expert network', headRight) + `
    <div class="ext-body">
      ${offline ? '<div class="notice">Cannot reach ACAPS right now. Showing saved information.</div>' : ''}
      ${surveyCard}
      ${articleCard}
      ${shareBox}
    </div>
    ${contactFooter(state)}`;

  // Navigation
  const toSidebar = $(root, '[data-to-sidebar]');
  if (toSidebar) toSidebar.onclick = () => opts.go('home');
  const settings = $(root, '[data-settings]');
  if (settings) settings.onclick = () => opts.go('settings');
  const surveyBtn = $(root, '[data-survey]');
  if (surveyBtn) surveyBtn.onclick = () => opts.go('survey');
  const feedbackBtn = $(root, '[data-feedback]');
  if (feedbackBtn) feedbackBtn.onclick = () => opts.go('feedback');

  // Share information
  const again = $(root, '[data-again]');
  if (again) again.onclick = () => { noteSent = false; opts.rerender(); };
  const note = $(root, '[data-note]');
  if (note) {
    const sendBtn = $(root, '[data-send]');
    note.value = state.noteDraft;
    sendBtn.disabled = !note.value.trim();
    note.oninput = () => {
      sendBtn.disabled = !note.value.trim();
      send('save-note-draft', { text: note.value });
    };
    sendBtn.onclick = async () => {
      sendBtn.disabled = true;
      const res = await send('send-note', { text: note.value.trim() });
      if (!res?.ok) {
        const err = $(root, '[data-note-error]');
        err.textContent = res?.error || 'Could not send. Try again.';
        err.hidden = false;
        sendBtn.disabled = false;
        return;
      }
      noteSent = true;
      state.noteDraft = '';
      opts.rerender();
    };
  }

  wireContact(root, opts);
}

function contactFooter(state) {
  const requestedAt = state.contact?.requestedAt;
  if (requestedAt && Date.now() - requestedAt < CONTACT_SHOWN_FOR) {
    return `<div class="ext-foot block small"><div style="color:var(--green); font-weight:700">Contact requested – ACAPS will be in touch</div></div>`;
  }
  if (contactForm) {
    return `
      <div class="ext-foot block small">
        <input type="text" data-contact-note maxlength="1000" placeholder="What's it about? (optional)">
        <div class="muted" style="margin-top:6px">ACAPS will use the contact details they already have.</div>
        <p class="error" data-contact-error hidden></p>
        <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end">
          <button class="btn secondary sm" data-contact-cancel>Cancel</button>
          <button class="btn sm" data-contact-send>Request contact</button>
        </div>
      </div>`;
  }
  return `<div class="ext-foot block"><button class="btn secondary block" data-contact-open>Ask ACAPS to contact me</button></div>`;
}

function wireContact(root, opts) {
  const open = $(root, '[data-contact-open]');
  if (open) open.onclick = () => { contactForm = true; opts.rerender(); };
  const input = $(root, '[data-contact-note]');
  if (!input) return;
  input.value = contactNote;
  input.focus();
  input.oninput = () => { contactNote = input.value; };
  input.onkeydown = e => { if (e.key === 'Enter') $(root, '[data-contact-send]').click(); };
  $(root, '[data-contact-cancel]').onclick = () => { contactForm = false; opts.rerender(); };
  $(root, '[data-contact-send]').onclick = async e => {
    e.target.disabled = true;
    const res = await send('request-contact', { note: contactNote.trim() });
    if (res?.ok === false) {
      const err = $(root, '[data-contact-error]');
      err.textContent = res.error || 'Could not send. Try again.';
      err.hidden = false;
      e.target.disabled = false;
      return;
    }
    contactForm = false;
    contactNote = '';
    // The background broadcasts state-changed, which re-renders with the "requested" footer.
  };
}
