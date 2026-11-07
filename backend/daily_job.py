# daily_job.py: prepare a survey for the hardcoded demo risk
#
#   python daily_job.py                 # generate a survey for R1011
#   python daily_job.py --force         # regenerate the R1011 survey, including if closed
import argparse
import logging
import sys

import db
from data import load_risks
from questions import generate_survey, survey_id_for

log = logging.getLogger("daily_job")

# The risk to generate a survey for while this script is being used as a demo.
RISK_ID = "R1011"

# Risks that already resolved: nothing left for experts to forecast or update
CLOSED_STATUSES = {"materialised", "not materialised"}


def run(force: bool = False) -> dict:
    stats = {"generated": 0, "skipped": 0, "closed": 0, "missing": 0, "failed": 0}
    log.info("using SQLite database: %s", db.DB_PATH)

    with db.connect() as conn:
        wanted = [RISK_ID]
        risks = {
            r["risk_id"]: r
            for r in load_risks(use_cache=False, risk_ids=wanted)
        }

        for risk_id in wanted:
            risk = risks.get(risk_id)
            if risk is None:
                log.warning("%s: not found in the ACAPS API, skipping", risk_id)
                stats["missing"] += 1
                continue

            if (
                not force
                and str(risk.get("status") or "").strip().lower() in CLOSED_STATUSES
            ):
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
    parser.add_argument(
        "--force",
        action="store_true",
        help="regenerate existing surveys, even for closed risks",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = run(args.force)
    log.info("done: %s", result)
    sys.exit(1 if result["failed"] else 0)
