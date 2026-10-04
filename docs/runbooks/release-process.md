# Basecoat UI MCP Release Process

Every release must reach all channels with the same version: GitHub tag +
Release, npm, and the official MCP Registry.

## 1. Quality gate
- `npm run check` (typecheck, semantic/block snapshot checks, tests, whitespace).
- `npm pack --dry-run` and confirm no secrets, `tmp/`, or local files ship.
  `.gitignore` does NOT filter npm: the `files` whitelist (`tests`) ships
  git-ignored folders unless negated (`!tests/fixtures/offline-dashboard`).
- Changes stay framework-agnostic (Astro, Next.js, Express, HTML).

## 2. Version bump (single source: package.json)
1. `npm version X.Y.Z --no-git-tag-version` (updates package.json + lock).
2. Set the same version in `server.json` (`version` and `packages[0].version`).
   Tests read the server version from package.json and assert server.json parity.
3. Move `## Unreleased` in `CHANGELOG.md` to `## X.Y.Z - YYYY-MM-DD`.
4. `npm run check`, then commit `chore(release): vX.Y.Z`.

## 3. Publish
```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z - <headline>" --notes-file <notes.md> --verify-tag
npm publish --access public --otp=<6-digit>   # npm login + 2FA OTP required (web login alone gets E403)
mcp-publisher validate && mcp-publisher publish  # requires `mcp-publisher login github`
```
Never move a tag after npm publish; if a fix is needed post-publish, cut X.Y.Z+1.

Verify:
```bash
npm view @intellmedia/basecoat-ui-mcp dist-tags
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=basecoat-ui-mcp" | head -c 600
```
npm must be published before the MCP Registry, which validates the npm
package and its `mcpName`.

## 4. Community update
*(Archived: We no longer post comments in the basecoat discussion thread to reduce noise).*

## 5. Local IDE sync
- `npm link` in this repo to link local development.
- Reload MCP server in your AI editor/client so cached instructions refresh.

## 6. Post-release presentation, SEO & modern branding checklist

Following modern open-source best practices (Linear, Vercel, shadcn/ui):

1. **Restrained, non-slop aesthetic:**
   - No busy infographic banners, purple neon glows, or redundant text cards.
   - Use clean monochrome vector logo (`assets/logo.svg`, 64x64) without hyperlinks.
   - Restrained, informative tone: clear 2-line pitch without hype or buzzwords.
   - Modern flat badges with official logos (npm, MCP Registry, downloads, MIT, Node, TS, 0KB Offline).

2. **Immediate client copy-paste DX:**
   - Provide direct setup snippets for leading AI coding clients:
     - Cursor (`.cursor/mcp.json` using `${workspaceFolder}`)
     - Claude Desktop (`claude_desktop_config.json`)
     - Claude Code CLI (`claude mcp add ...`)
     - Generic `npx`

3. **High-contrast Social Preview (1280x640):**
   - Keep `assets/social-preview.png` (and `.jpg`) optimized under 150KB.
   - Feature authentic UI component mockups (tabs, buttons, KPI cards, tables) rather than abstract artwork.
   - Update GitHub Settings -> General -> Social preview when visuals evolve.

4. **SEO & Multi-Channel Verification:**
   - `package.json` keywords include high-traffic MCP search tags: `mcp-server`, `cursor`, `claude`, `shadcn-ui`, `tailwind`, `ai-agents`.
   - GitHub repo has all 20 topics set (`mcp-server`, `cursor`, `claude`, `windsurf`, etc.).
   - Verify parity across GitHub release, npm registry (`latest`), and MCP Registry (`isLatest: true`).

5. **Commit & Author Hygiene:**
   - Maintain author purity (`Žygimantas Jasiulionis <z.jasiulionis@gmail.com>`).
   - Disable bot attribution in Cursor Settings (`Agents > Attribution: OFF`) to prevent unwanted `cursoragent` contributor entries.
