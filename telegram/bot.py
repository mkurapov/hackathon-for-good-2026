# bot.py: ACAPS expert bot for Telegram.
#
# Experts join with an invite code, send tips (any text or forwarded post, confirmed before
# sending) and answer the surveys analysts publish. A timer pushes new surveys and the
# dashboard's mass notifications. All data goes through the expert API, like the extension.
import html
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from telegram import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    LinkPreviewOptions,
    Message,
    MessageEntity,
    Update,
)
from telegram.constants import ParseMode
from telegram.error import BadRequest, Forbidden
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    Defaults,
    MessageHandler,
    filters,
)

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import store  # noqa: E402  (reads BOT_DB_PATH, so it comes after load_dotenv)
from client import ApiError, ExpertApi  # noqa: E402

log = logging.getLogger("telegram_bot")

API = ExpertApi(os.getenv("API_BASE_URL") or "http://localhost:8000")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL") or 60)
MAX_TIP_LENGTH = 5000
MAX_COMMENT_LENGTH = 2000
MAX_CODE_LENGTH = 50  # callback data is limited to 64 bytes and carries the code

ANONYMITY = [
    ("known_to_acaps", "k", "Known to ACAPS", "ACAPS analysts can see which contributions are yours."),
    ("pseudonymous_to_peers", "p", "Pseudonymous", "Other experts in your panel may see a pseudonym, never your name."),
    ("fully_anonymous", "a", "Fully anonymous", "Your contributions are shown without any name or pseudonym."),
]
ANON_BY_SHORT = {short: (level, label) for level, short, label, _ in ANONYMITY}
ANON_LABEL = {level: label for level, _, label, _ in ANONYMITY}

SCALE_LABELS = {  # same wording as the extension
    "likelihood": ("Very unlikely", "Very likely"),
    "urgency": ("Not urgent", "Very urgent"),
    "severity": ("Minor", "Severe"),
    "scale": ("Low", "High"),
    "other": ("Low", "High"),
}

PRIVACY = (
    "<i>Privacy: messages to Telegram bots are not end-to-end encrypted, so Telegram can read them. "
    "ACAPS never publishes who said what. If that is a concern where you are, use the ACAPS "
    "browser extension instead.</i>"
)
JOIN_HINT = "To join, open the invite link ACAPS sent you, or paste your invite code here."
GENERIC_ERROR = "I couldn't reach ACAPS just now. Please try again in a minute."
MISSING = object()


# ---------- small helpers ----------
def esc(value) -> str:
    return html.escape(str(value or ""), quote=False)


def risk_label(risk_id: str, title: str | None) -> str:
    return f"<b>{esc(risk_id)}</b>: {esc(title)}" if title else f"<b>{esc(risk_id)}</b>"


def keyboard(*rows) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton(label, callback_data=data) for label, data in row] for row in rows]
    )


def parse_time(value: str) -> datetime:
    """ISO timestamp, accepting a trailing Z (the API sends those; Python < 3.11 can't parse them)."""
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def shorten(text: str, limit: int) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


async def edit(bot, chat_id: int, message_id: int, text: str, markup=None) -> None:
    try:
        await bot.edit_message_text(text, chat_id=chat_id, message_id=message_id, reply_markup=markup)
    except BadRequest as exc:
        if "not modified" not in str(exc).lower():
            raise


async def retire(bot, chat_id: int, message_id: int | None) -> None:
    """Remove the buttons from an older bot message so stale taps can't happen."""
    if message_id is None:
        return
    try:
        await bot.edit_message_reply_markup(chat_id=chat_id, message_id=message_id, reply_markup=None)
    except BadRequest:
        pass


async def lost_access(bot, chat_id: int) -> None:
    store.unlink_chat(chat_id)
    log.info("token rejected, chat unlinked")
    try:
        await bot.send_message(
            chat_id,
            "Your ACAPS access for this chat has ended. Ask your ACAPS contact for a new invite code to rejoin.",
        )
    except Forbidden:
        pass


async def api_failed(bot, chat_id: int, exc: ApiError) -> None:
    """Common handling for API errors that the caller didn't handle itself."""
    if exc.status == 401:
        await lost_access(bot, chat_id)
        return
    log.warning("API error %s", exc.status)
    await bot.send_message(chat_id, GENERIC_ERROR)


