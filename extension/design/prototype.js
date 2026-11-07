// Shared logic for the ACAPS extension prototypes (popup.html and article.html).
// Plain JS, no build step. State lives in memory, so reloading the page resets the demo.
(function () {
  const CRISES = ['Venezuela', 'Colombia', 'Haiti'];
  const CONTEXT = 'The latest ACAPS update reports "no visible fractures" in the military after Padrino López\'s removal, over 400 opposition leaders released, and tentative signs of short-term improvement.';
  const QUESTIONS = [
    { type: 'scale', title: 'Military loyalty & friction', text: 'What ground-level signs suggest military loyalty is shifting, or that there are unreported mutiny risks in key units?', measure: 'Likelihood of internal conflict', lo: 'Very unlikely', hi: 'Very likely' },
    { type: 'scale', title: 'Humanitarian access', text: 'Despite the reported economic deals and oil shipments, how accessible are food and healthcare for rural populations in high-risk areas compared to early 2026?', measure: 'Urgency / impact on civilians', lo: 'Low', hi: 'Critical' },
    { type: 'scale', title: 'Opposition safety', text: 'More than 400 opposition leaders were released. Are these releases genuine, or are people still under surveillance or entrapment?', measure: 'Likelihood of political repression', lo: 'Very unlikely', hi: 'Very likely' },
    { type: 'scale', title: 'US pressure & local compliance', text: 'With US pressure continuing and naval forces still present, do communities in border regions show compliance with new policies, or active resistance?', measure: 'Pressingness of diplomatic friction', lo: 'Low', hi: 'Very high' },
    { type: 'scale', title: 'Armed groups & stability', text: 'Are there rumours or word-of-mouth of state services collapsing in the next quarter, especially linked to non-state armed group activity?', measure: 'Likelihood of rapid deterioration', lo: 'Very unlikely', hi: 'Very likely' },
    { type: 'yn', title: 'Military friction', text: "Is there active, organised resistance from former Chavista loyalists against Rodríguez's cabinet on the ground?" },
    { type: 'yn', title: 'Food security', text: 'Are rural food supply chains working well enough to prevent spikes in acute malnutrition, compared to pre-2026?' },
    { type: 'yn', title: 'Opposition status', text: 'Are released opposition leaders operating freely, without house arrest or monitoring?' },
    { type: 'yn', title: 'Displacement', text: 'Are displaced people in high-risk areas returning home voluntarily, without pressure from the new authorities?' },
    { type: 'yn', title: 'Naval presence', text: 'Has the US naval presence offshore led to a verified increase in restrictions on humanitarian aid?' },
  ];
  const TOTAL = QUESTIONS.length;

  const state = {
    registration: 'done',     // 'code' | 'confirm' | 'done'
    popupOpen: false,
    homeView: 'home',         // 'home' | 'sent'
    draft: '',
    crisis: 'Venezuela',
    sentCrisis: '',
    contact: 'idle',          // 'idle' | 'form' | 'sent'
    contactNote: '',
    // Survey starts part-done, to show "continue where you left off".
    survey: { step: 3, answers: { 0: '4', 1: '3', 2: 'skip' }, comments: {}, showContext: false, submitted: false },
    sidebarView: null,        // null (closed) | 'home' | 'survey' | 'feedback'
    feedback: { stance: null, highlights: [], comment: '', sent: false }, // stance: null | 'agree' | 'disagree'
  };

  let els = {};
  let article = null;
  const listeners = [];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = (root, sel) => root.querySelector(sel);
  const head = (sub, right = '') =>
    `<div class="ext-head"><div class="logo">ACAPS<span>.</span></div><div class="sub">${sub}</div><div class="spacer"></div>${right}</div>`;
  const answered = () => Object.keys(state.survey.answers).length;
  const surveyOutstanding = () => !state.survey.submitted;

  // ---------- Popup / home ----------
  function renderPopup() {
    els.popupLayer.hidden = !state.popupOpen;
    els.icon.classList.toggle('open', state.popupOpen);
    if (!state.popupOpen) return;
    const root = els.popup;
    if (state.registration === 'code') return renderCode(root);
    if (state.registration === 'confirm') return renderConfirm(root);
    renderHome(root, false);
  }

  function renderCode(root) {
    root.innerHTML = head('Expert network') + `
      <div class="ext-body stack">
        <h3>Welcome</h3>
        <p class="small muted" style="margin:0">Enter the invite code ACAPS sent you.</p>
        <input class="code-input" type="text" data-code placeholder="XXXX-XXXX" maxlength="9" autocomplete="off">
        <button class="btn block" data-activate disabled>Activate</button>
      </div>`;
    const input = q(root, '[data-code]'), btn = q(root, '[data-activate]');
    input.oninput = () => { btn.disabled = input.value.replace(/[^a-z0-9]/gi, '').length < 8; };
    input.onkeydown = e => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
    btn.onclick = () => { state.registration = 'confirm'; renderAll(); };
    input.focus();
  }

  function renderConfirm(root) {
    root.innerHTML = head('Expert network') + `
      <div class="ext-body stack">
        <h3>Confirm your profile</h3>
        <div class="card info" style="margin:0">
          <div class="label">Invited as</div>
          <div style="font-weight:700">Expert #EX-0412</div>
          <div class="small muted">Conflict analysis · Latin America</div>
          <div style="margin-top:8px">${CRISES.map(c => `<span class="chip">${c}</span>`).join('')}</div>
        </div>
        <button class="btn block" data-yes>This is me, continue</button>
        <button class="link small" data-no>This isn't me</button>
      </div>`;
    q(root, '[data-yes]').onclick = () => { state.registration = 'done'; renderAll(); };
    q(root, '[data-no]').onclick = () => { state.registration = 'code'; renderAll(); };
  }

  function renderHome(root, inSidebar) {
    const toSidebar = inSidebar ? '' : '<button class="icon-btn" data-to-sidebar title="Open in sidebar">⇥</button>';
    if (state.homeView === 'sent') {
      root.innerHTML = head('EX-0412', toSidebar) + `
        <div class="ext-body"><div class="success">
          <div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
          <h3>Sent to ACAPS</h3>
          <p class="small muted">Thank you. Analysts review submissions daily. Tagged <b>${esc(state.sentCrisis)}</b>.</p>
          <button class="btn secondary sm" data-again>Share something else</button>
        </div></div>` + contactFoot();
      q(root, '[data-again]').onclick = () => { state.homeView = 'home'; renderAll(); };
    } else {
      const n = answered();
      const surveyCard = !surveyOutstanding() ? '' : `
        <div class="card invite">
          <div class="label" style="color:var(--cyan); margin-bottom:2px">Your view is wanted</div>
          <div style="font-weight:700">Venezuela survey</div>
          <div class="small muted" style="margin:2px 0 8px">Help shape ACAPS's next Venezuela analysis.</div>
          <div class="mini-progress"><div style="width:${n / TOTAL * 100}%"></div></div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px">
            <span class="small muted">${n} of ${TOTAL} answered</span>
            <button class="btn cyan sm" data-survey>${n ? 'Continue' : 'Start'} →</button>
          </div>
        </div>`;
      const options = [...CRISES, 'Other / not sure'].map(c => `<option${c === state.crisis ? ' selected' : ''}>${c}</option>`).join('');
      root.innerHTML = head('EX-0412', toSidebar) + `
        <div class="ext-body">
          ${surveyCard}
          <div class="label">Share information with ACAPS</div>
          <textarea data-draft placeholder="What are you seeing on the ground? Rumours, incidents, access changes…" style="min-height:80px"></textarea>
          <div style="display:flex; gap:8px; margin-top:8px; align-items:center">
            <select data-crisis style="flex:1">${options}</select>
            <button class="btn" data-send>Send</button>
          </div>
        </div>` + contactFoot();

      const surveyBtn = q(root, '[data-survey]');
      if (surveyBtn) surveyBtn.onclick = () => openSidebar('survey');
      const draft = q(root, '[data-draft]'), send = q(root, '[data-send]');
      draft.value = state.draft;
      send.disabled = !state.draft.trim();
      draft.oninput = () => { state.draft = draft.value; send.disabled = !draft.value.trim(); };
      q(root, '[data-crisis]').onchange = e => { state.crisis = e.target.value; };
      send.onclick = () => {
        state.sentCrisis = state.crisis; state.draft = ''; state.homeView = 'sent';
        renderAll();
      };
    }
    const ts = q(root, '[data-to-sidebar]');
    if (ts) ts.onclick = () => openSidebar('home');
    wireContact(root, inSidebar);
  }

  function contactFoot() {
    if (state.contact === 'sent') {
      return `<div class="ext-foot block small"><div style="color:var(--green); font-weight:700">Contact requested – ACAPS will be in touch</div></div>`;
    }
    if (state.contact === 'form') {
      return `<div class="ext-foot block small">
        <input type="text" data-contact-note placeholder="What's it about? (optional)">
        <div class="muted" style="margin-top:6px">ACAPS will use the contact details they already have.</div>
        <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end">
          <button class="btn secondary sm" data-contact-cancel>Cancel</button>
          <button class="btn sm" data-contact-send>Request contact</button>
        </div>
      </div>`;
    }
    return `<div class="ext-foot block"><button class="btn secondary block" data-contact-open>Ask ACAPS to contact me</button></div>`;
  }

  function wireContact(root) {
    const open = q(root, '[data-contact-open]');
    if (open) open.onclick = () => { state.contact = 'form'; renderAll(); focusIn(root, '[data-contact-note]'); };
    const note = q(root, '[data-contact-note]');
    if (note) {
      note.value = state.contactNote;
      note.oninput = () => { state.contactNote = note.value; };
      note.onkeydown = e => { if (e.key === 'Enter') q(root, '[data-contact-send]').click(); };
    }
    const cancel = q(root, '[data-contact-cancel]');
    if (cancel) cancel.onclick = () => { state.contact = 'idle'; renderAll(); };
    const sendC = q(root, '[data-contact-send]');
    if (sendC) sendC.onclick = () => { state.contact = 'sent'; renderAll(); };
  }

  function focusIn(root, sel) { const el = q(root, sel); if (el) el.focus(); }

  // ---------- Sidebar ----------
  function renderSidebar() {
    els.sidebar.hidden = !state.sidebarView;
    if (!state.sidebarView) return;
    const root = els.sidebarPanel;
    if (state.sidebarView === 'home') renderHome(root, true);
    else if (state.sidebarView === 'survey') renderSurvey(root);
    else if (state.sidebarView === 'feedback') renderFeedback(root);
  }

  function renderSurvey(root) {
    const sv = state.survey;
    root.onkeydown = null;
    if (sv.submitted) {
      root.innerHTML = head('Venezuela survey') + `
        <div class="progress"><div style="width:100%"></div></div>
        <div class="ext-body"><div class="success">
          <div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><div class="q-big">Thank you</div>
          <p class="muted">Your answers have been sent to ACAPS.</p>
          <button class="btn secondary sm" data-close>Close</button>
        </div></div>`;
      q(root, '[data-close]').onclick = closeSidebar;
      return;
    }
    const st = sv.step, qn = QUESTIONS[st], a = sv.answers[st];
    const skip = `<button class="skip ${a === 'skip' ? 'on' : ''}" data-v="skip">Don't know</button>`;
    const answers = qn.type === 'scale'
      ? `<div class="label">${qn.measure}</div>
         <div class="answers">${[1, 2, 3, 4, 5].map(n => `<button data-v="${n}" class="${a == n ? 'on' : ''}">${n}</button>`).join('')}${skip}</div>
         <div class="legend"><span>${qn.lo}</span><span>${qn.hi}</span></div>`
      : `<div class="answers">${['Yes', 'No'].map(v => `<button data-v="${v}" class="${a === v ? 'on' : ''}">${v}</button>`).join('')}${skip}</div>`;

    root.innerHTML = head('Venezuela survey', '<button class="icon-btn" data-later>Finish later</button>') + `
      <div class="progress"><div style="width:${st / TOTAL * 100}%"></div></div>
      <div class="ext-body">
        <div class="q-num"><span>${qn.type === 'scale' ? 'Forecast' : 'Verify'}</span>
          <button class="link" data-ctx>${sv.showContext ? 'Hide context' : 'Context'}</button></div>
        ${sv.showContext ? `<div class="context-box">${CONTEXT}</div>` : ''}
        <div class="q-big">${qn.title}</div>
        <p class="q-body">${qn.text}</p>
        ${answers}
        <textarea data-comment style="margin-top:16px; min-height:80px" placeholder="Comment (optional)"></textarea>
      </div>
      <div class="ext-foot">
        <button class="btn secondary sm" data-back ${st === 0 ? 'style="visibility:hidden"' : ''}>← Back</button>
        <span class="small muted" style="flex:1; text-align:center">${st + 1} of ${TOTAL}</span>
        <button class="btn sm" data-next ${a === undefined ? 'disabled' : ''}>${st === TOTAL - 1 ? 'Submit' : 'Next →'}</button>
      </div>`;

    q(root, '[data-later]').onclick = closeSidebar;
    q(root, '[data-ctx]').onclick = () => { sv.showContext = !sv.showContext; renderSidebar(); };
    root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => answer(b.dataset.v));
    const c = q(root, '[data-comment]');
    c.value = sv.comments[st] || '';
    c.oninput = () => { sv.comments[st] = c.value; };
    q(root, '[data-back]').onclick = () => goTo(st - 1);
    const next = q(root, '[data-next]');
    next.onclick = () => goTo(st + 1);

    // Keyboard: 1–5 or Y/N to answer, D for don't know, Enter for next.
    root.tabIndex = -1;
    root.onkeydown = e => {
      if (e.target.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (qn.type === 'scale' && /^[1-5]$/.test(k)) answer(k);
      else if (qn.type === 'yn' && (k === 'y' || k === 'n')) answer(k === 'y' ? 'Yes' : 'No');
      else if (k === 'd') answer('skip');
      else if (k === 'enter' && !next.disabled) goTo(st + 1);
    };
    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
  }

  // Any answer moves on by itself, unless the expert has started a comment.
  function answer(v) {
    const sv = state.survey, st = sv.step;
    sv.answers[st] = v;
    renderSidebar();
    if (!(sv.comments[st] || '').trim()) {
      setTimeout(() => { if (state.sidebarView === 'survey' && sv.step === st && !sv.submitted) goTo(st + 1); }, 250);
    }
  }

  function goTo(step) {
    const sv = state.survey;
    if (step >= TOTAL) { sv.submitted = true; }
    else sv.step = Math.max(0, step);
    sv.showContext = false;
    renderAll();
  }

  function renderFeedback(root) {
    const fb = state.feedback;
    if (fb.sent) {
      root.innerHTML = head('Share your view') + `
        <div class="ext-body"><div class="success">
          <div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h3>Sent to ACAPS</h3>
          <p class="small muted">Thank you. Your comments were sent with the article link.</p>
          <button class="btn secondary sm" data-close>Close</button>
        </div></div>`;
      q(root, '[data-close]').onclick = closeSidebar;
      return;
    }
    const a = article || { title: 'Current page', source: '', date: '' };
    const hl = fb.highlights.map((h, i) => `
      <div class="card" style="margin:6px 0 0; padding:8px 10px; position:relative">
        ${h.stance ? stanceTag(h.stance) : ''}
        <div class="quote" style="margin-bottom:4px">${esc(h.text.length > 140 ? h.text.slice(0, 140) + '…' : h.text)}</div>
        ${h.comment ? `<div class="small">${esc(h.comment)}</div>` : ''}
        <button class="link small" data-remove="${i}" style="position:absolute; top:6px; right:8px; color:var(--muted)" title="Remove">×</button>
      </div>`).join('');
    root.innerHTML = head('Share your view') + `
      <div class="ext-body stack">
        <div class="card info" style="margin:0">
          <div class="label">Source attached</div>
          <div style="font-weight:700; font-size:14px">${esc(a.title)}</div>
          <div class="small muted">${esc([a.source, a.date].filter(Boolean).join(' · '))}</div>
        </div>
        <div>
          <div class="label">Does this article match what you're seeing?</div>
          <div class="stance">
            <button class="agree ${fb.stance === 'agree' ? 'on' : ''}" data-stance="agree">Agree</button>
            <button class="disagree ${fb.stance === 'disagree' ? 'on' : ''}" data-stance="disagree">Disagree</button>
          </div>
        </div>
        <div>
          <div class="label">Your highlights (${fb.highlights.length})</div>
          ${hl || '<p class="small muted" style="margin:0">Select text in the article to comment on it.</p>'}
        </div>
        <div>
          <div class="label">Comments</div>
          <textarea data-fb-comment placeholder="What does the article miss or get wrong? What are your sources saying?"></textarea>
        </div>
      </div>
      <div class="ext-foot">
        <span class="small muted" style="flex:1">Draft saved</span>
        <button class="btn sm" data-fb-send>Send to ACAPS</button>
      </div>`;
    const t = q(root, '[data-fb-comment]'), send = q(root, '[data-fb-send]');
    const canSend = () => !!fb.stance || fb.highlights.length > 0 || fb.comment.trim().length > 0;
    t.value = fb.comment;
    send.disabled = !canSend();
    t.oninput = () => { fb.comment = t.value; send.disabled = !canSend(); };
    root.querySelectorAll('[data-stance]').forEach(b => b.onclick = () => {
      fb.stance = fb.stance === b.dataset.stance ? null : b.dataset.stance; // tap again to clear
      renderSidebar();
    });
    root.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
      const [h] = fb.highlights.splice(+b.dataset.remove, 1);
      emit('highlight-removed', h);
      renderSidebar();
    });
    send.onclick = () => {
      fb.sent = true;
      emit('feedback-sent', fb.highlights.slice());
      fb.highlights = []; fb.comment = ''; fb.stance = null;
      renderSidebar();
    };
  }

  const stanceTag = st => `<span class="stance-tag ${st}">${st === 'agree' ? 'Agree' : 'Disagree'}</span>`;

  function openSidebar(view) {
    state.sidebarView = view;
    if (view === 'feedback') state.feedback.sent = false;
    state.popupOpen = false;
    renderAll();
  }
  function closeSidebar() { state.sidebarView = null; renderAll(); }

  function renderAll() {
    renderPopup();
    renderSidebar();
    if (els.badge) els.badge.hidden = !surveyOutstanding();
    emit('change');
  }

  function emit(type, data) { listeners.forEach(fn => fn(type, data)); }

  // ---------- Public API ----------
  window.Proto = {
    state,
    surveyOutstanding,
    openSidebar,
    closeSidebar,
    on(fn) { listeners.push(fn); },
    // One-click Agree / Disagree from the toast. Sent straight away (POST), no sidebar needed.
    quickStance(stance) {
      emit('quick-stance-sent', stance);
    },
    addHighlight(h) {
      state.feedback.highlights.push(h);
      openSidebar('feedback');
    },
    init(options) {
      els = options.els;
      article = options.article || null;
      const start = new URLSearchParams(location.search).get('start') || options.start || 'home';
      state.registration = start === 'code' ? 'code' : start === 'confirm' ? 'confirm' : 'done';
      state.popupOpen = !!options.popupOpen;

      els.icon.onclick = () => { state.popupOpen = !state.popupOpen; renderPopup(); };
      els.sidebarClose.onclick = closeSidebar;
      // Like a real toolbar popup, clicking anywhere else closes it.
      document.addEventListener('mousedown', e => {
        if (!state.popupOpen) return;
        if (els.popupLayer.contains(e.target) || els.icon.contains(e.target)) return;
        state.popupOpen = false; renderPopup();
      });
      renderAll();
    },
  };
})();
