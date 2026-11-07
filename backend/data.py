# data.py: one place to load risks, whether they come from the ACAPS API or the challenge CSV
import csv
import os
from pathlib import Path

from acaps_client import fetch_risks

# The Risk Radar export from the challenge repo. Put it next to this file or set CSV_PATH.
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


def load_risks(csv_path: Path = CSV_PATH, use_cache: bool = True) -> list[dict]:
    """API records first; CSV records fill in risks the API doesn't serve (e.g. R1043).
    Drafts (under development) are left out."""
    try:
        api = fetch_risks(use_cache=use_cache)
    except Exception as e:  # no network, bad credentials, rate limit...
        print(f"API unavailable ({e}); using CSV only")
        api = []

    api_ids = {r["risk_id"] for r in api}
    csv_only = [r for r in load_csv(csv_path) if r["risk_id"] not in api_ids]
    return [r for r in api + csv_only if not r.get("under_development")]


def get_risk(risk_id: str, **kwargs) -> dict:
    return next(r for r in load_risks(**kwargs) if r["risk_id"] == risk_id)


if __name__ == "__main__":
    risks = load_risks(use_cache=False)
    print(f"{len(risks)} risks loaded")
    r1011 = next((r for r in risks if r["risk_id"] == "R1011"), None)
    print("R1011:", "found" if r1011 else "NOT found", "|", (r1011 or {}).get("risk_title"))
