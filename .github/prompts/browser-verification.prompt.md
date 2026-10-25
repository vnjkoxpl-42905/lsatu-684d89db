---
name: browser-verification
description: Verify a route using browser tools or Playwright MCP.
agent: agent
---

Verify the specified LSAT U route in the running local app at http://localhost:8080.

Check:
- route loads
- primary content appears
- expected buttons or controls exist
- no obvious console errors
- no failed network requests if browser/network tools are available
- key interaction works
- mobile viewport has no severe layout break

Do not edit files.
Write results to docs/agent/handoffs/verification-notes.md if useful.

Return:
1. Pass/fail
2. Evidence observed
3. Console/network issues
4. Screenshots or snapshots if available
5. Exact next fix target if failing
