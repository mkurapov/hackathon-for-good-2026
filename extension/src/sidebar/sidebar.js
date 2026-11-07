// Sidebar: home, survey, feedback on the active tab's article, and settings.
import { onBroadcast, send } from '../lib/ui.js';
import { renderFeedback } from '../views/feedback.js';
import { renderHome } from '../views/home.js';
import { renderRegistration } from '../views/registration.js';
import { renderSettings } from '../views/settings.js';
import { renderSurvey } from '../views/survey.js';

const root = document.getElementById('root');
let view = 'home';
let focus = null;
let tabId = null;

async function activeTabId() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function go(next, nextFocus = null) {
  view = next;
  focus = nextFocus;
  render();
}

async function render() {
  const state = await send('get-state');
  if (!state.registered) {
    view = 'home';
    renderRegistration(root, { onDone: () => render() });
    return;
  }
  tabId = await activeTabId();
  const home = () => go('home');

  if (view === 'survey') {
    renderSurvey(root, state, { close: home, rerender: render });
  } else if (view === 'feedback') {
    const data = await send('get-feedback', { tabId });
    renderFeedback(root, data, { tabId, focus, close: home, rerender: render });
  } else if (view === 'settings') {
    renderSettings(root, state, { close: home, rerender: render });
  } else {
    const { article } = await send('tab-info', { tabId });
    renderHome(root, state, { inSidebar: true, article, go, rerender: render });
  }
}

async function start() {
  const pending = await send('take-view');
  if (pending) go(pending.view, pending.focus);
  else await render();
  const before = JSON.stringify(await send('get-state'));
  const after = JSON.stringify(await send('get-state', { refresh: true }));
  if (view === 'home' && after !== before) render();
}

onBroadcast({
  'show-view': async () => {
    const pending = await send('take-view');
    if (pending) go(pending.view, pending.focus);
  },
  'state-changed': () => { if (view !== 'feedback') render(); },
  'article-changed': msg => { if (msg.tabId === tabId && view !== 'survey' && view !== 'settings') render(); },
  'feedback-changed': msg => { if (msg.tabId === tabId && view === 'feedback') render(); },
});

// The sidebar follows the active tab: switching tabs shows that tab's article.
browser.tabs.onActivated.addListener(() => { if (view === 'home' || view === 'feedback') render(); });

start();
