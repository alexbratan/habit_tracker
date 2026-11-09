"""Thin async HTTP client for the Habit Tracker REST API.

This module knows nothing about MCP. It only handles:
  * reading config/credentials from environment variables,
  * logging in via POST /users/login to obtain a JWT,
  * attaching that JWT as a Bearer token on every request,
  * re-logging in once if the token expired (HTTP 401).
"""

import os

import httpx


class ApiError(Exception):
    """Raised when the backend returns an error we want to surface to the model."""


class HabitApiClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("HABIT_API_URL", "http://localhost:8000").rstrip("/")
        self._email = os.getenv("HABIT_EMAIL")
        self._password = os.getenv("HABIT_PASSWORD")
        self._token: str | None = None
        self._http = httpx.AsyncClient(base_url=self.base_url, timeout=10.0)

    async def _login(self) -> None:
        if not self._email or not self._password:
            raise ApiError(
                "HABIT_EMAIL and HABIT_PASSWORD must be set (see mcp_server/.env.example)."
            )
        # The backend uses FastAPI's OAuth2PasswordRequestForm, so login is a
        # *form* post (not JSON) and the email goes in the "username" field.
        resp = await self._http.post(
            "/users/login",
            data={"username": self._email, "password": self._password},
        )
        if resp.status_code != 200:
            raise ApiError(f"Login failed ({resp.status_code}): {resp.text}")
        self._token = resp.json()["access_token"]

    async def request(self, method: str, path: str, **kwargs) -> dict | list:
        """Send an authenticated request; log in lazily and retry once on 401."""
        if self._token is None:
            await self._login()

        for attempt in range(2):
            headers = {"Authorization": f"Bearer {self._token}"}
            try:
                resp = await self._http.request(method, path, headers=headers, **kwargs)
            except httpx.ConnectError:
                raise ApiError(f"Cannot reach the Habit Tracker API at {self.base_url}. Is the backend running?")

            if resp.status_code == 401 and attempt == 0:
                # JWTs from this backend expire after 60 minutes; get a fresh one.
                await self._login()
                continue
            if resp.status_code >= 400:
                raise ApiError(f"{method} {path} failed ({resp.status_code}): {resp.text}")
            return resp.json()

        raise ApiError("Authentication failed after re-login.")

    async def get(self, path: str, **kwargs):
        return await self.request("GET", path, **kwargs)

    async def patch(self, path: str, **kwargs):
        return await self.request("PATCH", path, **kwargs)
