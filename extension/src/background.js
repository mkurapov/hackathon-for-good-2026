// Background script: owns the expert's token and all API calls. The popup, sidebar, injected
// frames and content scripts talk to it with browser.runtime.sendMessage({ type, ... }).
//
// storage.local (survives restarts):
//   auth            { token, expertId }
//   profile         GET /experts/me
//   survey          GET /experts/{id}/surveys/current, or null
//   draft:<survey>  { answers: { qid: value|null }, comments: { qid: text }, step }
//   noteDraft       text typed in the "Share information" box
//   contact         { requestedAt }
//   feedback:<url>  { stance, comment, highlights: [{ id, text, stance, comment }] }
//   offline         true when the last refresh failed
// storage.session (cleared when Firefox closes):
//   tab:<id>        the matched article open in that tab
//   pendingView     { view, focus } for the sidebar to show next
//   dismissed:<url> the expert closed the toast on that article
import { api, ApiError } from './lib/api.js';
import { DEFAULT_ANONYMITY, PREFILL_INVITE_CODE, REFRESH_MINUTES } from './config.js';

const local = browser.storage.local;
const session = browser.storage.session;

const getLocal = async key => (await local.get(key))[key];
const getSession = async key => (await session.get(key))[key];

// Tell open extension pages (popup, sidebar) to re-render. Nobody listening is fine.
function broadcast(type, data = {}) {
  browser.runtime.sendMessage({ type, ...data }).catch(() => {});
}

async function call(path, opts = {}) {
  const auth = await getLocal('auth');
  try {
    return await api(path, { ...opts, token: auth?.token });
  } catch (err) {
    // The token was revoked or the expert removed: go back to registration.
    if (err.status === 401 && auth) await signOut();
    throw err;
  }
}

// ---------- state ----------
async function refresh() {
  const auth = await getLocal('auth');
  if (!auth) return;
  try {
    const [profile, survey] = await Promise.all([
      call('/experts/me'),
      call(`/experts/${auth.expertId}/surveys/current`),
    ]);
    await local.set({ profile, survey: survey || null, offline: false });
  } catch (err) {
    if (err.status === 401) return;
    await local.set({ offline: true });
  }
  await updateBadge();
}

async function updateBadge() {
  const survey = await getLocal('survey');
  await browser.action.setBadgeBackgroundColor({ color: '#0096ba' });
  await browser.action.setBadgeText({ text: survey ? '1' : '' });
}

function emptyDraft() {
  return { answers: {}, comments: {}, step: 0 };
}

async function getDraft(survey) {
  return survey ? (await getLocal('draft:' + survey.survey_id)) || emptyDraft() : null;
}

async function getState({ refresh: doRefresh } = {}) {
  if (doRefresh) await refresh();
  const s = await local.get(['auth', 'profile', 'survey', 'contact', 'offline', 'noteDraft']);
  const draft = await getDraft(s.survey);
  return {
    registered: !!s.auth,
    profile: s.profile || null,
    survey: s.survey || null,
    draft,
    answered: draft ? Object.keys(draft.answers).length : 0,
    contact: s.contact || null,
    offline: !!s.offline,
    noteDraft: s.noteDraft || '',
  };
}

// ---------- registration ----------
const cleanCode = code => String(code || '').trim();

async function previewInvite({ code }) {
  return api(`/invites/${encodeURIComponent(cleanCode(code))}`);
}

async function register({ code }) {
  const expert = await api('/experts', {
    method: 'POST',
    body: { invite_code: cleanCode(code), anonymity_level: DEFAULT_ANONYMITY, channel: 'extension' },
  });
  await local.set({ auth: { token: expert.token, expertId: expert.expert_id } });
  await refresh();
  broadcast('state-changed');
  return { ok: true };
}

async function signOut() {
  await local.clear();
  await session.clear();
  await updateBadge();
  broadcast('state-changed');
}

async function updateSettings(changes) {
  const expert = await call('/experts/me', { method: 'PATCH', body: changes });
  const profile = { ...(await getLocal('profile')), ...expert };
  await local.set({ profile });
  broadcast('state-changed');
  return profile;
}

// ---------- survey ----------
function responseBody(survey, draft, status) {
  const answers = questions =>
    questions
      .filter(q => status === 'submitted' || q.id in draft.answers || draft.comments[q.id])
      .map(q => ({
        question_id: q.id,
        value: draft.answers[q.id] ?? null,
        comment: (draft.comments[q.id] || '').trim() || null,
      }));
  return { status, binary: answers(survey.binary), likert: answers(survey.likert) };
}

async function putResponse(status) {
  const [auth, survey] = await Promise.all([getLocal('auth'), getLocal('survey')]);
  const draft = await getDraft(survey);
  return call(`/experts/${auth.expertId}/surveys/${survey.survey_id}/responses`, {
    method: 'PUT',
    body: responseBody(survey, draft, status),
  });
}

// Saves run one after another, so an answer and a step change sent together don't overwrite each other.
let draftQueue = Promise.resolve();
function saveDraft(msg) {
  draftQueue = draftQueue.then(() => saveDraftNow(msg), () => saveDraftNow(msg));
  return draftQueue;
}

