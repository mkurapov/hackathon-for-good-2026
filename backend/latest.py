# latest.py
import re
from acaps_client import fetch_risks, CACHE_DIR

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

def format_context(risk: dict) -> str:
    ctx = latest_context(risk)
    updates = ctx["updates"]  # newest first
    country = ", ".join(ctx["country"]) if isinstance(ctx["country"], list) else ctx["country"]

    last_date = updates[0]["date"] if updates else None
    header = f"Concerning risk {ctx['title']} ({ctx['risk_id']}) in {country}"
    header += f", last updated on {last_date}:\n" if last_date else ":\n"

    parts = [header]
    if ctx["background"]:
        parts.append(ctx["background"])
    for update in reversed(updates):  # oldest -> newest, so the story reads chronologically
        parts.append(f"Update {update['date']}: {update['text']}" if update["date"] else update["text"])
    formatted = "\n\n".join(parts)
    cache_file = CACHE_DIR / f"formatted_context_{ctx['risk_id']}_{last_date.replace('/', '-') if last_date else 'no-date'}.txt"
    with open(cache_file, "w", encoding="utf-8") as f:
        f.write(formatted)
    return formatted


if __name__ == "__main__":
    risks = fetch_risks(use_cache=True, risk_id="R1011", ordering="-last_risk_update")
    _ = format_context(risks[0])
