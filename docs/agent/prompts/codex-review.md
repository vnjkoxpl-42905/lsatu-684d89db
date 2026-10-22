# Codex review (universal)

VS Code slash version: `.github/prompts/codex-review.prompt.md`.

Generate the diff first:
```bash
git diff > docs/agent/handoffs/recent-changes.diff
```

Then: review the provided diff, files, or handoff artifact. Do not edit files unless explicitly asked.

Focus on:
- correctness
- regression risk
- route behavior
- state flow (especially Smart Drill: per-question UI must key off `currentQuestion.qid`)
- permission leaks / feature-flag gaps (`has_*_access` patterns)
- fake or misleading UI
- mobile responsiveness
- unnecessary complexity
- broken or missing verification

Write findings to `docs/agent/handoffs/codex-findings.md`. Do not broaden scope.

Return:
1. Critical issues
2. Medium issues
3. Minor issues
4. What is correct
5. Exact smallest follow-up fix
