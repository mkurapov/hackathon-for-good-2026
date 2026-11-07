import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatDateTime } from "../lib/utils.js";

// Likert answers run from 1 to 5; positions on the interval bar are percentages of that range.
const scalePosition = (value) => ((value - 1) / 4) * 100;

function AnswerInterval({ mean, stdDev }) {
  const low = Math.max(1, mean - stdDev);
  const high = Math.min(5, mean + stdDev);
  const label = `${low.toFixed(1)}–${high.toFixed(1)}`;
  return (
    <div className="answer-interval">
      <div className="answer-interval-heading"><span>Average ± 1 SD</span><strong>{label}</strong></div>
      <div className="answer-interval-track" role="img" aria-label={`Average ${mean.toFixed(1)} out of 5; average plus or minus one standard deviation is ${label}`}>
        <span className="answer-interval-range" style={{ left: `${scalePosition(low)}%`, width: `${scalePosition(high) - scalePosition(low)}%` }} />
        <span className="answer-interval-mean" style={{ left: `${scalePosition(mean)}%` }} />
      </div>
      <div className="answer-interval-axis"><span>1</span><span>3</span><span>5</span></div>
    </div>
  );
}

function QuestionAnswers({ question, index }) {
  const isLikert = question.kind === "Likert";
  const hasValues = question.mean !== null;
  let average = "–";
  if (hasValues) average = isLikert ? `${question.mean.toFixed(1)} / 5` : `${Math.round(question.mean * 100)}%`;
  return (
    <article className="answer-question">
      <header>
        <span className="question-order">{String(index + 1).padStart(2, "0")}</span>
        <span className={`question-kind${isLikert ? "" : " binary"}`}>{question.kind}</span>
        <p>{question.text}</p>
      </header>
      <div className="answer-metrics">
        <div><span>{isLikert ? "Average score" : "Yes responses"}</span><strong>{average}</strong></div>
        {isLikert && <div><span>Standard deviation</span><strong>{hasValues ? question.stdDev.toFixed(2) : "–"}</strong></div>}
        <div><span>Answers</span><strong>{question.answered}</strong></div>
      </div>
      {isLikert && hasValues && <AnswerInterval mean={question.mean} stdDev={question.stdDev} />}
      <div className="answer-comments">
        <span className="answer-comments-label">Comment highlights</span>
        {question.comments.length === 0 && <p className="muted">No comments on this question.</p>}
        {question.comments.map((comment, i) => <blockquote key={i}>{comment}</blockquote>)}
      </div>
    </article>
  );
}

export default function SurveyAnswers({ risk, riskCode, survey, attempt }) {
  const [answers, setAnswers] = useState(null);
  const published = survey?.status === "Published";

  // Reload whenever the risk changes or the survey is (re)published.
  useEffect(() => {
    setAnswers(null);
    if (!published) return undefined;
    let current = true;
    attempt(() => api.surveyAnswers(riskCode)).then((data) => current && data && setAnswers(data));
    return () => { current = false; };
  }, [riskCode, published, survey?.publishedAt, attempt]);

  const heading = (
    <div className="page-heading">
      <div><p className="eyebrow">PUBLISHED SURVEY {risk.code}</p><h1>Survey answers</h1></div>
      {answers && <span className="count-chip">{answers.responseCount} responses</span>}
    </div>
  );

  if (!published) {
    return (
      <section className="view active">
        {heading}
        <div className="empty-state empty-inline">
          <span>◫</span>
          <strong>No published survey for {risk.code}</strong>
          <small>Answers appear here once the survey is published and experts respond.</small>
        </div>
      </section>
    );
  }
  if (!answers) return <section className="view active">{heading}<p className="muted">Loading answers…</p></section>;

  const rate = answers.panelSize ? Math.round((answers.responseCount / answers.panelSize) * 100) : 0;
  return (
    <section className="view active">
      {heading}
      <div className="answers-overview">
        <div><span>Responses received</span><strong>{answers.responseCount}</strong></div>
        <div><span>Response rate</span><strong>{answers.panelSize ? `${rate}%` : "–"}</strong></div>
        <div><span>Published</span><strong>{formatDateTime(answers.publishedAt) || "–"}</strong></div>
      </div>
      <div className="answers-question-list">
        {answers.questions.map((question, index) => <QuestionAnswers key={question.id} question={question} index={index} />)}
      </div>
    </section>
  );
}
