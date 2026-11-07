// Content script for the invite landing page (/join?code=...). Hands the code to the extension,
// which opens the registration page with it filled in.
(async () => {
  const el = document.getElementById('acaps-invite');
  const code = el?.dataset.code || new URLSearchParams(location.search).get('code');
  if (!code) return;
  const res = await browser.runtime.sendMessage({ type: 'invite-found', code });
  if (el) {
    el.textContent = res?.registered
      ? 'The ACAPS extension is already set up on this browser. Click the ACAPS icon in the toolbar to use it.'
      : 'The ACAPS extension opened a new tab to finish joining.';
  }
})();
