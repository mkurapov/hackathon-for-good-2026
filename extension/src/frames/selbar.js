// Bar shown above selected article text: Agree, Disagree or Comment on the passage.
// Each one adds the passage to the article feedback and shows it, in the sidebar if open,
// otherwise in a panel on the page.
import { send } from '../lib/ui.js';
import { reportSize, tabId } from './frame.js';

document.querySelectorAll('[data-action]').forEach(button => {
  button.onclick = () => send('selection-action', { tabId, action: button.dataset.action });
});

reportSize();
