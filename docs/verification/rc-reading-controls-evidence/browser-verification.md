# RC reading controls: live component verification

2026-10-14. Real production RcPassagePane, RcTextSettings, useRcA11y and RcLineSpacingMenu mounted through the committed standalone Vite verification fixture. This does not bypass authentication or claim signed-in production acceptance.

- Default, Medium and Large produce 28.8px,43.2px and57.6px line-height on18px text: exact100/150/200percent baseline.
- Medium and paragraph-focus on survived a browser reload.
- KeyboardEnd thenEnter selectedLarge.
- Dropdown fit within375,640,900,1440px viewports; temporary viewport reset.
- All6readingthemes produced a nontransparent paragraph hover background with unchanged paragraph positions and dimensions.
- Native drag selection still opened Highlight / Choose highlight color / Dismiss actions with paragraphfocus enabled. The fixture does not persist annotation writes; saved-mark persistence remains covered by existing code/tests, not this fixture.
- Source review confirmed scope is passage-only and shared Markdown rendering is unchanged.

Screenshots: spacing-menu.png,paragraph-focus.png,selection.png.
