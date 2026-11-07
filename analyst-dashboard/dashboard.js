const riskSelect = document.querySelector("#risk-code-select");
const state = {
  riskCode: riskSelect.value,
  activeView: "overview",
  typeFilter: "all",
  statusFilter: "all",
  feedbackStatus: "all",
  feedbackCode: "all",
  recipientType: "all",
  experts: [
    { id: "e-01", type: "A", name: "Dr. Leila Haddad", subtitle: "Long-term expert", invite: "AC-7F2K-91", used: true, status: "Responded", activity: "Today, 09:42", riskCode: "R-0427" },
    { id: "e-02", type: "A", name: "M. Okafor", subtitle: "Long-term expert", invite: "AC-3M8Q-14", used: true, status: "Awaiting response", activity: "Yesterday", riskCode: "R-0427" },
    { id: "e-03", type: "B", name: "Field contributor 08", subtitle: "Opaque handle", invite: "AC-9P1D-62", used: true, status: "Onboarded", activity: "2 days ago", riskCode: "R-0427" },
    { id: "e-04", type: "A", name: "Samira N.", subtitle: "Long-term expert", invite: "AC-5J6R-33", used: false, status: "Invited", activity: "3 days ago", riskCode: "R-0427" },
    { id: "e-05", type: "B", name: "Field contributor 12", subtitle: "Opaque handle", invite: "AC-2W4B-08", used: true, status: "Awaiting response", activity: "4 days ago", riskCode: "R-0427" },
    { id: "e-06", type: "A", name: "R. Mensah", subtitle: "Long-term expert", invite: "AC-8L2C-75", used: true, status: "Responded", activity: "5 days ago", riskCode: "R-0427" },
    { id: "e-07", type: "A", name: "Nadia K.", subtitle: "Long-term expert", invite: "AC-4H7N-20", used: false, status: "Invited", activity: "1 week ago", riskCode: "R-0427" },
    { id: "e-08", type: "B", name: "Field contributor 19", subtitle: "Opaque handle", invite: "AC-6D3T-57", used: true, status: "Onboarded", activity: "1 week ago", riskCode: "R-0427" },
    { id: "e-09", type: "A", name: "Dr. Peter Osei", subtitle: "Long-term expert", invite: "AC-1N9F-48", used: true, status: "Awaiting response", activity: "2 weeks ago", riskCode: "R-0183" },
    { id: "e-10", type: "B", name: "Field contributor 03", subtitle: "Opaque handle", invite: "AC-7A5E-11", used: false, status: "Invited", activity: "2 weeks ago", riskCode: "R-0183" },
    { id: "e-11", type: "A", name: "T. Mwangi", subtitle: "Long-term expert", invite: "AC-9C2K-86", used: true, status: "Onboarded", activity: "Yesterday", riskCode: "R-0183" },
    { id: "e-12", type: "A", name: "H. Saleh", subtitle: "Long-term expert", invite: "AC-6B4M-39", used: false, status: "Invited", activity: "4 days ago", riskCode: "R-1102" }
  ],
  approvals: [
    { id: "a-01", handle: "Field contributor 24", arrived: "Today, 08:24", eventId: "EVT-27-NORTH", screening: "Community health volunteer · Central district", riskCode: "R-0427" },
    { id: "a-02", handle: "Field contributor 25", arrived: "Yesterday, 16:10", eventId: "New identifier", screening: "Local market association · East district", riskCode: "R-0427" },
    { id: "a-03", handle: "Field contributor 31", arrived: "Yesterday, 11:35", eventId: "EVT-27-NORTH", screening: "Displacement response volunteer · North district", riskCode: "R-0427" }
  ],
  surveyStatus: "Draft",
  questions: [
    { kind: "Likert", text: "How likely is it that armed clashes will intensify in the coming four weeks?" },
    { kind: "Likert", text: "How would you rate the current risk of disruption to key transport corridors?" },
    { kind: "Likert", text: "To what extent are local health facilities able to maintain essential services?" },
    { kind: "Likert", text: "How severe is the current pressure on the availability of essential supplies?" },
    { kind: "Likert", text: "How confident are you in the information available about emerging displacement?" },
    { kind: "Binary", text: "Have you observed new population movements in your area in the past seven days?" },
    { kind: "Binary", text: "Are any key roads or transport routes currently inaccessible?" },
    { kind: "Binary", text: "Have health facilities reported a shortage of essential medical supplies?" },
    { kind: "Binary", text: "Has access to humanitarian assistance changed in the past two weeks?" },
    { kind: "Binary", text: "Are local authorities currently responding to the reported access constraints?" }
  ],
  submissions: [
    { id: "s-01", handle: "Field contributor 19", type: "B", date: "Today, 10:18", body: "The eastern road has been intermittently blocked since Monday. Community members are taking the river route, but transport costs have increased sharply.", tags: ["Access", "Transport"], riskCode: "R-0427", status: "unreviewed" },
    { id: "s-02", handle: "Dr. Leila Haddad", type: "A", date: "Today, 08:52", body: "Two clinics in the central area report that deliveries of trauma kits have not arrived this week. They have enough stock for several days, but no confirmed replenishment date.", tags: ["Health", "Supplies"], riskCode: "R-0427", status: "unreviewed" },
    { id: "s-03", handle: "Field contributor 08", type: "B", date: "Yesterday, 17:26", body: "Families from three nearby villages are staying with relatives near the market. I have not seen a formal site open yet.", tags: ["Displacement"], riskCode: null, status: "unreviewed" },
    { id: "s-04", handle: "M. Okafor", type: "A", date: "Yesterday, 14:03", body: "Local traders expect food prices to rise if the northern checkpoint remains closed through the end of the month.", tags: ["Markets"], riskCode: "R-0183", status: "reviewed" }
  ],
  notifications: []
};

