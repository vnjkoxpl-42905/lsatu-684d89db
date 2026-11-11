# Component library and 21st.dev tooling

Reference for any agent (Claude Code, Codex) that is about to build or restyle UI. Last checked 2026-11-11.

## 1. Personal component library

A folder of UI components Joshua has collected, each saved as markdown exactly as received, with a local visual gallery.

- **Location:** `C:\Users\Joshu\dev\component-library` (Windows machine). It is **not in this repo** and is not synced to the MacBook. On the Mac it does not exist unless copied across.
- **Open the gallery:** `node serve.mjs` in that folder, then http://localhost:4321 (or double-click `start.bat`). Needs internet: React, Babel and gsap load from cdnjs.
- **One folder per component:** `components/<slug>/component.md` holds notes, a props table, the source (`tsx file=<name>.tsx` block) and a demo (`tsx file=demo.tsx` block). The gallery reads the folder list on every request, so there is no index to update.
- **Add one:** copy `_template/component.md` into a new folder and fill it in. Full rules are in the library's `README.md`.
- **Keep source verbatim.** Anything changed from the original is listed under Notes in that file.

### What is in it (2026-11-11)

| Slug | What it is | Dependencies | Known differences from the original |
| --- | --- | --- | --- |
| `3d-curved-carousel` | WebGL photo carousel seen through a curved lens | none | embedded title font missing; demo uses Unsplash links |
| `tumble-deck-showcase` | Screenshots on edge that tip onto the floor, scroll-driven, loops | `gsap`, Tailwind | demo images are drawn placeholders, not the original screenshots |
| `journal-spread-carousel` | 3D scrapbook of double pages with prints and notes | none | embedded handwriting font missing; demo uses Unsplash links |

### Using it in LSAT U

The library is inspiration and a source of working code. It is not a design system for the product.

- Look here before hand-writing a new visual component, then adapt.
- `DESIGN.md` and the Tailwind tokens stay the visual authority. These components use inline CSS and hard-coded colours; map them to tokens, and never add a token name whose CSS variable is undefined.
- The product rules in `CLAUDE.md` still apply: Foyer is the primary navigation, the `GooeyDock` is allowed only on `/foyer`, no fake analytics or dead buttons.
- Do not install a dependency (for example `gsap`) because a library component needs it without Joshua's approval.
- Any change under `src/components/` or `src/pages/` still needs the running-app verification described in `CLAUDE.md`.

## 2. 21st.dev tooling

Three layers were set up on 2026-11-11. All of them point at the same service.

| Layer | What | Where it lives | State |
| --- | --- | --- | --- |
| MCP server `21st` | HTTP, `https://21st.dev/api/mcp`, sends an `x-api-key` header | Local scope for this project, in `~/.claude.json` | connected (`claude mcp list`) |
| Project `.mcp.json` | Same server, key read from env var `API_KEY_21ST` | repo root, **untracked** | not usable yet, the env var is not set |
| Plugin `21st@21st` | Marketplace `21st-dev/claude-code-plugin`, v0.4.1, user scope | Claude Code plugin cache | enabled |
| Skills | `21st-ai`, `21st-cli-use`, `21st-design-sync`, `21st-registry`, `21st-ui-build`, `21st-ui-explore`, `21st-ui-review`, `21st-video` | `.claude/skills/21st-*` and `.agents/skills/21st-*` (committed), plus user-level copies in `~/.claude`, `~/.codex`, `~/.cursor` | present |

Notes:

- **Precedence.** Local scope beats the project `.mcp.json` when both define `21st`, so today the local entry is the one in use. The `.mcp.json` was written by `npx @21st-dev/cli init --client claude --write` and is deliberately not committed until the key handling below is settled.
- **The API key is never stored in this repo.** The local entry keeps it in plaintext inside `~/.claude.json` on this machine. To move it out, set a user environment variable `API_KEY_21ST` and remove the local entry with `claude mcp remove 21st -s local`; the project `.mcp.json` then takes over. The key was pasted into a chat on 2026-11-11, so rotate it in the 21st.dev dashboard if that matters.
- **Duplicate skills.** The same skills appear under the plugin (`21st:` prefix), in `~/.claude/skills`, and in this repo. That is clutter, not an error. Remove the user-level copies if the repo copies are the ones to keep.
- **Check it works:** `claude mcp list` should show `21st: https://21st.dev/api/mcp (HTTP) - ✔ Connected`. New MCP tools and skills load at session start, so restart the session after changing any of this.
- **Reinstall steps**, if ever needed: `claude mcp add --transport http 21st https://21st.dev/api/mcp --header "x-api-key: <key>"`, `claude plugin marketplace add 21st-dev/claude-code-plugin`, `claude plugin install 21st@21st`, `npx @21st-dev/cli install-skill`.
