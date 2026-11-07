# questions.py
import json
import os
import re
from datetime import datetime, timezone
from typing import Annotated, Literal, get_args

import requests
from dotenv import load_dotenv
from pydantic import BaseModel, StringConstraints, ValidationError, field_validator

from latest import latest_context, render_context

load_dotenv()

CHARS_PER_TOKEN = 4  # rough; French/non-Latin text uses more tokens per character

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5)]
Dimension = Literal["likelihood", "urgency", "severity", "scale", "other"]  # same enum as the YAML


# ---------- what the LLM returns (no IDs: we assign those) ----------
class LikertDraft(BaseModel):
    text: Text
    dimension: Dimension = "other"

    @field_validator("dimension", mode="before")
    @classmethod
    def _coerce_dimension(cls, v):
        # small models invent dimensions ("importance"...): map unknown ones to "other"
        v = str(v).strip().lower() if v is not None else "other"
        return v if v in get_args(Dimension) else "other"


class BinaryDraft(BaseModel):
    text: Text


class QuestionSet(BaseModel):
    likert: list[LikertDraft]
    binary: list[BinaryDraft]

    @field_validator("likert", "binary", mode="before")
    @classmethod
    def _accept_plain_strings(cls, items):
        # small models sometimes return ["question?", ...] instead of [{"text": ...}]
        return [{"text": i} if isinstance(i, str) else i for i in items]


# ---------- API shape (matches components/schemas/Survey in openapi.yaml) ----------
class LikertQuestion(BaseModel):
    id: str
    text: str
    dimension: Dimension


class BinaryQuestion(BaseModel):
    id: str
    text: str


class Survey(BaseModel):
    survey_id: str
    risk_id: str
    risk_title: str
    based_on_update: str | None  # dd/mm/yyyy of the newest update used, None if the risk has no updates
    generated_at: datetime
    likert: list[LikertQuestion]
    binary: list[BinaryQuestion]


# ---------- prompt ----------
SYSTEM_PROMPT = """You help an NGO that tracks conflicts keep in touch with humanitarian experts \
between its risk reports. The experts are humanitarian workers, conflict-management practitioners \
and social scientists, usually living near the affected areas.

You will receive a risk assessment. Using it, prepare:
- the 5 most pressing questions that need an update from an expert, answered on a 1-5 scale \
(for example: how likely, how pressing, how urgent, how severe), and
- the 5 most pressing yes/no questions.

Rules:
- Focus on what changed in the most recent updates and on what is still uncertain.
- Tailor questions to people weighing in with their own knowledge and what they may have heard or \
seen on the ground (observations, rumours, word of mouth, local contacts). Never ask for \
information only government, military or other insiders would have.
- Each question must be one short sentence that makes sense on its own, without the report, \
and names the place or group involved. Plain language, no acronyms the expert might not know.
- Scale questions must be answerable with 1 (low) to 5 (high). Set "dimension" to one of: \
likelihood, urgency, severity, scale, other.
- Do not repeat questions or ask about things the assessment already states as fact.

Reply with ONLY a JSON object, no other text, in exactly this shape:
{"likert": [{"text": "...", "dimension": "likelihood"}],
 "binary": [{"text": "..."}]}"""


# ---------- survey identity ----------
def _iso(d: str) -> str:
    """dd/mm/yyyy -> yyyy-mm-dd (falls back to a filesystem/URL-safe version of the raw string)."""
    try:
        return datetime.strptime(d, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return re.sub(r"[^0-9A-Za-z]+", "-", d).strip("-")


def make_survey_id(risk_id: str, latest_update: str | None) -> str:
    return f"{risk_id}_{_iso(latest_update) if latest_update else 'baseline'}"


def survey_id_for(risk: dict) -> str:
    """Cheap and deterministic (no LLM call): lets the daily job skip risks whose survey already exists."""
    updates = latest_context(risk, max_updates=1)["updates"]
    return make_survey_id(risk["risk_id"], updates[0]["date"] if updates else None)


# ---------- context building ----------
def build_context(risk: dict, max_context_tokens: int = 3000) -> tuple[dict, str]:
    """3 most recent updates; fall back to 1 if the text would exceed the token budget."""
    for n in (3, 1):
        ctx = latest_context(risk, max_updates=n)
        text = render_context(ctx)
        if len(text) / CHARS_PER_TOKEN <= max_context_tokens:
            break
    return ctx, text


# ---------- LLM call ----------
def call_llm(messages: list[dict], temperature: float = 0.3, timeout: int = 300) -> str:
    base_url = os.environ["LLM_BASE_URL"].rstrip("/")  # e.g. http://localhost:1234/api/v1
    headers = {"Content-Type": "application/json"}
    if api_key := os.getenv("LLM_API_KEY"):
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": os.environ["LLM_MODEL"],
        "input": "\n\n".join(
            f"{'System instructions' if message['role'] == 'system' else 'User input'}:\n"
            f"{message['content']}"
            for message in messages
        ),
        "context_length": 8000,
        "reasoning": "off",
        "temperature": temperature,
        "max_output_tokens": 1500,
    }
    r = requests.post(f"{base_url}/chat", headers=headers, json=payload, timeout=timeout)
    r.raise_for_status()
    response = r.json()
    for item in response.get("output", []):
        if item.get("type") == "message" and isinstance(item.get("content"), str):
            return item["content"]
    raise ValueError("LM Studio response did not contain a message in its output")


def extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text)  # strip code fences
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start : end + 1])


def _dedupe(items: list) -> list:
    seen, out = set(), []
    for item in items:
        key = item.text.lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


# ---------- main entry point (used by the daily job) ----------
def generate_survey(risk: dict, retries: int = 2, n_per_type: int = 5) -> Survey:
    ctx, context = build_context(risk)
    latest_update = ctx["updates"][0]["date"] if ctx["updates"] else None
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Risk assessment:\n\n{context}"},
    ]

    last_error = None
    for attempt in range(retries + 1):
        try:
            raw = call_llm(messages, temperature=0.3 + 0.2 * attempt)
            qs = QuestionSet.model_validate(extract_json(raw))
            likert = _dedupe(qs.likert)[:n_per_type]
            binary = _dedupe(qs.binary)[:n_per_type]
            if len(likert) < 3 or len(binary) < 3:
                raise ValueError(f"too few questions ({len(likert)} likert, {len(binary)} binary)")
            return Survey(
                survey_id=make_survey_id(risk["risk_id"], latest_update),
                risk_id=risk["risk_id"],
                risk_title=ctx["title"],
                based_on_update=latest_update,
                generated_at=datetime.now(timezone.utc),
                likert=[LikertQuestion(id=f"L{i}", text=q.text, dimension=q.dimension) for i, q in enumerate(likert, 1)],
                binary=[BinaryQuestion(id=f"B{i}", text=q.text) for i, q in enumerate(binary, 1)],
            )
        except (ValueError, ValidationError, KeyError) as e:  # JSON/shape problems: try again
            last_error = e
    raise RuntimeError(f"LLM did not return usable questions after {retries + 1} attempts: {last_error}")


if __name__ == "__main__":
    from acaps_client import fetch_risks

    risks = fetch_risks(use_cache=True, risk_id="R1011", ordering="-last_risk_update")
    if risks:
        print("survey id would be:", survey_id_for(risks[0]))
        print(generate_survey(risks[0]).model_dump_json(indent=2))