const statusClass = { Invited: "status-invited", Onboarded: "status-onboarded", "Awaiting response": "status-awaiting", Responded: "status-responded" };
const initialsFor = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function currentExperts() {
  return state.experts.filter((expert) => expert.riskCode === state.riskCode && expert.status !== "Rejected");
}

function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  const activeView = document.querySelector(`#view-${viewName}`);
  document.querySelector("#topbar-section").textContent = activeView?.dataset.title || "Overview";
  document.querySelector("#sidebar-nav").classList.remove("mobile-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderExpertTable(targetId, emptyId, searchValue = "", includeStatusFilter = false) {
  const search = searchValue.trim().toLowerCase();
  const filtered = currentExperts().filter((expert) => {
    const matchesType = state.typeFilter === "all" || expert.type === state.typeFilter;
    const matchesStatus = !includeStatusFilter || state.statusFilter === "all" || expert.status === state.statusFilter;
    const matchesSearch = !search || `${expert.name} ${expert.type} ${expert.invite} ${expert.status}`.toLowerCase().includes(search);
    return matchesType && matchesStatus && matchesSearch;
  });
  const rows = document.getElementById(targetId);
  rows.innerHTML = filtered.map((expert) => `
    <tr>
      <td><div class="expert-name"><span class="expert-avatar ${expert.type === "B" ? "type-b-avatar" : ""}">${escapeHTML(initialsFor(expert.name))}</span><span><strong>${escapeHTML(expert.name)}</strong><small>${escapeHTML(expert.subtitle)}</small></span></div></td>
      <td><span class="type-label ${expert.type === "B" ? "type-b-label" : ""}"><i class="type-dot type-${expert.type.toLowerCase()}"></i>Type ${expert.type}</span></td>
      <td><span class="invite-cell">${escapeHTML(expert.invite)}</span><small class="invite-state ${expert.used ? "code-used" : "code-unused"}">${expert.used ? "Used to onboard" : "Issued · not used"}</small></td>
      <td><span class="status-badge ${statusClass[expert.status] || ""}">${escapeHTML(expert.status)}</span></td>
      <td class="last-activity">${escapeHTML(expert.activity)}</td>
      <td><button class="row-more" data-copy-invite="${escapeHTML(expert.id)}" title="Copy invite code" aria-label="Copy invite code">···</button></td>
    </tr>`).join("");
  document.getElementById(emptyId).hidden = filtered.length !== 0;
  const countId = targetId === "expert-rows" ? "expert-count-label" : "experts-count-label";
  document.getElementById(countId).textContent = `${filtered.length} ${filtered.length === 1 ? "expert" : "experts"}`;
}

