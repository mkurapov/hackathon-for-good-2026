import { useEffect, useRef, useState } from "react";
import { articleLabel, hostnameOf, initialsFor, timeAgo, typeLabel } from "../lib/utils.js";

const byUnreviewedFirst = (a, b) => Number(b.status === "unreviewed") - Number(a.status === "unreviewed");

function ArticleCommentCard({ item, openModal, onToggleReviewed }) {
  const openArticle = () => openModal("article", { commentId: item.id });
  return (
    <article className={`article-comment-card ${item.status === "unreviewed" ? "tip-unreviewed" : "reviewed"}`}>
      <div className="article-comment-head">
        <div><strong>{item.handle}</strong><small>{typeLabel(item.type)} · {timeAgo(item.createdAt, { withTime: true })}</small></div>
        <span className={`status-badge ${item.status === "unreviewed" ? "status-awaiting" : "status-onboarded"}`}>
          {item.status === "unreviewed" ? "Unreviewed" : "Reviewed"}
        </span>
      </div>
      <button className="article-title-link" onClick={openArticle}>{articleLabel(item.url)} <span>↗</span></button>
      <div className="article-source">{hostnameOf(item.url)} · {item.riskCode}</div>
      {item.quote && <blockquote className="commented-snippet">{item.quote}</blockquote>}
      {item.stance && <span className={`stance-pill ${item.stance}`}>{item.stance === "agree" ? "Agree" : "Disagree"}</span>}
      <p className="article-expert-comment">{item.comment || "No additional comment provided."}</p>
      <div className="article-comment-actions">
        <button className="mini-action" onClick={openArticle}>View article with comments</button>
        <button className="mini-action review-action" onClick={() => onToggleReviewed(item)}>
          {item.status === "reviewed" ? "Reviewed ✓" : "Mark reviewed"}
        </button>
      </div>
    </article>
  );
}

export default function Tips({
  risks, riskCode, submissions, updateSubmission, articleComments, updateArticleComment,
  unreviewedCount, openModal, toast, focusTipId, onFocusDone,
}) {
  const [tab, setTab] = useState("unstructured");
  const [status, setStatus] = useState("all");
  const [code, setCode] = useState("all");
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs = useRef({});

  // Opened from the overview: scroll to that tip and flash it.
  useEffect(() => {
    if (!focusTipId) return;
    setTab("unstructured");
    cardRefs.current[focusTipId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(focusTipId);
    onFocusDone?.();
  }, [focusTipId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!highlightId) return undefined;
    const timer = window.setTimeout(() => setHighlightId(null), 2000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const matchesFilters = (item) => (status === "all" || item.status === status) && (code === "all" || item.riskCode === code);
  const items = submissions.slice().sort(byUnreviewedFirst).filter(matchesFilters);
  const comments = articleComments.slice().sort(byUnreviewedFirst).filter(matchesFilters);
  const unreviewedComments = articleComments.filter((c) => c.status === "unreviewed" && c.riskCode === riskCode).length;
  const isRaw = tab === "unstructured";

  const toggleCommentReviewed = async (c) => {
    const next = c.status === "reviewed" ? "unreviewed" : "reviewed";
    if (await updateArticleComment(c.id, { status: next })) {
      toast(next === "reviewed" ? "Comment marked reviewed" : "Comment reopened");
    }
  };
  const toggleReviewed = async (s) => {
    const next = s.status === "reviewed" ? "unreviewed" : "reviewed";
    if (await updateSubmission(s.id, { status: next })) {
      toast(next === "reviewed" ? "Tip marked reviewed" : "Tip reopened");
    }
  };
  const addTag = (s) => {
    const tag = window.prompt("Add a short tag")?.trim();
    if (tag && !s.tags.includes(tag)) updateSubmission(s.id, { tags: [...s.tags, tag] });
  };
  const removeTag = (s, tag) => updateSubmission(s.id, { tags: s.tags.filter((t) => t !== tag) });
  const link = async (s, value) => {
    if (await updateSubmission(s.id, { risk_id: value })) toast(`Tip linked to ${value}`);
  };
  // A tip can point at a risk the dashboard does not list, so keep its code selectable.
  const linkOptions = (s) => (risks.some((r) => r.code === s.riskCode) ? risks : [{ code: s.riskCode }, ...risks]);

  return (
    <section className="view active">
      <div className="page-heading">
        <div><p className="eyebrow">INCOMING INTELLIGENCE</p><h1>Tips inbox</h1></div>
        <span className="count-chip">{unreviewedCount + unreviewedComments} unreviewed</span>
      </div>
      <div className="tips-tabs" role="tablist" aria-label="Tips inbox type">
        <button className={`tips-tab${isRaw ? " active" : ""}`} role="tab" aria-selected={isRaw} aria-controls="unstructured-panel" id="unstructured-tab" onClick={() => setTab("unstructured")}>
          Unstructured tips <span>{unreviewedCount}</span>
        </button>
        <button className={`tips-tab${isRaw ? "" : " active"}`} role="tab" aria-selected={!isRaw} aria-controls="article-comments-panel" id="article-comments-tab" onClick={() => setTab("articles")}>
          Article commentary <span>{unreviewedComments}</span>
        </button>
      </div>
      <div className="board-toolbar feedback-toolbar">
        <div className="filter-group" role="group" aria-label="Filter tips">
          <button className={`filter-pill${status === "all" ? " selected" : ""}`} onClick={() => setStatus("all")}>All</button>
          <button className={`filter-pill${status === "unreviewed" ? " selected" : ""}`} onClick={() => setStatus("unreviewed")}>
            Unreviewed <span className="filter-number">{isRaw ? unreviewedCount : unreviewedComments}</span>
          </button>
          <button className={`filter-pill${status === "reviewed" ? " selected" : ""}`} onClick={() => setStatus("reviewed")}>Reviewed</button>
        </div>
        <select className="compact-select" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Filter by linked Risk Code">
          <option value="all">All Risk Codes</option>
          {risks.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
        </select>
      </div>
      {isRaw ? (
        <div id="unstructured-panel" className="tips-panel active" role="tabpanel" aria-labelledby="unstructured-tab">
          <div className="feedback-list">
            {items.map((s) => (
              <article
                key={s.id}
                ref={(el) => { cardRefs.current[s.id] = el; }}
                className={`feedback-card ${s.status === "unreviewed" ? "tip-unreviewed" : "reviewed"}${s.id === highlightId ? " tip-focused" : ""}`}
              >
                <div className="feedback-head">
                  <span className="latest-initial">{initialsFor(s.handle)}</span>
                  <div className="feedback-who">
                    <strong>{s.handle}</strong>
                    <small>{typeLabel(s.type)} · Linked to {s.riskCode}</small>
                  </div>
                  <time className="feedback-date">{timeAgo(s.createdAt, { withTime: true })}</time>
                </div>
                <p className="feedback-body">{s.body}</p>
                {s.url && <a className="feedback-link" href={s.url} target="_blank" rel="noreferrer noopener">{s.url}</a>}
                {s.reply && <p className="feedback-reply"><strong>Your reply</strong> {s.reply}</p>}
                <div className="feedback-controls">
                  <div className="feedback-tag-list">
                    {s.tags.map((tag) => (
                      <button key={tag} className="feedback-tag" title="Remove tag" onClick={() => removeTag(s, tag)}>{tag} ×</button>
                    ))}
                    <button className="mini-action" onClick={() => addTag(s)}>+ Tag</button>
                  </div>
                  <div className="feedback-actions">
                    <select className="small-select" value={s.riskCode} onChange={(e) => link(s, e.target.value)} aria-label="Link tip to a Risk Code">
                      {linkOptions(s).map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
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
        </div>
      ) : (
        <div id="article-comments-panel" className="tips-panel active" role="tabpanel" aria-labelledby="article-comments-tab">
          <div className="article-comment-list">
            {comments.map((c) => <ArticleCommentCard key={c.id} item={c} openModal={openModal} onToggleReviewed={toggleCommentReviewed} />)}
          </div>
          {comments.length === 0 && (
            <div className="empty-state empty-inline"><span>▤</span><strong>No article commentary here</strong><small>Comments attached to article passages will appear here.</small></div>
          )}
        </div>
      )}
    </section>
  );
}
