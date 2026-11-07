// Registration: confirm an invite (straight from an invite link), or type the code by hand.
import { $, esc, head, send } from '../lib/ui.js';

export function renderRegistration(root, { code = '', onDone }) {
  const showCode = async (error = '', value) => {
    // Prefill with the last invite code seen, unless the expert just rejected or mistyped one.
    if (value === undefined) value = (await send('suggested-code'))?.code || '';
    root.innerHTML = head('Expert network') + `
      <div class="ext-body stack">
        <h3>Welcome</h3>
        <p class="small muted" style="margin:0">Enter the invite code ACAPS sent you.</p>
        <input class="code-input" type="text" data-code maxlength="64" autocomplete="off" spellcheck="false">
        ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
        <button class="btn block" data-activate disabled>Activate</button>
      </div>`;
    const input = $(root, '[data-code]');
    const btn = $(root, '[data-activate]');
    input.value = value;
    const sync = () => { btn.disabled = input.value.trim().length < 4; };
    sync();
    input.oninput = sync;
    input.onkeydown = e => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
    btn.onclick = () => lookUp(input.value);
    input.focus();
  };

  const lookUp = async value => {
    const res = await send('preview-invite', { code: value });
    if (!res || res.ok === false) {
      showCode(res?.error === 'Invite code not found' ? "That code wasn't recognised." : res?.error, value);
      return;
    }
    showConfirm(value, res);
  };

  const showConfirm = (value, invite, error = '') => {
    root.innerHTML = head('Expert network') + `
      <div class="ext-body stack">
        <h3>Confirm your invite</h3>
        <div class="card info" style="margin:0">
          <div class="label">Invited to</div>
          <div style="font-weight:700">${esc(invite.group_name)}</div>
          ${invite.risk_title ? `<div class="small muted" style="margin-top:2px">${esc(invite.risk_title)}</div>` : ''}
        </div>
        ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
        <button class="btn block" data-yes>This is me, continue</button>
        <button class="link small" data-no>This isn't me</button>
      </div>`;
    $(root, '[data-yes]').onclick = async e => {
      e.target.disabled = true;
      const res = await send('register', { code: value });
      if (!res?.ok) return showConfirm(value, invite, res?.error || 'Could not register. Try again.');
      onDone();
    };
    $(root, '[data-no]').onclick = () => showCode('', '');
  };

  if (code) lookUp(code);
  else showCode();
}
