import { useEffect, useState } from "react";
import { formatDateTime } from "../lib/utils.js";

export default function Survey({ risk, survey, onSave, onPublish }) {
  const [editing, setEditing] = useState(false);
  const [questions, setQuestions] = useState(survey?.questions || []);
  const [busy, setBusy] = useState(false);

  // Reset local edits whenever a different survey (or a saved version) comes in.
  useEffect(() => {
    setQuestions(survey?.questions || []);
    setEditing(false);
  }, [survey]);

  if (!survey) {
    return (
      <section className="view active">
        <div className="page-heading"><div><p className="eyebrow">ACTIVE RISK {risk.code}</p><h1>New survey</h1></div></div>
        <div className="empty-state empty-inline">
          <span>▤</span>
          <strong>No survey drafted for {risk.code} yet</strong>
          <small>The daily job drafts questions when a new risk update is published.</small>
        </div>
      </section>
    );
  }

  const published = survey.status === "Published";
  const likertCount = questions.filter((q) => q.kind === "Likert").length;
  const dirty = JSON.stringify(questions) !== JSON.stringify(survey.questions);
  const invalid = questions.length === 0 || questions.some((q) => q.text.trim().length < 5);

  const updateText = (id, text) => setQuestions((items) => items.map((q) => (q.id === id ? { ...q, text } : q)));
  const updateKind = (id, kind) => setQuestions((items) => items.map((q) => (q.id === id ? { ...q, kind } : q)));
  const remove = (id) => setQuestions((items) => items.filter((q) => q.id !== id));
  const add = () => setQuestions((items) => [...items, { id: `new-${Date.now()}`, kind: "Likert", text: "" }]);

  const toggleEditing = async () => {
    if (!editing) { setEditing(true); return; }
    if (!dirty) { setEditing(false); return; }
    setBusy(true);
    await onSave(questions); // on success the new survey resets editing
    setBusy(false);
  };

  const publish = async () => {
    setBusy(true);
    if (!dirty || (await onSave(questions))) await onPublish();
    setBusy(false);
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div><p className="eyebrow">ACTIVE RISK {risk.code}</p><h1>New survey</h1></div>
        <div className="heading-actions">
          <span className={`status-badge draft-badge${published ? " published-badge" : ""}`}>{survey.status}</span>
          {!published && (
            <button className="btn secondary" disabled={busy || (editing && invalid)} onClick={toggleEditing}>
              {editing ? <><span className="button-icon">✓</span> Save changes</> : <><span className="button-icon">✎</span> Edit questions</>}
            </button>
          )}
          <button className="btn primary-action" disabled={published || busy || invalid} onClick={publish}>
            {published ? <><span className="button-icon">✓</span> Published</> : <><span className="button-icon">↗</span> Publish survey</>}
          </button>
        </div>
      </div>
      <div className="report-version">
        {survey.basedOnUpdate && <>Based on report update <strong>{survey.basedOnUpdate}</strong><span>·</span> </>}
        Generated {formatDateTime(survey.generatedAt)}
        {published && <><span>·</span> Published {formatDateTime(survey.publishedAt)} <span>·</span> {survey.responseCount} responses</>}
      </div>
      <div className="survey-layout">
        <div className="survey-editor-column">
          <div className="survey-editor-toolbar">
            <div>
              <strong>Questions</strong>
              <small>{questions.length} questions <span className="muted-separator">·</span> {likertCount} Likert, {questions.length - likertCount} binary</small>
            </div>
            {editing && <button className="btn secondary sm" onClick={add}><span className="plus">+</span> Add question</button>}
          </div>
          <div className="question-list">
            {questions.map((question, index) => (
              <div key={question.id} className="question-row">
                <span className="question-order">{String(index + 1).padStart(2, "0")}</span>
                {editing && question.id.startsWith("new-") ? (
                  <select className="small-select" value={question.kind} onChange={(e) => updateKind(question.id, e.target.value)} aria-label="Question type">
                    <option>Likert</option>
                    <option>Binary</option>
                  </select>
                ) : (
                  <span className={`question-kind${question.kind === "Binary" ? " binary" : ""}`}>{question.kind}</span>
                )}
                <textarea
                  className="question-text"
                  aria-label={`Edit question ${index + 1}`}
                  rows={2}
                  readOnly={!editing}
                  placeholder="Enter question text"
                  value={question.text}
                  onChange={(e) => updateText(question.id, e.target.value)}
                />
                {editing && <button className="question-delete" title="Remove question" aria-label="Remove question" onClick={() => remove(question.id)}>×</button>}
              </div>
            ))}
          </div>
        </div>
        <aside className="source-panel">
          <p className="eyebrow">SOURCE CONTEXT</p>
          <h2>Risk assessment summary</h2>
          <p className="source-summary">{risk.summary || risk.title}</p>
          <div className="source-divider" />
          <div className="source-meta"><span>Risk Code</span><strong>{risk.code}</strong></div>
          {survey.basedOnUpdate && <div className="source-meta"><span>Report update</span><strong>{survey.basedOnUpdate}</strong></div>}
          <div className="source-note"><span>i</span> Publishing sends this survey to the selected expert panel. Nothing is sent automatically.</div>
        </aside>
      </div>
    </section>
  );
}
