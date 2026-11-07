# db.py: SQLite storage shared by the daily job and the API
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
    stance      TEXT,                        -- agree | disagree | NULL
    quote       TEXT,                        -- highlighted passage, if the comment is about one
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_requests (
    request_id  TEXT PRIMARY KEY,
    expert_id   TEXT NOT NULL REFERENCES experts(expert_id),
    note        TEXT,
    created_at  TEXT NOT NULL
);
"""

# Columns added after the first release. CREATE TABLE IF NOT EXISTS does not add them to
# databases that already exist, so connect() adds any that are missing.
ADDED_COLUMNS = {
    "article_comments": {"stance": "TEXT", "quote": "TEXT"},
}


def _migrate(conn: sqlite3.Connection) -> None:
    for table, columns in ADDED_COLUMNS.items():
        existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        for column, column_type in columns.items():
            if column not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")
    conn.commit()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    _migrate(conn)
    try:
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
    conn.commit()
