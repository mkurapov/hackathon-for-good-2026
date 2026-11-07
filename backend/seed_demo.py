# seed_demo.py: create a demo group and survey so the extension can be tried without the LLM
# or ACAPS credentials. Safe to run more than once.
#
# Uses the same risk as daily_job.py (R1011) and the survey ID the daily job computes for its
# newest update, so the daily job sees this survey as already generated. `daily_job.py --force`
# replaces these hand-written questions with LLM ones, as long as no expert has answered yet.
#
#   python seed_demo.py            -> prints the invite code and invite link
#   python seed_demo.py --reset    -> deletes the demo group's experts and answers first
#   python seed_demo.py --draft    -> leaves the survey as a draft, to publish from the analyst dashboard
import argparse
from datetime import datetime, timezone

import db
from daily_job import RISK_ID
from questions import BinaryQuestion, LikertQuestion, Survey, make_survey_id

GROUP_ID = "grp_demo_venezuela"
INVITE_CODE = "DEMO-VEN-2026"
# Copied from the ACAPS API for R1011, so this works offline. Running the daily job overwrites
# the risk details with live data.
RISK_TITLE = "US military build-up in the Caribbean triggers internal destabilisation in Venezuela and heightens humanitarian needs"
RISK_LEVEL = "Medium"
RISK_TREND = "Improved"
BASED_ON_UPDATE = "01/04/2026"  # date of R1011's newest update
SUMMARY = (
    "Four months after the capture of Nicolás Maduro and the transfer of government to Delcy Rodríguez, "
    "the overall risk environment in Venezuela remains stable, with tentative signs of short-term improvement."
)

LIKERT = [
    ("likelihood", "How likely is it that military units in Venezuela turn against the new cabinet in the next three months?"),
    ("urgency", "How urgent is the lack of food and healthcare for rural communities in high-risk areas of Venezuela, compared to early 2026?"),
    ("likelihood", "How likely is it that recently released opposition leaders in Venezuela are still under surveillance or pressure?"),
    ("scale", "How strong is local resistance to the new policies in Venezuela's border regions?"),
    ("likelihood", "How likely is it that state services collapse in parts of Venezuela in the next quarter because of armed group activity?"),
]
BINARY = [
    "Is there organised resistance from former Chavista loyalists against the new cabinet where you are?",
    "Are rural food supply chains in Venezuela working well enough to prevent a rise in acute malnutrition?",
    "Are released opposition leaders in Venezuela able to operate freely, without house arrest or monitoring?",
    "Are displaced people in high-risk areas of Venezuela returning home voluntarily, without pressure from the authorities?",
    "Has the US naval presence off Venezuela's coast made it harder to deliver humanitarian aid?",
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="remove demo experts and their answers first")
    parser.add_argument("--draft", action="store_true", help="do not publish the survey (publish it from the dashboard)")
    args = parser.parse_args()

    survey = Survey(
        survey_id=make_survey_id(RISK_ID, BASED_ON_UPDATE),
        risk_id=RISK_ID,
        risk_title=RISK_TITLE,
        based_on_update=BASED_ON_UPDATE,
        generated_at=datetime.now(timezone.utc),
        likert=[LikertQuestion(id=f"L{i}", text=t, dimension=d) for i, (d, t) in enumerate(LIKERT, 1)],
        binary=[BinaryQuestion(id=f"B{i}", text=t) for i, t in enumerate(BINARY, 1)],
    )

    with db.connect() as conn:
        if args.reset:
            experts = [r["expert_id"] for r in conn.execute("SELECT expert_id FROM experts WHERE group_id = ?", (GROUP_ID,))]
            for table in ("responses", "notes", "article_comments", "contact_requests"):
                conn.executemany(f"DELETE FROM {table} WHERE expert_id = ?", [(e,) for e in experts])
            conn.execute("UPDATE invites SET expert_id = NULL WHERE group_id = ?", (GROUP_ID,))
            conn.execute("DELETE FROM experts WHERE group_id = ?", (GROUP_ID,))
            conn.commit()
        if conn.execute("SELECT 1 FROM groups WHERE group_id = ?", (GROUP_ID,)).fetchone() is None:
            db.add_group(conn, GROUP_ID, "Venezuela expert panel (demo)", RISK_ID, INVITE_CODE, "VEN")
        else:  # databases seeded before the demo used R1011 point the group at the old risk
            conn.execute("UPDATE groups SET risk_id = ? WHERE group_id = ?", (RISK_ID, GROUP_ID))
            conn.execute("UPDATE invites SET risk_id = ? WHERE group_id = ?", (RISK_ID, GROUP_ID))
        # keep live details from the daily job if it already ran
        if conn.execute("SELECT 1 FROM risks WHERE risk_id = ?", (RISK_ID,)).fetchone() is None:
            db.upsert_risk(conn, RISK_ID, RISK_TITLE, ["Venezuela"], RISK_LEVEL, RISK_TREND, SUMMARY)
        if not db.survey_exists(conn, survey.survey_id):
            db.save_survey(conn, survey)
        status = "draft" if args.draft else "published"
        conn.execute(
            """UPDATE surveys SET status = ?, published_at = CASE WHEN ? = 'published' THEN ? END
               WHERE survey_id = ?""",
            (status, status, datetime.now(timezone.utc).isoformat(), survey.survey_id),
        )
        conn.commit()

    print(f"Survey {survey.survey_id}: {status}")
    print(f"Invite code: {INVITE_CODE}")
    print(f"Invite link: http://localhost:8000/join?code={INVITE_CODE}")


if __name__ == "__main__":
    main()
