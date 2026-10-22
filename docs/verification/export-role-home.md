# Export the current dashboards for another model

From the LSAT U repository:

```powershell
node scripts/verification/export-role-home.mjs
```

Or choose an output folder:

```powershell
node scripts/verification/export-role-home.mjs --out "C:/Users/Joshu/Downloads/LSAT-U-Dashboard-Handoff-2026-10-22"
```

This generates `student-dashboard.html`, `teacher-dashboard.html`, their handoff
Markdown, a README and `auto-checks.json`. Both HTML files are self-contained:
React, GSAP, styles and fonts are embedded. Open them directly without a server.
The first run downloads the public Fraunces fonts and font licenses; later runs
use the cache under `node_modules/.cache/lsatu-role-export/`. No packages are added.

The export is compiled from `docs/verification/role-home-preview.tsx`, which uses
the production Home presentation components and fictional typed sample data.
It includes normal, empty, loading, error and role-resolution states and local
sample interactions. Each output locks its initial role. A changed fixture
contract causes a clear error instead of silently exporting a partial design.

Handoff sources live under `docs/verification/role-home-handoff/`. Pass
`--prompts-dir PATH` to use another directory containing `student-handoff.md` and
`teacher-handoff.md`. Each prompt is copied alongside and embedded inside its
HTML file, under “Review handoff, source and limitations.”

The exporter replaces the Supabase module with an inert offline boundary before
bundling. A restrictive content security policy blocks all network connections,
and output checks reject external resource dependencies and backend configuration.
It never reads saved authentication or live records. The app's normal Vite config,
Lovable plugins, full application entry and build hooks are not run.

The authenticated sidebar, backend persistence, other routes and full question
bank are not included. Navigation is logged, not executed. These files preserve
the Home component experience, not the entire product. Browser review is separate
from structural checks; `auto-checks.json` never claims a visual review occurred.

For another model, attach the matching HTML and handoff Markdown. Add a screenshot
when the receiving model cannot render HTML. A PDF would lose motion and sample
interactions, so HTML is the primary artifact.

Only the script's named generated outputs are replaced. Existing unrelated files
in the output directory are retained. No source component is edited, and this
command does not commit, push or deploy anything.