function renderApprovals() {
  const pending = state.approvals.filter((approval) => approval.riskCode === state.riskCode);
  document.querySelector("#approval-list").innerHTML = pending.map((approval) => `
    <article class="approval-card"><span class="expert-avatar type-b-avatar">${escapeHTML(initialsFor(approval.handle))}</span><div class="approval-main"><strong>${escapeHTML(approval.handle)}</strong><small>Type B · Registered ${escapeHTML(approval.arrived)}</small></div><div class="approval-screening"><span>Screening snapshot</span>${escapeHTML(approval.screening)}<br>Identifier: ${escapeHTML(approval.eventId)}</div><div class="approval-actions"><button class="btn reject" data-approval="${escapeHTML(approval.id)}" data-decision="reject">Reject</button><button class="btn approve" data-approval="${escapeHTML(approval.id)}" data-decision="approve">Approve</button></div></article>`).join("");
  document.querySelector("#approval-empty").hidden = pending.length > 0;
  document.querySelector("#approval-count-chip").textContent = `${pending.length} awaiting review`;
}

function renderQuestions() {
  document.querySelector("#question-list").innerHTML = state.questions.map((question, index) => `
    <div class="question-row"><span class="question-order">${String(index + 1).padStart(2, "0")}</span><span class="question-kind ${question.kind === "Binary" ? "binary" : ""}">${question.kind}</span><textarea class="question-text" data-question-index="${index}" aria-label="Edit question ${index + 1}" rows="2">${escapeHTML(question.text)}</textarea><button class="question-delete" data-delete-question="${index}" title="Remove question" aria-label="Remove question">×</button></div>`).join("");
  const likertCount = state.questions.filter((question) => question.kind === "Likert").length;
  const binaryCount = state.questions.length - likertCount;
  document.querySelector("#question-count").textContent = state.questions.length;
  document.querySelector("#question-kind-count").textContent = `${likertCount} Likert, ${binaryCount} binary`;
}

function renderFeedback() {
  const items = state.submissions.filter((submission) => {
    const matchesStatus = state.feedbackStatus === "all" || submission.status === state.feedbackStatus;
    const matchesCode = state.feedbackCode === "all" || (state.feedbackCode === "unlinked" ? !submission.riskCode : submission.riskCode === state.feedbackCode);
    return matchesStatus && matchesCode;
  });
  document.querySelector("#feedback-list").innerHTML = items.map((submission) => `
    <article class="feedback-card ${submission.status === "reviewed" ? "reviewed" : ""}"><div class="feedback-head"><span class="latest-initial">${escapeHTML(initialsFor(submission.handle))}</span><div class="feedback-who"><strong>${escapeHTML(submission.handle)}</strong><small>Type ${submission.type} · ${submission.riskCode ? `Linked to ${escapeHTML(submission.riskCode)}` : "No Risk Code linked"}</small></div><time class="feedback-date">${escapeHTML(submission.date)}</time></div><p class="feedback-body">${escapeHTML(submission.body)}</p><div class="feedback-controls"><div class="feedback-tag-list">${submission.tags.map((tag) => `<span class="feedback-tag">${escapeHTML(tag)}</span>`).join("")}<button class="mini-action" data-add-tag="${escapeHTML(submission.id)}">+ Tag</button></div><div class="feedback-actions"><select class="small-select" data-link-submission="${escapeHTML(submission.id)}" aria-label="Link submission to a Risk Code"><option value="">Link Risk Code</option><option value="R-0427" ${submission.riskCode === "R-0427" ? "selected" : ""}>R-0427</option><option value="R-0183" ${submission.riskCode === "R-0183" ? "selected" : ""}>R-0183</option><option value="R-1102" ${submission.riskCode === "R-1102" ? "selected" : ""}>R-1102</option></select><button class="mini-action review-action" data-mark-reviewed="${escapeHTML(submission.id)}">${submission.status === "reviewed" ? "Reviewed ✓" : "Mark reviewed"}</button><button class="mini-action" data-reply="${escapeHTML(submission.id)}">Reply</button></div></div></article>`).join("");
  document.querySelector("#feedback-empty").hidden = items.length > 0;
}

