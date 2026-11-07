import { useState } from "react";
import { copyText, initialsFor, statusClass } from "../lib/utils.js";

const STATUSES = ["Invited", "Onboarded", "Awaiting response", "Responded"];
const awaitingFirst = (a, b) => Number(b.status === "Awaiting response") - Number(a.status === "Awaiting response");

export default function Experts({ risk, currentExperts, openModal, toast }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = currentExperts.slice().sort(awaitingFirst).filter((expert) =>
    (typeFilter === "all" || expert.type === typeFilter) &&
    (statusFilter === "all" || expert.status === statusFilter) &&
    (!query || `${expert.internalAlias} ${expert.name} ${expert.type} ${expert.invite} ${expert.status}`.toLowerCase().includes(query))
  );
  const countA = currentExperts.filter((e) => e.type === "A").length;

  return (
    <section className="view active">
      <div className="page-heading">
        <div><p className="eyebrow">ACTIVE RISK {risk.code}</p><h1>Expert panel</h1></div>
        <div className="heading-actions">
          <button className="btn secondary" onClick={() => openModal("import")}><span className="button-icon">↑</span> Import CSV</button>
          <button className="btn primary-action" onClick={() => openModal("addExpert")}><span className="plus">+</span> Add expert</button>
        </div>
      </div>
      <div className="stat-strip">
        <span><strong>{currentExperts.length}</strong> experts</span>
        <span className="strip-separator" />
        <span><span className="type-dot type-a" /><strong>{countA}</strong> Long-term</span>
        <span><span className="type-dot type-b" /><strong>{currentExperts.length - countA}</strong> Informal</span>
        <span className="strip-separator" />
        <span><strong>{currentExperts.filter((e) => !e.used).length}</strong> invites unused</span>
      </div>
      <div className="board-toolbar full-toolbar">
        <div className="filter-group" role="group" aria-label="Filter by contributor type">
          {[["all", "All experts"], ["A", "Long-term"], ["B", "Informal"]].map(([value, label]) => (
            <button key={value} className={`filter-pill${typeFilter === value ? " selected" : ""}`} onClick={() => setTypeFilter(value)}>
              {label} {value !== "all" && <span className={`type-dot type-${value.toLowerCase()}`} />}
            </button>
          ))}
        </div>
        <select className="compact-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by onboarding status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="search-field">
          <span>⌕</span>
          <input type="search" placeholder="Search experts" aria-label="Search experts" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="table-scroll board-table-scroll">
        <table className="data-table expert-table">
          <thead><tr><th>Internal alias</th><th>Contributor</th><th>Invite code</th><th>Status</th><th>Last activity</th></tr></thead>
          <tbody>
            {filtered.map((expert) => {
              const informal = expert.type === "B";
              return (
                <tr key={expert.id}>
                  <td>
                    <button className="profile-link" onClick={() => openModal("profile", { expertId: expert.id })}>
                      <span className={`expert-avatar${informal ? " type-b-avatar" : ""}`}>{initialsFor(expert.internalAlias)}</span>
                      <span><strong>{expert.internalAlias}</strong><small>{informal ? "Informal expert" : "Long-term expert"}</small></span>
                    </button>
                  </td>
                  <td>
                    <span className={`type-label${informal ? " type-b-label" : ""}`}>
                      <i className={`type-dot type-${expert.type.toLowerCase()}`} />{informal ? "Informal" : "Long-term"}
                    </span>
                  </td>
                  <td>
                    <span className="invite-cell">{expert.invite}</span>
                    <button className="copy-invite" title="Copy invite code" aria-label="Copy invite code" onClick={async () => { await copyText(expert.invite); toast("Invite code copied"); }}>▢</button>
                    <small className={`invite-state ${expert.used ? "code-used" : "code-unused"}`}>{expert.used ? "Used to onboard" : "Issued · not used"}</small>
                  </td>
                  <td><span className={`status-badge ${statusClass[expert.status] || ""}`}>{expert.status}</span></td>
                  <td className="last-activity">{expert.activity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state"><span>◎</span><strong>No experts match these filters</strong><small>Try changing the status, search, or contributor type.</small></div>
        )}
      </div>
      <div className="table-footer">
        <span>{filtered.length} {filtered.length === 1 ? "expert" : "experts"}</span>
        <span className="privacy-footnote"><span>●</span> Submission linkage is not shown on this board</span>
      </div>
      <div className="bottom-callout">
        <span className="callout-mark">i</span>
        <span><strong>Privacy</strong> Informal expert identifiers and records are visible only in this internal workspace.</span>
      </div>
    </section>
  );
}
