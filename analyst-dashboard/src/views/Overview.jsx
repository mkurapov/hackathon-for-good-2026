import { initialsFor } from "../lib/utils.js";

const byUnreviewedFirst = (a, b) => Number(b.status === "unreviewed") - Number(a.status === "unreviewed");

export default function Overview({ risk, questions, surveyStatus, submissions, unreviewedCount, goTo }) {
  const latest = submissions.filter((item) => item.riskCode === risk.code).sort(byUnreviewedFirst).slice(0, 3);

  return (
    <section className="view active">
      <div className="page-heading overview-heading">
        <div><p className="eyebrow">ACTIVE RISK {risk.code}</p><h1>Overview</h1></div>
      </div>
      <div className="overview-priorities">
        <article className="priority-survey">
          <div className="priority-survey-copy">
            <span className="priority-kicker">
              NEW SURVEY <span className={`status-badge draft-badge${surveyStatus === "Published" ? " published-badge" : ""}`}>{surveyStatus}</span>
            </span>
            <h2>Questions ready for your review</h2>
            <p>{questions.length} questions based on the latest report update, <strong>{risk.basedOnUpdate}</strong>.</p>
            <button className="btn survey-cta" onClick={() => goTo("survey")}>Review survey <span>→</span></button>
          </div>
          <div className="survey-mark" aria-hidden="true">
            <span>{questions.filter((q) => q.kind === "Likert").length}</span><small>LIKERT</small>
            <span className="mark-divider" />
            <span>{questions.filter((q) => q.kind === "Binary").length}</span><small>YES / NO</small>
          </div>
        </article>
        <article className="priority-tips">
          <div className="priority-section-heading">
            <div>
              <span className="priority-kicker">LATEST VOLUNTARY INFORMATION</span>
              <h2>New tips to review <span className="unread-total">{unreviewedCount}</span></h2>
            </div>
            <button className="text-action" onClick={() => goTo("feedback")}>View tips <span>→</span></button>
          </div>
          <div className="latest-feedback">
            {latest.length === 0 && <div className="history-empty">No voluntary information linked to this Risk Code.</div>}
            {latest.map((item) => (
              <div key={item.id} className={`latest-item${item.status === "unreviewed" ? " unreviewed" : ""}`}>
                <span className="latest-initial">{initialsFor(item.handle)}</span>
                <span>
                  <strong>{item.handle}</strong>
                  <small>{item.body.slice(0, 80)}{item.body.length > 80 ? "…" : ""}</small>
                </span>
                <time>{item.status === "unreviewed" ? "NEW" : item.date.split(",")[0]}</time>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
