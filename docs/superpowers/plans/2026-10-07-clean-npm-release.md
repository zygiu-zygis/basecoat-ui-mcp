# Clean npm Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce avoidable npm and Socket release signals while enforcing package and lockfile integrity in future releases.

**Architecture:** Tighten the `package.json.files` publication boundary, extend the local release evidence generator with lockfile parity records, and turn the packed tarball into an explicit contract. Keep production audit separate because it is network-dependent.

**Tech Stack:** Node.js 22, TypeScript, npm pack, npm audit, Node test runner, tsx.

## Global Constraints

- Keep `src/` in the package because runtime snapshots are loaded from it.
- Do not change MCP runtime behavior or replace the MCP SDK.
- Do not hide legitimate filesystem or transitive dependency signals.
- Keep `release-check` local-only and network-free.

---

### Task 1: Tighten the npm publication boundary

**Files:**
- Modify: `package.json:53-66`
- Modify: `package-lock.json:1-8`
- Test: `tests/package-contract.test.ts:70-99`

- [ ] Remove `scripts`, `tests`, the tests fixture negation, and both TypeScript project files from `package.json.files`.
- [ ] Synchronize the lockfile top-level `name` and `version` with `package.json`.
- [ ] Extend the pack contract to require the runtime snapshots and reject `scripts/`, `tests/`, `tsconfig.json`, `tsconfig.check.json`, workflow files, `tmp/`, and local probe files.
- [ ] Run the focused package contract test and verify the extracted read-only server still starts.

### Task 2: Add lockfile parity evidence

**Files:**
- Modify: `scripts/release-check.ts:54-80,170-190,350-370`
- Modify: `tests/release-routine.test.ts:1-60`

- [ ] Add a typed lockfile manifest shape for top-level metadata and `packages[""]`.
- [ ] Read `package-lock.json` with the existing manifest reads.
- [ ] Add parity records for lockfile name/version and lockfile root package name/version.
- [ ] Make any stale or missing lockfile parity record fail the evidence result.
- [ ] Add isolated temporary-repository tests for top-level version, root version, and root name drift, plus the valid case.
- [ ] Run the focused release routine tests and inspect the JSON evidence directly through `node --import tsx`.

### Task 3: Document stable release gates

**Files:**
- Modify: `docs/runbooks/release-process.md:44-112`
- Modify: `package.json:70-84`

- [ ] Document the direct Node command for machine-readable release evidence.
- [ ] Document the packed-file allowlist and lockfile parity gate.
- [ ] Add a named production audit script using `npm audit --omit=dev --json`, without folding network access into `release-check`.
- [ ] Document that npm warnings belong to stderr and must not be parsed as evidence JSON.

### Task 4: Verify the complete release path

**Files:**
- Review: all files changed by Tasks 1-3

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run compile:semantics:check`.
- [ ] Run `npm run compile:blocks:check`.
- [ ] Run `npm test`.
- [ ] Run `npm pack --dry-run --json --ignore-scripts` and inspect the file count and forbidden paths.
- [ ] Run `npm audit --omit=dev --json` and require zero production vulnerabilities.
- [ ] Run `node --import tsx scripts/release-check.ts --phase=pre-release` and require `parity: pass`.
- [ ] Run `git diff --check` and the linter on every edited source file.
