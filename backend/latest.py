# latest.py
import re

UPDATE_RE = re.compile(r"(?i)update (\d{2}/\d{2}/\d{4})\s*(.*?)(?=update \d{2}/\d{2}/\d{4}|\Z)", re.S)
LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")  # [Reuters 25/09/2026](url) -> Reuters 25/09/2026


def clean(text: str) -> str:
    text = LINK_RE.sub(r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def latest_context(risk: dict, max_updates: int = 3) -> dict:
    blob = risk.get("rationale_updates") or ""
    updates = [{"date": d, "text": clean(t)} for d, t in UPDATE_RE.findall(blob)]

    # a few risks have an unmarked update: treat it as one undated update
    if not updates and blob.strip():
        updates = [{"date": None, "text": clean(blob)}]

    updates = updates[:max_updates]  # log is newest first, so these are the latest

    # Full rationale only when there is too little update history to stand on
    background = clean(risk.get("rationale") or "") or None if len(updates) < max_updates else None

    return {
        "risk_id": risk["risk_id"],
        "title": risk["risk_title"],
        "country": risk["country"],
        "rating": {k: risk.get(k) for k in ("probability", "impact", "risk_level", "risk_trend")},
        "background": background,  # None when there are 3+ updates
        "updates": updates,        # newest first, 0-3 entries
    }
