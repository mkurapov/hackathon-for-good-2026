# Telegram bot: spec

Status: built (`bot.py`, `client.py`, `store.py`). See "Running it" at the end.

A Telegram bot that lets ACAPS experts do two things from their phone:

1. **Send tips**: unstructured text or forwarded channel posts, which land in the analyst Tips inbox.
2. **Answer surveys**: when an analyst publishes a survey for the expert's risk, the bot pushes it and walks the expert through it with buttons.

It also delivers the analyst dashboard's mass notifications to Telegram-linked experts.

## Decisions

| Topic | Decision |
|---|---|
| Architecture | Thin client. A separate bot process calls the existing expert API with each expert's bearer token, exactly like the extension. No direct SQLite access. |
| Transport | Long polling (`getUpdates`). No public HTTPS endpoint needed for the hackathon. |
| Survey delivery | Pushed when an analyst publishes. The bot checks each linked expert's `GET /experts/{id}/surveys/current` on a timer and messages each new `survey_id` once. |
| What is a tip | Any plain text or forwarded post becomes a draft tip; the bot asks "Send to ACAPS?" with Send / Cancel. |
| Outbound | Surveys and mass notifications go out on Telegram. Analyst replies to tips stay mocked for now. |
| Library | `python-telegram-bot` v21 (async, built-in `JobQueue` for the timers). |

## Expert flows

### 1. Joining

- Analysts share a deep link: `https://t.me/<BotUsername>?start=<invite_code>` (Telegram allows up to 64 chars of `A-Z a-z 0-9 _ -`, which fits our codes).
- Fallback: the expert opens the bot and types `/start`, then pastes their code.

Steps:

1. Bot calls `GET /invites/{code}` and shows: "You've been invited to follow **R1011: \<risk title\>**."
2. Short privacy note (see Privacy below), then anonymity choice as three buttons: *Known to ACAPS* / *Pseudonymous to peers* / *Fully anonymous*.
3. Bot calls `POST /experts` with `channel: "telegram"` and stores the returned token against the chat.
4. Confirmation, plus what to do next: "Send me anything you hear on the ground. I'll message you when ACAPS has new questions."
5. If a published survey is already waiting, offer it straight away.

Errors: unknown code (404) → "That code didn't work, check with your ACAPS contact." Used code (409) → same message plus "If you already joined on another device, use that one."

A chat links to one expert. `/start <code>` on an already linked chat asks whether to switch.

### 2. Sending a tip

Triggers: any non-command text message, or a forwarded message (text or caption).

1. Bot replies, quoting the start of the message: "Send this to ACAPS analysts on R1011?" [Send] [Cancel].
2. On Send: `POST /notes` with
   - `text`: the message. For a forward, prefix the source, e.g. `Forwarded from @channel_name (2026-11-06):`. Posts forwarded from a person say `Forwarded from a private chat`: the bot never names private senders.
   - `url`: for a forwarded post from a public channel, the `t.me/<channel>/<msg_id>` link (provenance); otherwise the first link in the message.
3. Bot edits the prompt to "Sent. Thank you." (no analyst reply is promised in v1).

Rules:
- Only one pending tip per chat. A new message while one is pending replaces it ("Updated, send this instead?").
- A pending tip expires after 30 minutes without being sent.
- Text over 5,000 characters (API limit): ask the expert to shorten it or split it.
- Photos, voice notes, files, locations: "I can only send text for now. Add a caption or describe it in words." A photo or video *with a caption* is treated as a text tip using the caption.
- `/tip` with no text replies with a one-line hint ("Just type it, or forward a post").

### 3. Answering a survey

**Push.** When a new survey appears for the expert:

> New questions from ACAPS on **R1011: \<title\>**, based on the update of 03/11/2026. 10 quick questions, about 2 minutes.
> [Start] [Later]

"Later" does nothing more; `/survey` brings it back.

**Questions.** One message, edited in place for each question so the chat stays clean:

> **3 of 10** · How likely is it that ... in the next 3 months?
> 1 = very unlikely · 5 = very likely
> [1] [2] [3] [4] [5]
> [Skip] [Back]

- Yes/no questions first ([Yes] [No] / [Skip] [Back]), then the 1-5 ratings, the same order as the extension.
- The scale wording comes from the question's `dimension` (likelihood, urgency, ...); fall back to "1 = low · 5 = high".
- After every tap, the bot saves a draft with `PUT .../responses` (`status: "draft"`, skipped = `null`), so nothing is lost if the expert stops halfway. The bot keeps the current position and answers in its own store, since the API doesn't return drafts.

**Finish.**

> Your answers: 1. Yes · \<question\> / 2. No · ... / 3. skipped · ... / 6. 4 · ...
> Anything to add? Type a comment, or tap Submit.
> [Submit] [Change an answer]

- A text message at this step becomes the survey's `comment`, not a tip.
- Submit sends `status: "submitted"` with all 10 questions (skips as `null`).
- "Change an answer" lists the questions as buttons, jumps to one, then back to the summary.

**Edge cases.**
- `409 Survey is outdated`: "ACAPS has published newer questions" and offer the new survey. The old draft is dropped.
- `409 Response was already submitted` (answered elsewhere, e.g. the extension): "You've already answered these. Thanks."
- `204` on `/survey`: "Nothing waiting right now. I'll message you when there is."

