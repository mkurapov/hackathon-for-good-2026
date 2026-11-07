import { ModalHeader } from "../components/Modal.jsx";
import { articleLabel, hostnameOf, timeAgo } from "../lib/utils.js";

// Summary view of one article: every expert comment on it, each under the passage it highlights.
// Only the URL and highlighted passages are stored, so the full article opens at its source.
export default function ArticleReader({ commentId, articleComments, onClose }) {
  const selected = articleComments.find((item) => item.id === commentId);
  if (!selected) return null;
  const linked = articleComments
    .filter((item) => item.url === selected.url)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <>
      <ModalHeader eyebrow={`ANNOTATED ARTICLE · ${hostnameOf(selected.url)}`} title={articleLabel(selected.url)} onClose={onClose} />
      <div className="reader-toolbar">
        <span>{linked.length} expert comment{linked.length === 1 ? "" : "s"}</span>
        <a href={selected.url} target="_blank" rel="noreferrer noopener">Open original article ↗</a>
      </div>
      <article className="reader-article">
        {linked.map((item) => (
          <div key={item.id} className={item.id === selected.id ? "reader-entry selected" : "reader-entry"}>
            {item.quote && <p><mark className={`reader-highlight ${item.stance || ""}`}>{item.quote}</mark></p>}
            <aside className="reader-comment">
              <span className="reader-comment-pin">{item.stance === "agree" ? "+" : item.stance === "disagree" ? "−" : "•"}</span>
              <div>
                <strong>
                  {item.handle}
                  {item.stance && ` · ${item.stance === "agree" ? "Agrees" : "Disagrees"}`}
                  {` · ${timeAgo(item.createdAt)}`}
                </strong>
                <p>{item.comment || "No additional comment provided."}</p>
              </div>
            </aside>
          </div>
        ))}
      </article>
    </>
  );
}
