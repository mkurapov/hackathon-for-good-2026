# data.py: load risks from the ACAPS API, with an optional challenge-CSV fallback
import csv
import os
from pathlib import Path

from acaps_client import fetch_risks

# Optional Risk Radar export fallback. Put it next to this file or set CSV_PATH.
CSV_PATH = Path(os.getenv("CSV_PATH") or Path(__file__).resolve().parent / "risk-radar-export.csv")

# CSV column -> API field name (only what the rest of the backend reads)
CSV_TO_API = {
    "Risk ID": "risk_id",
    "Risk Title": "risk_title",
    "Country": "country",
    "ISO": "iso3",
    "Probability": "probability",
    "Impact": "impact",
    "Risk Level": "risk_level",
    "Risk trend": "risk_trend",
    "Status": "status",
    "Rationale": "rationale",
    "Rationale update": "rationale_updates",
}


def load_csv(path: Path = CSV_PATH) -> list[dict]:
    """Read the export in the same record shape as the API."""
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    risks = []
    for row in rows:
        rec = {api: (row.get(col) or None) for col, api in CSV_TO_API.items()}
        # risks with no status are drafts (the API calls these "Under development")
        rec["under_development"] = None if rec["status"] else "Under development"
        risks.append(rec)
    return risks


def load_risks(
    csv_path: Path = CSV_PATH,
    use_cache: bool = True,
    include_csv: bool = False,
    risk_ids: list[str] | None = None,
) -> list[dict]:
    """Load API risks, optionally querying specific IDs and including CSV-only records.

    CSV fallback is opt-in. If the API fails without an available fallback, its error
    propagates instead of being hidden by a missing-file error. When risk IDs are
    provided, query each ID directly rather than relying on the unfiltered listing.
    """
    try:
        if risk_ids is None:
            api_risks = fetch_risks(use_cache=use_cache)
        else:
            api_risks = [
                risk
                for risk_id in sorted(set(risk_ids))
                for risk in fetch_risks(use_cache=use_cache, risk_id=risk_id)
            ]
    except Exception as e:  # no network, bad credentials, rate limit...
        if not include_csv or not csv_path.is_file():
            raise
        print(f"API unavailable ({e}); using CSV only")
        api_risks = []

    csv_only = []
    if include_csv and csv_path.is_file():
        api_ids = {r["risk_id"] for r in api_risks}
        csv_only = [r for r in load_csv(csv_path) if r["risk_id"] not in api_ids]
    risks = api_risks + csv_only
    if risk_ids is None:
        risks = [risk for risk in risks if not risk.get("under_development")]
    return risks


def get_risk(risk_id: str, **kwargs) -> dict:
    return next(r for r in load_risks(risk_ids=[risk_id], **kwargs) if r["risk_id"] == risk_id)


if __name__ == "__main__":
    risks = load_risks(use_cache=False, risk_ids=["R1011"])
    print(f"{len(risks)} risks loaded")
    r1011 = next((r for r in risks if r["risk_id"] == "R1011"), None)
    print("R1011:", "found" if r1011 else "NOT found", "|", (r1011 or {}).get("risk_title"))
