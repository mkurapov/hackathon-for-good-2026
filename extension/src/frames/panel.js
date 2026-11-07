// In-page panel: the feedback or survey view, shown on the article when the sidebar is closed.
import { onBroadcast, send } from '../lib/ui.js';
import { renderFeedback } from '../views/feedback.js';
import { renderSurvey } from '../views/survey.js';
import { tabId } from './frame.js';

const root = document.getElementById('root');
const params = new URLSearchParams(location.search);
const view = params.get('view') === 'survey' ? 'survey' : 'feedback';
const focus = params.get('focus');

const close = () => window.parent.postMessage({ acaps: true, close: true }, '*');

async function render() {
  if (view === 'survey') {
    renderSurvey(root, await send('get-state'), { close, rerender: render });
  } else {
    const data = await send('get-feedback', { tabId });
    renderFeedback(root, data, { tabId, focus, close, closeLabel: 'Close', rerender: render });
  }
}

onBroadcast({
  'feedback-changed': msg => { if (view === 'feedback' && msg.tabId === tabId) render(); },
  'state-changed': () => { if (view === 'survey') render(); },
});
render();
