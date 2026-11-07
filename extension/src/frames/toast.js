// Toast shown on a matched article: quick Agree / Disagree, or open the sidebar for more.
import { $, esc, send } from '../lib/ui.js';
import { reportSize, tabId } from './frame.js';

const root = document.getElementById('root');
const FADE_OUT = 300; // ms, matches .toast.leaving in toast.html
let leaving = false;
const dismiss = () => {
  if (leaving) return;
  leaving = true;
  root.classList.add('leaving');
  setTimeout(() => send('dismiss-toast', { tabId }), FADE_OUT);
};
// Shows the view in the sidebar if it is open, otherwise in a panel on the page.
const open = view => { send('open-view', { view, tabId, inPage: true }); dismiss(); };

function shortName(title) {
  const name = (title || '').split(':')[0].trim();
  return name.length > 28 ? name.slice(0, 27) + '…' : name;
}

function head(risk) {
  return `<div class="t-head">
    <img class="logo" src="/icons/mark-pin.svg" alt="ACAPS">
    ${risk ? `<span class="chip" title="${esc(risk)}">${esc(shortName(risk))}</span>` : ''}
    <button class="close" data-close title="Dismiss" aria-label="Dismiss">&times;</button>
  </div>`;
}

function renderAsk({ article, surveyOutstanding }) {
  root.innerHTML = head(article?.risk_title) + `
    <div class="t-body">
      Does this article match what you're seeing?
      <div class="t-actions">
        <button class="btn agree sm" data-stance="agree">Agree</button>
        <button class="btn disagree sm" data-stance="disagree">Disagree</button>
      </div>
      <div class="t-more">
        <button class="link" data-feedback>Share your view &rarr;</button>
        ${surveyOutstanding ? '<button class="link" data-survey>Take the survey &rarr;</button>' : ''}
      </div>
    </div>`;
  $(root, '[data-close]').onclick = dismiss;
  root.querySelectorAll('[data-stance]').forEach(b => {
    b.onclick = async () => {
      root.querySelectorAll('[data-stance]').forEach(x => { x.disabled = true; });
      const res = await send('quick-stance', { tabId, stance: b.dataset.stance });
      if (res?.ok) renderThanks(article);
      else root.querySelectorAll('[data-stance]').forEach(x => { x.disabled = false; });
    };
  });
  $(root, '[data-feedback]').onclick = () => open('feedback');
  const survey = $(root, '[data-survey]');
  if (survey) survey.onclick = () => open('survey');
  reportSize();
}

function renderThanks(article) {
  root.innerHTML = head(article?.risk_title) + `
    <div class="t-body">
      <b style="color:var(--green)">Thanks, sent to ACAPS.</b>
      <div class="t-more"><button class="link" data-more>Add details &rarr;</button></div>
    </div>`;
  $(root, '[data-close]').onclick = dismiss;
  $(root, '[data-more]').onclick = () => open('feedback');
  reportSize();
  setTimeout(dismiss, 5000);
}

send('tab-info', { tabId }).then(info => {
  renderAsk(info);
  // Start the fade once the card has been drawn invisible, so the transition runs.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('shown')));
});
