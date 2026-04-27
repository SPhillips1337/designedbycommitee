# Codebase Insight: DesignedByCommittee V1

## Overview
A collaborative UI design platform built with React/Vite (frontend) and Node.js (backend). The core differentiator is the "Committee" system where design changes are validated and suggested by an agent stack in real-time.

## Key Modules
- **Frontend (`src/App.jsx`)**: Implements a glassmorphic dashboard with real-time sync indicators and interactive design token sliders.
- **Backend (`server/index.js`)**: A WebSocket-enabled server that acts as the communication hub for committee members and agents.
- **Agent Stack (`server/agent-stack/`)**: 
  - `ManagerAgent.js`: Orchestrates the flow between user inputs and worker skills.
  - `skills/designValidator.js`: Enforces design system compliance (e.g., token usage).
  - `llm.js`: A universal provider for local (LM Studio) and remote (Ollama) LLM endpoints.

## Dependencies & Integrations
- **StitchMCP**: Used to generate the initial "Luminous Obsidian" design system and UI mockup.
- **WebSocket (`ws`)**: Used for proactive, real-time message broadcasting.
- **LM Studio / Ollama**: Integrated via an OpenAI-compatible abstraction layer.

## Hidden Knowledge
- The "No-Line" rule in the CSS is critical for maintaining the "Luminous Obsidian" aesthetic. Avoid adding 1px solid borders for sectioning; use tonal shifts in background colors instead.
- The `ManagerAgent` is designed to be the single point of entry for design state mutations to ensure all changes are audited by the "Committee" logic.