### 4. Mass notifications

When an analyst sends a notification from the dashboard to a risk (audience all / A / B), each matching Telegram-linked expert gets:

> **\<subject\>**
> \<body\>
> — ACAPS, R1011

The bot polls a new endpoint (below) and tracks the last notification it delivered per chat.

### 5. Commands

| Command | What it does |
|---|---|
| `/start [code]` | Join, or show status if already linked |
| `/survey` | Open the waiting survey, or say there is none |
| `/tip` | Hint on how to send a tip |
| `/settings` | Change anonymity level (`PATCH /experts/me`) |
| `/help` | What the bot does, privacy note, how to reach ACAPS |
| `/stop` | Unlink this chat: deletes the token and progress from the bot store. The expert record and past contributions stay in the backend. |

Register these with `setMyCommands` so they show in Telegram's menu.

## Privacy

- Telegram bot chats are **not end-to-end encrypted**; Telegram can read them. Say this plainly at join time and in `/help`, so experts in sensitive places can choose the extension instead.
- The bot store keeps only: `chat_id`, `expert_id`, token, survey progress, last delivered survey and notification. **No** Telegram username, display name or phone number, and none of that is sent to the backend.
- Never log message text or tip contents. Log only event types and IDs.
- Anonymity levels behave exactly as in the extension; the bot never shows other experts' identities.

## Backend changes needed

1. **`GET /experts/me/notifications?since=<iso datetime>`** (new, expert token). Returns notifications for the expert's risk whose audience is `all` or matches their `contributor_type`, oldest first. Add to `openapi.yaml`.
2. **Mass notification count**: unchanged. `recipient_count` keeps counting all experts on the risk; actual Telegram delivery is the bot's job.
3. **Invite links**: when `TELEGRAM_BOT_USERNAME` is set,
   - the `/join` landing page shows an "Open in Telegram" link next to the extension instructions;
   - the dashboard's *Invite ready* modal shows the Telegram deep link with a copy button.

No other API changes: registration, surveys, drafts and notes already cover what the bot needs.

## Bot internals

```
telegram/
  bot.py        # handlers, survey/tip flows, JobQueue timer
  client.py     # small async client for the expert API (httpx)
  store.py      # SQLite: chats, survey progress, pending tips
  Dockerfile
```

Bot store (its own SQLite file, separate from `groundtruth.db`):

| Table | Columns |
|---|---|
| `chats` | `chat_id` PK, `expert_id`, `token`, `risk_id`, `risk_title`, `last_survey_pushed`, `last_notification_at`, `created_at` |
| `survey_progress` | `chat_id` PK, `survey_id`, `survey` (JSON), `position`, `answers` (JSON), `comment`, `mode`, `revisiting`, `message_id`, `updated_at` |
| `pending_tips` | `chat_id` PK, `text`, `url`, `prompt_message_id`, `expires_at` |

Timers (`JobQueue`):
- Every `POLL_INTERVAL` (default 60 s): for each linked chat, check the current survey and new notifications. Fine for a 5–10 person panel per risk; group by risk if it grows.
- A `401` from the API means the token is no longer valid: unlink the chat and tell the expert to rejoin with a new code.

Config (`.env`):

| Variable | Notes |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_BOT_USERNAME` | Also read by the backend for invite links |
| `API_BASE_URL` | e.g. `http://api:8000` inside Docker Compose |
| `BOT_DB_PATH` | Defaults to `telegram/bot.db` |
| `POLL_INTERVAL` | Seconds, default 60 |

Add a `telegram` service to `docker/docker-compose.yml` with its own volume for `bot.db`.

## Demo script

1. Analyst creates an invite on the dashboard and copies the Telegram link.
2. Expert taps it, picks an anonymity level, is linked.
3. Expert forwards a post from a local news channel, taps Send. It appears in the dashboard Tips inbox with the channel link.
4. Analyst publishes the R1011 survey. Within a minute the expert's phone buzzes; they answer 10 questions with taps and submit.
5. Analyst sends a mass notification; it arrives in Telegram.

## Out of scope (v1)

- Analyst replies to tips over Telegram (still mocked).
- Photos, voice notes and files as tips.
- French and other languages (the API supports `language`; the bot copy is English only for now).
- Reminders for unanswered surveys.
- Webhook mode and multiple bot instances.
- WhatsApp (should reuse this flow design).

## Open questions

- **Tip routing**: experts follow one risk today, so tips go to that risk. If experts can follow several risks later, the bot will need to ask which one.
- **Token at rest**: the bot stores tokens in plain SQLite. Acceptable for the hackathon; encrypt or move to a secrets store before a pilot.
- **Quiet hours**: should pushes wait until local daytime? Needs the expert's time zone, which we don't collect.

## Running it

1. Create a bot with @BotFather and put its token and username in the repo's `.env`:

   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_BOT_USERNAME=acaps_expert_bot
   ```

2. With Docker: `docker compose -f docker/docker-compose.yml up -d --build` starts the API, dashboard and bot together.

3. Without Docker, with the API running on port 8000:

   ```bash
   pip install -r telegram/requirements.txt
   python telegram/bot.py
   ```

4. Create an invite in the dashboard (Add expert). The *Invite ready* pop-up shows the Telegram link; the backend's `/join?code=` page shows it too.