# ---------- joining ----------
async def send_join_prompt(bot, chat_id: int, code: str) -> None:
    code = code.strip()
    if not code or len(code) > MAX_CODE_LENGTH or any(c.isspace() for c in code):
        await bot.send_message(chat_id, "That doesn't look like an invite code. " + JOIN_HINT)
        return
    try:
        invite = await API.preview_invite(code)
    except ApiError as exc:
        if exc.status == 404:
            await bot.send_message(chat_id, "That code didn't work. Check it with your ACAPS contact.")
        elif exc.status == 409:
            await bot.send_message(
                chat_id,
                "That code has already been used. If you already joined on another device, use that one, "
                "or ask your ACAPS contact for a new code.",
            )
        else:
            await api_failed(bot, chat_id, exc)
        return
    options = "\n".join(f"• <b>{label}</b>: {desc}" for _, _, label, desc in ANONYMITY)
    await bot.send_message(
        chat_id,
        f"You've been invited to follow {risk_label(invite['risk_id'], invite.get('risk_title'))}.\n\n"
        f"{PRIVACY}\n\n<b>How should ACAPS see your contributions?</b>\n{options}\n\n"
        "You can change this later with /settings.",
        reply_markup=keyboard(*[[(label, f"join:{short}:{code}")] for _, short, label, _ in ANONYMITY]),
    )


async def complete_join(bot, chat_id: int, message: Message, short: str, code: str) -> None:
    level, label = ANON_BY_SHORT[short]
    try:
        registered = await API.register(code, level)
        profile = await API.me(registered["token"])
    except ApiError as exc:
        if exc.status in (404, 409):
            await edit(bot, chat_id, message.message_id, "That code can no longer be used. Ask your ACAPS contact for a new one.")
        else:
            await api_failed(bot, chat_id, exc)
        return
    store.link_chat(chat_id, profile["expert_id"], registered["token"], profile["risk_id"], profile.get("risk_title"))
    log.info("chat linked")
    await edit(
        bot,
        chat_id,
        message.message_id,
        f"You're in. You're following {risk_label(profile['risk_id'], profile.get('risk_title'))} "
        f"as <b>{label}</b>.\n\n"
        "Send me anything you hear on the ground: type it, or forward a post from a channel. "
        "I'll check with you before anything goes to ACAPS.\n\n"
        "I'll message you when ACAPS has new questions for you.",
    )
    await check_for_survey(bot, store.get_chat(chat_id))


# ---------- surveys ----------
def survey_questions(survey: dict) -> list[dict]:
    """Yes/no questions first, then the 1-5 ratings, like the extension."""
    return [{**q, "kind": "binary"} for q in survey.get("binary", [])] + [
        {**q, "kind": "likert"} for q in survey.get("likert", [])
    ]


def format_answer(value) -> str:
    if value is MISSING or value is None:
        return "skipped"
    if value is True:
        return "Yes"
    if value is False:
        return "No"
    return str(value)


def parse_answer(raw: str):
    if raw in {"1", "2", "3", "4", "5"}:
        return int(raw)
    return {"y": True, "n": False, "s": None}[raw]


def render_question(progress: dict) -> tuple[str, InlineKeyboardMarkup]:
    questions = survey_questions(progress["survey"])
    pos = progress["position"]
    q = questions[pos]
    text = f"<b>{pos + 1} of {len(questions)}</b>\n\n{esc(q['text'])}"
    if q["kind"] == "likert":
        low, high = SCALE_LABELS.get(q.get("dimension") or "other", SCALE_LABELS["other"])
        text += f"\n\n<i>1 = {low} · 5 = {high}</i>"
        choices = [(str(v), f"sv:a:{pos}:{v}") for v in range(1, 6)]
    else:
        choices = [("Yes", f"sv:a:{pos}:y"), ("No", f"sv:a:{pos}:n")]
    previous = progress["answers"].get(q["id"], MISSING)
    if previous is not MISSING:
        text += f"\n\nYour answer: <b>{format_answer(previous)}</b>"
    nav = [("Skip", f"sv:a:{pos}:s")]
    if progress["revisiting"]:
        nav.append(("Back to summary", "sv:sum"))
    elif pos > 0:
        nav.append(("Back", "sv:back"))
    return text, keyboard(choices, nav)


