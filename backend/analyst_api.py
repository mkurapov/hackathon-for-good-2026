# analyst_api.py: routes for the analyst dashboard (all under /analyst, X-Analyst-Key required)
#
# Analysts onboard long-term experts with personal invite codes, review and publish the
# drafted survey, triage expert notes ("tips") and log mass notifications (delivery is mocked).
import json
import logging
import os
import re
import secrets
from datetime import datetime, timezone
from typing import Annotated, Literal

import db
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator

log = logging.getLogger("analyst_api")


def require_analyst_key(x_analyst_key: Annotated[str | None, Header()] = None) -> None:
    expected = os.getenv("ANALYST_API_KEY")
    if not expected:
        raise HTTPException(status_code=503, detail="Analyst API is not configured (set ANALYST_API_KEY)")
    if x_analyst_key is None or not secrets.compare_digest(x_analyst_key, expected):
        raise HTTPException(status_code=401, detail="Missing or invalid analyst key")


router = APIRouter(prefix="/analyst", tags=["Analyst"], dependencies=[Depends(require_analyst_key)])

ContributorType = Literal["A", "B"]
ExpertStatus = Literal["Invited", "Onboarded", "Awaiting response", "Responded"]
RISK_ID_RE = re.compile(r"^R-?(\d{3,5})$", re.I)


# ---------- schemas ----------
class Risk(BaseModel):
    risk_id: str
    title: str
    countries: list[str]
    risk_level: str | None = None
    risk_trend: str | None = None
    summary: str | None = None
    based_on_update: str | None = None


class AnalystExpert(BaseModel):
    id: str = Field(description="expert_id once registered, otherwise the unused invite code")
    expert_id: str | None
    contributor_type: ContributorType
    alias: str
    invite_code: str
    invite_used: bool
    status: ExpertStatus
    last_activity: datetime
    risk_id: str
    expertise: list[str] = []
    screening: dict[str, str] = {}


class ExpertInviteCreate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    screening: dict[str, str] = {}
    expertise: list[str] = []


class ExpertInvite(BaseModel):
    invite_code: str
    risk_id: str
    display_name: str | None


class ImportRow(ExpertInviteCreate):
    risk_id: str


class ImportRequest(BaseModel):
    rows: list[ImportRow] = Field(max_length=1000)


class ImportError_(BaseModel):
    row: int
    detail: str


class ImportResult(BaseModel):
    imported: list[ExpertInvite]
    errors: list[ImportError_]


class Question(BaseModel):
    id: str | None = None  # omit for a new question
    kind: Literal["likert", "binary"]
    text: str = Field(min_length=5, max_length=500)
    dimension: str | None = None

    @field_validator("text")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class SurveyEdit(BaseModel):
    questions: list[Question] = Field(min_length=1, max_length=20)


class AnalystSurvey(BaseModel):
    survey_id: str
    risk_id: str
    risk_title: str
    based_on_update: str | None
    generated_at: datetime
    status: Literal["draft", "published"]
    published_at: datetime | None
    questions: list[Question]
    response_count: int


class NotificationCreate(BaseModel):
    audience: Literal["all", "A", "B"] = "all"
    subject: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=500)


class Notification(NotificationCreate):
    notification_id: str
    risk_id: str
    recipient_count: int
    sent_at: datetime


class Tip(BaseModel):
    tip_id: str
    expert_id: str
    alias: str
    contributor_type: ContributorType
    risk_id: str
    text: str
    url: str | None
    tags: list[str]
    status: Literal["unreviewed", "reviewed"]
    reply_notes: str | None
    replied_at: datetime | None
    created_at: datetime


class TipUpdate(BaseModel):
    tags: list[str] | None = None
    status: Literal["unreviewed", "reviewed"] | None = None
    risk_id: str | None = None


class TipReply(BaseModel):
    notes: str = Field(min_length=1, max_length=5000)


class ArticleCommentItem(BaseModel):
    comment_id: str
    expert_id: str
    alias: str
    contributor_type: ContributorType
    risk_id: str
    url: str
    text: str
    stance: Literal["agree", "disagree"] | None
    quote: str | None
    status: Literal["unreviewed", "reviewed"]
    created_at: datetime


class ArticleCommentUpdate(BaseModel):
    status: Literal["unreviewed", "reviewed"]


