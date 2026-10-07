---
name: codex-review
description: Review recent LSAT U changes as a skeptical reviewer.
agent: ask
---

Review the provided diff, files, or handoff artifact.
If a diff artifact exists, read docs/agent/handoffs/recent-changes.diff and review only the changed code.

Focus on:
- correctness
- regression risk
- route behavior
- state flow (Smart Drill per-question UI must key off currentQuestion.qid)
- permission leaks / feature-flag gaps
- fake or misleading UI
- mobile responsiveness
- unnecessary complexity
- broken or missing verification

Do not edit files unless explicitly asked.
Write findings to docs/agent/handoffs/codex-findings.md. Do not broaden scope.

Return:
1. Critical issues
2. Medium issues
3. Minor issues
4. What is correct
5. Exact smallest follow-up fix
