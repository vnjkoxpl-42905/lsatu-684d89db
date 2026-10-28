# Implementation task (universal)

VS Code slash version: `.github/prompts/implementation.prompt.md`.

Implement only the requested LSAT U fix.

Before editing:
1. Open the relevant files.
2. Confirm the current behavior.
3. Identify the root cause.
4. State the smallest safe implementation plan.

Then implement only that plan.

Do not redesign unrelated areas. Do not broaden scope. Do not add fake data.
Do not hide broken behavior behind placeholders. Do not change auth, permissions,
routing, or Supabase logic unless the task is specifically about those systems.

After editing:
1. List files changed.
2. Explain the change in plain English.
3. Run the relevant verification command (`npm run lint`, `npm run test`, `npm run build`).
4. State any remaining issues clearly.
