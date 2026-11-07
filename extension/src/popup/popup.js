// Toolbar popup: registration when signed out, otherwise the home view.
// Longer tasks (survey, article feedback, settings) open in the sidebar.
import { onBroadcast, openSidebar, send } from '../lib/ui.js';
import { renderHome } from '../views/home.js';
import { renderRegistration } from '../views/registration.js';

const root = document.getElementById('root');

let shown = '';

async function render({ refresh = false, force = true } = {}) {
  const state = await send('get-state', { refresh });
  // Don't redraw (and steal the cursor) when a refresh brought nothing new.
  const key = JSON.stringify({ ...state, noteDraft: null });
  if (!force && key === shown) return;
  shown = key;
  if (!state.registered) {
    renderRegistration(root, { onDone: () => render() });
    return;
  }
  renderHome(root, state, {
    inSidebar: false,
    // Called straight from a click handler, so Firefox lets us open the sidebar.
    go: view => { openSidebar(view); window.close(); },
    rerender: () => render(),
  });
}

// Show saved data at once, then check for a new survey.
render().then(async () => {
  if ((await send('get-state')).registered) render({ refresh: true, force: false });
});
onBroadcast({ 'state-changed': () => render() });