// Saves locally right away, and to the API when `sync` is set (answers, moving between questions).
async function saveDraftNow({ surveyId, answer, comment, step, sync }) {
  const survey = await getLocal('survey');
  if (!survey || survey.survey_id !== surveyId) return { ok: false };
  const draft = await getDraft(survey);
  if (answer) draft.answers[answer.qid] = answer.value;
  if (comment) draft.comments[comment.qid] = comment.text;
  if (step !== undefined) draft.step = step;
  await local.set({ ['draft:' + surveyId]: draft });
  if (sync) putResponse('draft').catch(() => {}); // the local copy is the source of truth until submit
  return { ok: true };
}

async function submitSurvey() {
  const survey = await getLocal('survey');
  try {
    await putResponse('submitted');
  } catch (err) {
    if (err.status === 409) {
      await refresh();
      broadcast('state-changed');
      return { ok: false, error: 'This survey was replaced by a newer one. Your answers were not sent.' };
    }
    return { ok: false, error: err.message };
  }
  await local.remove('draft:' + survey.survey_id);
  await local.set({ survey: null });
  await updateBadge();
  broadcast('state-changed');
  refresh();
  return { ok: true };
}

// ---------- notes and contact ----------
async function sendNote({ text }) {
  await call('/notes', { method: 'POST', body: { text } });
  await local.set({ noteDraft: '' });
  return { ok: true };
}

async function requestContact({ note }) {
  await call('/contact-requests', { method: 'POST', body: { note: note || null } });
  const contact = { requestedAt: Date.now() };
  await local.set({ contact });
  broadcast('state-changed');
  return contact;
}

// ---------- articles ----------
const normaliseUrl = url => url.split('#')[0];

async function articleDetected(article, tabId) {
  if (!(await getLocal('auth'))) return { matched: false };
  let match;
  try {
    match = await call('/articles/match', {
      method: 'POST',
      body: { url: article.url, title: article.title || undefined, text: (article.text || '').slice(0, 20000) },
    });
  } catch (err) {
    return { matched: false };
  }
  if (!match.matched) {
    await session.remove('tab:' + tabId);
    return { matched: false };
  }
  const info = {
    url: normaliseUrl(article.url),
    title: article.title,
    source: article.source,
    published: article.published,
    risk_id: match.risk_id,
    risk_title: match.risk_title,
  };
  await session.set({ ['tab:' + tabId]: info });
  broadcast('article-changed', { tabId });
  return {
    matched: true,
    tabId,
    showToast: !(await getSession('dismissed:' + info.url)),
  };
}

async function tabInfo(tabId) {
  const article = await getSession('tab:' + tabId);
  return { article: article || null, surveyOutstanding: !!(await getLocal('survey')) };
}

async function quickStance({ stance }, tabId) {
  const article = await getSession('tab:' + tabId);
  if (!article) return { ok: false };
  await call('/articles/comments', {
    method: 'POST',
    body: { url: article.url, risk_id: article.risk_id, stance },
  });
  await session.set({ ['dismissed:' + article.url]: true });
  return { ok: true };
}

async function dismissToast(tabId) {
  const article = await getSession('tab:' + tabId);
  if (article) await session.set({ ['dismissed:' + article.url]: true });
  browser.tabs.sendMessage(tabId, { type: 'remove-toast' }).catch(() => {});
  return { ok: true };
}

const emptyFeedback = () => ({ stance: null, comment: '', highlights: [] });

async function getFeedback({ tabId }) {
  const article = await getSession('tab:' + tabId);
  if (!article) return { article: null, draft: null };
  return { article, draft: (await getLocal('feedback:' + article.url)) || emptyFeedback() };
}

async function updateFeedback({ url, draft }) {
  await local.set({ ['feedback:' + url]: draft });
  return { ok: true };
}

// A button in the selection bar was clicked. The page's content script owns the selection, so ask
// it to mark the passage, then add the passage to this article's feedback.
async function selectionAction({ action }, tabId) {
  const article = await getSession('tab:' + tabId);
  if (!article) return { ok: false };
  const stance = action === 'comment' ? null : action;
  const marked = await browser.tabs.sendMessage(tabId, { type: 'mark-selection', stance });
  if (!marked?.text) return { ok: false };

  const key = 'feedback:' + article.url;
  const draft = (await getLocal(key)) || emptyFeedback();
  draft.highlights.push({ id: marked.id, text: marked.text, stance, comment: '' });
  await local.set({ [key]: draft });
  await openView({ view: 'feedback', focus: action === 'comment' ? marked.id : null, tabId, inPage: true });
  broadcast('feedback-changed', { tabId });
  return { ok: true };
}

async function removeHighlight({ tabId, id }) {
  const article = await getSession('tab:' + tabId);
  if (!article) return { ok: false };
  const key = 'feedback:' + article.url;
  const draft = (await getLocal(key)) || emptyFeedback();
  draft.highlights = draft.highlights.filter(h => h.id !== id);
  await local.set({ [key]: draft });
  browser.tabs.sendMessage(tabId, { type: 'unmark', id }).catch(() => {});
  return draft;
}

