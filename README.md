# LSAT U

Premium ed-tech web app: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui, with a Supabase backend (Edge Functions), hosted on Lovable.

For full architecture, commands, and conventions, see [CLAUDE.md](./CLAUDE.md).

## Fast locator

- Code repo root (this project): `/Users/joshuaf/brain/projects/lsatu`
- Vault root (the `~/brain` directory IS the Obsidian vault): `/Users/joshuaf/brain`
- LSATU vault content: `/Users/joshuaf/brain/wiki/domains/lsat-u/`

(Older notes may point at `~/Documents/Obsidian Vault/...` — that path is stale; the vault was consolidated into `~/brain`.)

## Working agreement for AI assistants

**Always push to `main` after every task.** Once a code change is complete, stage the relevant files, commit with a descriptive message, and push directly to `main`. Do not create feature branches or pull requests unless explicitly asked. (See the full Git workflow note in [CLAUDE.md](./CLAUDE.md#conventions).)

## Common commands

- `npm run dev` — Vite dev server on port 8080
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit -p tsconfig.app.json` — typecheck (no dedicated script)
