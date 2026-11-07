import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from typing import Annotated, Literal

import db
from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import AnyUrl, BaseModel, Field, StrictBool, StrictInt, model_validator

app = FastAPI(
    title="Ground Truth - Expert Loop API",
    version="0.1.0",
    description="API for expert registration, risk surveys, and contributions.",
)
bearer_scheme = HTTPBearer(auto_error=False)

AnonymityLevel = Literal["known_to_acaps", "pseudonymous_to_peers", "fully_anonymous"]
Channel = Literal["extension", "telegram", "whatsapp"]
Language = Literal["en", "fr"]


class GroupCreate(BaseModel):
    name: str
    risk_id: str
    country_iso3: str | None = None


class Group(GroupCreate):
    group_id: str
    invite_code: str


class ExpertRegistration(BaseModel):
    invite_code: str
    anonymity_level: AnonymityLevel
    display_name: str | None = None
    channel: Channel | None = None
    language: Language | None = None


class ExpertUpdate(BaseModel):
    anonymity_level: AnonymityLevel | None = None
    display_name: str | None = None
    channel: Channel | None = None
    language: Language | None = None

    @model_validator(mode="after")
    def require_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one setting must be provided")
        if any(value is None for value in self.model_dump(exclude_unset=True).values()):
            raise ValueError("Settings cannot be cleared with null")
        return self


class Expert(BaseModel):
    expert_id: str
    group_id: str
    anonymity_level: AnonymityLevel
    display_name: str | None = None
    channel: Channel | None = None
    language: Language | None = None


class ExpertRegistered(Expert):
    token: str


class LikertAnswer(BaseModel):
    question_id: str
    value: Annotated[StrictInt, Field(ge=1, le=5)] | None


class BinaryAnswer(BaseModel):
    question_id: str
    value: StrictBool | None


class SurveyResponseInput(BaseModel):
    status: Literal["draft", "submitted"]
    likert: list[LikertAnswer] = Field(default_factory=list)
    binary: list[BinaryAnswer] = Field(default_factory=list)
    comment: str | None = None

    @model_validator(mode="after")
    def require_unique_question_ids(self):
        for answers in (self.likert, self.binary):
            ids = [answer.question_id for answer in answers]
            if len(ids) != len(set(ids)):
                raise ValueError("A question can only be answered once")
        return self


class SurveyResponse(SurveyResponseInput):
    survey_id: str
    updated_at: datetime


class NoteCreate(BaseModel):
    text: str = Field(max_length=5000)
    url: AnyUrl | None = None
    risk_id: str | None = None


class Note(NoteCreate):
    note_id: str
    created_at: datetime


class ArticleInput(BaseModel):
    url: AnyUrl
    title: str | None = None
    text: str | None = Field(default=None, max_length=20000)


class ArticleMatch(BaseModel):
    matched: bool
    risk_id: str | None = None
    risk_title: str | None = None
    score: float | None = Field(default=None, ge=0, le=1)


class ArticleCommentCreate(BaseModel):
    url: AnyUrl
    risk_id: str
    text: str = Field(max_length=5000)


class ArticleComment(ArticleCommentCreate):
    comment_id: str
    created_at: datetime


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _expert_from_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    with db.connect() as conn:
        expert = conn.execute(
            """SELECT expert_id, group_id, token_hash, anonymity_level, display_name, channel, language
               FROM experts WHERE token_hash = ?""",
            (_token_hash(credentials.credentials),),
        ).fetchone()
    if expert is None:
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    return dict(expert)


def _expert_for_path(expert_id: str, expert: dict) -> None:
    if expert["expert_id"] != expert_id:
        raise HTTPException(status_code=403, detail="Token does not belong to this expert")


def _require_analyst_key(
    x_analyst_key: Annotated[str | None, Header()] = None,
) -> None:
    expected = os.getenv("ANALYST_API_KEY")
    if not expected:
        raise HTTPException(status_code=503, detail="Analyst API is not configured")
    if x_analyst_key is None or not secrets.compare_digest(x_analyst_key, expected):
        raise HTTPException(status_code=401, detail="Missing or invalid analyst key")


def _expert_response(row: dict) -> Expert:
    return Expert(
        expert_id=row["expert_id"],
        group_id=row["group_id"],
        anonymity_level=row["anonymity_level"],
        display_name=row["display_name"],
        channel=row["channel"],
        language=row["language"],
    )


