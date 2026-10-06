# Basecoat UI MCP Publication and Distributor Parity

This is a maintainer-operated routine. A release is complete only when every
approved public surface shows the intended package identity and version, or has
a recorded exception with an owner and next action. This document describes
what to verify; it does not authorize publication, tagging, directory edits, or
other external writes.

## 1. Discovery and evidence record

Before changing a version, create a release evidence record in the operator's
release notes or other approved working record. Do not put tokens, OTPs, or
private URLs in it. Record UTC timestamps, commands or screenshots, observed
values, and links for each check.

Start with the repository and current metadata:

- `git status --short --branch`, the current commit, and existing tags.
- `package.json`: `name`, `version`, `repository`, `homepage`, `mcpName`,
  `bin`, `files`, and package keywords.
- `server.json`: `name`, `version`, `packages[0].identifier`, and
  `packages[0].version`.
- `CHANGELOG.md`, `README.md`, package scripts, and the current release notes.
- Existing public links, badges, install commands, and directory references.

Then discover the actual public surfaces instead of relying on an old list:

1. GitHub repository metadata, default branch, tags, release, topics, README,
   and package-facing links.
2. npm package page, published version, `latest` dist-tag, tarball metadata,
   README, and install instructions.
3. The official MCP Registry entry identified by `server.json` `name` and
   `mcpName`, including its npm package identifier and version.
4. Approved MCP directories, awesome catalogs, package indexes, launchers,
   client catalogs, and other surfaces found in repository metadata or the
   release evidence record.

For each surface, record the URL, source of truth, observed name and version,
status (`match`, `stale`, `missing`, or `manual correction needed`), evidence,
and owner. Treat third-party directories as mirrors, not as authorities. Do
not restore deprecated or broken registry links merely to make a checklist
look complete.

## 2. Authority, correction order, and gates

Use this correction order:

1. Correct local authoritative metadata and documentation.
2. Run local checks and review the exact diff and package contents.
3. With explicit approval, publish the immutable GitHub tag and release.
4. With explicit approval, publish npm.
5. With explicit approval, publish or update the official MCP Registry entry.
6. With explicit approval, request or perform manual corrections in approved
   directories, awesome catalogs, and other mirrors.
7. Re-run the full discovery and record the final evidence.

Stop and resolve any identity or version mismatch before publication. In
particular, `package.json` is the local version source; `server.json.version`
and `server.json.packages[0].version` must match it, and the MCP name and npm
identifier must match the intended public entry.

Manual corrections are not implied by a release. For every stale or missing
mirror, record the exact requested change, the responsible maintainer, the
approval, and the resulting URL or response. Do not silently edit somebody
else's catalog or claim a correction that was not verified. If a correction is
not possible, keep the exception visible in the evidence record.

Each external write is a separate approval gate. The operator must explicitly
approve the exact version and target before `git push`, GitHub release creation,
`npm publish`, MCP Registry publication, or directory/catalog updates. No
GitHub Actions workflow is part of this routine.

## 3. Pre-release verification

Before any external write:

- Keep unrelated operator changes intact and confirm the working tree contains
  only intended release changes.
- Update `package.json` and lock metadata with the chosen version, then set the
  same version in both `server.json` locations.
- Move the changelog entry to `## X.Y.Z - YYYY-MM-DD` and prepare release notes.
- Run `npm run check`.
- Run `npm pack --dry-run` and inspect the file list. Confirm that no secrets,
  credentials, `tmp/`, local probes, workflow files, or unrelated files ship.
  `.gitignore` does not replace the npm `files` allowlist.
- Verify the GitHub repository URL, npm identifier, `mcpName`, install examples,
  and release notes all describe the same package.
- Re-run discovery and attach the clean pre-release evidence to the approval.

Typical publication commands, used only after their individual approval gates,
are:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z - <headline>" --notes-file <notes.md> --verify-tag
npm publish --access public --otp=<6-digit>
mcp-publisher validate
mcp-publisher publish
```

The OTP is entered interactively and must never be recorded. `mcp-publisher
validate` is a pre-publication check; `mcp-publisher publish` is an external
write and requires its own approval. Publish npm before the MCP Registry so the
registry can validate the package and its `mcpName`.

## 4. Post-release verification

After each approved publication, verify the result before proceeding to the
next channel:

- GitHub: tag points to the approved commit; release title, notes, and source
  links are correct.
- npm: the package page, tarball metadata, README, and `latest` dist-tag show
  the approved version. For example:

  ```bash
  npm view @intellmedia/basecoat-ui-mcp version dist-tags --json
  ```

- MCP Registry: the entry for the `server.json` name shows the approved npm
  identifier and version and is marked current by the registry's own UI or
  response.
- Directories and catalogs: each approved mirror is checked manually for the
  intended link, package name, version, and description.
- Client setup: a clean consumer can follow the README install path and the
  packed server starts offline with the documented project-root behavior.

Re-run the discovery matrix, record final evidence and unresolved exceptions,
and only then call the release complete. Never move or retarget a tag after
npm publication. If a post-publication fix is required, publish the next
appropriate version and repeat the routine.

## 5. Local development sync

- `npm link` is for local development only; it is not release evidence.
- Reload the MCP server in the AI editor or client after a package update so
  cached instructions refresh.
- Keep local IDE sync separate from public distributor parity.

## 6. Presentation and metadata review

Review presentation surfaces during discovery, without treating aesthetics as
a publication substitute:

- Keep the README restrained, factual, framework-agnostic, and aligned with
  the actual install commands and supported clients.
- Keep the monochrome `assets/logo.svg` and social preview current when they
  are part of the approved release scope.
- Keep package keywords useful for MCP, Cursor, Claude, shadcn-ui, Tailwind,
  and AI-agent discovery; do not add misleading claims.
- Preserve maintainer and author hygiene. Do not add bot attribution or
  secrets to commits, release notes, package metadata, or evidence.