class QuestionAnswers(BaseModel):
    id: str
    kind: Literal["likert", "binary"]
    text: str
    answered: int = Field(description="Submitted responses that gave a value for this question")
    mean: float | None = Field(description="Likert: average score (1-5). Binary: share answering yes (0-1).")
    std_dev: float | None = Field(description="Likert only: sample standard deviation")
    comments: list[str]


class SurveyAnswers(BaseModel):
    survey_id: str
    risk_id: str
    published_at: datetime | None
    response_count: int
    panel_size: int = Field(description="Registered experts on this risk, for the response rate")
    questions: list[QuestionAnswers]


# ---------- helpers ----------
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ts(value: str | None) -> datetime | None:
    """Parse ISO timestamps and SQLite's CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS', UTC)."""
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace(" ", "T").replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _normalise_risk_id(value: str) -> str:
    """Accept R1043, R-1043 or r-1043."""
    match = RISK_ID_RE.match(value.strip())
    if not match:
        raise ValueError("Risk Code must look like R1043")
    return f"R{match.group(1)}"


def _known_risk_ids(conn) -> set[str]:
    rows = conn.execute(
        "SELECT risk_id FROM groups UNION SELECT risk_id FROM surveys UNION SELECT risk_id FROM risks"
    )
    return {row["risk_id"] for row in rows}


def _require_risk(conn, risk_id: str) -> None:
    if risk_id not in _known_risk_ids(conn):
        raise HTTPException(status_code=404, detail=f"Unknown Risk Code {risk_id}")


def _new_invite_code(conn) -> str:
    # Demo-friendly codes for now: DEMO1, DEMO2, ... (first number not already used).
    n = 1
    while True:
        code = f"DEMO{n}"
        n += 1
        taken = conn.execute(
            "SELECT 1 FROM invites WHERE invite_code = ? UNION SELECT 1 FROM groups WHERE invite_code = ?",
            (code, code),
        ).fetchone()
        if taken is None:
            return code


def _panel_group(conn, risk_id: str) -> str:
    """The group personal invites for a risk belong to; created on first use."""
    row = conn.execute(
        "SELECT group_id FROM groups WHERE risk_id = ? ORDER BY created_at LIMIT 1", (risk_id,)
    ).fetchone()
    if row is not None:
        return row["group_id"]
    group_id = f"grp_{secrets.token_urlsafe(12)}"
    db.add_group(conn, group_id, f"{risk_id} expert panel", risk_id, secrets.token_urlsafe(12))
    return group_id


