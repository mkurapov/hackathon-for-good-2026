# db.py: SQLite storage shared by the daily job and the API
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import TYPE_CHECKING, Iterator

if TYPE_CHECKING:
    from questions import Survey

DB_PATH = Path(os.getenv("DB_PATH") or Path(__file__).resolve().parent / "groundtruth.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS groups (
    group_id      TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    risk_id       TEXT NOT NULL,
    country_iso3  TEXT,
    invite_code   TEXT NOT NULL UNIQUE,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experts (
    expert_id        TEXT PRIMARY KEY,
    group_id         TEXT NOT NULL REFERENCES groups(group_id),
    token_hash       TEXT NOT NULL,          -- store a hash, never the token itself
    anonymity_level  TEXT NOT NULL,
    display_name     TEXT,
    channel          TEXT,
    language         TEXT,
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS surveys (
    survey_id        TEXT PRIMARY KEY,       -- <risk_id>_<yyyy-mm-dd of newest update>
    risk_id          TEXT NOT NULL,
    risk_title       TEXT NOT NULL,
    based_on_update  TEXT,
    generated_at     TEXT NOT NULL,
    payload          TEXT NOT NULL           -- the full Survey as JSON (matches openapi.yaml)
);
CREATE INDEX IF NOT EXISTS idx_surveys_risk ON surveys(risk_id, generated_at);

CREATE TABLE IF NOT EXISTS survey_questions (
    survey_id       TEXT NOT NULL REFERENCES surveys(survey_id) ON DELETE CASCADE,
    risk_id         TEXT NOT NULL,
    based_on_update TEXT,
    question_id     TEXT NOT NULL,
    question_type   TEXT NOT NULL CHECK (question_type IN ('likert', 'binary')),
    text            TEXT NOT NULL,
    dimension       TEXT,
    PRIMARY KEY (survey_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_survey_questions_risk_date
    ON survey_questions(risk_id, based_on_update);

CREATE TABLE IF NOT EXISTS responses (
    survey_id   TEXT NOT NULL REFERENCES surveys(survey_id),
    expert_id   TEXT NOT NULL REFERENCES experts(expert_id),
    status      TEXT NOT NULL,               -- draft | submitted
    payload     TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (survey_id, expert_id)
);

CREATE TABLE IF NOT EXISTS notes (
    note_id     TEXT PRIMARY KEY,
    expert_id   TEXT NOT NULL REFERENCES experts(expert_id),
    risk_id     TEXT NOT NULL,
    text        TEXT NOT NULL,
    url         TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS article_comments (
    comment_id  TEXT PRIMARY KEY,
    expert_id   TEXT NOT NULL REFERENCES experts(expert_id),
    url         TEXT NOT NULL,
    risk_id     TEXT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
"""


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        questions_table_exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'survey_questions'"
        ).fetchone() is not None
        conn.executescript(SCHEMA)
        if not questions_table_exists:
            _backfill_survey_questions(conn)
            conn.commit()
        yield conn
    finally:
        conn.close()


# ---------- groups ----------
def add_group(conn, group_id: str, name: str, risk_id: str, invite_code: str, country_iso3: str | None = None):
    conn.execute(
        "INSERT INTO groups (group_id, name, risk_id, country_iso3, invite_code) VALUES (?, ?, ?, ?, ?)",
        (group_id, name, risk_id, country_iso3, invite_code),
    )
    conn.commit()


def tracked_risk_ids(conn) -> list[str]:
    """Every risk that at least one group follows: these are the ones that need surveys."""
    return [r["risk_id"] for r in conn.execute("SELECT DISTINCT risk_id FROM groups ORDER BY risk_id")]


# ---------- surveys ----------
def survey_exists(conn, survey_id: str) -> bool:
    return conn.execute("SELECT 1 FROM surveys WHERE survey_id = ?", (survey_id,)).fetchone() is not None


def survey_has_responses(conn, survey_id: str) -> bool:
    return conn.execute("SELECT 1 FROM responses WHERE survey_id = ?", (survey_id,)).fetchone() is not None


def save_survey(conn, survey: "Survey", replace: bool = False) -> None:
    existed = survey_exists(conn, survey.survey_id)
    conflict = (
        """DO UPDATE SET risk_title = excluded.risk_title, based_on_update = excluded.based_on_update,
                        generated_at = excluded.generated_at, payload = excluded.payload"""
        if replace
        else "DO NOTHING"
    )
    conn.execute(
        f"""INSERT INTO surveys (survey_id, risk_id, risk_title, based_on_update, generated_at, payload)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(survey_id) {conflict}""",
        (
            survey.survey_id,
            survey.risk_id,
            survey.risk_title,
            survey.based_on_update,
            survey.generated_at.isoformat(),
            survey.model_dump_json(),
        ),
    )
    if not existed or replace:
        conn.execute("DELETE FROM survey_questions WHERE survey_id = ?", (survey.survey_id,))
        questions = [
            (
                survey.survey_id,
                survey.risk_id,
                survey.based_on_update,
                question.id,
                "likert",
                question.text,
                question.dimension,
            )
            for question in survey.likert
        ] + [
            (
                survey.survey_id,
                survey.risk_id,
                survey.based_on_update,
                question.id,
                "binary",
                question.text,
                None,
            )
            for question in survey.binary
        ]
        conn.executemany(
            """INSERT INTO survey_questions
               (survey_id, risk_id, based_on_update, question_id, question_type, text, dimension)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            questions,
        )
    conn.commit()


def _backfill_survey_questions(conn: sqlite3.Connection) -> None:
    """Populate the normalized question table from surveys stored before the table existed."""
    for row in conn.execute(
        "SELECT survey_id, risk_id, based_on_update, payload FROM surveys"
    ):
        payload = json.loads(row["payload"])
        questions = [
            (
                row["survey_id"],
                row["risk_id"],
                row["based_on_update"],
                question["id"],
                question_type,
                question["text"],
                question.get("dimension") if question_type == "likert" else None,
            )
            for question_type, items in (("likert", payload["likert"]), ("binary", payload["binary"]))
            for question in items
        ]
        conn.executemany(
            """INSERT INTO survey_questions
               (survey_id, risk_id, based_on_update, question_id, question_type, text, dimension)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            questions,
        )


def survey_questions(conn: sqlite3.Connection, survey_id: str) -> dict[str, list[dict]]:
    """Return a survey's normalized Likert and binary questions."""
    result: dict[str, list[dict]] = {"likert": [], "binary": []}
    for row in conn.execute(
        """SELECT question_id, question_type, text, dimension
           FROM survey_questions WHERE survey_id = ?
           ORDER BY question_type, question_id""",
        (survey_id,),
    ):
        question = {"id": row["question_id"], "text": row["text"]}
        if row["question_type"] == "likert":
            question["dimension"] = row["dimension"]
        result[row["question_type"]].append(question)
    return result
