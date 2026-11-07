// Settings: who inside the loop can see who the expert is, and signing out.
import { $, $$, esc, head, icons, send } from '../lib/ui.js';

const LEVELS = [
  ['known_to_acaps', 'Known to ACAPS', 'ACAPS analysts can see which contributions are yours.'],
  ['pseudonymous_to_peers', 'Pseudonymous', 'Other experts in your panel may see a pseudonym, never your name.'],
  ['fully_anonymous', 'Fully anonymous', 'Your contributions are shown without any name or pseudonym.'],
];

let confirmSignOut = false;
let message = '';

export function renderSettings(root, state, opts) {
  const current = state.profile?.anonymity_level;
  root.innerHTML = head('Settings', `<button class="icon-btn" data-close title="Back">${icons.back} Back</button>`) + `
    <div class="ext-body">
      <div class="label">Who can see your contributions are yours</div>
      <p class="small muted" style="margin-top:0">Your contributions are never published with your name, whatever you choose.</p>
      ${LEVELS.map(([value, title, text]) => `
        <label class="choice">
          <input type="radio" name="anonymity" value="${value}" ${value === current ? 'checked' : ''}>
          <span><b>${title}</b><br><span class="small muted">${text}</span></span>
        </label>`).join('')}
      ${message ? `<p class="small" style="color:var(--green); font-weight:700">${esc(message)}</p>` : ''}
      <div class="card" style="margin-top:18px">
        <div class="label">Panel</div>
        <div style="font-weight:700">${esc(state.profile?.group_name || '')}</div>
        <div class="small muted">${esc(state.profile?.risk_title || state.profile?.risk_id || '')}</div>
      </div>
      ${confirmSignOut ? `
        <p class="small">Sign out of the ACAPS extension on this browser? You will need your invite code to sign in again.</p>
        <div style="display:flex; gap:8px">
          <button class="btn secondary sm" data-cancel>Cancel</button>
          <button class="btn disagree sm" data-signout-confirm>Sign out</button>
        </div>` : '<button class="link small" data-signout>Sign out</button>'}
    </div>`;

  $(root, '[data-close]').onclick = () => { message = ''; confirmSignOut = false; opts.close(); };
  $$(root, 'input[name=anonymity]').forEach(input => {
    input.onchange = async () => {
      const res = await send('update-settings', { changes: { anonymity_level: input.value } });
      message = res?.ok === false ? '' : 'Saved.';
      opts.rerender();
    };
  });
  const signOut = $(root, '[data-signout]');
  if (signOut) signOut.onclick = () => { confirmSignOut = true; opts.rerender(); };
  const cancel = $(root, '[data-cancel]');
  if (cancel) cancel.onclick = () => { confirmSignOut = false; opts.rerender(); };
  const confirm = $(root, '[data-signout-confirm]');
  if (confirm) confirm.onclick = () => { confirmSignOut = false; send('sign-out'); };
}
