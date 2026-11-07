const riskSelect = document.querySelector("#risk-code-select");
const state = {
  riskCode: "R-1062",
  activeView: "overview",
  typeFilter: "all",
  statusFilter: "all",
  feedbackStatus: "all",
  feedbackCode: "all",
  tipsTab: "unstructured",
  recipientType: "all",
  editingQuestions: false,
  basedOnUpdate: "",
  surveyPublishedAt: null,
  experts: [
    { id: "e-01", type: "A", name: "Dr. Leila Haddad", subtitle: "Long-term expert", invite: "AC-7F2K-91", used: true, status: "Responded", activity: "Today, 09:42", riskCode: "R-1062" },
    { id: "e-02", type: "A", name: "M. Okafor", subtitle: "Long-term expert", invite: "AC-3M8Q-14", used: true, status: "Awaiting response", activity: "Yesterday", riskCode: "R-1062" },
    { id: "e-03", type: "B", name: "Field contributor 08", subtitle: "Opaque handle", invite: "AC-9P1D-62", used: true, status: "Onboarded", activity: "2 days ago", riskCode: "R-1062" },
    { id: "e-04", type: "A", name: "Samira N.", subtitle: "Long-term expert", invite: "AC-5J6R-33", used: false, status: "Invited", activity: "3 days ago", riskCode: "R-1062" },
    { id: "e-05", type: "B", name: "Field contributor 12", subtitle: "Opaque handle", invite: "AC-2W4B-08", used: true, status: "Awaiting response", activity: "4 days ago", riskCode: "R-1062" },
    { id: "e-06", type: "A", name: "R. Mensah", subtitle: "Long-term expert", invite: "AC-8L2C-75", used: true, status: "Responded", activity: "5 days ago", riskCode: "R-1062" },
    { id: "e-07", type: "A", name: "Nadia K.", subtitle: "Long-term expert", invite: "AC-4H7N-20", used: false, status: "Invited", activity: "1 week ago", riskCode: "R-1062" },
    { id: "e-08", type: "B", name: "Field contributor 19", subtitle: "Opaque handle", invite: "AC-6D3T-57", used: true, status: "Onboarded", activity: "1 week ago", riskCode: "R-1062" },
    { id: "e-09", type: "A", name: "Dr. Peter Osei", subtitle: "Long-term expert", invite: "AC-1N9F-48", used: true, status: "Awaiting response", activity: "2 weeks ago", riskCode: "R-1015" },
    { id: "e-10", type: "B", name: "Field contributor 03", subtitle: "Opaque handle", invite: "AC-7A5E-11", used: false, status: "Invited", activity: "2 weeks ago", riskCode: "R-1015" },
    { id: "e-11", type: "A", name: "T. Mwangi", subtitle: "Long-term expert", invite: "AC-9C2K-86", used: true, status: "Onboarded", activity: "Yesterday", riskCode: "R-1015" },
    { id: "e-12", type: "A", name: "H. Saleh", subtitle: "Long-term expert", invite: "AC-6B4M-39", used: false, status: "Invited", activity: "4 days ago", riskCode: "R-1020" }
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
    { id: "s-01", handle: "Field contributor 19", type: "B", date: "Today, 10:18", body: "The eastern road has been intermittently blocked since Monday. Community members are taking the river route, but transport costs have increased sharply.", tags: ["Access", "Transport"], riskCode: "R-1062", status: "unreviewed" },
    { id: "s-02", handle: "Dr. Leila Haddad", type: "A", date: "Today, 08:52", body: "Two clinics in the central area report that deliveries of trauma kits have not arrived this week. They have enough stock for several days, but no confirmed replenishment date.", tags: ["Health", "Supplies"], riskCode: "R-1062", status: "unreviewed" },
    { id: "s-03", handle: "Field contributor 08", type: "B", date: "Yesterday, 17:26", body: "Families from three nearby villages are staying with relatives near the market. I have not seen a formal site open yet.", tags: ["Displacement"], riskCode: null, status: "unreviewed" },
    { id: "s-04", handle: "M. Okafor", type: "A", date: "Yesterday, 14:03", body: "Local traders expect food prices to rise if the northern checkpoint remains closed through the end of the month.", tags: ["Markets"], riskCode: "R-1015", status: "reviewed" }
  ],
  articleComments: [
    { id: "ac-01", handle: "Field contributor 08", type: "B", date: "Today, 09:16", status: "unreviewed", riskCode: null, articleTitle: "Venezuela's new cabinet reshuffles army command as US warships remain offshore", source: "example-news.com", href: "../extension/design/article.html", paragraphIndex: 1, quote: "the moves targeted commanders seen as close to the previous leadership", stance: "disagree", comment: "Local contacts describe the rotations as broader than a routine reshuffle.", tags: ["Conflict", "Verification"] },
    { id: "ac-02", handle: "Dr. Leila Haddad", type: "A", date: "Yesterday, 15:40", status: "unreviewed", riskCode: null, articleTitle: "Venezuela's new cabinet reshuffles army command as US warships remain offshore", source: "example-news.com", href: "../extension/design/article.html", paragraphIndex: 2, quote: "road checkpoints had multiplied since October, slowing deliveries of food and medical supplies", stance: "agree", comment: "The access delays are consistent with reports from two rural health partners.", tags: ["Humanitarian Aid", "Access"] }
  ],
  answerSamples: [
    { scores: [4, 3, 5, 2, 4, 3, 4, 3], comments: ["Several local units report new checkpoints.", "The main corridor is slower, but still passable."] },
    { scores: [3, 2, 4, 3, 3, 2, 4, 3], comments: ["Travel times rose this month."] },
    { scores: [3, 4, 3, 4, 2, 3, 4, 3], comments: ["Clinics are open, though supplies vary by district."] },
    { scores: [4, 3, 4, 4, 3, 5, 3, 4], comments: ["Prices are rising in smaller markets.", "Stock availability differs across the region."] },
    { scores: [2, 3, 4, 3, 4, 3, 2, 4], comments: ["More reporting is needed from rural areas."] },
    { scores: [1, 0, 1, 1, 0, 1, 0, 1], comments: ["Two villages reported new arrivals last week."] },
    { scores: [1, 1, 0, 1, 1, 0, 1, 1], comments: ["One secondary route was temporarily closed."] },
    { scores: [1, 1, 1, 0, 1, 1, 0, 1], comments: ["A clinic reported a short-term medicine shortage."] },
    { scores: [1, 0, 1, 1, 0, 1, 1, 0], comments: ["No major change in aid access was noted."] },
    { scores: [0, 1, 1, 0, 1, 1, 0, 1], comments: ["Local response coordination continues."] }
  ],
  notifications: []
};

