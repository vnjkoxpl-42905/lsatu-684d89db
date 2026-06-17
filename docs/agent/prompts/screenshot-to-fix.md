# Screenshot to fix (universal)

VS Code slash version: `.github/prompts/screenshot-to-fix.prompt.md`.

I am attaching a screenshot of an LSAT U surface. Treat it as the current product state.

1. Describe what the screenshot shows and what is wrong.
2. Identify the route/component most likely responsible (use LocatorJS / click-to-source
   if available; otherwise reason from the design system and route map).
3. Classify the issue: layout, spacing, z-index, overflow, state, routing, animation,
   data, copy, or responsiveness.
4. State the smallest structural change that fixes it (not "make it better").
5. If asked to implement, do only that change and then verify with `npm run build`.

Do not redesign the whole page. Do not add stock images or fake data.
