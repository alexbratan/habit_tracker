"""MCP server exposing the Habit Tracker API as tools for AI assistants.

Transport: stdio. The MCP client (e.g. Claude Code) starts this file as a
subprocess and speaks JSON-RPC over stdin/stdout:
    initialize -> tools/list -> tools/call ...
Because stdout carries the protocol, never print() here; log to stderr.
"""

import logging
from datetime import date as date_cls
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

# Load mcp_server/.env regardless of the working directory the client uses.
load_dotenv(Path(__file__).parent / ".env")

from api_client import ApiError, HabitApiClient  # noqa: E402  (needs env loaded first)

mcp = MCPServer(
    "habit-tracker",
    instructions=(
        "Tools for the user's personal Habit Tracker. Dates are YYYY-MM-DD. "
        "Use get_week_plan to see what is planned before logging progress."
    ),
)
api = HabitApiClient()
logging.getLogger("httpx").setLevel(logging.WARNING)  # don't log every HTTP request

READ_ONLY = ToolAnnotations(readOnlyHint=True, openWorldHint=False)


@mcp.tool(annotations=READ_ONLY)
async def list_habits() -> list[dict]:
    """List the user's active habits with their default duration in minutes."""
    try:
        habits = await api.get("/habits")
    except ApiError as e:
        raise ToolError(str(e))
    return [
        {"id": h["id"], "name": h["name"], "default_duration_min": h.get("default_duration")}
        for h in habits
    ]


@mcp.tool(annotations=READ_ONLY)
async def get_week_plan(start_date: str | None = None) -> dict:
    """Get the Mon-Sun plan for a week: each day's habits, planned minutes and status
    (planned / done / skipped).

    Args:
        start_date: Any date (YYYY-MM-DD) inside the wanted week. Defaults to the current week.
    """
    params = {"start": start_date} if start_date else {}
    try:
        week = await api.get("/week-view", params=params)
    except ApiError as e:
        raise ToolError(str(e))

    # Return a compact view: the model doesn't need internal IDs or bookkeeping fields.
    return {
        "week_start": week["start"],
        "days": [
            {
                "date": d["date"],
                "planned_minutes": d["totalPlannedMinutes"],
                "counts": d["counts"],
                "items": [
                    {
                        "habit": i["habitName"],
                        "planned_min": i["plannedDuration"],
                        "status": i["status"],
                        "actual_min": i["actualDuration"],
                        "note": i["note"],
                    }
                    for i in d["items"]
                ],
            }
            for d in week["days"]
        ],
    }


@mcp.tool()
async def log_habit(
    habit_name: str,
    status: Literal["done", "skipped", "planned"] = "done",
    date: str | None = None,
    actual_minutes: int | None = None,
    note: str | None = None,
) -> dict:
    """Log progress for a habit that is planned on a given day: mark it done or skipped
    (or reset it to planned), optionally with the actual minutes spent and a note.

    Args:
        habit_name: Name of the habit (case-insensitive), as shown by get_week_plan.
        status: "done", "skipped", or "planned" to undo.
        date: Day to log (YYYY-MM-DD). Defaults to today.
        actual_minutes: Minutes actually spent (only meaningful when done).
        note: Optional short note.
    """
    day = date or date_cls.today().isoformat()

    try:
        # The backend logs progress per *weekly plan item* (weeklyPlanId) + date,
        # so first resolve the habit name to the plan item scheduled that day.
        week = await api.get("/week-view", params={"start": day})
        day_view = next((d for d in week["days"] if d["date"] == day), None)
        items = day_view["items"] if day_view else []
        match = next((i for i in items if i["habitName"].lower() == habit_name.lower()), None)
        if match is None:
            planned = ", ".join(i["habitName"] for i in items) or "nothing"
            raise ToolError(f"'{habit_name}' is not planned on {day}. Planned that day: {planned}.")

        payload = {"date": day, "weeklyPlanId": match["weeklyPlanId"], "status": status}
        if actual_minutes is not None:
            payload["actualDuration"] = actual_minutes
        if note is not None:
            payload["note"] = note

        result = await api.patch("/overrides", json=payload)
    except ApiError as e:
        raise ToolError(str(e))

    return {
        "habit": match["habitName"],
        "date": result["date"],
        "status": result["status"],
        "planned_min": result["plannedDuration"] or match["plannedDuration"],
        "actual_min": result["actualDuration"],
        "note": result["note"],
    }


if __name__ == "__main__":
    mcp.run()  # defaults to the stdio transport