function renderLatestFeedback() {
  const latest = state.submissions.filter((item) => item.riskCode === state.riskCode).slice(0, 2);
  document.querySelector("#latest-feedback").innerHTML = latest.map((item) => `<div class="latest-item"><span class="latest-initial">${escapeHTML(initialsFor(item.handle))}</span><span><strong>${escapeHTML(item.handle)}</strong><small>${escapeHTML(item.body.slice(0, 62))}${item.body.length > 62 ? "…" : ""}</small></span><time>${escapeHTML(item.date.split(",")[0])}</time></div>`).join("") || `<div class="history-empty">No feedback linked to this Risk Code yet.</div>`;
}

function renderNotifications() {
  const experts = currentExperts();
  document.querySelector("#recipient-all-count").textContent = `${experts.length} recipients`;
  document.querySelector("#recipient-a-count").textContent = `${experts.filter((expert) => expert.type === "A").length} recipients`;
  document.querySelector("#recipient-b-count").textContent = `${experts.filter((expert) => expert.type === "B").length} recipients`;
  document.querySelector("#notification-history").innerHTML = state.notifications.slice(0, 5).map((item) => `<div class="history-item"><strong>${escapeHTML(item.subject)}</strong><small>${escapeHTML(item.date)} · ${item.count} recipients (${item.type === "all" ? "All experts" : `Type ${item.type}`})</small></div>`).join("") || `<div class="history-empty">No notifications queued yet.</div>`;
}

function renderSummary() {
  const experts = currentExperts();
  const unreviewedCount = state.submissions.filter((item) => item.status === "unreviewed").length;
  const pendingCount = state.approvals.filter((item) => item.riskCode === state.riskCode).length;
  const awaitingCount = experts.filter((expert) => expert.status === "Awaiting response").length;
  document.querySelector("#stat-experts").textContent = experts.length;
  document.querySelector("#stat-awaiting").textContent = awaitingCount;
  document.querySelector("#stat-feedback").textContent = unreviewedCount;
  document.querySelector("#stat-survey").textContent = state.surveyStatus;
  document.querySelector("#survey-stat-detail").textContent = state.surveyStatus === "Draft" ? `${state.questions.length} questions ready to review` : "Published to expert panel";
  document.querySelector("#expert-nav-count").textContent = experts.length;
  document.querySelector("#approval-nav-count").textContent = pendingCount;
  document.querySelector("#feedback-nav-count").textContent = unreviewedCount;
  document.querySelector("#feedback-count-chip").textContent = `${unreviewedCount} unreviewed`;
  document.querySelector("#unreviewed-filter-count").textContent = unreviewedCount;
  document.querySelector("#experts-total").textContent = experts.length;
  document.querySelector("#experts-a").textContent = experts.filter((expert) => expert.type === "A").length;
  document.querySelector("#experts-b").textContent = experts.filter((expert) => expert.type === "B").length;
  document.querySelector("#experts-invited").textContent = experts.filter((expert) => !expert.used).length;
  document.querySelector("#survey-status-badge").textContent = state.surveyStatus;
  document.querySelector("#survey-page-status").textContent = state.surveyStatus;
  document.querySelector("#survey-status-badge").classList.toggle("published-badge", state.surveyStatus === "Published");
  document.querySelector("#survey-page-status").classList.toggle("published-badge", state.surveyStatus === "Published");
  document.querySelector("#publish-survey").innerHTML = state.surveyStatus === "Published" ? `<span class="button-icon">✓</span> Published` : `<span class="button-icon">↗</span> Publish survey`;
  document.querySelector("#publish-survey").disabled = state.surveyStatus === "Published";
  document.querySelectorAll("#overview-code, #experts-code, #approvals-code, #survey-code, #survey-code-preview, #source-code, #notifications-code").forEach((element) => { element.textContent = state.riskCode; });
}

