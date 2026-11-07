import { initialsFor, timeAgo } from "../lib/utils.js";

const byUnreviewedFirst = (a, b) => Number(b.status === "unreviewed") - Number(a.status === "unreviewed");

export default function Overview({ risk, survey, submissions, unreviewedCount, goTo, openTip }) {
  const questions = survey?.questions || [];
  const surveyStatus = survey?.status;
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
              NEW SURVEY {survey && <span className={`status-badge draft-badge${surveyStatus === "Published" ? " published-badge" : ""}`}>{surveyStatus}</span>}
            </span>
            {survey ? (
              <>
                <h2>{surveyStatus === "Published" ? `Survey published · ${survey.responseCount} responses` : "Questions ready for your review"}</h2>
                <p>{questions.length} questions based on the latest report update{survey.basedOnUpdate && <>, <strong>{survey.basedOnUpdate}</strong></>}.</p>
                <button className="btn survey-cta" onClick={() => goTo("survey")}>Review survey <span>→</span></button>
              </>
            ) : (
              <>
                <h2>No survey drafted yet</h2>
                <p>The daily job has not prepared questions for {risk.code}.</p>
              </>
            )}
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
              <button
                key={item.id}
                type="button"
                className={`latest-item${item.status === "unreviewed" ? " unreviewed" : ""}`}
                onClick={() => openTip(item.id)}
                title="Open in Tips inbox"
              >
                <span className="latest-initial">{initialsFor(item.handle)}</span>
                <span>
                  <strong>{item.handle}</strong>
                  <small>{item.body.slice(0, 80)}{item.body.length > 80 ? "…" : ""}</small>
                </span>
                <time>{item.status === "unreviewed" ? "NEW" : timeAgo(item.createdAt)}</time>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
