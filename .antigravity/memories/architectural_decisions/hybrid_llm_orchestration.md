# Architectural Decision: Hybrid LLM Orchestration

## Context
The user requires high-performance AI processing with the flexibility to use local hardware (Laptop/LM Studio) and remote servers (another PC via Cloudflare Tunnel/Ollama).

## Decision
Implement a universal LLM provider (`llm.js`) that abstracts the difference between local and remote OpenAI-compatible endpoints.

## Tech Stack
- **Local**: LM Studio running on `localhost:1234`.
- **Remote**: Ollama running on a separate PC, exposed via a Cloudflare Tunnel.
- **Protocol**: OpenAI Chat Completions API.

## Rationale
- **Latency**: Local models are used for low-latency validation and quick UI suggestions.
- **Power**: Remote models (potentially larger) are used for deep analysis or creative generation tasks.
- **Privacy**: Keeps sensitive design data on local/private infrastructure.

## Status
**Active** (Implemented 2026-04-27)

## Consequences
- Requires `.env` configuration for both `LOCAL_LLM_*` and `REMOTE_LLM_*` variables.
- The `ManagerAgent` can now dynamically route tasks based on the complexity of the request.