const articleContent = [
  "CARACAS — Venezuela's interim government replaced at least four regional army commanders this week, officials said, in the most significant military shake-up since the removal of former defence minister Vladimir Padrino López.",
  "The government described the changes as routine rotations. But two retired officers, speaking on condition of anonymity, said the moves targeted commanders seen as close to the previous leadership, and that several mid-ranking officers in Zulia and Táchira states had not been paid for over a month.",
  "Aid agencies operating in rural Apure said road checkpoints had multiplied since October, slowing deliveries of food and medical supplies. ‘We are negotiating access village by village,’ said one coordinator.",
  "Meanwhile, US naval vessels remained in waters off the northern coast. Washington says the deployment is aimed at drug trafficking routes, while Caracas has called it a pressure tactic tied to oil negotiations.",
  "Analysts say the coming weeks will test whether the new cabinet can keep the armed forces united while delivering on promises of economic recovery."
];

const expertiseSamples = ["Economy", "Displacement", "Humanitarian Aid", "Women's Rights", "Conflict"];
let riskCatalogue = [];

state.experts.forEach((expert, index) => {
  expert.internalAlias = expert.type === "B" ? expert.name.replace("Field contributor", "FC") : expert.name;
  expert.crossCommunityIdentifier = expert.type === "B" ? `opaque-${String(index + 8).padStart(2, "0")}` : `LT-${String(index + 1048).padStart(4, "0")}`;
  expert.expertise = [expertiseSamples[index % expertiseSamples.length], expertiseSamples[(index + 2) % expertiseSamples.length]];
  expert.riskCodes = [expert.riskCode];
});
state.experts[0].riskCodes.push("R-1015");
state.experts[4].riskCodes.push("R-1020");

const statusClass = { Invited: "status-invited", Onboarded: "status-onboarded", "Awaiting response": "status-awaiting", Responded: "status-responded" };
const initialsFor = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const displayRiskCode = (sourceId) => sourceId.replace(/^(R)(\d{4})$/, "$1-$2");
const sourceRiskId = (riskCode) => riskCode.replace(/-/, "");

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += character;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function latestReportUpdate(text) {
  const match = text.match(/\bUPDATE\s+(\d{2}\/\d{2}\/\d{4})/i);
  return match?.[1] || "Update date unavailable";
}

function riskRecordFromRow(headers, values) {
  const record = Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() || ""]));
  if (!/^R\d{4}$/.test(record["Risk ID"])) return null;
  const countries = record.Country.split(",").map((name) => name.trim()).filter(Boolean);
  return {
    id: record["Risk ID"],
    code: displayRiskCode(record["Risk ID"]),
    title: record["Risk Title"],
    countries: countries.length ? countries : ["Unassigned"],
    level: record["Risk Level"] || "Not rated",
    trend: record["Risk trend"] || "No trend recorded",
    summary: (record["Rationale update"] || record.Rationale || record["Risk Title"] || "").replace(/\s+/g, " ").slice(0, 620),
    basedOnUpdate: latestReportUpdate(record["Rationale update"] || "")
  };
}