def _create_invite(conn, risk_id: str, body: ExpertInviteCreate) -> ExpertInvite:
    name = (body.display_name or "").strip() or None
    code = _new_invite_code(conn)
    conn.execute(
        """INSERT INTO invites (invite_code, group_id, risk_id, display_name, screening, expertise, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            code,
            _panel_group(conn, risk_id),
            risk_id,
            name,
            json.dumps(body.screening),
            json.dumps(body.expertise),
            _now().isoformat(),
        ),
    )
    return ExpertInvite(invite_code=code, risk_id=risk_id, display_name=name)


def _latest_survey(conn, risk_id: str, published_only: bool = False):
    where = "AND status = 'published'" if published_only else ""
    return conn.execute(
        f"""SELECT * FROM surveys WHERE risk_id = ? {where}
            ORDER BY generated_at DESC LIMIT 1""",
        (risk_id,),
    ).fetchone()


def _alias(row, invite_name: str | None = None) -> str:
    return invite_name or row["display_name"] or f"Contributor {row['expert_id'][-4:]}"


def _survey_response(conn, survey) -> AnalystSurvey:
    questions = db.survey_questions(conn, survey["survey_id"])
    count = conn.execute(
        "SELECT COUNT(*) AS n FROM responses WHERE survey_id = ? AND status = 'submitted'",
        (survey["survey_id"],),
    ).fetchone()["n"]
    return AnalystSurvey(
        survey_id=survey["survey_id"],
        risk_id=survey["risk_id"],
        risk_title=survey["risk_title"],
        based_on_update=survey["based_on_update"],
        generated_at=_ts(survey["generated_at"]),
        status=survey["status"],
        published_at=_ts(survey["published_at"]),
        questions=[Question(kind="likert", **q) for q in questions["likert"]]
        + [Question(kind="binary", **q) for q in questions["binary"]],
        response_count=count,
    )


def _tip(row) -> Tip:
    return Tip(
        tip_id=row["note_id"],
        expert_id=row["expert_id"],
        alias=_alias(row, row["invite_name"]),
        contributor_type=row["contributor_type"],
        risk_id=row["risk_id"],
        text=row["text"],
        url=row["url"],
        tags=json.loads(row["tags"] or "[]"),
        status=row["status"],
        reply_notes=row["reply_notes"],
        replied_at=_ts(row["replied_at"]),
        created_at=_ts(row["created_at"]),
    )


TIP_SELECT = """SELECT n.*, e.display_name, e.contributor_type, i.display_name AS invite_name
                FROM notes n
                JOIN experts e ON e.expert_id = n.expert_id
                LEFT JOIN invites i ON i.expert_id = e.expert_id"""

COMMENT_SELECT = """SELECT c.*, e.display_name, e.contributor_type, i.display_name AS invite_name
                    FROM article_comments c
                    JOIN experts e ON e.expert_id = c.expert_id
                    LEFT JOIN invites i ON i.expert_id = e.expert_id"""


def _article_comment(row) -> ArticleCommentItem:
    return ArticleCommentItem(
        comment_id=row["comment_id"],
        expert_id=row["expert_id"],
        alias=_alias(row, row["invite_name"]),
        contributor_type=row["contributor_type"],
        risk_id=row["risk_id"],
        url=row["url"],
        text=row["text"],
        stance=row["stance"],
        quote=row["quote"],
        status=row["status"],
        created_at=_ts(row["created_at"]),
    )


def _panel_size(conn, risk_id: str) -> int:
    return conn.execute(
        "SELECT COUNT(*) AS n FROM experts e JOIN groups g ON g.group_id = e.group_id WHERE g.risk_id = ?",
        (risk_id,),
    ).fetchone()["n"]


# ---------- risks ----------
@router.get("/risks", response_model=list[Risk])
def list_risks() -> list[Risk]:
    """Every risk the dashboard can scope to: tracked by a group, surveyed, or described by the daily job."""
    with db.connect() as conn:
        result = []
        for risk_id in sorted(_known_risk_ids(conn)):
            meta = conn.execute("SELECT * FROM risks WHERE risk_id = ?", (risk_id,)).fetchone()
            survey = _latest_survey(conn, risk_id)
            group = conn.execute(
                "SELECT country_iso3 FROM groups WHERE risk_id = ? AND country_iso3 IS NOT NULL LIMIT 1",
                (risk_id,),
            ).fetchone()
            countries = json.loads(meta["countries"]) if meta else []
            if not countries:
                countries = [group["country_iso3"]] if group else ["Unassigned"]
            result.append(
                Risk(
                    risk_id=risk_id,
                    title=(meta and meta["title"]) or (survey and survey["risk_title"]) or risk_id,
                    countries=countries,
                    risk_level=meta and meta["risk_level"],
                    risk_trend=meta and meta["risk_trend"],
                    summary=meta and meta["summary"],
                    based_on_update=survey and survey["based_on_update"],
                )
            )
    return result


# ---------- experts ----------
@router.get("/risks/{risk_id}/experts", response_model=list[AnalystExpert])
def list_experts(risk_id: str) -> list[AnalystExpert]:
    with db.connect() as conn:
        _require_risk(conn, risk_id)
        published = _latest_survey(conn, risk_id, published_only=True)
        experts: list[AnalystExpert] = []

        for inv in conn.execute(
            "SELECT * FROM invites WHERE risk_id = ? AND expert_id IS NULL", (risk_id,)
        ):
            experts.append(
                AnalystExpert(
                    id=inv["invite_code"],
                    expert_id=None,
                    contributor_type="A",
                    alias=inv["display_name"] or f"Invite {inv['invite_code']}",
                    invite_code=inv["invite_code"],
                    invite_used=False,
                    status="Invited",
                    last_activity=_ts(inv["created_at"]),
                    risk_id=risk_id,
                    expertise=json.loads(inv["expertise"]),
                    screening=json.loads(inv["screening"]),
                )
            )

        rows = conn.execute(
            """SELECT e.expert_id, e.display_name, e.contributor_type, e.created_at,
                      g.invite_code AS group_code,
                      i.invite_code AS personal_code, i.display_name AS invite_name,
                      i.expertise, i.screening,
                      (SELECT MAX(updated_at) FROM responses r WHERE r.expert_id = e.expert_id) AS last_response,
                      (SELECT MAX(created_at) FROM notes n WHERE n.expert_id = e.expert_id) AS last_note
               FROM experts e
               JOIN groups g ON g.group_id = e.group_id
               LEFT JOIN invites i ON i.expert_id = e.expert_id
               WHERE g.risk_id = ?""",
            (risk_id,),
        ).fetchall()
        for row in rows:
            if published is None:
                expert_status = "Onboarded"
            else:
                answered = conn.execute(
                    """SELECT 1 FROM responses
                       WHERE survey_id = ? AND expert_id = ? AND status = 'submitted'""",
                    (published["survey_id"], row["expert_id"]),
                ).fetchone()
                expert_status = "Responded" if answered else "Awaiting response"
            activity = max(
                ts for ts in (_ts(row["created_at"]), _ts(row["last_response"]), _ts(row["last_note"])) if ts
            )
            experts.append(
                AnalystExpert(
                    id=row["expert_id"],
                    expert_id=row["expert_id"],
                    contributor_type=row["contributor_type"],
                    alias=_alias(row, row["invite_name"]),
                    invite_code=row["personal_code"] or row["group_code"],
                    invite_used=True,
                    status=expert_status,
                    last_activity=activity,
                    risk_id=risk_id,
                    expertise=json.loads(row["expertise"] or "[]"),
                    screening=json.loads(row["screening"] or "{}"),
                )
            )
    return experts


@router.post("/risks/{risk_id}/experts", response_model=ExpertInvite, status_code=status.HTTP_201_CREATED)
def onboard_expert(risk_id: str, body: ExpertInviteCreate) -> ExpertInvite:
    """Issue a personal invite code for a long-term expert. Nothing is sent: the analyst shares it."""
    with db.connect() as conn:
        _require_risk(conn, risk_id)
        invite = _create_invite(conn, risk_id, body)
        conn.commit()
    return invite


@router.post("/experts/import", response_model=ImportResult)
def import_experts(body: ImportRequest) -> ImportResult:
    """Bulk version of onboard_expert. Rows are numbered from 1; bad rows are reported, not fatal."""
    imported, errors = [], []
    with db.connect() as conn:
        known = _known_risk_ids(conn)
        for number, row in enumerate(body.rows, 1):
            try:
                risk_id = _normalise_risk_id(row.risk_id)
            except ValueError as e:
                errors.append(ImportError_(row=number, detail=str(e)))
                continue
            if risk_id not in known:
                errors.append(ImportError_(row=number, detail=f"Unknown Risk Code {risk_id}"))
                continue
            imported.append(_create_invite(conn, risk_id, row))
        conn.commit()
    return ImportResult(imported=imported, errors=errors)


# ---------- survey review ----------
@router.get("/risks/{risk_id}/survey", response_model=AnalystSurvey)
def get_survey(risk_id: str) -> AnalystSurvey:
    """The newest survey the daily job drafted for this risk, published or not."""
    with db.connect() as conn:
        survey = _latest_survey(conn, risk_id)
        if survey is None:
            raise HTTPException(status_code=404, detail="No survey has been drafted for this risk yet")
        return _survey_response(conn, survey)


@router.put("/risks/{risk_id}/survey", response_model=AnalystSurvey)
def edit_survey(risk_id: str, body: SurveyEdit) -> AnalystSurvey:
    """Replace the draft's questions (reword, remove, add). Published surveys are frozen."""
    with db.connect() as conn:
        survey = _latest_survey(conn, risk_id)
        if survey is None:
            raise HTTPException(status_code=404, detail="No survey has been drafted for this risk yet")
        if survey["status"] == "published":
            raise HTTPException(status_code=409, detail="Survey is already published")

        existing = db.survey_questions(conn, survey["survey_id"])
        dimensions = {q["id"]: q.get("dimension") for q in existing["likert"]}
        kept_ids = [q.id for q in body.questions if q.id]
        if len(kept_ids) != len(set(kept_ids)):
            raise HTTPException(status_code=422, detail="Duplicate question ID")

        # New questions get the next free L<n> / B<n>, never reusing a removed ID.
        used = {q["id"] for kind in existing.values() for q in kind} | set(kept_ids)
        counters = {"likert": 0, "binary": 0}
        payload = json.loads(survey["payload"])
        payload["likert"], payload["binary"] = [], []
        rows = []
        for q in body.questions:
            qid = q.id
            if not qid:
                prefix = "L" if q.kind == "likert" else "B"
                while True:
                    counters[q.kind] += 1
                    qid = f"{prefix}{counters[q.kind]}"
                    if qid not in used:
                        break
                used.add(qid)
            if q.kind == "likert":
                dimension = q.dimension or dimensions.get(qid) or "other"
                payload["likert"].append({"id": qid, "text": q.text, "dimension": dimension})
            else:
                dimension = None
                payload["binary"].append({"id": qid, "text": q.text})
            rows.append(
                (survey["survey_id"], risk_id, survey["based_on_update"], qid, q.kind, q.text, dimension)
            )

        conn.execute("DELETE FROM survey_questions WHERE survey_id = ?", (survey["survey_id"],))
        conn.executemany(
            """INSERT INTO survey_questions
               (survey_id, risk_id, based_on_update, question_id, question_type, text, dimension)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )
        conn.execute(
            "UPDATE surveys SET payload = ? WHERE survey_id = ?",
            (json.dumps(payload), survey["survey_id"]),
        )
        conn.commit()
        return _survey_response(conn, _latest_survey(conn, risk_id))


@router.post("/risks/{risk_id}/survey/publish", response_model=AnalystSurvey)
def publish_survey(risk_id: str) -> AnalystSurvey:
    """Make the latest draft visible to this risk's experts. Nothing goes out automatically."""
    with db.connect() as conn:
        survey = _latest_survey(conn, risk_id)
        if survey is None:
            raise HTTPException(status_code=404, detail="No survey has been drafted for this risk yet")
        if survey["status"] != "published":
            conn.execute(
                "UPDATE surveys SET status = 'published', published_at = ? WHERE survey_id = ?",
                (_now().isoformat(), survey["survey_id"]),
            )
            conn.commit()
            log.info("published survey %s", survey["survey_id"])
        return _survey_response(conn, _latest_survey(conn, risk_id))


@router.get("/risks/{risk_id}/survey/answers", response_model=SurveyAnswers)
def survey_answers(risk_id: str) -> SurveyAnswers:
    """Per-question statistics over the submitted responses to the latest published survey."""
    with db.connect() as conn:
        survey = _latest_survey(conn, risk_id, published_only=True)
        if survey is None:
            raise HTTPException(status_code=404, detail="No survey has been published for this risk yet")
        questions = db.survey_questions(conn, survey["survey_id"])
        responses = [
            json.loads(row["payload"])
            for row in conn.execute(
                "SELECT payload FROM responses WHERE survey_id = ? AND status = 'submitted'",
                (survey["survey_id"],),
            )
        ]
        panel_size = _panel_size(conn, risk_id)

    result = []
    for kind in ("likert", "binary"):
        for q in questions[kind]:
            answers = [a for r in responses for a in r.get(kind, []) if a.get("question_id") == q["id"]]
            values = [float(a["value"]) for a in answers if a.get("value") is not None]
            mean = sum(values) / len(values) if values else None
            std_dev = None
            if kind == "likert" and values:
                variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1) if len(values) > 1 else 0.0
                std_dev = variance**0.5
            result.append(
                QuestionAnswers(
                    id=q["id"],
                    kind=kind,
                    text=q["text"],
                    answered=len(values),
                    mean=mean,
                    std_dev=std_dev,
                    comments=[a["comment"].strip() for a in answers if (a.get("comment") or "").strip()],
                )
            )
    return SurveyAnswers(
        survey_id=survey["survey_id"],
        risk_id=risk_id,
        published_at=_ts(survey["published_at"]),
        response_count=len(responses),
        panel_size=panel_size,
        questions=result,
    )


# ---------- mass notifications (mock delivery) ----------
@router.get("/risks/{risk_id}/notifications", response_model=list[Notification])
def list_notifications(risk_id: str) -> list[Notification]:
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE risk_id = ? ORDER BY sent_at DESC LIMIT 50", (risk_id,)
        ).fetchall()
    return [
        Notification(**{k: row[k] for k in row.keys() if k != "sent_at"}, sent_at=_ts(row["sent_at"]))
        for row in rows
    ]