def render_summary(progress: dict) -> tuple[str, InlineKeyboardMarkup]:
    lines = [
        f"{i + 1}. <b>{format_answer(progress['answers'].get(q['id'], MISSING))}</b> · {esc(shorten(q['text'], 60))}"
        for i, q in enumerate(survey_questions(progress["survey"]))
    ]
    text = "<b>Your answers</b>\n" + "\n".join(lines)
    if progress["comment"]:
        text += f"\n\n<b>Your comment</b>\n{esc(progress['comment'])}\n\nSend another message to replace it, or tap Submit."
    else:
        text += "\n\nAnything to add? Type a comment and send it, or tap Submit."
    return text, keyboard([("Submit", "sv:submit")], [("Change an answer", "sv:edit")])


def render_pick(progress: dict) -> tuple[str, InlineKeyboardMarkup]:
    questions = survey_questions(progress["survey"])
    lines = [f"{i + 1}. {esc(shorten(q['text'], 70))}" for i, q in enumerate(questions)]
    numbers = [(str(i + 1), f"sv:goto:{i}") for i in range(len(questions))]
    rows = [numbers[i : i + 5] for i in range(0, len(numbers), 5)]
    return "<b>Which answer do you want to change?</b>\n" + "\n".join(lines), keyboard(*rows, [("Back to summary", "sv:sum")])


def render_progress(progress: dict):
    return render_summary(progress) if progress["mode"] == "summary" else render_question(progress)


def response_payload(progress: dict, status: str) -> dict:
    answers = progress["answers"]
    questions = survey_questions(progress["survey"])
    if status == "draft":
        questions = [q for q in questions if q["id"] in answers]
    payload = {
        "status": status,
        "likert": [{"question_id": q["id"], "value": answers.get(q["id"])} for q in questions if q["kind"] == "likert"],
        "binary": [{"question_id": q["id"], "value": answers.get(q["id"])} for q in questions if q["kind"] == "binary"],
    }
    if progress["comment"]:
        payload["comment"] = progress["comment"]
    return payload


async def offer_survey(bot, chat: dict, survey: dict) -> None:
    count = len(survey_questions(survey))
    update = f", based on the ACAPS update of {esc(survey['based_on_update'])}" if survey.get("based_on_update") else ""
    await bot.send_message(
        chat["chat_id"],
        f"New questions from ACAPS on {risk_label(survey['risk_id'], survey.get('risk_title'))}{update}.\n\n"
        f"{count} quick questions, about {max(1, round(count * 0.2))} minutes. Tap a button to answer.",
        reply_markup=keyboard([("Start", f"sv:start:{survey['survey_id']}"), ("Later", "sv:later")]),
    )
    store.update_chat(chat["chat_id"], last_survey_pushed=survey["survey_id"])


async def check_for_survey(bot, chat: dict) -> None:
    """Offer the current survey once per survey_id, unless the expert is already answering it."""
    try:
        survey = await API.current_survey(chat["token"], chat["expert_id"])
    except ApiError as exc:
        if exc.status == 401:
            await lost_access(bot, chat["chat_id"])
            return
        raise
    if survey is None or survey["survey_id"] == chat["last_survey_pushed"]:
        return
    if survey.get("risk_title") and survey["risk_title"] != chat["risk_title"]:
        store.update_chat(chat["chat_id"], risk_title=survey["risk_title"])
    progress = store.get_progress(chat["chat_id"])
    if progress and progress["survey_id"] == survey["survey_id"]:
        store.update_chat(chat["chat_id"], last_survey_pushed=survey["survey_id"])
        return
    await offer_survey(bot, chat, survey)


async def open_survey(bot, chat: dict, message: Message | None = None) -> None:
    """Show the current survey, resuming saved progress. Edits `message` in place if given."""
    chat_id = chat["chat_id"]
    try:
        survey = await API.current_survey(chat["token"], chat["expert_id"])
    except ApiError as exc:
        await api_failed(bot, chat_id, exc)
        return
    if survey is None:
        store.clear_progress(chat_id)
        text = "Nothing waiting right now. I'll message you when ACAPS has new questions."
        if message:
            await edit(bot, chat_id, message.message_id, text)
        else:
            await bot.send_message(chat_id, text)
        return
    progress = store.get_progress(chat_id)
    if progress is None or progress["survey_id"] != survey["survey_id"]:
        progress = store.start_progress(chat_id, survey)
    elif progress["message_id"] and (message is None or progress["message_id"] != message.message_id):
        await retire(bot, chat_id, progress["message_id"])
    store.update_chat(chat_id, last_survey_pushed=survey["survey_id"])
    text, markup = render_progress(progress)
    if message:
        await edit(bot, chat_id, message.message_id, text, markup)
        store.save_progress(chat_id, message_id=message.message_id)
    else:
        sent = await bot.send_message(chat_id, text, reply_markup=markup)
        store.save_progress(chat_id, message_id=sent.message_id)