function renderAll() {
  renderSummary();
  renderExpertTable("expert-rows", "expert-empty", document.querySelector("#expert-search").value);
  renderExpertTable("experts-rows", "experts-empty", document.querySelector("#experts-search").value, true);
  renderApprovals();
  renderQuestions();
  renderFeedback();
  renderLatestFeedback();
  renderNotifications();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function openModal(content) {
  document.querySelector("#modal-content").innerHTML = content;
  document.querySelector("#modal-backdrop").hidden = false;
  document.querySelector("#modal-content input, #modal-content textarea, #modal-content select")?.focus();
}

function closeModal() {
  document.querySelector("#modal-backdrop").hidden = true;
  document.querySelector("#modal-content").innerHTML = "";
}

function openExpertModal() {
  openModal(`<div class="modal-header"><div><p class="eyebrow">TYPE A · ANALYST ONBOARDING</p><h2 id="modal-title">Add an expert</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div>
    <form id="expert-form"><div class="modal-form-grid">
      <div class="modal-field full"><label for="expert-display-name">Name or pseudonym <span class="muted">(optional)</span></label><input id="expert-display-name" name="name" type="text" placeholder="Leave blank to use an opaque handle" maxlength="80"></div>
      <div class="modal-field full"><label for="expert-risk-code">Risk Code</label><select id="expert-risk-code" name="riskCode"><option ${state.riskCode === "R-0427" ? "selected" : ""}>R-0427</option><option ${state.riskCode === "R-0183" ? "selected" : ""}>R-0183</option><option ${state.riskCode === "R-1102" ? "selected" : ""}>R-1102</option></select></div>
      <div class="modal-field full"><label for="expert-education">Educational background</label><textarea id="expert-education" name="education" placeholder="Education, training, or relevant experience"></textarea></div>
      <div class="modal-field"><label for="expert-partners">Partner organisations</label><input id="expert-partners" name="partners" type="text" placeholder="Organisation names"></div>
      <div class="modal-field"><label for="expert-politics">Political affiliation</label><input id="expert-politics" name="politics" type="text" placeholder="As disclosed by expert"></div>
      <div class="modal-field full"><label for="expert-connection">Connection to the studied risk</label><textarea id="expert-connection" name="connection" placeholder="Relevant local knowledge or professional connection"></textarea></div>
    </div><div class="modal-foot"><button type="button" class="btn secondary" data-close-modal>Cancel</button><button type="submit" class="btn primary-action">Generate invite code</button></div></form>`);
}

function openInviteResult(expert) {
  openModal(`<div class="modal-header"><div><p class="eyebrow">INVITE READY · TYPE A</p><h2 id="modal-title">Share this invite code</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="invite-result"><p>Copy and share this code with <strong>${escapeHTML(expert.name)}</strong> manually. No message has been sent.</p><div class="invite-code-row"><code class="invite-code">${escapeHTML(expert.invite)}</code><button class="copy-code" data-copy-value="${escapeHTML(expert.invite)}">Copy code</button></div></div><div class="modal-foot"><button class="btn primary-action" data-close-modal>Done</button></div>`);
}

function openImportModal() {
  openModal(`<div class="modal-header"><div><p class="eyebrow">BULK ONBOARDING · TYPE A</p><h2 id="modal-title">Import experts from CSV</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="drop-zone" id="drop-zone" role="button" tabindex="0"><span class="drop-icon">↑</span><strong>Choose a CSV file or drop it here</strong><small>Each valid row receives a unique invite code.</small><input type="file" class="file-input" id="csv-file" accept=".csv,text/csv"></div><p class="csv-help">Required headers: risk_code, name, educational_background, partner_organisations, political_affiliation, connection_to_risk. The name column may be blank.</p><div id="import-results"></div><div class="modal-foot"><button class="btn secondary" data-close-modal>Close</button></div>`);
  const dropZone = document.querySelector("#drop-zone");
  const fileInput = document.querySelector("#csv-file");
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") fileInput.click(); });
  dropZone.addEventListener("dragover", (event) => { event.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => { event.preventDefault(); dropZone.classList.remove("dragover"); if (event.dataTransfer.files[0]) processCSV(event.dataTransfer.files[0]); });
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) processCSV(fileInput.files[0]); });
}

function parseCSVLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

function processCSV(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).split(/\r?\n/).filter((line) => line.trim());
    const header = parseCSVLine(lines.shift() || "").map((value) => value.toLowerCase());
    const riskIndex = header.indexOf("risk_code");
    const nameIndex = header.indexOf("name");
    const requiredHeaders = ["educational_background", "partner_organisations", "political_affiliation", "connection_to_risk"];
    const missing = requiredHeaders.filter((field) => !header.includes(field));
    let imported = 0;
    const errors = [];
    if (riskIndex < 0 || missing.length) {
      errors.push(`Missing required column${missing.length > 1 ? "s" : ""}: ${[...(riskIndex < 0 ? ["risk_code"] : []), ...missing].join(", ")}`);
    } else {
      lines.forEach((line, index) => {
        const values = parseCSVLine(line);
        const code = values[riskIndex]?.toUpperCase();
        if (!/^R-\d{4}$/.test(code || "")) { errors.push(`Row ${index + 2}: invalid Risk Code`); return; }
        const name = values[nameIndex]?.trim() || `Expert ${String(Date.now()).slice(-4)}-${index + 1}`;
        state.experts.unshift({ id: `e-${Date.now()}-${index}`, type: "A", name, subtitle: "Long-term expert", invite: makeInviteCode(), used: false, status: "Invited", activity: "Just now", riskCode: code });
        imported += 1;
      });
      renderAll();
    }
    document.querySelector("#import-results").innerHTML = `<div class="import-results"><strong>${imported} imported · ${errors.length} row${errors.length === 1 ? "" : "s"} with errors</strong>${errors.length ? `<ul>${errors.map((error) => `<li>${escapeHTML(error)}</li>`).join("")}</ul>` : "<span>Invite codes have been generated for each imported Type A expert.</span>"}</div>`;
  };
  reader.readAsText(file);
}

