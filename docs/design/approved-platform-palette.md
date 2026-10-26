# Approved platform palette

Approved by Joshua on 2026-10-21 from the open Direct lookup composition. Preserve these exact rendered colors and their contrast relationships. Use this as the reference when adapting platform surfaces, rather than introducing a warmer beige or replacing the canvas with pure white.

Measured in Codex browser at `/docs/verification/rc-layout-3.html` using computed styles:

| Role | Exact color |
| --- | --- |
| Main canvas, soft warm white | `#F7F4EE` |
| Heading on canvas | `#252B26` |
| Supporting text on canvas | `#64645B` |
| Dark settings surface | `#131718` |
| Fields on dark surface | `#282B2C` |
| Field text on dark surface | `#EFEDE6` |
| Field borders | `#747773` |
| Primary action on dark surface | `#EEEBE2` |
| Primary action text | `#161D18` |
| Lookup value on canvas | `#293328` |

```css
:root {
  --lsatu-canvas: #f7f4ee;
  --lsatu-ink: #252b26;
  --lsatu-ink-muted: #64645b;
  --lsatu-surface-dark: #131718;
  --lsatu-field-dark: #282b2c;
  --lsatu-text-on-dark: #efede6;
  --lsatu-field-border: #747773;
  --lsatu-action-on-dark: #eeebe2;
  --lsatu-action-ink: #161d18;
  --lsatu-lookup-ink: #293328;
}
```

The identity is an open light canvas, restrained dark working surfaces, and one clear primary action. Approval concerns the palette and contrast, not putting every surface inside a dark card. Existing semantic correctness, warning, error, and success colors require their own accessible mappings.

These roles are implemented locally in shared platform tokens and the RC builder, including classroom/Home, practice, Booking, Testing Centre, Activity Centre wrappers, light Reading Center, and Academy neutral grounds. They have not been deployed. Fixture-backed browser checks demonstrate local rendering and interactions; they do not prove signed-in persistence or backend behavior. Semantic feedback, authored teaching-world visuals, Academy film/accent colors, and saved immersive reader appearances remain independent.
