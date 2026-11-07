// Survey: one question per screen. Verification (Yes / No) questions come first, then forecasts.
// Tapping an answer moves on by itself, unless the expert has typed a comment. Next always works.
import { $, $$, esc, head, send, success } from '../lib/ui.js';

const SCALE_LABELS = {
  likelihood: ['Very unlikely', 'Very likely'],
  urgency: ['Not urgent', 'Very urgent'],
  severity: ['Minor', 'Severe'],
  scale: ['Low', 'High'],
  other: ['Low', 'High'],
};
const ADVANCE_DELAY = 250; // ms, so the expert sees their choice before the next question

let showContext = false;
let submitted = false;
let submitError = '';

/**
 * state      from the background: { survey, draft }
 * opts.close()   leave the survey (back to home)
 */
export function renderSurvey(root, state, opts) {
  root.onkeydown = null;

  if (submitted) {
    root.innerHTML = head('Survey') + `
      <div class="progress"><div style="width:100%"></div></div>
      <div class="ext-body">${success('Thank you', 'Your answers have been sent to ACAPS.',
        '<button class="btn secondary sm" data-close>Close</button>')}</div>`;
    $(root, '[data-close]').onclick = () => { submitted = false; opts.close(); };
    return;
  }

  const { survey } = state;
  if (!survey) {
    root.innerHTML = head('Survey') + `
      <div class="ext-body"><p class="muted">No survey is waiting for you right now.</p>
      <button class="btn secondary sm" data-close>Back</button></div>`;
    $(root, '[data-close]').onclick = opts.close;
    return;
  }

  const questions = [
    ...survey.binary.map(q => ({ ...q, type: 'binary' })),
    ...survey.likert.map(q => ({ ...q, type: 'likert' })),
  ];
  const total = questions.length;
  const draft = state.draft;
  const step = Math.min(draft.step || 0, total - 1);
  const q = questions[step];
  const has = q.id in draft.answers;
  const value = draft.answers[q.id];
  const isLast = step === total - 1;

  const dontKnow = `<button class="skip ${has && value === null ? 'on' : ''}" data-value="null">Don't know</button>`;
  let answers;
  if (q.type === 'likert') {
    const [lo, hi] = SCALE_LABELS[q.dimension] || SCALE_LABELS.other;
    answers = `
      <div class="answers">${[1, 2, 3, 4, 5].map(n =>
        `<button data-value="${n}" class="${value === n ? 'on' : ''}" aria-label="${n} of 5">${n}</button>`).join('')}${dontKnow}</div>
      <div class="legend"><span>${lo}</span><span>${hi}</span></div>`;
  } else {
    answers = `<div class="answers">
      <button data-value="true" class="${value === true ? 'on' : ''}">Yes</button>
      <button data-value="false" class="${value === false ? 'on' : ''}">No</button>${dontKnow}</div>`;
  }

  root.innerHTML = head(survey.risk_title, '<button class="icon-btn" data-later>Finish later</button>') + `
    <div class="progress"><div style="width:${(step / total) * 100}%"></div></div>
    <div class="ext-body">
      <div class="q-num"><span>${q.type === 'binary' ? 'Verify' : 'Forecast'}</span>
        <button class="link" data-context>${showContext ? 'Hide context' : 'Context'}</button></div>
      ${showContext ? `<div class="context-box">Based on the ACAPS update of ${esc(survey.based_on_update || 'the latest assessment')}
        for <b>${esc(survey.risk_title)}</b>.</div>` : ''}
      <p class="q-body">${esc(q.text)}</p>
      ${answers}
      <textarea data-comment style="margin-top:16px" placeholder="Comment (optional)"></textarea>
      ${submitError ? `<p class="error" role="alert">${esc(submitError)}</p>` : ''}
    </div>
    <div class="ext-foot">
      <button class="btn secondary sm" data-back ${step === 0 ? 'style="visibility:hidden"' : ''}>&larr; Back</button>
      <span class="small muted" style="flex:1; text-align:center">${step + 1} of ${total}</span>
      <button class="btn sm" data-next>${isLast ? 'Submit' : 'Next &rarr;'}</button>
    </div>`;

  const save = data => send('save-draft', { surveyId: survey.survey_id, ...data });

  const goTo = async next => {
    showContext = false;
    submitError = '';
    if (next >= total) {
      const nextBtn = $(root, '[data-next]');
      nextBtn.disabled = true;
      nextBtn.textContent = 'Sending…';
      const res = await send('submit-survey');
      if (!res?.ok) {
        submitError = res?.error || 'Could not send. Try again.';
        return opts.rerender();
      }
      submitted = true;
      return opts.rerender();
    }
    draft.step = Math.max(0, next);
    await save({ step: draft.step, sync: true });
    opts.rerender();
  };

  const answer = raw => {
    const v = JSON.parse(raw); // "3" -> 3, "true" -> true, "null" -> null (don't know)
    draft.answers[q.id] = v;
    save({ answer: { qid: q.id, value: v }, sync: true });
    $$(root, '.answers button').forEach(b => b.classList.toggle('on', b.dataset.value === raw));
    // Never auto-submit: on the last question the expert presses Submit.
    if (!isLast && !(draft.comments[q.id] || '').trim()) {
      setTimeout(() => { if ((draft.step || 0) === step) goTo(step + 1); }, ADVANCE_DELAY);
    }
  };

  $(root, '[data-later]').onclick = opts.close;
  $(root, '[data-context]').onclick = () => { showContext = !showContext; opts.rerender(); };
  $$(root, '[data-value]').forEach(b => { b.onclick = () => answer(b.dataset.value); });
  $(root, '[data-back]').onclick = () => goTo(step - 1);
  $(root, '[data-next]').onclick = () => goTo(step + 1);

  const comment = $(root, '[data-comment]');
  comment.value = draft.comments[q.id] || '';
  comment.oninput = () => {
    draft.comments[q.id] = comment.value;
    save({ comment: { qid: q.id, text: comment.value } });
  };

  // Keyboard: 1-5 or Y/N to answer, D for don't know, Enter for next.
  root.tabIndex = -1;
  root.onkeydown = e => {
    if (e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (q.type === 'likert' && /^[1-5]$/.test(k)) answer(k);
    else if (q.type === 'binary' && (k === 'y' || k === 'n')) answer(k === 'y' ? 'true' : 'false');
    else if (k === 'd') answer('null');
    else if (k === 'enter') goTo(step + 1);
  };
  if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
}
