"""End-to-end smoke test: acts as an MCP client, spawns server.py over stdio,
and calls every tool against the running backend.

Usage (backend must be running, .env filled in):
    .venv/Scripts/python smoke_test.py      (Windows)
    .venv/bin/python smoke_test.py          (macOS/Linux)
"""

import asyncio
import sys
from pathlib import Path

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

SERVER = Path(__file__).parent / "server.py"


def show(label, result):
    status = "ERROR" if result.is_error else "ok"
    text = result.content[0].text if result.content else ""
    print(f"\n[{status}] {label}\n{text[:600]}")


async def main() -> None:
    params = StdioServerParameters(command=sys.executable, args=[str(SERVER)])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()  # JSON-RPC handshake: capabilities exchange

            tools = await session.list_tools()
            print("tools:", [t.name for t in tools.tools])

            show("list_habits", await session.call_tool("list_habits", {}))
            show("get_week_plan", await session.call_tool("get_week_plan", {}))
            show(
                "log_habit Reading done",
                await session.call_tool(
                    "log_habit", {"habit_name": "reading", "actual_minutes": 25, "note": "smoke test"}
                ),
            )
            show("log_habit unknown habit (expect error)",
                 await session.call_tool("log_habit", {"habit_name": "Juggling"}))


if __name__ == "__main__":
    asyncio.run(main())
