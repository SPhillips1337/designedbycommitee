# Patterns & Lessons learned

## Success Patterns (Anti-Gravity)
- **Stitch-to-Token Workflow**: Using StitchMCP to define a visual north star and then immediately extracting those tokens into a `DESIGN.md` and `index.css` creates a strong, consistent foundation.
- **Hybrid Stack Cherry-Picking**: Combining the proactive UI of `PHPaibot`, the skill pattern of `ClawTeam`, and the orchestration of `devsys` allowed for rapid prototyping of a complex "Committee" system.
- **Universal LLM Wrapper**: Standardizing on the OpenAI-compatible API for both local (LM Studio) and remote (Ollama) simplifies agent code and future-proofs the stack.

## Failure Lessons (Drag)
- **Vite 6 Scaffolding**: Initial attempt with `create-vite@latest` (Vite 6) failed due to Rolldown native binary issues in this environment. 
    - **Lesson**: If `@latest` fails on native binaries, pinning to the previous major version (Vite 5) is a reliable fallback for fast progress.
- **Interactive Prompts**: `create-vite` defaults to interactive prompts which can hang headless agents.
    - **Lesson**: Always use `--no-interactive` or equivalent flags for project initialization tools.

## The Ratchet Protocol
- **Pattern**: Commit memory updates (`.antigravity/memories/`) incrementally after major architectural milestones to ensure knowledge persistence across agent sessions.
