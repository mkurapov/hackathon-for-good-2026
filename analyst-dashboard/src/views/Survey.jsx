import { useState } from "react";

export default function Survey({ risk, questions, setQuestions, surveyStatus, onPublish }) {
  const [editing, setEditing] = useState(false);
  const published = surveyStatus === "Published";
  const likertCount = questions.filter((q) => q.kind === "Likert").length;

  const updateText = (id, text) => setQuestions((items) => items.map((q) => (q.id === id ? { ...q, text } : q)));
  const remove = (id) => setQuestions((items) => items.filter((q) => q.id !== id));
  const add = () => setQuestions((items) => [...items, { id: `q-${Date.now()}`, kind: "Likert", text: "New question: enter question text" }]);

  return (
    <section className="view active">
      <div className="page-heading">
        <div><p className="eyebrow">ACTIVE RISK {risk.code}</p><h1>New survey</h1></div>
        <div className="heading-actions">
          <span className={`status-badge draft-badge${published ? " published-badge" : ""}`}>{surveyStatus}</span>
          <button className="btn secondary" onClick={() => setEditing((value) => !value)}>
            {editing ? <><span className="button-icon">✓</span> Save changes</> : <><span className="button-icon">✎</span> Edit questions</>}
          </button>
          <button className="btn primary-action" disabled={published} onClick={onPublish}>
            {published ? <><span className="button-icon">✓</span> Published</> : <><span className="button-icon">↗</span> Publish survey</>}
          </button>
        </div>
      </div>
      <div className="report-version">Based on report update <strong>{risk.basedOnUpdate}</strong><span>·</span> Generated today at 06:15</div>
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
                <span className={`question-kind${question.kind === "Binary" ? " binary" : ""}`}>{question.kind}</span>
                <textarea
                  className="question-text"
                  aria-label={`Edit question ${index + 1}`}
                  rows={2}
                  readOnly={!editing}
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
          <div className="source-meta"><span>Report update</span><strong>{risk.basedOnUpdate}</strong></div>
          <div className="source-note"><span>i</span> Publishing sends this survey to the selected expert panel. Nothing is sent automatically.</div>
        </aside>
      </div>
    </section>
  );
}
