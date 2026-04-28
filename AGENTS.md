# Agents & Committee Roles

DesignedByCommittee assembles a dynamic committee of AI agents whose membership is determined at runtime by which environment variables are configured. No code changes are needed to add or remove members.

## Committee Members

Members are enabled by the presence of their env var. The `ManagerAgent` calls `getActiveMembers()` on every interaction to build the current roster.

| Agent name | Provider ID | Enabled by |
|---|---|---|
| Local Model | `local` | `LOCAL_LLM_API_BASE` |
| Remote Model | `remote` | `REMOTE_LLM_API_BASE` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Gemini | `gemini` | `GEMINI_API_KEY` |
| Claude | `anthropic` | `ANTHROPIC_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Gemini CLI | `gemini-cli` | `USE_GEMINI_CLI=true` |
| OpenCode CLI | `opencode-cli` | `USE_OPENCODE_CLI=true` |

If no providers are configured, a `Fallback Model` (local) is used so the server never starts empty.

## Roles

### Debate Participants (all non-OpenCode members)
- Respond to chat messages and to each other.
- AI-to-AI follow-up has a 60% probability and is depth-limited to 2 hops to prevent infinite loops.
- Contribute to draft synthesis, peer review, and approval voting.

### Draft Synthesiser (random non-OpenCode member)
- Fires after every 5th message (starting from the 3rd) on an active project.
- Proposes one new Requirement, Task, or Todo item per cycle using recent chat history as context.
- Responds `COMPLETE` when it believes the current phase is fully covered; the platform then prompts the user to sign off.
- Self-propagates: after each item is reviewed, synthesis schedules the next item automatically.

### Peer Reviewer (up to 2 non-OpenCode members, excluding the proposer)
- Called immediately after each item is drafted.
- Expected response format: `APPROVE: <reason>` or `REVISE: <text> REASON: <why>`.
- Three fallback levels if the format is not followed: positive-sentiment detection → revision-phrase detection → default approve (to prevent stalls).
- ≥50% approval from active AI members marks an item `aiApproved`.

### OpenCode CLI (worker agent)
- Polls for `pending` todos every 5 seconds.
- Locks one todo at a time to prevent double-execution.
- Executes via the **Better-OpenCodeMCP** bridge (`opencode`, `opencode_sessions`, `opencode_respond` MCP tools).
- Polls for task completion with a 2s interval, up to 30 attempts (60s timeout).
- On failure, unlocks the todo so it can be retried.
- After completion, a random non-OpenCode member is called to post a 1-2 sentence peer review.

## Orchestration: ManagerAgent

`server/agent-stack/manager.js` runs five concurrent behaviours:

1. **Committee chat** (`handleCommitteeChat`) — routes incoming messages, decides who responds, chains AI-to-AI turns.
2. **Draft synthesis** (`synthesizeDraftItem` / `synthesizeTodoItems`) — triggers every 5 messages to propose new pipeline items.
3. **Peer review** (`triggerItemReview`) — called after each draft; collects approvals and tracks consensus.
4. **Todo execution** (`processPendingTodos`) — background worker on a 5-second interval.
5. **Auto-promotion** (`checkAutoPromote`) — advances the project phase when all items are approved and signed off, then triggers a handoff discussion.

## Customising Agent Behaviour

System prompts are in `server/agent-stack/manager.js`:
- Debate tone: `handleCommitteeChat` → `systemPrompt` template.
- Synthesis style: `synthesizeDraftItem` → `systemPrompt`.
- Review strictness: `triggerItemReview` → `systemPrompt`.
- Todo execution scope: `processPendingTodos` → `prompt`.

LLM routing and provider configuration: `server/agent-stack/llm.js`.
