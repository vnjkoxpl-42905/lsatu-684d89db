# Console error fix (universal)

VS Code slash version: `.github/prompts/console-error-fix.prompt.md`.

Investigate console errors/warnings on the specified LSAT U route at http://localhost:8080.

Before editing:
1. Reproduce the error and capture the exact message and stack.
2. Trace it to the owning component/hook/lib file.
3. Identify root cause (state, effect, routing, data, hydration, missing guard).
4. State the smallest safe fix.

Then implement only that fix. Do not swallow errors with empty catches or `console.error`
alone. Throw, rethrow, return failure, or surface a toast. Do not broaden scope.

After editing:
1. Confirm the error is gone in the browser console.
2. List files changed and run `npm run lint` and `npm run build`.
3. Note any remaining warnings.
