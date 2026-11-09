# Habit Tracker MCP Server

A small [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants such as Claude Code read and update your habits in natural language, for example "mark my reading as done, 25 minutes".

It wraps the existing FastAPI backend: every tool calls the REST API over HTTP with a JWT, so it goes through the same auth and validation as the web app. It never touches MongoDB directly.

## How it works

```
Claude Code  --(JSON-RPC over stdio)-->  server.py (MCPServer)  --(HTTP + Bearer JWT)-->  FastAPI backend  -->  MongoDB
```

- **Transport: stdio.** The MCP client starts `server.py` as a subprocess and exchanges JSON-RPC messages over stdin/stdout (`initialize` → `tools/list` → `tools/call`). Because stdout carries the protocol, the server only logs to stderr.
- **Tools** are plain async Python functions decorated with `@mcp.tool()`. The SDK turns their type hints into a JSON input schema and their docstring into the description the model reads when it decides which tool to call.
- **Auth** (`api_client.py`): on the first call the server logs in with `POST /users/login` (an OAuth2 password form) using credentials from environment variables, caches the JWT, and sends it as `Authorization: Bearer …`. The backend's tokens expire after 60 minutes, so a `401` triggers one re-login and a retry.

Files:

| File | Purpose |
|---|---|
| `server.py` | MCP layer: the three tools, stdio entrypoint |
| `api_client.py` | HTTP + JWT auth, no MCP code |
| `smoke_test.py` | Acts as an MCP client: spawns the server over stdio and calls every tool |

## Tools

| Tool | Backend call | What it does |
|---|---|---|
| `list_habits` | `GET /habits` | Active habits and their default duration (read-only) |
| `get_week_plan(start_date?)` | `GET /week-view` | Mon–Sun plan: per-day habits, planned minutes, status (read-only) |
| `log_habit(habit_name, status="done", date?, actual_minutes?, note?)` | `GET /week-view` + `PATCH /overrides` | Marks a planned habit done/skipped/planned for a day. Resolves the habit name to the internal `weeklyPlanId`, so the model never handles IDs |

## Setup

Requires Python 3.10+ and the backend running (see `docs/README.md`).

```bash
cd mcp_server
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
# .venv/bin/pip install -r requirements.txt     # macOS/Linux
cp .env.example .env                             # then fill in your login
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `HABIT_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |
| `HABIT_EMAIL` | required | Email of your Habit Tracker account |
| `HABIT_PASSWORD` | required | Password of that account |

`.env` is gitignored. You can also pass these as real environment variables (see `-e` below) instead of using a file.

### Test it without an AI client

```bash
.venv/Scripts/python smoke_test.py
```

This prints the tool list and the result of each tool call. It logs a "Reading" entry for today, so run it against a test account.

## Connect to Claude Code

From the repository root (use `.venv/bin/python` on macOS/Linux):

```bash
claude mcp add habit-tracker --scope project -- "$PWD/mcp_server/.venv/Scripts/python.exe" "$PWD/mcp_server/server.py"
```

This writes a `.mcp.json` in the repo root (gitignored here, because it contains absolute paths). Equivalent hand-written file:

```json
{
  "mcpServers": {
    "habit-tracker": {
      "type": "stdio",
      "command": "/abs/path/mcp_server/.venv/Scripts/python.exe",
      "args": ["/abs/path/mcp_server/server.py"]
    }
  }
}
```

To keep credentials out of `.env`, add `-e HABIT_EMAIL=... -e HABIT_PASSWORD=...` to `claude mcp add` instead.

Start a new Claude Code session in the repo, approve the `habit-tracker` server when prompted, and check it with `/mcp`.

### Example prompts

- "What habits do I have?"
- "Show me my plan for this week. How many minutes are planned today?"
- "I did 25 minutes of reading today, log it with the note 'finished chapter 3'."
- "Skip the gym today."
- "Undo that, set the gym back to planned."
- "How did last week go? Use the week starting 2026-11-02."
