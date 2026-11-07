# Ground Truth backend: architecture overview

Backend for a moderated expert loop around ACAPS risk analyses (Hackathon for Good #8). Experts react to the latest risk updates through short surveys, via a Firefox extension (primary), a Telegram bot and a WhatsApp bot. Each expert controls their own anonymity level, and nothing is ever attributed publicly.

Requirements: `SPEC_1.md`. API contract: `openapi.yaml`.

## Architecture

```mermaid
flowchart TD
    subgraph sources["Data sources"]
        ACAPS["ACAPS API<br/>risk-radar"]
        CSV["Risk Radar CSV export<br/>from the challenge repo"]
    end

    subgraph job["Daily job: survey preparation"]
        CLIENT["acaps_client.py<br/>auth, pagination, cache"]
        DATA["data.py<br/>load_risks"]
        DAILY["daily_job.py<br/>orchestrator"]
        LATEST["latest.py<br/>latest_context, render_context"]
        QUESTIONS["questions.py<br/>generate_survey"]
    end

    LLM["LM Studio<br/>native REST API"]
    DB[("db.py<br/>SQLite")]

    subgraph api["API layer"]
        FASTAPI["FastAPI app<br/>contract: openapi.yaml"]
    end

    subgraph clients["Expert-facing clients"]
        EXT["Firefox extension"]
        TG["Telegram bot"]
        WA["WhatsApp bot"]
    end

    ACAPS --> CLIENT --> DATA
    CSV --> DATA
    DATA -->|"risk records"| DAILY
    DAILY -->|"survey_id_for / generate_survey"| QUESTIONS
    QUESTIONS --> LATEST
    QUESTIONS -->|"prompt + context"| LLM
    LLM -->|"JSON questions"| QUESTIONS
    DAILY -->|"save survey"| DB

    DB <--> FASTAPI
    EXT --> FASTAPI
    TG --> FASTAPI
    WA --> FASTAPI
```

## Files

| File | Role | Notes | Owner |
|---|---|---|---|
| `acaps_client.py` | Talks to the ACAPS API: token auth (`/api/v1/token-auth/`), pagination, rate limiting (60 requests/min), JSON cache in `.cache/` | Cache key includes the filters; `use_cache=False` forces a fresh fetch | |
| `data.py` | Loads risks from the ACAPS API; targeted IDs use the API's `risk_id` filter; optionally includes CSV-only risks when `include_csv=True` | API-only by default; drops drafts (under development) | |
| `latest.py` | Turns a risk into a compact LLM context: 3 most recent updates, or rationale + updates if there are fewer than 3. Strips citation links | `render_context` produces the text | |
| `questions.py` | Prompt, LLM call, JSON extraction/validation, retries. Assigns question IDs (`L1`-`L5`, `B1`-`B5`) and `survey_id`. Returns a `Survey` matching the OpenAPI schema | Token budget: 3 updates, falls back to 1 | |
| `db.py` | SQLite storage: groups, experts, surveys, normalized `survey_questions`, responses, notes, article comments, contact requests | Questions are indexed by `risk_id` and `based_on_update`; expert tokens are stored hashed | |
| `seed_demo.py` | Creates a demo group (invite code `DEMO-VEN-2026`) and survey, without the LLM, for trying the extension | `--reset` removes demo experts and answers | |
| `daily_job.py` | Demo orchestrator for hardcoded risk `R1011`; skips existing surveys and closed risks, otherwise generates and saves | One failing risk does not stop the job | |
| `api.py` | FastAPI app; authentication, request validation, and API routes backed by SQLite | Article matching currently checks exact risk-ID/title text matches | |
| `openapi.yaml` | API contract | Assumptions are marked in the file | |
| `SPEC_1.md` | Team requirements | | |

## Data flow

### 1. Daily job (survey preparation)

1. `data.load_risks(use_cache=False, risk_ids=["R1011"])` requests the hardcoded demo risk directly from the ACAPS API. Targeted requests include the requested risk even if it is marked under development.
2. `questions.survey_id_for(risk)` computes `<risk_id>_<yyyy-mm-dd of newest update>` without calling the LLM.
3. If that survey already exists, the job skips it. Closed risks (`Materialised`, `Not materialised`) are also skipped unless `--force` is used; risks missing from the data are always skipped.
4. Otherwise `generate_survey(risk)` builds the context (`latest.py`), calls the LLM, validates the JSON (retries up to twice), and returns a `Survey`.
5. `db.save_survey` stores it. `--force` regenerates even closed risks, but refuses when experts have already answered that survey.

### 2. Expert flow (API)

1. A group is created for a `risk_id` and returns an invite code. The expert registers with it and picks an anonymity level, then receives a bearer token.
2. The client calls `GET /experts/{expert_id}/surveys/current`. The API finds the expert's group and its risk, then returns the latest survey, or `204` if there is none or the expert has already submitted answers for it.
3. Answers are saved with `PUT /experts/{expert_id}/surveys/{survey_id}/responses` (draft or submitted). A skipped question is `null`. If a newer update has superseded the survey, the API returns `409`.
4. Free-form input goes to `POST /notes`. Articles are checked against tracked risks with `POST /articles/match` and commented on with `POST /articles/comments`.

## API endpoints

| Method and path | Purpose |
|---|---|
| `POST /groups` | Create a group linked to a `risk_id` (analyst key) |
| `GET /invites/{invite_code}` | Preview the group and risk an invite belongs to, before registering |
| `GET /join?code=` | Invite landing page; the extension reads the code from it |
| `POST /experts` | Register an expert with an invite code, choose anonymity level, receive a token |
| `GET /experts/me` | The expert's profile, including the group and risk they follow |
| `PATCH /experts/me` | Change anonymity level, language or channel |
| `GET /experts/{expert_id}/surveys/current` | Outstanding survey, or `204` |
| `PUT /experts/{expert_id}/surveys/{survey_id}/responses` | Save answers (draft or submitted) |
| `POST /notes` | Unstructured input |
| `POST /articles/match` | Does an article contain a tracked risk ID or title? |
| `POST /articles/comments` | Store an expert comment, Agree / Disagree, or highlighted passage for a matched risk/article |
| `POST /contact-requests` | The expert asks ACAPS to get in touch |

## Design decisions

- **Both data sources produce the same record shape.** Nothing downstream knows whether a risk came from the API or the CSV.
- **Surveys are keyed by `(risk_id, newest update date)`.** This gives generate-once-per-update, the "already answered?" check, and the `409` on stale answers.
- **Questions are stored as individual `survey_questions` rows.** Filter by `risk_id` and `based_on_update` to retrieve a risk's question set for a specific ACAPS update. Existing survey JSON remains for compatibility.
- **Question IDs are assigned in code, not by the LLM.** Answers refer to them, so the model never sees or invents them.
- **The LLM only sees public ACAPS text**, never expert input.
- **Anonymity is part of the data model.** There are three levels (`known_to_acaps`, `pseudonymous_to_peers`, `fully_anonymous`). Contributions are never attributed publicly at any level.
- **Authentication:** bearer token issued at registration, checked against the `expert_id` in the path. Analysts use an `X-Analyst-Key` header.

## Configuration (`.env`)

| Variable | Used by | Notes |
|---|---|---|
| `ACAPS_EMAIL`, `ACAPS_PASSWORD` | `acaps_client.py` | Registered ACAPS API account |
| `LLM_BASE_URL`, `LLM_MODEL` | `questions.py` | LM Studio v1 API base URL (for example `http://localhost:1234/api/v1`) and model name. Calls `/chat` with `input`, `context_length`, reasoning disabled, and `temperature`. |
| `LLM_API_KEY` | `questions.py` | Optional |
| `ANALYST_API_KEY` | `api.py` | Required for `POST /groups`; sent as `X-Analyst-Key` |
| `CSV_PATH` | `data.py` | Defaults to `risk-radar-export.csv` next to the script |
| `DB_PATH` | `db.py` | Defaults to `groundtruth.db` next to the script |

Never commit `.env` or `.cache/`.

Fetch questions for one risk and update directly from SQLite:

```sql
SELECT question_id, question_type, text, dimension
FROM survey_questions
WHERE risk_id = ? AND based_on_update = ?
ORDER BY question_type, question_id;
```

`based_on_update` uses the ACAPS date string (`dd/mm/yyyy`); it is `NULL` for baseline surveys.

## Running it

```bash
pip install requests python-dotenv pydantic fastapi uvicorn

# generate a survey for the hardcoded demo risk (R1011)
python daily_job.py
python daily_job.py --force          # regenerate R1011 even if closed (unless it has responses)

# start the API (without Docker)
uvicorn api:app --app-dir backend --reload --env-file .env
```

Or run the API in Docker from the repo root. `docker-compose.yml` builds `backend/Dockerfile`, loads `.env` if present, and keeps the database in the `groundtruth-data` volume:

```bash
docker compose up -d --build
docker compose exec api python seed_demo.py
docker compose exec api python daily_job.py --risk R1043
```

Inside the container, `localhost` is the container itself. Point `LLM_BASE_URL` at `http://host.docker.internal:1234/api/v1` to reach LM Studio on the host.

## Open questions

- **Article matching.** How `POST /articles/match` decides that an article relates to a risk (keywords, embeddings, or the LLM):
- **Analyst moderation view.** How analysts see expert answers, agreement and disagreement, and where the "super estimator" scoreboard would live:
- **Group creation by experts.** Currently analysts only. Self-registered groups would need an approval step:
- **Closed risks.** Experts in a group whose risk has resolved get `204` from then on. Keep, or keep surveying:
- **LLM model and hosting:**
- **Deployment and scheduling** of the daily job and the API:
- **French and other languages** for questions and the interface:
- **Low-bandwidth and mobile behaviour:**
- **Pilot data.** Synthetic experts only until the pilot, per the challenge brief:
