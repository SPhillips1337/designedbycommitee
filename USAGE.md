# Usage Guide: DesignedByCommittee

## Prerequisites

- Node.js v18+
- npm
- At least one LLM provider configured (see below)
- `opencode` CLI installed if you want automated code execution (`USE_OPENCODE_CLI=true`)

## Installation

```bash
# 1. Frontend dependencies (project root)
npm install

# 2. Backend dependencies
cd server && npm install
```

## Environment Configuration

The `.env` file lives at the **project root** (not inside `server/`). Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

Key variables:

| Variable | Purpose |
|---|---|
| `ACTIVE_LLM_PROVIDER` | Default provider for synthesis/review (e.g. `openai`, `anthropic`, `gemini`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI provider. Note: reasoning models (o1, o3, o4-mini, gpt-5-*) do not support custom temperature — the platform handles this automatically. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Anthropic provider. Use a current model ID (e.g. `claude-sonnet-4-6`). |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini provider. |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | OpenRouter provider. |
| `LOCAL_LLM_API_BASE` / `LOCAL_LLM_MODEL` | LM Studio or any OpenAI-compatible local server. |
| `REMOTE_LLM_API_BASE` / `REMOTE_LLM_MODEL` | Remote Ollama or OpenAI-compatible endpoint. |
| `USE_OPENCODE_CLI` | Set `true` to enable the OpenCode CLI worker agent. |
| `USE_GEMINI_CLI` | Set `true` to enable the Gemini CLI agent. |

Providers are enabled dynamically: if the env var for a provider is present, its agent joins the committee automatically — no code changes needed.

## Running the Application

Open two terminal windows.

### Terminal 1 — Backend

```bash
cd server
node index.js
# Expected: "Server is running on port 4002"
```

### Terminal 2 — Frontend

```bash
npm run dev
# Expected: Vite local URL, typically http://localhost:5173
```

## Using the Platform

### Starting a Project

1. Open `http://localhost:5173` in your browser.
2. Click **New Project** and give it a name.
3. The committee immediately begins a 12-second kickoff discussion.

### Pipeline Phases

The project moves through four phases automatically:

| Phase | What happens |
|---|---|
| **Requirements** | Agents debate and synthesise requirement items every 5 messages. |
| **Tasks** | Each approved requirement is broken into technical tasks. |
| **Todos** | Tasks are broken into atomic, executable todo items. |
| **Execution** | OpenCode CLI picks up todos, executes them in the project directory, and a peer agent reviews the output. |

Each item requires:
- **AI approval** — ≥50% of active non-OpenCode agents must approve (via peer review).
- **Your sign-off** — click the tick next to each item in the dashboard.

Once every item in a phase is both AI-approved and signed off, the project auto-promotes to the next phase.

### Chat

Type in the committee feed to guide the debate. Your message is broadcast to all agents; each agent has a 60% chance of triggering an AI-to-AI follow-up response (depth-limited to 2 hops).

### Project Isolation

All generated files land in `server/projects/YYYYMMDD-HHMMSS-slug/`. The OpenCode agent is instructed to write only within this directory. Projects persist across server restarts via `server/projects/store.json`.

## Troubleshooting

**Temperature errors from OpenAI** — newer OpenAI models (gpt-5-*, o-series) only accept default temperature. The platform omits the temperature parameter automatically.

**Agent not appearing in committee** — check that the env var for that provider is set and the server has been restarted.

**OpenCode not executing todos** — ensure `USE_OPENCODE_CLI=true` is set and the `opencode` CLI is on your `$PATH`. Check the server log for `[LLM-OpenCode]` messages.

**MCP transport closed** — the Better-OpenCodeMCP bridge reconnects automatically on the next todo execution cycle.
