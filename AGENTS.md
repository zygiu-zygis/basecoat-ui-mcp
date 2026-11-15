# AGENTS CONTRACT: basecoat-ui-mcp
Zone: platform
Contract Version: 2026-10-22-PROD
Authority: Canonical OpenViking (viking://intellmedia/platform/basecoat-ui-mcp)

## MANDATORY 7-PHASE FSM WORKFLOW
Every agent invocation MUST transition sequentially through these 7 phases. Skipping any phase raises an immediate abort:
1. PLAN: Retrieve memory once (official OpenViking MCP search mode=context, max_tokens=700, limit=3 at 127.0.0.1:1935), project="basecoat-ui-mcp". Formulate micro-diff scope.
2. BUILD: Perform surgical code changes. Full-file rewrites are forbidden.
3. DIFF: Generate git diff and compute SHA256 checksum.
4. QA: Execute local tests in test runner. Unit tests must pass with 0 failures.
5. APPROVAL: If touching production boundaries, wait for Cryptographic SHA256 Approval Gate in canonical PostgreSQL.
6. APPLY: Commit atomic changes.
7. DOCS: Update session memory via one closeout (npm --prefix ~/@github/ai run session:closeout -- "<topic>" "<verdict>" --project basecoat-ui-mcp) call.
Code graph calls: read .claude/rules/session-project-binding.md for this repo's indexed project argument.

## BOUNDED FILE OPERATIONS
- Never create ad-hoc test scripts at repository root (e.g., test-*.ts, patch-*.js).
- All assertions must reside strictly under tests/.
- Code comments must use ASCII hyphen-minus (-) and follow 'shortcut: <limit>, <when to upgrade>'.