async def survey_conflict(bot, chat: dict, message_id: int, exc: ApiError) -> bool:
    """Handle a 404/409 from saving answers. Returns True if handled."""
    chat_id = chat["chat_id"]
    if exc.status == 409 and "already submitted" in exc.detail.lower():
        store.clear_progress(chat_id)
        await edit(bot, chat_id, message_id, "You've already answered these questions. Thank you.")
        return True
    if exc.status in (404, 409):
        store.clear_progress(chat_id)
        await edit(bot, chat_id, message_id, "ACAPS has published newer questions since you started.")
        store.update_chat(chat_id, last_survey_pushed=None)
        await check_for_survey(bot, store.get_chat(chat_id))
        return True
    return False


async def on_survey_callback(update: Update, context: ContextTypes.DEFAULT_TYPE, chat: dict, parts: list[str]) -> None:
    query = update.callback_query
    bot = context.bot
    chat_id = chat["chat_id"]
    message_id = query.message.message_id
    action = parts[1]

    if action == "start":
        await query.answer()
        await open_survey(bot, chat, query.message)
        return
    if action == "later":
        await query.answer()
        await edit(bot, chat_id, message_id, query.message.text_html + "\n\nNo problem. Send /survey whenever you're ready.")
        return

    progress = store.get_progress(chat_id)
    if progress is None or progress["message_id"] != message_id:
        await query.answer("These buttons are out of date. Send /survey to continue.")
        await retire(bot, chat_id, message_id)
        return
    questions = survey_questions(progress["survey"])

    if action == "a":
        pos, raw = int(parts[2]), parts[3]
        if progress["mode"] != "question" or pos != progress["position"]:
            await query.answer("That question has moved on.")
            return
        await query.answer()
        progress["answers"][questions[pos]["id"]] = parse_answer(raw)
        try:
            await API.save_response(chat["token"], chat["expert_id"], progress["survey_id"], response_payload(progress, "draft"))
        except ApiError as exc:
            if not await survey_conflict(bot, chat, message_id, exc):
                await api_failed(bot, chat_id, exc)
            return
        if progress["revisiting"] or pos + 1 >= len(questions):
            progress.update(mode="summary", revisiting=0)
        else:
            progress["position"] = pos + 1
        store.save_progress(chat_id, answers=progress["answers"], position=progress["position"], mode=progress["mode"], revisiting=progress["revisiting"])
    elif action == "back":
        await query.answer()
        progress["position"] = max(0, progress["position"] - 1)
        store.save_progress(chat_id, position=progress["position"])
    elif action == "edit":
        await query.answer()
        text, markup = render_pick(progress)
        await edit(bot, chat_id, message_id, text, markup)
        return
    elif action == "goto":
        await query.answer()
        progress.update(position=min(int(parts[2]), len(questions) - 1), mode="question", revisiting=1)
        store.save_progress(chat_id, position=progress["position"], mode="question", revisiting=1)
    elif action == "sum":
        await query.answer()
        progress.update(mode="summary", revisiting=0)
        store.save_progress(chat_id, mode="summary", revisiting=0)
    elif action == "submit":
        await query.answer()
        try:
            await API.save_response(chat["token"], chat["expert_id"], progress["survey_id"], response_payload(progress, "submitted"))
        except ApiError as exc:
            if not await survey_conflict(bot, chat, message_id, exc):
                await api_failed(bot, chat_id, exc)
            return
        store.clear_progress(chat_id)
        log.info("survey submitted")
        summary, _ = render_summary(progress)
        summary = summary.rsplit("\n\n", 1)[0]  # drop the "anything to add" prompt
        await edit(bot, chat_id, message_id, summary + "\n\n<b>Submitted.</b> Thank you, your answers are with the ACAPS analysts.")
        return
    else:
        await query.answer()
        return

    text, markup = render_progress(progress)
    await edit(bot, chat_id, message_id, text, markup)


