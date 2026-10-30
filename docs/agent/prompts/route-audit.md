# Route audit (universal)

VS Code slash version: `.github/prompts/route-audit.prompt.md`.

Audit this LSAT U route for real implementation quality. Do not edit files.

Check:
- real data vs placeholder data
- working actions vs dead actions
- route links and navigation
- state loading/error/empty handling
- permissions or role-based display (`has_*_access`, admin)
- mobile behavior
- visual hierarchy
- naming consistency (instructor displays as "Joshua"; students by real profile name)

Return:
1. Correct
2. Partially wired
3. Visually right but behaviorally wrong
4. Not implemented
5. What to fix first
