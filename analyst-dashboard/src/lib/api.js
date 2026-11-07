// Client for the backend's /analyst routes. Requests go to /api, which the Vite dev server
// and nginx proxy to the backend, adding the X-Analyst-Key header on the way.
// The adapters below map API records to the shapes the views use.

const BASE = import.meta.env.VITE_API_BASE || "/api";

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the backend. Is the API running on port 8000?");
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.[0]?.msg;
    throw new ApiError(response.status, detail || `Request failed (${response.status})`);
  }
  return data;
}

const enc = encodeURIComponent;
const SURVEY_STATUS = { draft: "Draft", published: "Published" };
const KIND = { likert: "Likert", binary: "Binary" };

export const toRisk = (r) => ({
  code: r.risk_id,
  title: r.title,
  countries: r.countries,
  level: r.risk_level,
  trend: r.risk_trend,
  summary: r.summary,
  basedOnUpdate: r.based_on_update,
});

export const toExpert = (e) => ({
  id: e.id,
  expertId: e.expert_id,
  type: e.contributor_type,
  internalAlias: e.alias,
  crossCommunityIdentifier: e.expert_id || "Not registered yet",
  invite: e.invite_code,
  used: e.invite_used,
  status: e.status,
  lastActivity: e.last_activity,
  riskCodes: [e.risk_id],
  expertise: e.expertise,
  screening: e.screening,
});

export const toSurvey = (s) => ({
  id: s.survey_id,
  status: SURVEY_STATUS[s.status],
  basedOnUpdate: s.based_on_update,
  generatedAt: s.generated_at,
  publishedAt: s.published_at,
  responseCount: s.response_count,
  questions: s.questions.map((q) => ({ id: q.id, kind: KIND[q.kind], text: q.text, dimension: q.dimension })),
});

const fromQuestion = (q) => ({
  // Locally added questions have temporary ids; the backend assigns real ones.
  id: q.id.startsWith("new-") ? null : q.id,
  kind: q.kind.toLowerCase(),
  text: q.text,
  dimension: q.dimension || null,
});

export const toTip = (t) => ({
  id: t.tip_id,
  handle: t.alias,
  type: t.contributor_type,
  createdAt: t.created_at,
  body: t.text,
  url: t.url,
  tags: t.tags,
  riskCode: t.risk_id,
  status: t.status,
  reply: t.reply_notes,
});

export const toArticleComment = (c) => ({
  id: c.comment_id,
  handle: c.alias,
  type: c.contributor_type,
  createdAt: c.created_at,
  riskCode: c.risk_id,
  url: c.url,
  comment: c.text,
  stance: c.stance,
  quote: c.quote,
  status: c.status,
});

export const toSurveyAnswers = (a) => ({
  surveyId: a.survey_id,
  publishedAt: a.published_at,
  responseCount: a.response_count,
  panelSize: a.panel_size,
  questions: a.questions.map((q) => ({
    id: q.id,
    kind: KIND[q.kind],
    text: q.text,
    answered: q.answered,
    mean: q.mean,
    stdDev: q.std_dev,
    comments: q.comments,
  })),
});

export const toNotification = (n) => ({
  id: n.notification_id,
  subject: n.subject,
  message: n.body,
  type: n.audience,
  count: n.recipient_count,
  sentAt: n.sent_at,
});

export const api = {
  risks: async () => (await request("GET", "/analyst/risks")).map(toRisk),

  experts: async (code) => (await request("GET", `/analyst/risks/${enc(code)}/experts`)).map(toExpert),
  addExpert: (code, { name, screening, expertise }) =>
    request("POST", `/analyst/risks/${enc(code)}/experts`, { display_name: name || null, screening, expertise }),
  importExperts: (rows) => request("POST", "/analyst/experts/import", { rows }),

  survey: async (code) => {
    try {
      return toSurvey(await request("GET", `/analyst/risks/${enc(code)}/survey`));
    } catch (error) {
      if (error.status === 404) return null; // no draft yet for this risk
      throw error;
    }
  },
  saveSurvey: async (code, questions) =>
    toSurvey(await request("PUT", `/analyst/risks/${enc(code)}/survey`, { questions: questions.map(fromQuestion) })),
  publishSurvey: async (code) => toSurvey(await request("POST", `/analyst/risks/${enc(code)}/survey/publish`)),
  surveyAnswers: async (code) => toSurveyAnswers(await request("GET", `/analyst/risks/${enc(code)}/survey/answers`)),

  notifications: async (code) =>
    (await request("GET", `/analyst/risks/${enc(code)}/notifications`)).map(toNotification),
  sendNotification: async (code, { type, subject, message }) =>
    toNotification(await request("POST", `/analyst/risks/${enc(code)}/notifications`, { audience: type, subject, body: message })),

  tips: async () => (await request("GET", "/analyst/tips")).map(toTip),
  updateTip: async (id, patch) => toTip(await request("PATCH", `/analyst/tips/${enc(id)}`, patch)),
  replyTip: async (id, notes) => toTip(await request("POST", `/analyst/tips/${enc(id)}/reply`, { notes })),

  articleComments: async () => (await request("GET", "/analyst/article-comments")).map(toArticleComment),
  updateArticleComment: async (id, patch) =>
    toArticleComment(await request("PATCH", `/analyst/article-comments/${enc(id)}`, patch)),
};
