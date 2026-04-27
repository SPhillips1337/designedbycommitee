# Architecture Notes - DesignedByCommittee

We are cherry-picking the best components from previous agentic stacks to build a robust, collaborative design platform.

## 1. Frontend: Kinetic Chat & Dashboard
- **Source**: `PHPaibot` / `Stitch Mockup`
- **Pattern**: 
    - **WebSocket Real-time Sync**: Use the proactive messaging pattern from `PHPaibot` for live "Committee" updates.
    - **Tonal Depth UI**: Implement the "No-Line" rule and glassmorphism from the Stitch mockup to maintain a premium feel.
    - **Identity Management**: Simple local-storage based identity for "Committee Members".

## 2. Agent Stack: Skill-Based Team
- **Source**: `ClawTeam` / `agent-factory-mcp`
- **Pattern**:
    - **Skills System**: Decouple agent capabilities into "skills" (e.g., `StyleArchitect`, `LayoutValidator`).
    - **Discovery**: Use the MCP discovery pattern to dynamically load tools available in the environment.
    - **Mailbox Pattern**: Implement an asynchronous message queue (like in `agent-factory-mcp`) for collaborative design threads.

## 3. Orchestration: Manager-Worker Pattern
- **Source**: `devsys` / `724-office`
- **Pattern**:
    - **Manager Agent**: Oversees the "Committee" voting process and resolves conflicts.
    - **Worker Agents**: Perform specific design tasks (generating variants, running accessibility audits).
    - **State Management**: Persist design iterations and voting history in a centralized `memory.db` (as seen in `724-office`).

## 4. Integration Strategy
- **Frontend**: Vite + React for the dashboard.
- **Backend**: Node.js (Fastify/Express) for the WebSocket and Agent Orchestration.
- **Agent Framework**: Custom lightweight wrapper using the MCP client logic found in `724-office`.
