# daily_job.py: prepare surveys for every risk that a group tracks
#
#   python daily_job.py                 # all risks followed by a registered group
#   python daily_job.py --risk R1043    # specific risk(s), no group needed (handy for demos)
#   python daily_job.py --force         # regenerate even if a survey for the latest update exists
import argparse
import logging
import sys

import db
from data import load_risks
from questions import generate_survey, survey_id_for

log = logging.getLogger("daily_job")

# Risks that already resolved: nothing left for experts to forecast or update
CLOSED_STATUSES = {"materialised", "not materialised"}


def run(risk_ids: list[str] | None = None, force: bool = False) -> dict:
    stats = {"generated": 0, "skipped": 0, "closed": 0, "missing": 0, "failed": 0}

    with db.connect() as conn:
        wanted = sorted(set(risk_ids)) if risk_ids else db.tracked_risk_ids(conn)
        if not wanted:
            log.warning("No risks to process: register a group first or pass --risk")
            return stats

        # one fetch for everything; use_cache=False so the job always sees fresh ACAPS data
        risks = {r["risk_id"]: r for r in load_risks(use_cache=False)}

        for risk_id in wanted:
            risk = risks.get(risk_id)
            if risk is None:
                log.warning("%s: not found in API or CSV (or still under development), skipping", risk_id)
                stats["missing"] += 1
                continue

            if str(risk.get("status") or "").strip().lower() in CLOSED_STATUSES:
                log.info("%s: risk is %s, no new survey", risk_id, risk["status"])
                stats["closed"] += 1
                continue

            survey_id = survey_id_for(risk)  # cheap, no LLM call
            exists = db.survey_exists(conn, survey_id)

            if exists and not force:
                log.info("%s: survey %s already exists, skipping", risk_id, survey_id)
                stats["skipped"] += 1
                continue
            if exists and db.survey_has_responses(conn, survey_id):
                # question IDs (L1, B2...) would point at different text than experts answered
                log.warning("%s: %s already has expert responses, refusing to regenerate", risk_id, survey_id)
                stats["skipped"] += 1
                continue

            try:
                survey = generate_survey(risk)
            except Exception:  # one bad risk must not stop the others
                log.exception("%s: question generation failed", risk_id)
                stats["failed"] += 1
                continue

            db.save_survey(conn, survey, replace=exists)
            log.info("%s: saved survey %s", risk_id, survey.survey_id)
            stats["generated"] += 1

    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate expert surveys from the latest ACAPS risk updates")
    parser.add_argument("--risk", action="append", help="risk ID to process (repeatable); default: all tracked")
    parser.add_argument("--force", action="store_true", help="regenerate surveys that already exist")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = run(args.risk, args.force)
    log.info("done: %s", result)
    sys.exit(1 if result["failed"] else 0)
