"""End-to-end test: real Firefox + the unpacked extension + the local API and test article.

Needs Firefox and: pip install selenium. Start the API and the test article first:

    cd backend && DB_PATH=/tmp/acaps-e2e.db python seed_demo.py --reset --publish
    DB_PATH=/tmp/acaps-e2e.db uvicorn api:app --port 8000
    python3 -m http.server 8766 --directory extension/dev

Then: DB_PATH=/tmp/acaps-e2e.db python extension/tests/e2e_firefox.py [--headed]
Run seed_demo.py --reset before each run: the test registers a new expert and submits the survey.
Screenshots go to a temporary folder printed at the end.
"""
import json
import os
import sqlite3
import sys
import tempfile
import time
import traceback

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

EXT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.environ["DB_PATH"]
OUT = tempfile.mkdtemp(prefix="acaps-e2e-")
FIREFOX = os.environ.get("FIREFOX_BIN", "/Applications/Firefox.app/Contents/MacOS/firefox")
ADDON_ID = "expert-extension@acaps-hackathon.org"
UUID = "0f6c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f"  # fixed, so the test can open moz-extension:// pages
BASE = f"moz-extension://{UUID}/"
HEADLESS = "--headed" not in sys.argv

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)


def db(query, *args):
    with sqlite3.connect(DB) as conn:
        conn.row_factory = sqlite3.Row
        return [dict(r) for r in conn.execute(query, args)]


opts = Options()
if HEADLESS:
    opts.add_argument("-headless")
opts.binary_location = FIREFOX
opts.set_preference("extensions.webextensions.uuids", json.dumps({ADDON_ID: UUID}))
opts.set_preference("ui.prefersReducedMotion", 0)  # automation turns it on, which skips the toast fade
d = webdriver.Firefox(options=opts, service=Service(service_args=["--allow-system-access"]))
d.set_window_size(1300, 900)
wait = WebDriverWait(d, 10)


def shot(name):
    d.save_screenshot(os.path.join(OUT, f"{name}.png"))


def new_tab(url):
    d.switch_to.new_window("tab")
    d.get(url)


def ext_call(script):
    """Run async JS with the extension's `browser` API, from an extension page."""
    return d.execute_async_script(
        "const done = arguments[arguments.length - 1];"
        f"(async () => {{ {script} }})().then(done, e => done({{error: String(e)}}));"
    )