async function loadRiskCatalogue() {
  const response = await fetch("risk-radar-export.csv");
  if (!response.ok) throw new Error(`Catalogue request failed (${response.status})`);
  const rows = parseCSV(await response.text());
  const headers = (rows.shift() || []).map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "") : header);
  riskCatalogue = rows.map((row) => riskRecordFromRow(headers, row)).filter(Boolean);
  if (!riskCatalogue.length) throw new Error("No risk profiles were found in the export");

  const countrySelect = document.querySelector("#country-select");
  const countries = [...new Set(riskCatalogue.flatMap((risk) => risk.countries))].sort((a, b) => a.localeCompare(b));
  countrySelect.innerHTML = countries.map((country) => `<option>${escapeHTML(country)}</option>`).join("");
  document.querySelector("#feedback-code-filter").innerHTML = `<option value="all">All Risk Codes</option>${riskCatalogue.map((risk) => `<option value="${escapeHTML(risk.code)}">${escapeHTML(risk.code)}</option>`).join("")}<option value="unlinked">Unlinked</option>`;
  const preferredRisk = riskCatalogue.find((risk) => risk.code === state.riskCode) || riskCatalogue.find((risk) => risk.id === "R1062") || riskCatalogue[0];
  state.riskCode = preferredRisk.code;
  countrySelect.value = preferredRisk.countries[0];
  populateRiskSelect(preferredRisk.code);
  document.querySelector("#country-select").addEventListener("change", () => populateRiskSelect());
  riskSelect.addEventListener("change", () => {
    state.riskCode = riskSelect.value;
    updateSelectedRisk();
    renderAll();
    showToast(`Risk profile switched to ${state.riskCode}`);
  });
  updateSelectedRisk();
}

function populateRiskSelect(selectedCode) {
  const selectedCountry = document.querySelector("#country-select").value;
  const countryRisks = riskCatalogue.filter((risk) => risk.countries.includes(selectedCountry));
  riskSelect.innerHTML = countryRisks.map((risk) => `<option value="${escapeHTML(risk.code)}">${escapeHTML(risk.code)}</option>`).join("");
  riskSelect.value = countryRisks.some((risk) => risk.code === selectedCode) ? selectedCode : countryRisks[0]?.code || "";
  state.riskCode = riskSelect.value;
  updateSelectedRisk();
  renderAll();
}

function selectedRisk() {
  return riskCatalogue.find((risk) => risk.code === state.riskCode);
}

function updateSelectedRisk() {
  const risk = selectedRisk();
  if (!risk) return;
  if (!risk.countries.includes(document.querySelector("#country-select").value)) document.querySelector("#country-select").value = risk.countries[0];
  state.basedOnUpdate = risk.basedOnUpdate;
  document.querySelector("#risk-title-preview").textContent = risk.title;
  document.querySelector("#risk-title-preview").title = risk.title;
  document.querySelectorAll("#overview-code, #experts-code, #survey-code, #source-code, #notifications-code").forEach((element) => { element.textContent = risk.code; });
  ["#survey-report-date", "#source-report-date", "#overview-report-date"].forEach((selector) => { document.querySelector(selector).textContent = risk.basedOnUpdate; });
  document.querySelector("#risk-alert-title").textContent = risk.title;
  document.querySelector("#source-summary").textContent = risk.summary || risk.title;
  const riskAlert = document.querySelector("#risk-alert");
  const trend = risk.trend.toLowerCase();
  const direction = /deteriorat|worsen|increas|escalat/.test(trend) ? "increased" : /improv|decreas|reduc/.test(trend) ? "decreased" : /stable|unchanged/.test(trend) ? "unchanged" : "unknown";
  const directionText = { increased: "Increased", decreased: "Decreased", unchanged: "Unchanged", unknown: "Not recorded" }[direction];
  riskAlert.dataset.direction = direction;
  riskAlert.querySelector(".priority-kicker").textContent = direction === "unknown" ? "RISK DIRECTION NOT RECORDED" : `RISK ${direction.toUpperCase()}`;
  riskAlert.querySelector(".risk-alert-icon").textContent = { increased: "↑", decreased: "↓", unchanged: "→", unknown: "?" }[direction];
  riskAlert.querySelector(".risk-level-value").textContent = risk.level;
  riskAlert.querySelector(".risk-trend-value").textContent = directionText;
}

