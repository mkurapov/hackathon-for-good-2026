import { useState } from "react";
import { riskCatalogue } from "../data/mock.js";
import { initialsFor, typeLabel } from "../lib/utils.js";

const byUnreviewedFirst = (a, b) => Number(b.status === "unreviewed") - Number(a.status === "unreviewed");

export default function Tips({ submissions, updateSubmission, unreviewedCount, openModal, toast }) {
  const [status, setStatus] = useState("all");
  const [code, setCode] = useState("all");

  const items = submissions.slice().sort(byUnreviewedFirst).filter((s) =>
    (status === "all" || s.status === status) &&
    (code === "all" || (code === "unlinked" ? !s.riskCode : s.riskCode === code))
  );

  const toggleReviewed = (s) => {
    const next = s.status === "reviewed" ? "unreviewed" : "reviewed";
    updateSubmission(s.id, { status: next });
    toast(next === "reviewed" ? "Submission marked reviewed" : "Submission reopened");
  };
  const addTag = (s) => {
    const tag = window.prompt("Add a short tag");
    if (tag?.trim()) updateSubmission(s.id, { tags: [...s.tags, tag.trim()] });
  };
  const link = (s, value) => {
    updateSubmission(s.id, { riskCode: value || null });
    toast(value ? `Submission linked to ${value}` : "Risk Code link removed");
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div><p className="eyebrow">INCOMING INTELLIGENCE</p><h1>Tips inbox</h1></div>
        <span className="count-chip">{unreviewedCount} unreviewed</span>
      </div>
      <div className="board-toolbar feedback-toolbar">
        <div className="filter-group" role="group" aria-label="Filter tips">
          <button className={`filter-pill${status === "all" ? " selected" : ""}`} onClick={() => setStatus("all")}>All tips</button>
          <button className={`filter-pill${status === "unreviewed" ? " selected" : ""}`} onClick={() => setStatus("unreviewed")}>
            Unreviewed <span className="filter-number">{unreviewedCount}</span>
          </button>
          <button className={`filter-pill${status === "reviewed" ? " selected" : ""}`} onClick={() => setStatus("reviewed")}>Reviewed</button>
        </div>
        <select className="compact-select" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Filter by linked Risk Code">
          <option value="all">All Risk Codes</option>
          {riskCatalogue.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
          <option value="unlinked">Unlinked</option>
        </select>
      </div>
      <div className="feedback-list">
        {items.map((s) => (
          <article key={s.id} className={`feedback-card ${s.status === "unreviewed" ? "tip-unreviewed" : "reviewed"}`}>
            <div className="feedback-head">
              <span className="latest-initial">{initialsFor(s.handle)}</span>
              <div className="feedback-who">
                <strong>{s.handle}</strong>
                <small>{typeLabel(s.type)} · {s.riskCode ? `Linked to ${s.riskCode}` : "No Risk Code linked"}</small>
              </div>
              <time className="feedback-date">{s.date}</time>
            </div>
            <p className="feedback-body">{s.body}</p>
            <div className="feedback-controls">
              <div className="feedback-tag-list">
                {s.tags.map((tag) => <span key={tag} className="feedback-tag">{tag}</span>)}
                <button className="mini-action" onClick={() => addTag(s)}>+ Tag</button>
              </div>
              <div className="feedback-actions">
                <select className="small-select" value={s.riskCode || ""} onChange={(e) => link(s, e.target.value)} aria-label="Link submission to a Risk Code">
                  <option value="">Link Risk Code</option>
                  {riskCatalogue.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
                </select>
                <button className="mini-action review-action" onClick={() => toggleReviewed(s)}>{s.status === "reviewed" ? "Reviewed ✓" : "Mark reviewed"}</button>
                <button className="mini-action" onClick={() => openModal("reply", { submissionId: s.id })}>Reply</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && (
        <div className="empty-state empty-inline"><span>▧</span><strong>No tips here</strong><small>Try adjusting your inbox filters.</small></div>
      )}
    </section>
  );
}
