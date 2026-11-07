# client.py: async client for the backend's expert API (the same routes the extension uses)
from datetime import datetime
from urllib.parse import quote

import httpx


class ApiError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(f"{status}: {detail}")
        self.status = status
        self.detail = detail


class ExpertApi:
    def __init__(self, base_url: str, timeout: float = 15, transport: httpx.AsyncBaseTransport | None = None):
        self._http = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout, transport=transport)

    async def close(self) -> None:
        await self._http.aclose()

    async def _request(self, method: str, path: str, token: str | None = None, **kwargs):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        try:
            response = await self._http.request(method, path, headers=headers, **kwargs)
        except httpx.HTTPError as exc:
            raise ApiError(0, f"Cannot reach the API: {type(exc).__name__}") from exc
        if response.status_code == 204:
            return None
        data = response.json() if response.content else None
        if response.is_error:
            detail = data.get("detail") if isinstance(data, dict) else None
            if isinstance(detail, list):
                detail = detail[0].get("msg") if detail else None
            raise ApiError(response.status_code, str(detail or response.reason_phrase))
        return data

    # ---------- registration ----------
    async def preview_invite(self, code: str) -> dict:
        return await self._request("GET", f"/invites/{quote(code, safe='')}")

    async def register(self, code: str, anonymity_level: str) -> dict:
        return await self._request(
            "POST",
            "/experts",
            json={"invite_code": code, "anonymity_level": anonymity_level, "channel": "telegram"},
        )

    async def me(self, token: str) -> dict:
        return await self._request("GET", "/experts/me", token)

    async def update_me(self, token: str, **fields) -> dict:
        return await self._request("PATCH", "/experts/me", token, json=fields)

    # ---------- surveys ----------
    async def current_survey(self, token: str, expert_id: str) -> dict | None:
        return await self._request("GET", f"/experts/{expert_id}/surveys/current", token)

    async def save_response(self, token: str, expert_id: str, survey_id: str, payload: dict) -> dict:
        return await self._request(
            "PUT", f"/experts/{expert_id}/surveys/{survey_id}/responses", token, json=payload
        )

    # ---------- contributions ----------
    async def create_note(self, token: str, text: str, url: str | None = None) -> dict:
        body = {"text": text}
        if url:
            body["url"] = url
        return await self._request("POST", "/notes", token, json=body)

    async def notifications(self, token: str, since: datetime | None = None) -> list[dict]:
        params = {"since": since.isoformat()} if since else None
        return await self._request("GET", "/experts/me/notifications", token, params=params)
