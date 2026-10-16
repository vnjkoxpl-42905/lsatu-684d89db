---
name: visual-audit
description: Audit a visible LSAT U route or component without editing files.
agent: ask
---

Audit the currently visible LSAT U screen or the route I provide.

Focus on:
- layout hierarchy
- spacing and alignment
- responsive behavior
- overflow or clipping
- misleading UI states
- dead actions
- fake data
- console errors if browser tools are available
- component/source file likely responsible

Do not edit files.

Return:
1. What is correct
2. What is wrong
3. Likely files/components involved
4. Exact smallest fix path
5. What evidence would prove the fix worked