async def set_survey_comment(bot, chat: dict, progress: dict, text: str) -> None:
    chat_id = chat["chat_id"]
    if len(text) > MAX_COMMENT_LENGTH:
        await bot.send_message(chat_id, f"Please keep your comment under {MAX_COMMENT_LENGTH} characters.")
        return
    progress["comment"] = text.strip()
    store.save_progress(chat_id, comment=progress["comment"])
    await retire(bot, chat_id, progress["message_id"])
    summary, markup = render_summary(progress)
    sent = await bot.send_message(chat_id, summary, reply_markup=markup)
    store.save_progress(chat_id, message_id=sent.message_id)


# ---------- tips ----------
def first_link(message: Message) -> str | None:
    entities = (
        message.parse_entities([MessageEntity.URL, MessageEntity.TEXT_LINK])
        if message.text
        else message.parse_caption_entities([MessageEntity.URL, MessageEntity.TEXT_LINK])
    )
    for entity, text in sorted(entities.items(), key=lambda item: item[0].offset):
        url = entity.url if entity.type == MessageEntity.TEXT_LINK else text
        if url and not url.lower().startswith(("http://", "https://")):
            url = "https://" + url
        if url:
            return url
    return None


def tip_from_message(message: Message) -> tuple[str, str | None]:
    """Tip text and link. Forwards keep their public source; private senders are never named."""
    text = message.text or message.caption or ""
    origin = message.forward_origin
    if origin is None:
        return text, first_link(message)
    when = origin.date.date().isoformat()
    source_chat = getattr(origin, "chat", None) or getattr(origin, "sender_chat", None)
    if source_chat is not None:
        name = f"@{source_chat.username}" if source_chat.username else (source_chat.title or "a channel")
        url = None
        if origin.type == "channel" and source_chat.username:
            url = f"https://t.me/{source_chat.username}/{origin.message_id}"
        return f"Forwarded from {name} ({when}):\n{text}", url or first_link(message)
    return f"Forwarded from a private chat ({when}):\n{text}", first_link(message)


async def prompt_tip(bot, chat: dict, message: Message) -> None:
    chat_id = chat["chat_id"]
    if not (message.text or message.caption):
        await message.reply_text("I can only send text for now. Add a caption, or describe it in words.")
        return
    text, url = tip_from_message(message)
    if len(text) > MAX_TIP_LENGTH:
        await message.reply_text(f"That's a bit long. Please shorten it to under {MAX_TIP_LENGTH} characters, or split it in two.")
        return
    previous = store.get_pending_tip(chat_id)
    intro = f"Send this to ACAPS analysts on {risk_label(chat['risk_id'], chat['risk_title'])}?"
    if previous and previous["prompt_message_id"]:
        await edit(bot, chat_id, previous["prompt_message_id"], "Replaced by your newer message.")
        intro = "Updated. " + intro
    sent = await message.reply_text(
        f"{intro}\n\n<blockquote>{esc(shorten(text, 300))}</blockquote>",
        reply_markup=keyboard([("Send", "tip:send"), ("Cancel", "tip:cancel")]),
    )
    store.set_pending_tip(chat_id, text, url, sent.message_id)


async def on_tip_callback(update: Update, context: ContextTypes.DEFAULT_TYPE, chat: dict, action: str) -> None:
    query = update.callback_query
    chat_id = chat["chat_id"]
    message_id = query.message.message_id
    await query.answer()
    tip = store.get_pending_tip(chat_id)
    if tip is None or tip["prompt_message_id"] != message_id:
        await edit(context.bot, chat_id, message_id, "This draft has expired. Send your message again if you still want to share it.")
        return
    if action == "cancel":
        store.clear_pending_tip(chat_id)
        await edit(context.bot, chat_id, message_id, "Not sent.")
        return
    try:
        await API.create_note(chat["token"], tip["text"], tip["url"])
    except ApiError as exc:
        if exc.status == 422:
            await edit(context.bot, chat_id, message_id, f"ACAPS couldn't accept this message ({esc(exc.detail)}). Please edit it and send it again.")
            store.clear_pending_tip(chat_id)
        else:
            await api_failed(context.bot, chat_id, exc)
        return
    store.clear_pending_tip(chat_id)
    log.info("tip sent")
    await edit(
        context.bot, chat_id, message_id,
        f"<b>Sent to ACAPS.</b> Thank you.\n\n<blockquote>{esc(shorten(tip['text'], 300))}</blockquote>",
    )


