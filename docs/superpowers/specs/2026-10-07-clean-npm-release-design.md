# Clean npm Release Design

## Goal

Reduce avoidable npm and Socket release signals while preserving the offline MCP
runtime and making future release metadata drift fail locally.

## Scope

- Publish only runtime assets and user-facing documentation from the npm package.
- Keep `src/` because the runtime loads packaged JSON snapshots from it.
- Exclude development scripts, tests, TypeScript project files, and local fixtures
  from the npm tarball.
- Verify package metadata and both lockfile version/name locations before release.
- Verify the tarball allowlist and packed runtime contract.
- Keep `npm audit --omit=dev` as an explicit network-dependent release command.

## Non-goals

- Do not hide Socket findings caused by legitimate runtime filesystem access.
- Do not replace the MCP SDK or alter MCP transport behavior.
- Do not make the local release evidence generator perform network requests.
- Do not change the user's global npm configuration as part of the repository change.

## Design

`package.json.files` becomes the first publication boundary. The existing packed
runtime test becomes the executable contract: required runtime snapshots remain,
while `scripts/`, `tests/`, TypeScript project files, workflow files, and local
probe data are rejected.

`buildReleaseEvidence()` reads `package-lock.json` in addition to the existing
manifests. It emits separate parity records for the lockfile metadata and the
lockfile root package, and the overall local parity fails if any authoritative
name or version differs from `package.json`. Dependency contents are not
reimplemented as a second npm resolver.

Audit remains a separate gate because it contacts the npm registry. The release
runbook documents the exact JSON command and keeps npm warnings on stderr from
being confused with JSON evidence.

## Verification

The focused release tests cover valid metadata and each lockfile mismatch. The
package contract test verifies the reduced tarball and starts the extracted
runtime read-only. The final verification runs typecheck, generated snapshot
checks, the full test suite, pack inspection, production audit, direct
machine-readable release evidence, and `git diff --check`.
