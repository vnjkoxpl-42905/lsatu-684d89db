---
name: route-audit
description: Audit an LSAT U route for product and implementation integrity.
agent: ask
---

Audit this LSAT U route for real implementation quality.

Check:
- real data vs placeholder data
- working actions vs dead actions
- route links and navigation
- state loading/error/empty handling
- permissions or role-based display
- mobile behavior
- visual hierarchy
- naming consistency (instructor displays as "Joshua"; students by real profile name)

Do not edit files.

Return:
1. Correct
2. Partially wired
3. Visually right but behaviorally wrong
4. Not implemented
5. What to fix first