# ---------- commands ----------
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    code = context.args[0] if context.args else None
    chat = store.get_chat(chat_id)
    if chat and code:
        if len(code) > MAX_CODE_LENGTH:
            await update.effective_message.reply_text("That doesn't look like an invite code.")
            return
        await update.effective_message.reply_text(
            f"This chat is already linked to {risk_label(chat['risk_id'], chat['risk_title'])}. "
            "Switch to the new invite? Your current link will be removed.",
            reply_markup=keyboard([("Switch", f"switch:{code}"), ("Keep current", "switch:")]),
        )
    elif chat:
        await update.effective_message.reply_text(
            f"You're following {risk_label(chat['risk_id'], chat['risk_title'])}.\n\n"
            "Send me anything you hear on the ground, or forward a post. /survey shows any questions waiting for you."
        )
    elif code:
        await send_join_prompt(context.bot, chat_id, code)
    else:
        await update.effective_message.reply_text(
            "Hello. This is the ACAPS expert bot. It lets you share what you see on the ground with "
            f"ACAPS analysts and answer their short surveys.\n\n{JOIN_HINT}"
        )


async def cmd_survey(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat = store.get_chat(update.effective_chat.id)
    if chat is None:
        await update.effective_message.reply_text(JOIN_HINT)
        return
    await open_survey(context.bot, chat)


async def cmd_tip(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "Just type what you've heard or seen and send it, or forward a post from a channel. "
        "I'll ask you to confirm before it goes to ACAPS."
    )


async def cmd_settings(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat = store.get_chat(update.effective_chat.id)
    if chat is None:
        await update.effective_message.reply_text(JOIN_HINT)
        return
    try:
        profile = await API.me(chat["token"])
    except ApiError as exc:
        await api_failed(context.bot, chat["chat_id"], exc)
        return
    current = profile["anonymity_level"]
    options = "\n".join(f"• <b>{label}</b>: {desc}" for _, _, label, desc in ANONYMITY)
    await update.effective_message.reply_text(
        f"You're currently <b>{ANON_LABEL[current]}</b>.\n\n{options}",
        reply_markup=keyboard(*[[(label, f"anon:{short}")] for level, short, label, _ in ANONYMITY if level != current]),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "<b>What I do</b>\n"
        "• Send me anything you hear or see on the ground, or forward a post. I'll check with you before it goes to ACAPS.\n"
        "• When ACAPS publishes new questions on the risk you follow, I'll message you. Answer with a few taps.\n\n"
        "<b>Commands</b>\n"
        "/survey: questions waiting for you\n"
        "/settings: how ACAPS sees your contributions\n"
        "/stop: unlink this chat\n\n"
        f"{PRIVACY}"
    )


async def cmd_stop(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if store.get_chat(update.effective_chat.id) is None:
        await update.effective_message.reply_text("This chat isn't linked. " + JOIN_HINT)
        return
    await update.effective_message.reply_text(
        "Unlink this chat from ACAPS? Your past contributions stay with ACAPS. "
        "Personal invite codes only work once, so you'd need a new code to rejoin.",
        reply_markup=keyboard([("Unlink", "stop:yes"), ("Cancel", "stop:no")]),
    )


# ---------- dispatch ----------
async def on_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    chat_id = update.effective_chat.id
    parts = (query.data or "").split(":")
    kind = parts[0]
    message_id = query.message.message_id

    if kind == "join":
        await query.answer()
        if len(parts) < 3 or parts[1] not in ANON_BY_SHORT:
            return
        if store.get_chat(chat_id):
            await edit(context.bot, chat_id, message_id, "This chat is already linked. Use /start with the new link to switch.")
            return
        await complete_join(context.bot, chat_id, query.message, parts[1], ":".join(parts[2:]))
        return
    if kind == "switch":
        await query.answer()
        code = ":".join(parts[1:])
        if not code:
            await edit(context.bot, chat_id, message_id, "Kept your current link.")
            return
        store.unlink_chat(chat_id)
        await edit(context.bot, chat_id, message_id, "Previous link removed.")
        await send_join_prompt(context.bot, chat_id, code)
        return

    chat = store.get_chat(chat_id)
    if chat is None:
        await query.answer()
        await retire(context.bot, chat_id, message_id)
        await context.bot.send_message(chat_id, "This chat isn't linked. " + JOIN_HINT)
        return

    if kind == "sv":
        await on_survey_callback(update, context, chat, parts)
    elif kind == "tip":
        await on_tip_callback(update, context, chat, parts[1])
    elif kind == "anon":
        await query.answer()
        level, label = ANON_BY_SHORT[parts[1]]
        try:
            await API.update_me(chat["token"], anonymity_level=level)
        except ApiError as exc:
            await api_failed(context.bot, chat_id, exc)
            return
        await edit(context.bot, chat_id, message_id, f"Done. You're now <b>{label}</b>.")
    elif kind == "stop":
        await query.answer()
        if parts[1] == "yes":
            store.unlink_chat(chat_id)
            log.info("chat unlinked by expert")
            await edit(context.bot, chat_id, message_id, "This chat is unlinked. Thank you for your help. " + JOIN_HINT)
        else:
            await edit(context.bot, chat_id, message_id, "Still linked.")
    else:
        await query.answer()


async def on_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    chat = store.get_chat(update.effective_chat.id)
    if chat is None:
        if message.text and message.forward_origin is None:
            await send_join_prompt(context.bot, update.effective_chat.id, message.text)
        else:
            await message.reply_text(JOIN_HINT)
        return
    progress = store.get_progress(chat["chat_id"])
    if progress and progress["mode"] == "summary" and message.text and message.forward_origin is None:
        await set_survey_comment(context.bot, chat, progress, message.text)
        return
    await prompt_tip(context.bot, chat, message)


# ---------- timer: push surveys and notifications ----------
async def poll_chat(bot, chat: dict) -> None:
    await check_for_survey(bot, chat)
    chat = store.get_chat(chat["chat_id"])
    if chat is None:
        return
    try:
        notifications = await API.notifications(chat["token"], since=parse_time(chat["last_notification_at"]))
    except ApiError as exc:
        if exc.status == 401:
            await lost_access(bot, chat["chat_id"])
            return
        raise
    for n in notifications:
        await bot.send_message(
            chat["chat_id"], f"<b>{esc(n['subject'])}</b>\n{esc(n['body'])}\n\n— ACAPS, {esc(n['risk_id'])}"
        )
        store.update_chat(chat["chat_id"], last_notification_at=n["sent_at"])


async def poll(context: ContextTypes.DEFAULT_TYPE) -> None:
    for chat in store.all_chats():
        try:
            await poll_chat(context.bot, chat)
        except Forbidden:
            log.info("chat blocked the bot; skipping")
        except Exception as exc:  # one chat failing must not stop the others
            log.warning("poll failed for a chat: %s", type(exc).__name__)


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Log the error type only: tracebacks can include message text.
    log.error("handler error: %s", type(context.error).__name__)
    if isinstance(update, Update) and update.effective_chat:
        try:
            await context.bot.send_message(update.effective_chat.id, "Something went wrong. Please try again.")
        except Exception:
            pass


async def post_init(app: Application) -> None:
    await app.bot.set_my_commands([
        BotCommand("survey", "Questions waiting for you"),
        BotCommand("tip", "How to send a tip"),
        BotCommand("settings", "How ACAPS sees your contributions"),
        BotCommand("help", "What this bot does"),
        BotCommand("stop", "Unlink this chat"),
    ])


async def post_shutdown(app: Application) -> None:
    await API.close()


def build_app(token: str) -> Application:
    app = (
        Application.builder()
        .token(token)
        .defaults(Defaults(parse_mode=ParseMode.HTML, link_preview_options=LinkPreviewOptions(is_disabled=True)))
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    private = filters.ChatType.PRIVATE
    for name, handler in [
        ("start", cmd_start), ("survey", cmd_survey), ("tip", cmd_tip),
        ("settings", cmd_settings), ("help", cmd_help), ("stop", cmd_stop),
    ]:
        app.add_handler(CommandHandler(name, handler, filters=private))
    app.add_handler(CallbackQueryHandler(on_callback))
    app.add_handler(MessageHandler(private & ~filters.COMMAND, on_message))
    app.add_error_handler(on_error)
    app.job_queue.run_repeating(poll, interval=POLL_INTERVAL, first=5)
    return app


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)  # its request logs include the bot token
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        sys.exit("Set TELEGRAM_BOT_TOKEN (from @BotFather) in .env")
    build_app(token).run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    main()
