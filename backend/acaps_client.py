import os
import json
import time
from pathlib import Path

import requests

BASE_URL = "https://api.acaps.org/api/v1"
CACHE_DIR = Path(".cache")
CACHE_DIR.mkdir(exist_ok=True)

MIN_INTERVAL = 1.1  # seconds between calls: stays under the 60 requests/minute throttle


class AcapsClient:
    def __init__(self, email: str, password: str):
        self._last_call = 0.0
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Token {self._get_token(email, password)}"

    @staticmethod
    def _get_token(email: str, password: str) -> str:
        r = requests.post(
            f"{BASE_URL}/token-auth/",
            data={"username": email, "password": password},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["token"]

    def _get(self, url: str, params: dict | None = None) -> dict:
        while True:
            wait = MIN_INTERVAL - (time.monotonic() - self._last_call)
            if wait > 0:
                time.sleep(wait)
            self._last_call = time.monotonic()
            r = self.session.get(url, params=params, timeout=60)
            if r.status_code == 429:  # throttled anyway: honour Retry-After
                time.sleep(int(r.headers.get("Retry-After", 10)))
                continue
            r.raise_for_status()
            return r.json()

    def _paginate(self, url: str, params: dict | None = None):
        while url:
            page = self._get(url, params)
            yield from page["results"]
            url, params = page["next"], None  # 'next' already contains the query string

    def risk_radar(self, **filters) -> list[dict]:
        return list(self._paginate(f"{BASE_URL}/risk-radar/risk-radar", filters))  # path: confirm in Swagger


def fetch_risks(use_cache: bool = True, **filters) -> list[dict]:
    key = "_".join(f"{k}-{v}" for k, v in sorted(filters.items())) or "all"
    cache_file = CACHE_DIR / f"risk_radar_{key}.json"
    if use_cache and cache_file.exists():
        return json.loads(cache_file.read_text())
    client = AcapsClient(os.environ["ACAPS_EMAIL"], os.environ["ACAPS_PASSWORD"])
    risks = client.risk_radar(**filters)
    cache_file.write_text(json.dumps(risks, indent=2))
    return risks


if __name__ == "__main__":
    risks = fetch_risks(use_cache=False, risk_id="R1011", ordering="-last_risk_update")
    print(f"Fetched {len(risks)} risk(s)")