async function sendFeedback({ tabId }) {
  const article = await getSession('tab:' + tabId);
  if (!article) return { ok: false, error: 'This article is no longer open.' };
  const key = 'feedback:' + article.url;
  const draft = (await getLocal(key)) || emptyFeedback();
  const base = { url: article.url, risk_id: article.risk_id };
  const comments = [];
  if (draft.stance || draft.comment.trim()) {
    comments.push({ ...base, stance: draft.stance, text: draft.comment.trim() });
  }
  for (const h of draft.highlights) {
    comments.push({ ...base, quote: h.text.slice(0, 2000), stance: h.stance, text: (h.comment || '').trim() });
  }
  if (!comments.length) return { ok: false, error: 'Nothing to send yet.' };
  try {
    for (const body of comments) await call('/articles/comments', { method: 'POST', body });
  } catch (err) {
    return { ok: false, error: err.message };
  }
  await local.remove(key);
  await session.set({ ['dismissed:' + article.url]: true });
  return { ok: true };
}

// ---------- sidebar navigation ----------
// From the popup or onboarding page (`inPage` false), the caller has just opened the sidebar: the
// sidebar asks for the pending view when it loads, or the broadcast switches it if already open.
// From the toast or selection bar (`inPage` true), Firefox does not allow opening the sidebar, so
// switch it if it is open, otherwise show the view in a panel on the page.
async function openView({ view, focus = null, tabId, inPage = false }) {
  if (inPage && !(await browser.sidebarAction.isOpen({}))) {
    await browser.tabs.sendMessage(tabId, { type: 'open-panel', view, focus });
    return { ok: true, panel: true };
  }
  await session.set({ pendingView: { view, focus } });
  broadcast('show-view', { view, focus });
  return { ok: true };
}

async function takeView() {
  const pending = await getSession('pendingView');
  await session.remove('pendingView');
  return pending || null;
}

// ---------- invites ----------
async function inviteFound({ code }) {
  if (await getLocal('auth')) return { registered: true };
  await local.set({ lastInvite: cleanCode(code) }); // prefills the code box if this tab is closed
  await browser.tabs.create({
    url: browser.runtime.getURL('src/onboarding/onboarding.html?code=' + encodeURIComponent(code)),
  });
  return { registered: false };
}

// The code to put in the activation box: the last invite link seen, else the configured default.
async function suggestedCode() {
  return { code: (await getLocal('lastInvite')) || PREFILL_INVITE_CODE || '' };
}

// ---------- wiring ----------
const handlers = {
  'get-state': msg => getState(msg),
  'preview-invite': msg => previewInvite(msg),
  register: msg => register(msg),
  'sign-out': () => signOut(),
  'update-settings': msg => updateSettings(msg.changes),
  'save-draft': msg => saveDraft(msg),
  'submit-survey': () => submitSurvey(),
  'send-note': msg => sendNote(msg),
  'save-note-draft': msg => local.set({ noteDraft: msg.text }),
  'request-contact': msg => requestContact(msg),
  'article-detected': (msg, tabId) => articleDetected(msg.article, tabId),
  'tab-info': (msg, tabId) => tabInfo(msg.tabId ?? tabId),
  // The injected frames pass their tab's id (they get it in their URL).
  'quick-stance': (msg, tabId) => quickStance(msg, msg.tabId ?? tabId),
  'dismiss-toast': (msg, tabId) => dismissToast(msg.tabId ?? tabId),
  'selection-action': (msg, tabId) => selectionAction(msg, msg.tabId ?? tabId),
  'get-feedback': msg => getFeedback(msg),
  'update-feedback': msg => updateFeedback(msg),
  'remove-highlight': msg => removeHighlight(msg),
  'send-feedback': msg => sendFeedback(msg),
  'open-view': msg => openView(msg),
  'take-view': () => takeView(),
  'invite-found': msg => inviteFound(msg),
  'suggested-code': () => suggestedCode(),
};

browser.runtime.onMessage.addListener((msg, sender) => {
  const handler = handlers[msg?.type];
  if (!handler) return undefined; // a broadcast meant for the popup or sidebar
  return Promise.resolve(handler(msg, sender.tab?.id)).catch(err => {
    // Errors cross the message boundary as plain objects.
    return { ok: false, error: err instanceof ApiError ? err.message : String(err) };
  });
});

browser.tabs.onRemoved.addListener(tabId => session.remove('tab:' + tabId));
browser.tabs.onUpdated.addListener((tabId, change) => {
  if (change.url) session.remove('tab:' + tabId).then(() => broadcast('article-changed', { tabId }));
});

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refresh') refresh().then(() => broadcast('state-changed'));
});

browser.runtime.onInstalled.addListener(({ reason }) => {
  browser.alarms.create('refresh', { periodInMinutes: REFRESH_MINUTES });
  if (reason === 'install') {
    browser.tabs.create({ url: browser.runtime.getURL('src/onboarding/onboarding.html') });
  }
  refresh();
});

browser.runtime.onStartup.addListener(() => {
  browser.alarms.create('refresh', { periodInMinutes: REFRESH_MINUTES });
  refresh();
});
