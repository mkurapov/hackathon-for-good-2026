# store.py: the bot's own SQLite file. It holds only what the bot needs to act for a chat:
# chat ID, expert ID and token, survey progress and delivery bookkeeping. No Telegram names,
# usernames or phone numbers, and no copy of tips once they are sent.
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator

DB_PATH = Path(os.getenv("BOT_DB_PATH") or Path(__file__).resolve().parent / "bot.db")
TIP_TTL = timedelta(minutes=30)

SCHEMA = """
CREATE TABLE IF NOT EXISTS chats (
    chat_id              INTEGER PRIMARY KEY,
    expert_id            TEXT NOT NULL,
    token                TEXT NOT NULL,
    risk_id              TEXT NOT NULL,
    risk_title           TEXT,
    last_survey_pushed   TEXT,
    last_notification_at TEXT NOT NULL,
    created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS survey_progress (
    chat_id     INTEGER PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
    survey_id   TEXT NOT NULL,
    survey      TEXT NOT NULL,             -- the survey as the API returned it
    position    INTEGER NOT NULL DEFAULT 0,
    answers     TEXT NOT NULL DEFAULT '{}',-- question_id -> 1..5 | true | false | null (skipped)
    comment     TEXT,
    mode        TEXT NOT NULL DEFAULT 'question',  -- question | summary
    revisiting  INTEGER NOT NULL DEFAULT 0,        -- 1 while changing one answer from the summary
    message_id  INTEGER,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_tips (
    chat_id           INTEGER PRIMARY KEY REFERENCES chats(chat_id) ON DELETE CASCADE,
    text              TEXT NOT NULL,
    url               TEXT,
    prompt_message_id INTEGER,
    expires_at        TEXT NOT NULL
);
"""


def _now() -> datetime:
    return datetime.now(timezone.utc)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        conn.executescript(SCHEMA)
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------- chats ----------
def link_chat(chat_id: int, expert_id: str, token: str, risk_id: str, risk_title: str | None) -> None:
    now = _now().isoformat()
    with connect() as conn:
        conn.execute("DELETE FROM chats WHERE chat_id = ?", (chat_id,))
        conn.execute(
            """INSERT INTO chats (chat_id, expert_id, token, risk_id, risk_title, last_notification_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (chat_id, expert_id, token, risk_id, risk_title, now, now),
        )


def unlink_chat(chat_id: int) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM chats WHERE chat_id = ?", (chat_id,))


def get_chat(chat_id: int) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM chats WHERE chat_id = ?", (chat_id,)).fetchone()
    return dict(row) if row else None


def all_chats() -> list[dict]:
    with connect() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM chats")]


def update_chat(chat_id: int, **fields) -> None:
    columns = ", ".join(f"{column} = ?" for column in fields)
    with connect() as conn:
        conn.execute(f"UPDATE chats SET {columns} WHERE chat_id = ?", (*fields.values(), chat_id))


# ---------- survey progress ----------
def start_progress(chat_id: int, survey: dict) -> dict:
    with connect() as conn:
        conn.execute(
            """INSERT INTO survey_progress (chat_id, survey_id, survey, updated_at) VALUES (?, ?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET survey_id = excluded.survey_id, survey = excluded.survey,
                   position = 0, answers = '{}', comment = NULL, mode = 'question', revisiting = 0,
                   message_id = NULL, updated_at = excluded.updated_at""",
            (chat_id, survey["survey_id"], json.dumps(survey), _now().isoformat()),
        )
    return get_progress(chat_id)


def get_progress(chat_id: int) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM survey_progress WHERE chat_id = ?", (chat_id,)).fetchone()
    if row is None:
        return None
    progress = dict(row)
    progress["survey"] = json.loads(progress["survey"])
    progress["answers"] = json.loads(progress["answers"])
    return progress


def save_progress(chat_id: int, **fields) -> None:
    if "answers" in fields:
        fields["answers"] = json.dumps(fields["answers"])
    fields["updated_at"] = _now().isoformat()
    columns = ", ".join(f"{column} = ?" for column in fields)
    with connect() as conn:
        conn.execute(f"UPDATE survey_progress SET {columns} WHERE chat_id = ?", (*fields.values(), chat_id))


def clear_progress(chat_id: int) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM survey_progress WHERE chat_id = ?", (chat_id,))


# ---------- pending tips ----------
def set_pending_tip(chat_id: int, text: str, url: str | None, prompt_message_id: int | None) -> None:
    with connect() as conn:
        conn.execute(
            """INSERT INTO pending_tips (chat_id, text, url, prompt_message_id, expires_at) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(chat_id) DO UPDATE SET text = excluded.text, url = excluded.url,
                   prompt_message_id = excluded.prompt_message_id, expires_at = excluded.expires_at""",
            (chat_id, text, url, prompt_message_id, (_now() + TIP_TTL).isoformat()),
        )


def get_pending_tip(chat_id: int) -> dict | None:
    """The chat's unsent tip, or None. Expired drafts are deleted on read."""
    with connect() as conn:
        row = conn.execute("SELECT * FROM pending_tips WHERE chat_id = ?", (chat_id,)).fetchone()
        if row is None:
            return None
        if datetime.fromisoformat(row["expires_at"]) < _now():
            conn.execute("DELETE FROM pending_tips WHERE chat_id = ?", (chat_id,))
            return None
    return dict(row)


def clear_pending_tip(chat_id: int) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM pending_tips WHERE chat_id = ?", (chat_id,))
