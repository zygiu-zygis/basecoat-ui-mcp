# Claude Code contract: basecoat-ui-mcp

Read [AGENTS.md](AGENTS.md) first. OpenViking memory project id: `basecoat-ui-mcp`.

## Anti-Hallucination Canonical Loop

1. **Canon First:** AGENTS.md + `npm run session:context` (when defined) + one bounded OpenViking recall (`search mode=context`, <=700 tok, limit=3, project=`basecoat-ui-mcp`). For fast daily status (Calendar, Linear, Gmail, Git, Infra, Repos) run `npm --prefix ~/@github/ai run session:briefing`.
2. **Execute and baseline verify:** PLAN -> BUILD -> DIFF -> QA -> APPROVAL -> APPLY -> DOCS; run tests and review session errors.
3. **Periodic audit:** Repeated failures or high token use trigger canonical rule and skill updates.
4. **Subagent delegation:** Read-only multi-file work to `.claude/agents/fast-researcher.md` (haiku); pre-APPLY review to `.claude/agents/code-reviewer.md` (sonnet); delegate summaries <=90 lines.
5. **Closeout:** `npm --prefix ~/@github/ai run session:closeout -- "<topic>" "<verdict>" --project basecoat-ui-mcp`.

Operator chat and live voice (`talker`): 100% Lithuanian (`"tu"` / `"Žygi"`). Code, comments, and commits: English. No emoji.