function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `AC-${segment()}-${segment().slice(0, 2)}`;
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelectorAll("[data-view-link]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.viewLink)));
document.querySelectorAll("[data-action='add-expert']").forEach((button) => button.addEventListener("click", openExpertModal));
document.querySelector("#import-open").addEventListener("click", openImportModal);
document.querySelector("#mobile-menu").addEventListener("click", () => document.querySelector("#sidebar-nav").classList.toggle("mobile-open"));
document.querySelector("#help-button").addEventListener("click", () => showToast("Analyst workspace · internal mockup · delivery is simulated"));

document.querySelectorAll("[data-filter-type]").forEach((button) => button.addEventListener("click", () => {
  state.typeFilter = button.dataset.filterType;
  document.querySelectorAll("[data-filter-type]").forEach((item) => item.classList.toggle("selected", item.dataset.filterType === state.typeFilter));
  renderAll();
}));
document.querySelector("#status-filter").addEventListener("change", (event) => { state.statusFilter = event.target.value; renderAll(); });
document.querySelector("#expert-search").addEventListener("input", (event) => renderExpertTable("expert-rows", "expert-empty", event.target.value));
document.querySelector("#experts-search").addEventListener("input", (event) => renderExpertTable("experts-rows", "experts-empty", event.target.value, true));
document.querySelector("#risk-code-select").addEventListener("change", (event) => {
  state.riskCode = event.target.value;
  document.querySelector("#status-filter").value = "all";
  state.statusFilter = "all";
  renderAll();
  showToast(`Workspace switched to ${state.riskCode}`);
});

document.querySelector("#modal-backdrop").addEventListener("click", (event) => { if (event.target.id === "modal-backdrop" || event.target.closest("[data-close-modal]")) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !document.querySelector("#modal-backdrop").hidden) closeModal(); });
document.addEventListener("submit", (event) => {
  if (event.target.id === "expert-form") {
    event.preventDefault();
    const formData = new FormData(event.target);
    const expert = { id: `e-${Date.now()}`, type: "A", name: String(formData.get("name") || "").trim() || `Expert ${String(Date.now()).slice(-4)}`, subtitle: "Long-term expert", invite: makeInviteCode(), used: false, status: "Invited", activity: "Just now", riskCode: String(formData.get("riskCode")), screening: Object.fromEntries(["education", "partners", "politics", "connection"].map((key) => [key, String(formData.get(key) || "")])) };
    state.experts.unshift(expert);
    renderAll();
    openInviteResult(expert);
  }
  if (event.target.id === "notification-form") {
    event.preventDefault();
    const subject = document.querySelector("#notification-subject").value.trim();
    const message = document.querySelector("#notification-message").value.trim();
    if (!subject || !message) return;
    const recipients = currentExperts().filter((expert) => state.recipientType === "all" || expert.type === state.recipientType);
    state.notifications.unshift({ subject, message, count: recipients.length, type: state.recipientType, date: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date()) });
    event.target.reset();
    document.querySelector("#message-character-count").textContent = "0 / 500";
    renderNotifications();
    showToast(`Notification queued for ${recipients.length} experts`);
  }
});

document.addEventListener("click", async (event) => {
  const approvalButton = event.target.closest("[data-approval]");
  if (approvalButton) {
    const approval = state.approvals.find((item) => item.id === approvalButton.dataset.approval);
    if (approvalButton.dataset.decision === "approve") {
      state.experts.unshift({ id: `e-${Date.now()}`, type: "B", name: approval.handle, subtitle: "Opaque handle", invite: "—", used: true, status: "Onboarded", activity: "Just now", riskCode: approval.riskCode });
      showToast(`${approval.handle} approved and added to the expert panel`);
    } else showToast(`${approval.handle} rejected`);
    state.approvals = state.approvals.filter((item) => item.id !== approval.id);
    renderAll();
    return;
  }
  const deleteQuestion = event.target.closest("[data-delete-question]");
  if (deleteQuestion) { state.questions.splice(Number(deleteQuestion.dataset.deleteQuestion), 1); renderAll(); return; }
  const addQuestion = event.target.closest("#add-question");
  if (addQuestion) { state.questions.push({ kind: "Likert", text: "New question: enter question text" }); renderQuestions(); document.querySelector(".question-text:last-of-type")?.focus(); return; }
  const copyButton = event.target.closest("[data-copy-invite]");
  if (copyButton) {
    const expert = state.experts.find((item) => item.id === copyButton.dataset.copyInvite);
    if (expert && expert.invite !== "—") { await copyText(expert.invite); showToast("Invite code copied"); }
    return;
  }
  const copyValueButton = event.target.closest("[data-copy-value]");
  if (copyValueButton) { await copyText(copyValueButton.dataset.copyValue); copyValueButton.textContent = "Copied"; return; }
  const markReviewed = event.target.closest("[data-mark-reviewed]");
  if (markReviewed) {
    const submission = state.submissions.find((item) => item.id === markReviewed.dataset.markReviewed);
    submission.status = submission.status === "reviewed" ? "unreviewed" : "reviewed";
    renderAll();
    showToast(submission.status === "reviewed" ? "Submission marked reviewed" : "Submission reopened");
    return;
  }
  const addTagButton = event.target.closest("[data-add-tag]");
  if (addTagButton) {
    const tag = window.prompt("Add a short tag");
    if (tag?.trim()) { state.submissions.find((item) => item.id === addTagButton.dataset.addTag).tags.push(tag.trim()); renderAll(); }
    return;
  }
  const replyButton = event.target.closest("[data-reply]");
  if (replyButton) { openReplyModal(replyButton.dataset.reply); return; }
  if (event.target.closest("#publish-survey") && state.surveyStatus !== "Published") {
    state.surveyStatus = "Published";
    renderAll();
    showToast(`Survey published to ${currentExperts().length} experts`);
  }
});

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); }
  catch { const input = document.createElement("textarea"); input.value = value; document.body.append(input); input.select(); document.execCommand("copy"); input.remove(); }
}

