# DesignedByCommittee

**DesignedByCommittee** is a real-time, multi-agent development platform where a swarm of AI models collaborates to build software. It moves beyond simple chat by providing a structured project pipeline from brainstorm to execution: **Requirements → Tasks → Todos → Execution**.

## Key Features

### Collaborative Committee Debate
- Models reply to each other, not just to you — watch agents debate architecture, critique proposals, and build consensus.
- Context window: last 10 messages shared across all agents.
- AI-to-AI turns fire at 60% probability to prevent infinite loops.

### Structured Project Pipeline
- **Requirements** → **Tasks** → **Todos**: each phase gate-kept by AI peer review (≥50% approval) and your manual sign-off.
- Synthesis fires automatically every 5 messages and self-propagates until a phase is complete.
- Auto-promotion triggers once every item in a phase is both AI-approved and human-signed-off.

### Automated Local Execution
- OpenCode CLI picks up approved Todo items, locks them, and executes them inside the project's isolated directory (`server/projects/YYYYMMDD-HHMMSS-slug/`).
- A non-OpenCode agent auto-reviews each completed todo and posts feedback to the feed.

### Flexible LLM Stack
Providers are enabled by which env vars are present — no code changes needed to switch:

| Provider | Env var required |
|---|---|
| LM Studio (local) | `LOCAL_LLM_API_BASE` |
| Ollama (remote) | `REMOTE_LLM_API_BASE` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| Anthropic Claude | `ANTHROPIC_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Gemini CLI | `USE_GEMINI_CLI=true` |
| OpenCode CLI | `USE_OPENCODE_CLI=true` |

## Architecture

- **Frontend**: React + Vite (`src/App.jsx`) with a "Luminous Obsidian" glassmorphism design system.
- **Backend**: Node.js/Express + `ws` WebSocket server (`server/index.js`) on port 4002.
- **Orchestrator**: `ManagerAgent` (`server/agent-stack/manager.js`) runs debate, synthesis, peer review, todo execution, and auto-promotion concurrently.
- **LLM bridge**: `server/agent-stack/llm.js` — single `callLLM()` entry point routing to any provider.
- **Project store**: `server/memory/projectStore.js` — persists all project state to `server/projects/store.json`.
- **MCP bridge**: `server/tools/Better-OpenCodeMCP` — exposes `opencode`, `opencode_sessions`, `opencode_respond` MCP tools used by `callOpenCodeMCP()`.

## Getting Started

### One-line install (Ubuntu / WSL2)

```bash
curl -fsSL https://raw.githubusercontent.com/SPhillips1337/designedbycommitee/main/install.sh | bash
```

The installer will:
- Check/install Node.js 18+ via nvm
- Clone the repo to a directory of your choice
- Clone and build the Better-OpenCodeMCP tool
- Install all dependencies
- Walk you through configuring your LLM providers interactively
- Generate a `start.sh` convenience launcher

### Manual setup

1. Clone the repo and enter it.
2. Copy `.env.example` to `.env` in the project root and add your API keys.
3. Install dependencies: `npm install` then `cd server && npm install`.
4. Build the MCP bridge: `cd server/tools/Better-OpenCodeMCP && npm install && npm run build`
5. Start the backend: `node server/index.js`
6. Start the frontend: `npm run dev` (from project root)

Or use the generated launcher after running the installer: `./start.sh`

## License
MIT