try:
    d.install_addon(EXT, temporary=True)
    time.sleep(1.5)
    check("onboarding tab opens on install", any("onboarding" in (d.switch_to.window(h) or d.current_url) for h in d.window_handles))

    # The welcome tab opened on install has the code box prefilled.
    for h in d.window_handles:
        d.switch_to.window(h)
        if "onboarding.html" in d.current_url:
            box = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-code]")))
            wait.until(lambda _: box.get_attribute("value"))
            enabled = d.find_element(By.CSS_SELECTOR, "[data-activate]").is_enabled()
            check("activation code is prefilled", box.get_attribute("value") == "DEMO1" and enabled, box.get_attribute("value"))
            shot("0-prefilled")
            break

    # ---------- 1. Registration from the invite link ----------
    new_tab("http://localhost:8000/join?code=DEMO1")
    join_handle = d.current_window_handle
    def find_onboarding(drv):
        for h in drv.window_handles:
            drv.switch_to.window(h)
            if "onboarding.html?code=" in drv.current_url:
                return h
        return False
    onboarding = wait.until(find_onboarding)
    d.switch_to.window(onboarding)
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "h3"), "Confirm your invite"))
    check("invite link opens confirm screen", "Expert panel (demo)" in d.page_source)
    shot("1-confirm")
    d.find_element(By.CSS_SELECTOR, "[data-yes]").click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "h3"), "all set"))
    experts = db("SELECT * FROM experts")
    check("expert registered via API", len(experts) == 1 and experts[0]["anonymity_level"] == "known_to_acaps", experts[0]["anonymity_level"] if experts else "none")
    d.switch_to.window(join_handle)
    d.refresh()
    time.sleep(0.8)
    check("join page says already set up", "already set up" in d.page_source)

    # ---------- 2. Popup ----------
    new_tab(BASE + "src/popup/popup.html")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".card.invite")))
    card = d.find_element(By.CSS_SELECTOR, ".card.invite").text
    check("popup shows survey card", "0 of 10 answered" in card and "Venezuela" in card, card.replace("\n", " | "))
    badge = ext_call("return await browser.action.getBadgeText({});")
    check("toolbar badge shows 1", badge == "1", repr(badge))
    shot("2-popup")
    note = d.find_element(By.CSS_SELECTOR, "[data-note]")
    note.send_keys("Six new checkpoints on the Apure road this week.")
    d.find_element(By.CSS_SELECTOR, "[data-send]").click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".ext-body"), "Sent to ACAPS"))
    notes = db("SELECT * FROM notes")
    check("note stored", len(notes) == 1 and notes[0]["risk_id"] == "R1011", notes[0]["text"] if notes else "")
    d.find_element(By.CSS_SELECTOR, "[data-contact-open]").click()
    d.find_element(By.CSS_SELECTOR, "[data-contact-note]").send_keys("Displacement in Apure")
    d.find_element(By.CSS_SELECTOR, "[data-contact-send]").click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".ext-foot"), "Contact requested"))
    contacts = db("SELECT * FROM contact_requests")
    check("contact request stored", len(contacts) == 1 and contacts[0]["note"] == "Displacement in Apure")
    shot("2b-popup-after")

    # ---------- 3. Survey in the sidebar page ----------
    new_tab(BASE + "src/sidebar/sidebar.html")
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-survey]"))).click()
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".q-body")))
    count = lambda: d.find_element(By.CSS_SELECTOR, ".ext-foot span").text
    first_kind = d.find_element(By.CSS_SELECTOR, ".q-num span").text
    check("survey starts with a verification question", first_kind.upper() == "VERIFY" and count() == "1 of 10", f"{first_kind} {count()}")
    shot("3-survey-q1")

    d.find_element(By.CSS_SELECTOR, "[data-value=true]").click()  # Q1 Yes, auto-advance
    wait.until(lambda _: count() == "2 of 10")
    check("tapping Yes moves on", True)
    d.find_element(By.CSS_SELECTOR, "[data-comment]").send_keys("Supply trucks stopped twice this week.")
    d.find_element(By.CSS_SELECTOR, "[data-value=false]").click()  # Q2 No + comment: stays
    time.sleep(0.6)
    check("with a comment it waits for Next", count() == "2 of 10")
    d.find_element(By.CSS_SELECTOR, "[data-next]").click()
    wait.until(lambda _: count() == "3 of 10")
    d.find_element(By.CSS_SELECTOR, "[data-value=null]").click()  # Q3 don't know
    wait.until(lambda _: count() == "4 of 10")
    d.find_element(By.CSS_SELECTOR, "[data-next]").click()  # Q4 skip without answering
    wait.until(lambda _: count() == "5 of 10")
    check("Next works without an answer", True)
    d.find_element(By.CSS_SELECTOR, "#root").send_keys("y")  # Q5 keyboard
    wait.until(lambda _: count() == "6 of 10")
    check("keyboard Y answers and moves on", True)
    check("forecast questions follow", d.find_element(By.CSS_SELECTOR, ".q-num span").text.upper() == "FORECAST")
    shot("3b-survey-likert")
    for v in ("4", "2", "5", "3"):
        d.find_element(By.CSS_SELECTOR, f"[data-value='{v}']").click()
        time.sleep(0.5)
    check("reached the last question", count() == "10 of 10", count())
    d.find_element(By.CSS_SELECTOR, "[data-value='1']").click()
    time.sleep(0.6)
    check("last question does not auto-submit", count() == "10 of 10" and d.find_element(By.CSS_SELECTOR, "[data-next]").text == "Submit")
    d.find_element(By.CSS_SELECTOR, "[data-next]").click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".ext-body"), "Thank you"))
    resp = db("SELECT status, payload FROM responses")
    payload = json.loads(resp[0]["payload"]) if resp else {}
    b = {a["question_id"]: a for a in payload.get("binary", [])}
    l = {a["question_id"]: a["value"] for a in payload.get("likert", [])}
    check("survey submitted", resp and resp[0]["status"] == "submitted")
    check("binary answers stored", [b[f"B{i}"]["value"] for i in range(1, 6)] == [True, False, None, None, True], str([b[f"B{i}"]["value"] for i in range(1, 6)]))
    check("per-question comment stored", b["B2"]["comment"] == "Supply trucks stopped twice this week.")
    check("likert answers stored", [l[f"L{i}"] for i in range(1, 6)] == [4, 2, 5, 3, 1], str(l))
    shot("3c-survey-done")
    badge = ext_call("return await browser.action.getBadgeText({});")
    check("badge cleared after submit", badge == "", repr(badge))

    # ---------- 4. Article page ----------
    d.switch_to.window(d.window_handles[0])
    d.get("http://localhost:8766/article.html")
    toast = WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[src*='toast.html']")))
    time.sleep(0.3)
    check("toast appears on matched article", toast.size["height"] > 80, str(toast.size))
    d.switch_to.frame(toast)
    wait.until(lambda _: d.execute_script("return document.getElementById('root').classList.contains('shown')"))
    early = float(d.execute_script("return getComputedStyle(document.getElementById('root')).opacity"))
    time.sleep(1)
    late = float(d.execute_script("return getComputedStyle(document.getElementById('root')).opacity"))
    check("toast fades in", early < 1 and late == 1, f"{early:.2f} -> {late:.2f}")
    d.switch_to.default_content()
    shot("4-toast")
    d.switch_to.frame(toast)
    check("toast hides survey link once survey is done", not d.find_elements(By.CSS_SELECTOR, "[data-survey]"))
    d.find_element(By.CSS_SELECTOR, "[data-stance=agree]").click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".t-body"), "Thanks"))
    d.switch_to.default_content()
    quick = db("SELECT * FROM article_comments")
    check("quick Agree stored", len(quick) == 1 and quick[0]["stance"] == "agree" and quick[0]["url"].endswith("/article.html"))
    shot("4b-toast-thanks")

    # Select a passage and use the selection bar
    d.execute_script("""
      const p = document.querySelectorAll('article p')[3];
      const t = p.firstChild, s = t.textContent.indexOf('road checkpoints');
      const r = document.createRange(); r.setStart(t, s); r.setEnd(t, s + 'road checkpoints had multiplied'.length);
      getSelection().removeAllRanges(); getSelection().addRange(r);
      p.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));""")
    bar = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[src*='selbar.html']")))
    time.sleep(0.6)
    check("selection bar appears above the selection", bar.is_displayed() and bar.size["height"] > 30, str(bar.size))
    shot("4c-selbar")
    d.switch_to.frame(bar)
    d.find_element(By.CSS_SELECTOR, "[data-action=disagree]").click()
    d.switch_to.default_content()
    time.sleep(1)
    marks = d.find_elements(By.CSS_SELECTOR, "mark.acaps-hl.disagree")
    check("passage marked as Disagree", len(marks) == 1 and marks[0].text == "road checkpoints had multiplied", marks[0].text if marks else "")
    shot("4d-marked")

    # The sidebar is closed, so the click opens the in-page panel with the feedback view.
    panel = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "iframe[src*='panel.html']")))
    time.sleep(0.8)
    check("selection action opens the in-page panel", panel.size["width"] >= 300, str(panel.size))
    shot("4e-panel")
    d.switch_to.frame(panel)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".highlight")))
    tag = d.find_element(By.CSS_SELECTOR, ".highlight .stance-tag").text
    check("panel lists the highlight with its stance", tag == "Disagree", tag)
    d.find_element(By.CSS_SELECTOR, ".highlight textarea").send_keys("Six checkpoints on the Apure road.")
    d.find_element(By.CSS_SELECTOR, "[data-stance=disagree]").click()
    d.find_element(By.CSS_SELECTOR, "[data-comment]").send_keys("Access is worse in the south.")
    d.find_element(By.CSS_SELECTOR, "[data-send]").click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".ext-body"), "Sent to ACAPS"))
    shot("4f-panel-sent")
    d.find_element(By.CSS_SELECTOR, "[data-close]").click()
    d.switch_to.default_content()
    time.sleep(0.5)
    check("panel closes", not d.find_elements(By.CSS_SELECTOR, "iframe[src*='panel.html']"))
    rows = db("SELECT stance, quote, text FROM article_comments ORDER BY created_at")
    check("article feedback stored", len(rows) == 3, json.dumps(rows))
    check("highlight stored with quote, stance and comment",
          any(r["quote"] == "road checkpoints had multiplied" and r["stance"] == "disagree" and r["text"] == "Six checkpoints on the Apure road." for r in rows))
    check("overall stance and comment stored", any(r["quote"] is None and r["stance"] == "disagree" and r["text"] == "Access is worse in the south." for r in rows))

    # Comment on a passage: the panel opens with the cursor in that passage's comment box.
    d.execute_script("""
      const p = document.querySelectorAll('article p')[4];
      const t = p.firstChild, s = t.textContent.indexOf('US naval vessels');
      const r = document.createRange(); r.setStart(t, s); r.setEnd(t, s + 'US naval vessels'.length);
      getSelection().removeAllRanges(); getSelection().addRange(r);
      p.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));""")
    time.sleep(0.6)
    d.switch_to.frame(d.find_element(By.CSS_SELECTOR, "iframe[src*='selbar.html']"))
    d.find_element(By.CSS_SELECTOR, "[data-action=comment]").click()
    d.switch_to.default_content()
    panel = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "iframe[src*='panel.html']")))
    d.switch_to.frame(panel)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".highlight")))
    try:
        focused = WebDriverWait(d, 3).until(lambda drv: drv.execute_script("return document.activeElement.matches('.highlight textarea')"))
    except Exception:
        focused = False
    check("Comment puts the cursor in the passage's comment box", focused)
    d.switch_to.default_content()
    check("comment passage marked without stance", len(d.find_elements(By.CSS_SELECTOR, "mark.acaps-hl:not(.agree):not(.disagree)")) == 1)

    # ---------- 5. Settings ----------
    d.get(BASE + "src/sidebar/sidebar.html")
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-settings]"))).click()
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[value=fully_anonymous]"))).click()
    wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".ext-body"), "Saved."))
    check("anonymity level updated", db("SELECT anonymity_level FROM experts")[0]["anonymity_level"] == "fully_anonymous")
    shot("5-settings")

except Exception:
    traceback.print_exc()
    try:
        shot("error")
    except Exception:
        pass
finally:
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed. Screenshots: {OUT}")
    d.quit()
    sys.exit(1 if failed else 0)