@app.post("/groups", response_model=Group, status_code=status.HTTP_201_CREATED, tags=["Registration"])
def create_group(
    body: GroupCreate,
    _: Annotated[None, Depends(_require_analyst_key)],
) -> Group:
    group = Group(
        **body.model_dump(),
        group_id=f"grp_{secrets.token_urlsafe(12)}",
        invite_code=secrets.token_urlsafe(12),
    )
    with db.connect() as conn:
        db.add_group(
            conn,
            group.group_id,
            group.name,
            group.risk_id,
            group.invite_code,
            group.country_iso3,
        )
    return group


@app.post("/experts", response_model=ExpertRegistered, status_code=status.HTTP_201_CREATED, tags=["Registration"])
def register_expert(body: ExpertRegistration) -> ExpertRegistered:
    token = secrets.token_urlsafe(32)
    expert_id = f"exp_{secrets.token_urlsafe(12)}"
    with db.connect() as conn:
        group = conn.execute(
            "SELECT group_id FROM groups WHERE invite_code = ?",
            (body.invite_code,),
        ).fetchone()
        if group is None:
            raise HTTPException(status_code=404, detail="Invite code not found")
        conn.execute(
            """INSERT INTO experts
               (expert_id, group_id, token_hash, anonymity_level, display_name, channel, language)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                expert_id,
                group["group_id"],
                _token_hash(token),
                body.anonymity_level,
                body.display_name,
                body.channel,
                body.language,
            ),
        )
        conn.commit()
        row = conn.execute(
            """SELECT expert_id, group_id, anonymity_level, display_name, channel, language
               FROM experts WHERE expert_id = ?""",
            (expert_id,),
        ).fetchone()
    return ExpertRegistered(**_expert_response(dict(row)).model_dump(), token=token)


@app.patch("/experts/me", response_model=Expert, tags=["Registration"])
def update_expert(
    body: ExpertUpdate,
    expert: Annotated[dict, Depends(_expert_from_token)],
) -> Expert:
    updates = body.model_dump(exclude_unset=True)
    columns = ", ".join(f"{column} = ?" for column in updates)
    with db.connect() as conn:
        conn.execute(
            f"UPDATE experts SET {columns} WHERE expert_id = ?",
            (*updates.values(), expert["expert_id"]),
        )
        conn.commit()
        row = conn.execute(
            """SELECT expert_id, group_id, anonymity_level, display_name, channel, language
               FROM experts WHERE expert_id = ?""",
            (expert["expert_id"],),
        ).fetchone()
    return _expert_response(dict(row))


@app.get(
    "/experts/{expert_id}/surveys/current",
    response_model=None,
    tags=["Surveys"],
    responses={204: {"description": "Nothing outstanding"}},
)
def get_current_survey(
    expert_id: str,
    response: Response,
    expert: Annotated[dict, Depends(_expert_from_token)],
):
    _expert_for_path(expert_id, expert)
    with db.connect() as conn:
        group = conn.execute("SELECT risk_id FROM groups WHERE group_id = ?", (expert["group_id"],)).fetchone()
        survey = conn.execute(
            """SELECT survey_id, risk_id, risk_title, based_on_update, generated_at, payload FROM surveys
               WHERE risk_id = ? ORDER BY generated_at DESC LIMIT 1""",
            (group["risk_id"],),
        ).fetchone()
        if survey is None:
            response.status_code = status.HTTP_204_NO_CONTENT
            return None
        submitted = conn.execute(
            """SELECT 1 FROM responses
               WHERE survey_id = ? AND expert_id = ? AND status = 'submitted'""",
            (survey["survey_id"], expert_id),
        ).fetchone()
        if submitted is None:
            payload = json.loads(survey["payload"])
            payload.update(db.survey_questions(conn, survey["survey_id"]))
    if submitted is not None:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
    return payload


@app.put(
    "/experts/{expert_id}/surveys/{survey_id}/responses",
    response_model=SurveyResponse,
    tags=["Surveys"],
)
def put_survey_response(
    expert_id: str,
    survey_id: str,
    body: SurveyResponseInput,
    expert: Annotated[dict, Depends(_expert_from_token)],
) -> SurveyResponse:
    _expert_for_path(expert_id, expert)
    with db.connect() as conn:
        survey = conn.execute(
            "SELECT risk_id, payload FROM surveys WHERE survey_id = ?",
            (survey_id,),
        ).fetchone()
        if survey is None:
            raise HTTPException(status_code=404, detail="Survey not found")
        latest = conn.execute(
            """SELECT survey_id FROM surveys
               WHERE risk_id = ? ORDER BY generated_at DESC LIMIT 1""",
            (survey["risk_id"],),
        ).fetchone()
        if latest["survey_id"] != survey_id:
            raise HTTPException(status_code=409, detail="Survey is outdated")
        existing = conn.execute(
            "SELECT status FROM responses WHERE survey_id = ? AND expert_id = ?",
            (survey_id, expert_id),
        ).fetchone()
        if existing is not None and existing["status"] == "submitted":
            raise HTTPException(status_code=409, detail="Response was already submitted")

        survey_questions = db.survey_questions(conn, survey_id)
        likert_ids = {question["id"] for question in survey_questions["likert"]}
        binary_ids = {question["id"] for question in survey_questions["binary"]}
        if any(answer.question_id not in likert_ids for answer in body.likert):
            raise HTTPException(status_code=422, detail="Unknown Likert question ID")
        if any(answer.question_id not in binary_ids for answer in body.binary):
            raise HTTPException(status_code=422, detail="Unknown binary question ID")

        if body.status == "submitted":
            if {answer.question_id for answer in body.likert} != likert_ids:
                raise HTTPException(status_code=422, detail="A submitted response must include each Likert question")
            if {answer.question_id for answer in body.binary} != binary_ids:
                raise HTTPException(status_code=422, detail="A submitted response must include each binary question")

        updated_at = datetime.now(timezone.utc)
        payload = body.model_dump(mode="json")
        conn.execute(
            """INSERT INTO responses (survey_id, expert_id, status, payload, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(survey_id, expert_id) DO UPDATE SET
                   status = excluded.status, payload = excluded.payload, updated_at = excluded.updated_at""",
            (survey_id, expert_id, body.status, json.dumps(payload), updated_at.isoformat()),
        )
        conn.commit()
    return SurveyResponse(**payload, survey_id=survey_id, updated_at=updated_at)


@app.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED, tags=["Contributions"])
def create_note(
    body: NoteCreate,
    expert: Annotated[dict, Depends(_expert_from_token)],
) -> Note:
    with db.connect() as conn:
        group = conn.execute("SELECT risk_id FROM groups WHERE group_id = ?", (expert["group_id"],)).fetchone()
        note = Note(
            **body.model_dump(mode="json", exclude={"risk_id"}),
            risk_id=body.risk_id or group["risk_id"],
            note_id=f"note_{secrets.token_urlsafe(12)}",
            created_at=datetime.now(timezone.utc),
        )
        conn.execute(
            """INSERT INTO notes (note_id, expert_id, risk_id, text, url, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                note.note_id,
                expert["expert_id"],
                note.risk_id,
                note.text,
                str(note.url) if note.url else None,
                note.created_at.isoformat(),
            ),
        )
        conn.commit()
    return note


@app.post("/articles/match", response_model=ArticleMatch, tags=["Contributions"])
def match_article(
    body: ArticleInput,
    _: Annotated[dict, Depends(_expert_from_token)],
) -> ArticleMatch:
    article_text = " ".join(part for part in (body.title, body.text) if part).casefold()
    with db.connect() as conn:
        risks = conn.execute(
            """SELECT g.risk_id, COALESCE(MAX(s.risk_title), '') AS risk_title
               FROM groups g LEFT JOIN surveys s ON s.risk_id = g.risk_id
               GROUP BY g.risk_id"""
        ).fetchall()
    for risk in risks:
        risk_id = risk["risk_id"].casefold()
        risk_title = risk["risk_title"].strip()
        if risk_id in article_text or (risk_title and risk_title.casefold() in article_text):
            return ArticleMatch(matched=True, risk_id=risk["risk_id"], risk_title=risk_title, score=1.0)
    return ArticleMatch(matched=False)


@app.post(
    "/articles/comments",
    response_model=ArticleComment,
    status_code=status.HTTP_201_CREATED,
    tags=["Contributions"],
)
def comment_on_article(
    body: ArticleCommentCreate,
    expert: Annotated[dict, Depends(_expert_from_token)],
) -> ArticleComment:
    with db.connect() as conn:
        tracked = conn.execute(
            "SELECT 1 FROM groups WHERE risk_id = ?",
            (body.risk_id,),
        ).fetchone()
    if tracked is None:
        raise HTTPException(status_code=404, detail="Risk is not tracked by any group")

    comment = ArticleComment(
        **body.model_dump(mode="json"),
        comment_id=f"comment_{secrets.token_urlsafe(12)}",
        created_at=datetime.now(timezone.utc),
    )
    with db.connect() as conn:
        conn.execute(
            """INSERT INTO article_comments (comment_id, expert_id, url, risk_id, text, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                comment.comment_id,
                expert["expert_id"],
                str(comment.url),
                comment.risk_id,
                comment.text,
                comment.created_at.isoformat(),
            ),
        )
        conn.commit()
    return comment
