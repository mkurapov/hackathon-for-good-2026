// Full-page registration, opened on install or from an invite link (?code=...).
import { $, head, openSidebar, send, success } from '../lib/ui.js';
import { renderRegistration } from '../views/registration.js';

const root = document.getElementById('root');
const code = new URLSearchParams(location.search).get('code') || '';

function done() {
  root.innerHTML = head('Expert network') + `<div class="ext-body">${success("You're all set",
    'ACAPS will let you know when your view is wanted. Click the ACAPS icon in the toolbar at any time to share what you are seeing.',
    '<button class="btn sm" data-open>Open the ACAPS sidebar</button>')}</div>`;
  $(root, '[data-open]').onclick = () => openSidebar('home');
}

send('get-state').then(state => {
  if (state.registered) done();
  else renderRegistration(root, { code, onDone: done });
});
