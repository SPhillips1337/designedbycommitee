# DesignedByCommittee: Multi-Model Swarm for Development

**DesignedByCommittee** is a real-time, multi-agent development platform where a swarm of AI models collaborate to build software. It moves beyond simple chat by providing a structured project pipeline from brainstorm to execution.

![DesignedByCommittee Interface](./screenshots/dashboard_preview.png)

## 🚀 Key Features

### 1. Collaborative Committee Debate
- **Inter-Agent Chat**: Models don't just reply to you; they reply to each other. Watch the "AI Architect" debate with "OpenCode" and "Remote Models" about your project's architecture.
- **Context Awareness**: Agents maintain a shared memory of the last 10 messages, allowing for nuanced, multi-turn discussions.
- **Turn-Based Orchestration**: A background manager coordinates the debate to ensure high-quality output without infinite loops.

### 2. Structured Project Pipeline
- **Requirements**: Brainstorm and document what you want to build.
- **Tasks**: Break down high-level requirements into technical implementation steps.
- **Todo**: Executable tasks ready for an agent to pick up.
- **Human Sign-Off**: Every item in every phase requires a manual "tick" from you. You maintain ultimate control over the promotion of the project from one phase to the next.

### 3. Automated Local Execution
- **Task Locking**: When a project reaches the "Todo" phase, models (like **OpenCode CLI**) proactively "lock" items to begin working.
- **Isolated Projects**: Code is generated into dedicated directories under `server/projects/YYYYMMDD-HHMMSS-name/`.
- **Peer Review**: Upon task completion, the system automatically triggers a different model to review the code and provide feedback in the main feed.

## 🛠️ Architecture

- **Frontend**: React + Vite with a custom "Luminous Obsidian" glassmorphism design system.
- **Backend**: Node.js WebSocket server orchestrating agents and maintaining project state.
- **MCP Integration**: Uses the **Better-OpenCodeMCP** project to bridge LLMs with the local filesystem and CLI tools asynchronously.
- **Flexible LLM Stack**: Supports local models (Ollama/LM Studio), cloud APIs (Gemini, Anthropic, OpenAI, OpenRouter), and CLI-based models.

## 🏁 Getting Started

1. **Configure Environment**: Copy `.env.example` to `.env` and add your API keys/provider bases.
2. **Setup Tools**: Ensure the `opencode` CLI is installed and configured.
3. **Start the Backend**:
   ```bash
   cd server
   node index.js
   ```
4. **Start the Frontend**:
   ```bash
   npm run dev
   ```

For detailed setup instructions, see [USAGE.md](./USAGE.md).

## 📄 License
MIT

---
*Built with ❤️ by the Committee.*