function currentExperts() {
  return state.experts.filter((expert) => expert.riskCodes.includes(state.riskCode) && expert.status !== "Rejected");
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

function renderExpertTable(searchValue = "") {
  const search = searchValue.trim().toLowerCase();
  const filtered = currentExperts().slice().sort((first, second) => Number(second.status === "Awaiting response") - Number(first.status === "Awaiting response")).filter((expert) => {
    const matchesType = state.typeFilter === "all" || expert.type === state.typeFilter;
    const matchesStatus = state.statusFilter === "all" || expert.status === state.statusFilter;
    const matchesSearch = !search || `${expert.internalAlias} ${expert.name} ${expert.type} ${expert.invite} ${expert.status}`.toLowerCase().includes(search);
    return matchesType && matchesStatus && matchesSearch;
  });
  const rows = document.querySelector("#experts-rows");
  rows.innerHTML = filtered.map((expert) => `
    <tr>
      <td><button class="profile-link" data-expert-profile="${escapeHTML(expert.id)}"><span class="expert-avatar ${expert.type === "B" ? "type-b-avatar" : ""}">${escapeHTML(initialsFor(expert.internalAlias))}</span><span><strong>${escapeHTML(expert.internalAlias)}</strong><small>${expert.type === "B" ? "Informal expert" : "Long-term expert"}</small></span></button></td>
      <td><span class="type-label ${expert.type === "B" ? "type-b-label" : ""}"><i class="type-dot type-${expert.type.toLowerCase()}"></i>${expert.type === "B" ? "Informal" : "Long-term"}</span></td>
      <td><span class="invite-cell">${escapeHTML(expert.invite)}</span>${expert.invite !== "—" ? `<button class="copy-invite" data-copy-invite="${escapeHTML(expert.id)}" title="Copy invite code" aria-label="Copy invite code"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1.5"></rect><path d="M16 8V5.8A1.8 1.8 0 0 0 14.2 4H5.8A1.8 1.8 0 0 0 4 5.8v8.4A1.8 1.8 0 0 0 5.8 16H8"></path></svg></button>` : ""}<small class="invite-state ${expert.used ? "code-used" : "code-unused"}">${expert.used ? "Used to onboard" : "Issued · not used"}</small></td>
      <td><span class="status-badge ${statusClass[expert.status] || ""}">${escapeHTML(expert.status)}</span></td>
      <td class="last-activity">${escapeHTML(expert.activity)}</td>
    </tr>`).join("");
  document.querySelector("#experts-empty").hidden = filtered.length !== 0;
  document.querySelector("#experts-count-label").textContent = `${filtered.length} ${filtered.length === 1 ? "expert" : "experts"}`;
}

function renderQuestions() {
  document.querySelector("#question-list").innerHTML = state.questions.map((question, index) => `
    <div class="question-row"><span class="question-order">${String(index + 1).padStart(2, "0")}</span><span class="question-kind ${question.kind === "Binary" ? "binary" : ""}">${question.kind}</span><textarea class="question-text" data-question-index="${index}" aria-label="Edit question ${index + 1}" rows="2" ${state.editingQuestions ? "" : "readonly"}>${escapeHTML(question.text)}</textarea>${state.editingQuestions ? `<button class="question-delete" data-delete-question="${index}" title="Remove question" aria-label="Remove question">×</button>` : ""}</div>`).join("");
  const likertCount = state.questions.filter((question) => question.kind === "Likert").length;
  const binaryCount = state.questions.length - likertCount;
  document.querySelector("#question-count").textContent = state.questions.length;
  document.querySelector("#question-kind-count").textContent = `${likertCount} Likert, ${binaryCount} binary`;
  document.querySelector("#add-question").hidden = !state.editingQuestions;
}

function renderSurveyAnswers() {
  const responseCount = state.answerSamples[0].scores.length;
  const rate = Math.round(responseCount / 8 * 100);
  document.querySelector("#answers-total").textContent = responseCount;
  document.querySelector("#answers-response-count").textContent = `${responseCount} responses`;
  document.querySelector("#answers-rate").textContent = `${rate}%`;
  document.querySelector("#answers-updated").textContent = state.surveyPublishedAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(state.surveyPublishedAt) : "Not published";
  document.querySelector("#answers-code").textContent = state.riskCode;
  document.querySelector("#answers-question-list").innerHTML = state.questions.map((question, index) => {
    const sample = state.answerSamples[index];
    const values = sample.scores.filter((score) => Number.isFinite(score));
    const average = values.reduce((total, score) => total + score, 0) / (values.length || 1);
    const isLikert = question.kind === "Likert";
    const averageDisplay = isLikert ? `${average.toFixed(1)} / 5` : `${Math.round(average * 100)}%`;
    let likertDeviation = "";
    let likertInterval = "";
    if (isLikert) {
      const variance = values.length > 1 ? values.reduce((total, score) => total + (score - average) ** 2, 0) / (values.length - 1) : 0;
      const standardDeviation = Math.sqrt(variance);
      const intervalLow = Math.max(1, average - standardDeviation);
      const intervalHigh = Math.min(5, average + standardDeviation);
      const rangeLeft = ((intervalLow - 1) / 4) * 100;
      const rangeWidth = ((intervalHigh - intervalLow) / 4) * 100;
      const averagePosition = ((average - 1) / 4) * 100;
      const intervalLabel = `${intervalLow.toFixed(1)}–${intervalHigh.toFixed(1)}`;
      likertDeviation = `<div><span>Standard deviation</span><strong>${standardDeviation.toFixed(2)}</strong></div>`;
      likertInterval = `<div class="answer-interval"><div class="answer-interval-heading"><span>Average ± 1 SD</span><strong>${intervalLabel}</strong></div><div class="answer-interval-track" role="img" aria-label="Average ${averageDisplay}; average plus or minus one standard deviation is ${intervalLabel}"><span class="answer-interval-range" style="left:${rangeLeft}%;width:${rangeWidth}%"></span><span class="answer-interval-mean" style="left:${averagePosition}%"></span></div><div class="answer-interval-axis"><span>1</span><span>3</span><span>5</span></div></div>`;
    }
    const highlights = sample.comments;
    return `<article class="answer-question"><header><span class="question-order">${String(index + 1).padStart(2, "0")}</span><span class="question-kind ${question.kind === "Binary" ? "binary" : ""}">${question.kind}</span><p>${escapeHTML(question.text)}</p></header><div class="answer-metrics"><div><span>${isLikert ? "Average score" : "Yes responses"}</span><strong>${averageDisplay}</strong></div>${likertDeviation}<div><span>Answers</span><strong>${values.length}</strong></div></div>${likertInterval}<div class="answer-comments"><span class="answer-comments-label">Comment highlights</span>${highlights.map((comment) => `<blockquote>${escapeHTML(comment)}</blockquote>`).join("") || `<p class="muted">No comments on this question.</p>`}</div></article>`;
  }).join("");
}

function openExpertProfile(expertId) {
  const expert = state.experts.find((item) => item.id === expertId);
  if (!expert) return;
  const linkedRisks = expert.riskCodes.map((code) => riskCatalogue.find((risk) => risk.code === code)).filter(Boolean);
  const expertiseTags = expert.expertise.map((area) => `<span class="profile-tag">${escapeHTML(area)}</span>`).join("");
  const riskTags = linkedRisks.map((risk) => `<span class="profile-risk"><strong>${escapeHTML(risk.code)}</strong><small>${escapeHTML(risk.title)}</small></span>`).join("");
  openModal(`<div class="modal-header"><div><p class="eyebrow">${expert.type === "B" ? "INFORMAL EXPERT" : "LONG-TERM EXPERT"} · PROFILE</p><h2 id="modal-title">${escapeHTML(expert.internalAlias)}</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="profile-identifiers"><div><span>Internal alias</span><strong>${escapeHTML(expert.internalAlias)}</strong></div><div><span>Cross-community identifier</span><strong>${escapeHTML(expert.crossCommunityIdentifier)}</strong></div></div><div class="profile-section"><h3>Areas of expertise</h3><div class="profile-tags">${expertiseTags}</div></div><div class="profile-section"><h3>Risk Codes</h3><div class="profile-risks">${riskTags}</div></div><div class="profile-footer"><span class="status-badge ${statusClass[expert.status] || ""}">${escapeHTML(expert.status)}</span><span>Last activity · ${escapeHTML(expert.activity)}</span></div>`);
}

function renderFeedback() {
  const items = state.submissions.slice().sort((first, second) => Number(second.status === "unreviewed") - Number(first.status === "unreviewed")).filter((submission) => {
    const matchesStatus = state.feedbackStatus === "all" || submission.status === state.feedbackStatus;
    const matchesCode = state.feedbackCode === "all" || (state.feedbackCode === "unlinked" ? !submission.riskCode : submission.riskCode === state.feedbackCode);
    return matchesStatus && matchesCode;
  });
  document.querySelector("#feedback-list").innerHTML = items.map((submission) => `
    <article class="feedback-card ${submission.status === "unreviewed" ? "tip-unreviewed" : "reviewed"}"><div class="feedback-head"><span class="latest-initial">${escapeHTML(initialsFor(submission.handle))}</span><div class="feedback-who"><strong>${escapeHTML(submission.handle)}</strong><small>${submission.type === "B" ? "Informal" : "Long-term"} · ${submission.riskCode ? `Linked to ${escapeHTML(submission.riskCode)}` : "No Risk Code linked"}</small></div><time class="feedback-date">${escapeHTML(submission.date)}</time></div><p class="feedback-body">${escapeHTML(submission.body)}</p><div class="feedback-controls"><div class="feedback-tag-list">${submission.tags.map((tag) => `<span class="feedback-tag">${escapeHTML(tag)}</span>`).join("")}<button class="mini-action" data-add-tag="${escapeHTML(submission.id)}">+ Tag</button></div><div class="feedback-actions"><select class="small-select" data-link-submission="${escapeHTML(submission.id)}" aria-label="Link submission to a Risk Code"><option value="">Link Risk Code</option>${riskCatalogue.map((risk) => `<option value="${escapeHTML(risk.code)}" ${submission.riskCode === risk.code ? "selected" : ""}>${escapeHTML(risk.code)}</option>`).join("")}</select><button class="mini-action review-action" data-mark-reviewed="${escapeHTML(submission.id)}">${submission.status === "reviewed" ? "Reviewed ✓" : "Mark reviewed"}</button><button class="mini-action" data-reply="${escapeHTML(submission.id)}">Reply</button></div></div></article>`).join("");
  document.querySelector("#feedback-empty").hidden = items.length > 0;
}

function renderArticleComments() {
  const items = state.articleComments.slice().sort((first, second) => Number(second.status === "unreviewed") - Number(first.status === "unreviewed")).filter((item) => {
    const matchesStatus = state.feedbackStatus === "all" || item.status === state.feedbackStatus;
    const matchesCode = state.feedbackCode === "all" || (state.feedbackCode === "unlinked" ? !item.riskCode : item.riskCode === state.feedbackCode);
    return matchesStatus && matchesCode;
  });
  document.querySelector("#article-comment-list").innerHTML = items.map((item) => `<article class="article-comment-card ${item.status === "unreviewed" ? "tip-unreviewed" : "reviewed"}"><div class="article-comment-head"><div><strong>${escapeHTML(item.handle)}</strong><small>${item.type === "B" ? "Informal" : "Long-term"} · ${escapeHTML(item.date)}</small></div><span class="status-badge ${item.status === "unreviewed" ? "status-awaiting" : "status-onboarded"}">${item.status === "unreviewed" ? "Unreviewed" : "Reviewed"}</span></div><button class="article-title-link" data-open-article="${escapeHTML(item.id)}">${escapeHTML(item.articleTitle)} <span>↗</span></button><div class="article-source">${escapeHTML(item.source)} · ${item.riskCode ? escapeHTML(item.riskCode) : "Unlinked risk"}</div><blockquote class="commented-snippet">${escapeHTML(item.quote)}</blockquote>${item.stance ? `<span class="stance-pill ${escapeHTML(item.stance)}">${item.stance === "agree" ? "Agree" : "Disagree"}</span>` : ""}<p class="article-expert-comment">${escapeHTML(item.comment || "No additional comment provided.")}</p><div class="article-comment-actions"><button class="mini-action" data-open-article="${escapeHTML(item.id)}">View article with comments</button><button class="mini-action review-action" data-review-article="${escapeHTML(item.id)}">${item.status === "reviewed" ? "Reviewed ✓" : "Mark reviewed"}</button></div></article>`).join("");
  document.querySelector("#article-comments-empty").hidden = items.length > 0;
}

function renderTipsTab() {
  const isRaw = state.tipsTab === "unstructured";
  document.querySelectorAll("[data-tips-tab]").forEach((tab) => {
    const selected = tab.dataset.tipsTab === state.tipsTab;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  document.querySelector("#unstructured-panel").hidden = !isRaw;
  document.querySelector("#article-comments-panel").hidden = isRaw;
}

function renderArticleReader(commentId) {
  const selected = state.articleComments.find((item) => item.id === commentId);
  if (!selected) return;
  const linkedComments = state.articleComments.filter((item) => item.articleTitle === selected.articleTitle);
  const paragraphs = articleContent.map((paragraph, paragraphIndex) => {
    const annotations = linkedComments.filter((item) => item.paragraphIndex === paragraphIndex);
    let markup = escapeHTML(paragraph);
    annotations.forEach((annotation, annotationIndex) => {
      const start = paragraph.indexOf(annotation.quote);
      if (start < 0) return;
      const before = escapeHTML(paragraph.slice(0, start));
      const quote = escapeHTML(annotation.quote);
      const after = escapeHTML(paragraph.slice(start + annotation.quote.length));
      markup = `${before}<mark class="reader-highlight ${annotation.stance || ""}" id="reader-mark-${escapeHTML(annotation.id)}">${quote}</mark>${after}`;
      if (annotationIndex > 0) return;
    });
    return `<p>${markup}</p>${annotations.map((annotation) => `<aside class="reader-comment"><span class="reader-comment-pin">${annotation.stance === "agree" ? "+" : "−"}</span><div><strong>${escapeHTML(annotation.handle)}${annotation.stance ? ` · ${annotation.stance === "agree" ? "Agrees" : "Disagrees"}` : ""}</strong><p>${escapeHTML(annotation.comment || "No additional comment provided.")}</p></div></aside>`).join("")}`;
  }).join("");
  openModal(`<div class="modal-header"><div><p class="eyebrow">ANNOTATED ARTICLE · ${escapeHTML(selected.source)}</p><h2 id="modal-title">${escapeHTML(selected.articleTitle)}</h2></div><button class="modal-close" data-close-modal aria-label="Close article">×</button></div><div class="reader-toolbar"><span>${linkedComments.length} expert comments</span><a href="${escapeHTML(selected.href)}" target="_blank" rel="noopener">Open article prototype ↗</a></div><article class="reader-article">${paragraphs}</article>`);
}

function renderLatestFeedback() {
  const latest = state.submissions.filter((item) => item.riskCode === state.riskCode).slice().sort((first, second) => Number(second.status === "unreviewed") - Number(first.status === "unreviewed")).slice(0, 3);
  document.querySelector("#latest-feedback").innerHTML = latest.map((item) => `<div class="latest-item ${item.status === "unreviewed" ? "unreviewed" : ""}"><span class="latest-initial">${escapeHTML(initialsFor(item.handle))}</span><span><strong>${escapeHTML(item.handle)}</strong><small>${escapeHTML(item.body.slice(0, 80))}${item.body.length > 80 ? "…" : ""}</small></span><time>${item.status === "unreviewed" ? "NEW" : escapeHTML(item.date.split(",")[0])}</time></div>`).join("") || `<div class="history-empty">No voluntary information linked to this Risk Code.</div>`;
}

function renderNotifications() {
  const experts = currentExperts();
  document.querySelector("#recipient-all-count").textContent = `${experts.length} recipients`;
  document.querySelector("#recipient-a-count").textContent = `${experts.filter((expert) => expert.type === "A").length} recipients`;
  document.querySelector("#recipient-b-count").textContent = `${experts.filter((expert) => expert.type === "B").length} recipients`;
  document.querySelector("#notification-history").innerHTML = state.notifications.slice(0, 5).map((item) => `<div class="history-item"><strong>${escapeHTML(item.subject)}</strong><small>${escapeHTML(item.date)} · ${item.count} recipients (${item.type === "all" ? "All experts" : item.type === "A" ? "Long-term experts" : "Informal experts"})</small></div>`).join("") || `<div class="history-empty">No notifications queued yet.</div>`;
}

function renderSummary() {
  const experts = currentExperts();
  const unreviewedCount = state.submissions.filter((item) => item.status === "unreviewed" && item.riskCode === state.riskCode).length;
  document.querySelector("#feedback-nav-count").textContent = unreviewedCount;
  document.querySelector("#feedback-count-chip").textContent = `${unreviewedCount} unreviewed`;
  document.querySelector("#unreviewed-filter-count").textContent = unreviewedCount;
  document.querySelector("#raw-tip-count").textContent = state.submissions.filter((item) => item.status === "unreviewed" && item.riskCode === state.riskCode).length;
  document.querySelector("#article-comment-count").textContent = state.articleComments.filter((item) => item.status === "unreviewed" && (!item.riskCode || item.riskCode === state.riskCode)).length;
  document.querySelector("#home-unreviewed-count").textContent = unreviewedCount;
  document.querySelector("#overview-survey-count").textContent = state.questions.length;
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
  document.querySelector("#answers-nav").disabled = state.surveyStatus !== "Published";
  document.querySelector("#answers-nav").title = state.surveyStatus === "Published" ? "View survey response analytics" : "Available after survey publication";
}

function renderAll() {
  renderSummary();
  renderExpertTable(document.querySelector("#experts-search").value);
  renderQuestions();
  renderSurveyAnswers();
  renderFeedback();
  renderArticleComments();
  renderTipsTab();
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
  openModal(`<div class="modal-header"><div><p class="eyebrow">LONG-TERM EXPERT · ANALYST ONBOARDING</p><h2 id="modal-title">Add an expert</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div>
    <form id="expert-form"><div class="modal-form-grid">
      <div class="modal-field full"><label for="expert-display-name">Name or pseudonym <span class="muted">(optional)</span></label><input id="expert-display-name" name="name" type="text" placeholder="Leave blank to use an opaque handle" maxlength="80"></div>
      <div class="modal-field full"><label for="expert-risk-code">Risk Code</label><select id="expert-risk-code" name="riskCode">${riskCatalogue.map((risk) => `<option value="${escapeHTML(risk.code)}" ${risk.code === state.riskCode ? "selected" : ""}>${escapeHTML(risk.code)} · ${escapeHTML(risk.title)}</option>`).join("")}</select></div>
      <div class="modal-field full"><label for="expert-education">Educational background</label><textarea id="expert-education" name="education" placeholder="Education, training, or relevant experience"></textarea></div>
      <div class="modal-field"><label for="expert-partners">Partner organisations</label><input id="expert-partners" name="partners" type="text" placeholder="Organisation names"></div>
      <div class="modal-field"><label for="expert-politics">Political affiliation</label><input id="expert-politics" name="politics" type="text" placeholder="As disclosed by expert"></div>
      <div class="modal-field full"><label for="expert-connection">Connection to the studied risk</label><textarea id="expert-connection" name="connection" placeholder="Relevant local knowledge or professional connection"></textarea></div>
    </div><div class="modal-foot"><button type="button" class="btn secondary" data-close-modal>Cancel</button><button type="submit" class="btn primary-action">Generate invite code</button></div></form>`);
}

function openInviteResult(expert) {
  openModal(`<div class="modal-header"><div><p class="eyebrow">INVITE READY · LONG-TERM EXPERT</p><h2 id="modal-title">Share this invite code</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="invite-result"><p>Copy and share this code with <strong>${escapeHTML(expert.name)}</strong> manually. No message has been sent.</p><div class="invite-code-row"><code class="invite-code">${escapeHTML(expert.invite)}</code><button class="copy-code" data-copy-value="${escapeHTML(expert.invite)}">Copy code</button></div></div><div class="modal-foot"><button class="btn primary-action" data-close-modal>Done</button></div>`);
}

function openImportModal() {
  openModal(`<div class="modal-header"><div><p class="eyebrow">BULK ONBOARDING · LONG-TERM EXPERTS</p><h2 id="modal-title">Import experts from CSV</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="drop-zone" id="drop-zone" role="button" tabindex="0"><span class="drop-icon">↑</span><strong>Choose a CSV file or drop it here</strong><small>Each valid row receives a unique invite code.</small><input type="file" class="file-input" id="csv-file" accept=".csv,text/csv"></div><p class="csv-help">Required headers: risk_code, name, educational_background, partner_organisations, political_affiliation, connection_to_risk. The name column may be blank.</p><div id="import-results"></div><div class="modal-foot"><button class="btn secondary" data-close-modal>Close</button></div>`);
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
        const code = displayRiskCode((values[riskIndex] || "").toUpperCase().replace(/-/, ""));
        if (!/^R-\d{4}$/.test(code) || !riskCatalogue.some((risk) => risk.code === code)) { errors.push(`Row ${index + 2}: unknown or invalid Risk Code`); return; }
        const name = values[nameIndex]?.trim() || `Expert ${String(Date.now()).slice(-4)}-${index + 1}`;
        const importedExpert = { id: `e-${Date.now()}-${index}`, type: "A", name, internalAlias: name, crossCommunityIdentifier: `LT-${String(Date.now()).slice(-4)}`, expertise: [...expertiseSamples.slice(0, 2)], riskCodes: [code], subtitle: "Long-term expert", invite: makeInviteCode(), used: false, status: "Invited", activity: "Just now", riskCode: code };
        state.experts.unshift(importedExpert);
        imported += 1;
      });
      renderAll();
    }
    document.querySelector("#import-results").innerHTML = `<div class="import-results"><strong>${imported} imported · ${errors.length} row${errors.length === 1 ? "" : "s"} with errors</strong>${errors.length ? `<ul>${errors.map((error) => `<li>${escapeHTML(error)}</li>`).join("")}</ul>` : "<span>Invite codes have been generated for each long-term expert.</span>"}</div>`;
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
document.querySelector("#experts-search").addEventListener("input", (event) => renderExpertTable(event.target.value));
document.querySelector("#modal-backdrop").addEventListener("click", (event) => { if (event.target.id === "modal-backdrop" || event.target.closest("[data-close-modal]")) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !document.querySelector("#modal-backdrop").hidden) closeModal(); });
document.addEventListener("submit", (event) => {
  if (event.target.id === "expert-form") {
    event.preventDefault();
    const formData = new FormData(event.target);
    const name = String(formData.get("name") || "").trim() || `Expert ${String(Date.now()).slice(-4)}`;
    const riskCode = String(formData.get("riskCode"));
    const expert = { id: `e-${Date.now()}`, type: "A", name, internalAlias: name, crossCommunityIdentifier: `LT-${String(Date.now()).slice(-4)}`, expertise: [...expertiseSamples.slice(0, 2)], riskCodes: [riskCode], subtitle: "Long-term expert", invite: makeInviteCode(), used: false, status: "Invited", activity: "Just now", riskCode, screening: Object.fromEntries(["education", "partners", "politics", "connection"].map((key) => [key, String(formData.get(key) || "")])) };
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
  const profileButton = event.target.closest("[data-expert-profile]");
  if (profileButton) { openExpertProfile(profileButton.dataset.expertProfile); return; }
  if (event.target.closest("#edit-questions")) {
    state.editingQuestions = !state.editingQuestions;
    document.querySelector("#edit-questions").innerHTML = state.editingQuestions ? `<span class="button-icon">✓</span> Save changes` : `<span class="button-icon">✎</span> Edit questions`;
    renderQuestions();
    return;
  }
  const deleteQuestion = event.target.closest("[data-delete-question]");
  if (deleteQuestion) { state.questions.splice(Number(deleteQuestion.dataset.deleteQuestion), 1); renderAll(); return; }
  const addQuestion = event.target.closest("#add-question");
  if (addQuestion) { state.questions.push({ kind: "Likert", text: "New question: enter question text" }); renderQuestions(); document.querySelector(".question-text:last-of-type")?.focus(); return; }
  const articleButton = event.target.closest("[data-open-article]");
  if (articleButton) { renderArticleReader(articleButton.dataset.openArticle); return; }
  const articleReviewButton = event.target.closest("[data-review-article]");
  if (articleReviewButton) {
    const articleComment = state.articleComments.find((item) => item.id === articleReviewButton.dataset.reviewArticle);
    articleComment.status = articleComment.status === "reviewed" ? "unreviewed" : "reviewed";
    renderAll();
    return;
  }
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
    state.surveyPublishedAt = new Date();
    renderAll();
    showToast("Survey answers are now available");
    showToast(`Survey published to ${currentExperts().length} experts`);
  }
  const tipsTab = event.target.closest("[data-tips-tab]");
  if (tipsTab) {
    state.tipsTab = tipsTab.dataset.tipsTab;
    renderTipsTab();
  }
});

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); }
  catch { const input = document.createElement("textarea"); input.value = value; document.body.append(input); input.select(); document.execCommand("copy"); input.remove(); }
}

function openReplyModal(submissionId) {
  const submission = state.submissions.find((item) => item.id === submissionId);
  openModal(`<div class="modal-header"><div><p class="eyebrow">TIP RESPONSE · MOCK EMAIL</p><h2 id="modal-title">Reply to contributor</h2></div><button class="modal-close" data-close-modal aria-label="Close dialog">×</button></div><div class="reply-context"><strong>To: ${escapeHTML(submission.handle)}</strong>${escapeHTML(submission.body)}</div><form id="reply-form" data-submission-id="${escapeHTML(submission.id)}"><div class="modal-field"><label for="reply-notes">Reply notes</label><textarea id="reply-notes" name="notes" required placeholder="Write a short response for the expert..."></textarea></div><div class="modal-foot"><button type="button" class="btn secondary" data-close-modal>Cancel</button><button type="submit" class="btn primary-action">Compose and send</button></div></form>`);
}

document.addEventListener("change", (event) => {
  const linkSelect = event.target.closest("[data-link-submission]");
  if (linkSelect) {
    const submission = state.submissions.find((item) => item.id === linkSelect.dataset.linkSubmission);
    submission.riskCode = linkSelect.value || null;
    renderAll();
    showToast(submission.riskCode ? `Submission linked to ${submission.riskCode}` : "Risk Code link removed");
  }
  if (event.target.id === "feedback-code-filter") { state.feedbackCode = event.target.value; renderFeedback(); renderArticleComments(); }
});

document.addEventListener("click", (event) => {
  const feedbackFilter = event.target.closest("[data-feedback-status]");
  if (feedbackFilter) {
    state.feedbackStatus = feedbackFilter.dataset.feedbackStatus;
    document.querySelectorAll("[data-feedback-status]").forEach((button) => button.classList.toggle("selected", button.dataset.feedbackStatus === state.feedbackStatus));
    renderFeedback();
    renderArticleComments();
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
loadRiskCatalogue().catch((error) => {
  console.error("Unable to load the risk catalogue:", error);
  showToast("Risk catalogue unavailable. Open this dashboard through a local web server.");
});