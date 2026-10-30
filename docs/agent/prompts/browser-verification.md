# Browser verification (universal)

VS Code slash version: `.github/prompts/browser-verification.prompt.md`.

Verify the specified LSAT U route in the running local app at http://localhost:8080.
Use integrated browser, Playwright MCP, or Chrome DevTools MCP if available. Do not edit files.

Check:
- route loads
- primary content appears
- expected buttons or controls exist
- no obvious console errors
- no failed network requests (if network tools available)
- key interaction works
- mobile viewport has no severe layout break

Write results to `docs/agent/handoffs/verification-notes.md`.

Return:
1. Pass/fail
2. Evidence observed
3. Console/network issues
4. Screenshots or snapshots if available
5. Exact next fix target if failing
