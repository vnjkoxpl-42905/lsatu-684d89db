# Visual audit (universal)

Paste into any agent, or pipe via CLI. VS Code slash version: `.github/prompts/visual-audit.prompt.md`.

Audit the currently visible LSAT U screen or the route I provide. Do not edit files.

Focus on:
- layout hierarchy
- spacing and alignment
- responsive behavior (desktop and mobile)
- overflow or clipping
- misleading UI states
- dead actions / fake data / fake analytics
- console errors if browser tools are available
- the component/source file likely responsible

Return:
1. What is correct
2. What is wrong
3. Likely files/components involved
4. Exact smallest fix path
5. What evidence would prove the fix worked