@router.post(
    "/risks/{risk_id}/notifications", response_model=Notification, status_code=status.HTTP_201_CREATED
)
def send_notification(risk_id: str, body: NotificationCreate) -> Notification:
    with db.connect() as conn:
        _require_risk(conn, risk_id)
        type_filter = "" if body.audience == "all" else "AND e.contributor_type = ?"
        params = (risk_id,) if body.audience == "all" else (risk_id, body.audience)
        count = conn.execute(
            f"""SELECT COUNT(*) AS n FROM experts e JOIN groups g ON g.group_id = e.group_id
                WHERE g.risk_id = ? {type_filter}""",
            params,
        ).fetchone()["n"]
        notification = Notification(
            **body.model_dump(),
            notification_id=f"ntf_{secrets.token_urlsafe(12)}",
            risk_id=risk_id,
            recipient_count=count,
            sent_at=_now(),
        )
        conn.execute(
            """INSERT INTO notifications
               (notification_id, risk_id, audience, subject, body, recipient_count, sent_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                notification.notification_id,
                risk_id,
                body.audience,
                body.subject,
                body.body,
                count,
                notification.sent_at.isoformat(),
            ),
        )
        conn.commit()
    log.info("mock notification %s to %d experts on %s", notification.notification_id, count, risk_id)
    return notification


# ---------- tips inbox ----------
@router.get("/tips", response_model=list[Tip])
def list_tips() -> list[Tip]:
    with db.connect() as conn:
        rows = conn.execute(f"{TIP_SELECT} ORDER BY n.created_at DESC LIMIT 500").fetchall()
    return [_tip(row) for row in rows]


@router.patch("/tips/{tip_id}", response_model=Tip)
def update_tip(tip_id: str, body: TipUpdate) -> Tip:
    updates = body.model_dump(exclude_unset=True)
    if any(value is None for value in updates.values()):
        raise HTTPException(status_code=422, detail="Fields cannot be cleared with null")
    with db.connect() as conn:
        if "risk_id" in updates:
            _require_risk(conn, updates["risk_id"])
        if "tags" in updates:
            updates["tags"] = json.dumps([t.strip() for t in updates["tags"] if t.strip()])
        if updates:
            columns = ", ".join(f"{column} = ?" for column in updates)
            conn.execute(f"UPDATE notes SET {columns} WHERE note_id = ?", (*updates.values(), tip_id))
            conn.commit()
        row = conn.execute(f"{TIP_SELECT} WHERE n.note_id = ?", (tip_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Tip not found")
    return _tip(row)


@router.post("/tips/{tip_id}/reply", response_model=Tip)
def reply_to_tip(tip_id: str, body: TipReply) -> Tip:
    """Store the analyst's reply and mark the tip reviewed. The outbound email is mocked (logged)."""
    with db.connect() as conn:
        cursor = conn.execute(
            """UPDATE notes SET reply_notes = ?, replied_at = ?, status = 'reviewed'
               WHERE note_id = ?""",
            (body.notes.strip(), _now().isoformat(), tip_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tip not found")
        conn.commit()
        row = conn.execute(f"{TIP_SELECT} WHERE n.note_id = ?", (tip_id,)).fetchone()
    log.info("mock reply sent for tip %s", tip_id)
    return _tip(row)


# ---------- article commentary ----------
@router.get("/article-comments", response_model=list[ArticleCommentItem])
def list_article_comments() -> list[ArticleCommentItem]:
    with db.connect() as conn:
        rows = conn.execute(f"{COMMENT_SELECT} ORDER BY c.created_at DESC LIMIT 500").fetchall()
    return [_article_comment(row) for row in rows]


@router.patch("/article-comments/{comment_id}", response_model=ArticleCommentItem)
def update_article_comment(comment_id: str, body: ArticleCommentUpdate) -> ArticleCommentItem:
    with db.connect() as conn:
        conn.execute("UPDATE article_comments SET status = ? WHERE comment_id = ?", (body.status, comment_id))
        conn.commit()
        row = conn.execute(f"{COMMENT_SELECT} WHERE c.comment_id = ?", (comment_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return _article_comment(row)