function openReplyModal(submissionId) {
  const submission = state.submissions.find((item) => item.id === submissionId);
  openModal(`<div class="modal-header"><div><p class="eyebrow">FEEDBACK RESPONSE · MOCK EMAIL</p><h2 id="modal-title">Reply to contributor</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="reply-context"><strong>To: ${escapeHTML(submission.handle)}</strong>${escapeHTML(submission.body)}</div><form id="reply-form" data-submission-id="${escapeHTML(submission.id)}"><div class="modal-field"><label for="reply-notes">Reply notes</label><textarea id="reply-notes" name="notes" required placeholder="Write a short response for the expert..."></textarea></div><div class="modal-foot"><button type="button" class="btn secondary" data-close-modal>Cancel</button><button type="submit" class="btn primary-action">Compose and send</button></div></form>`);
}

document.addEventListener("change", (event) => {
  const linkSelect = event.target.closest("[data-link-submission]");
  if (linkSelect) {
    const submission = state.submissions.find((item) => item.id === linkSelect.dataset.linkSubmission);
    submission.riskCode = linkSelect.value || null;
    renderAll();
    showToast(submission.riskCode ? `Submission linked to ${submission.riskCode}` : "Risk Code link removed");
  }
  if (event.target.id === "feedback-code-filter") { state.feedbackCode = event.target.value; renderFeedback(); }
});

document.addEventListener("click", (event) => {
  const feedbackFilter = event.target.closest("[data-feedback-status]");
  if (feedbackFilter) {
    state.feedbackStatus = feedbackFilter.dataset.feedbackStatus;
    document.querySelectorAll("[data-feedback-status]").forEach((button) => button.classList.toggle("selected", button.dataset.feedbackStatus === state.feedbackStatus));
    renderFeedback();
  }
  const recipientChoice = event.target.closest("[data-recipient]");
  if (recipientChoice) {
    state.recipientType = recipientChoice.dataset.recipient;
    document.querySelectorAll("[data-recipient]").forEach((button) => button.classList.toggle("selected", button === recipientChoice));
    document.querySelectorAll("[data-recipient]").forEach((button) => { button.querySelector(".recipient-check").textContent = button === recipientChoice ? "✓" : ""; });
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-question-index]")) state.questions[Number(event.target.dataset.questionIndex)].text = event.target.value;
  if (event.target.id === "notification-message") document.querySelector("#message-character-count").textContent = `${event.target.value.length} / 500`;
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "reply-form") {
    event.preventDefault();
    const submission = state.submissions.find((item) => item.id === event.target.dataset.submissionId);
    submission.reply = new FormData(event.target).get("notes");
    submission.status = "reviewed";
    closeModal();
    renderAll();
    showToast(`Reply composed for ${submission.handle} (mock send)`);
  }
});

document.querySelector("#message-character-count").textContent = "0 / 500";
renderAll();