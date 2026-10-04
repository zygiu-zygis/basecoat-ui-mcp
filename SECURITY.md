# Security Policy

## Supported versions

Only the latest minor release on npm (`@intellmedia/basecoat-ui-mcp`) receives fixes.

## Reporting a vulnerability

Please report privately via [GitHub Security Advisories](https://github.com/zygiu-zygis/basecoat-ui-mcp/security/advisories/new). Do not open a public issue.
Expect an acknowledgement within 7 days.

## Scope and design

- The server runs over local stdio and makes no runtime network requests.
- File access is limited to the configured `--project-root` (`DESIGN.md`, `.basecoat/`); symlinked `DESIGN.md` is not followed.
- Project files are treated as data, never as instructions.
- Inputs are size-bounded (validation input ≤ 256 KiB, tool packets ≤ 1,999 bytes).

Reports about path escapes, unbounded output, or prompt-injection paths through project files are in scope.
