# Project Scaffolding Plan — Gate 1 Output

**Status:** Draft. Pending Joshua's sign-off. Locks at Gate 3.
**Author:** Claude Code, 2026-04-30.
**Inputs:** `MAIN_CONCLUSION_HANDOFF.md` §3, spec.html §2 + §3 + §11, `/rules/*`.

---

## Decisions locked at Gate 1 (2026-04-30)

- React + TypeScript confirmed (not vanilla JS).
- 15 named tools per the lexicon are canonical. Indicator Vault and Coach's Note are also UI / module surfaces — render once per role; no double-counting in any "named tools list."
- v1 question bank = Notes + Homework + Netlify extractions only. PT Bank → v1.5.
- AI Tutor stub: slot-filled templates default; hand-authored copy for top 5–10 most-specific responses.
- Dark-only for v1. Light mode = future token swap.
- Source corpus accessed via build-time import script; **no copies in the repo**. `scripts/import-content.ts` reads `/Curriculum/Main Conclusion/...` and emits typed data into `/src/data/`.
- Gate 2 inventory: JSON source of truth + auto-generated Markdown view.
- Stage summaries + audit tally are **authoritative**. Live in spec.html §3/§4/§5. Tier S/A/B/C → preserve. Tier D → Table B with reason. The tally is a primary input to Gate 2, not a secondary cross-check.

## 1. Tech Stack — Recommended Lock

| Concern | Choice | Reason |
|---|---|---|
| Build | **Vite** | Per handoff §3.A. Fast HMR. First-class TS. ES modules out of box. |
| Language | **TypeScript** (strict) | Per handoff. Required for typed Persistence interface and content schemas. |
| UI framework | **React 18** | Per handoff. The `argumentslr` prototype already proves React works for these mechanics; the four vanilla-JS prototypes provide *patterns*, not architecture. See **Open Question #1** below. |
| Styling | **Tailwind CSS + CSS variables** | Tailwind for utility composition. Spec §3.1 design tokens (Aspiring Gold #E8D08B, surfaces, role colors) live as CSS variables and surface to Tailwind via `theme.extend.colors`. No reskin needs touching markup. |
| Routing | **React Router v6** (data router) | Per handoff. Six module routes + index. Loaders/actions used for module-level data hydration. |
| Persistence | **Adapter pattern**: `LocalStoragePersistence` (default) + `IndexedDBPersistence` (R&R audio + large drill artifacts) | Per handoff §6. App code only ever imports the `Persistence` interface. |
| State | **Zustand** (small, no provider tree) for UI state. **TanStack Query** for derived/cache around persistence reads | Lightweight. Avoids Redux ceremony. Easy to swap when LSAT U absorbs. |
| Audio (R&R) | **Browser MediaRecorder API** → blob → `IndexedDBPersistence` | Per spec §3.6.2. Desktop-primary, mobile fallback. |
| PDF export | **`window.print()` against a hidden formatted iframe** | Lifted from MC Companion (S/100% codebase). No server PDF library. Per spec §3.5 + §11 reusable code spine. |
| Markdown rendering | **`marked` + `dompurify`** for lesson body where authored as MD | Lessons may store voice prose as markdown to keep authoring sane. Sanitized on render. |
| Forms | Native React forms, **Zod** for schema validation | Zod schemas double as the persistence record types — single source of truth. |
| Testing | **Vitest + React Testing Library** for components; **Playwright** for keyboard / a11y / Stage-Gate flow | Vitest aligns with Vite. Playwright covers WCAG 2.1 AA gates from spec §3.7. |
| Linting | **ESLint** (typescript-eslint, react-hooks, jsx-a11y) + **Prettier** | jsx-a11y is non-negotiable given the a11y bar. |
| No backend | Confirmed | Per handoff §3 + §8. |
| No auth | Confirmed (stubbed `useUser()` returns placeholder) | Per handoff §3. |

### Tailwind config sketch

```ts
// tailwind.config.ts (sketch)
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // brand
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        'accent-deep': 'rgb(var(--accent-deep) / <alpha-value>)',
        // surfaces
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-2': 'rgb(var(--bg-2) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-elev': 'rgb(var(--surface-elev) / <alpha-value>)',
        // argument-structure roles (spec §3.1.1)
        'role-conclusion': 'rgb(var(--role-conclusion) / <alpha-value>)',
        'role-premise': 'rgb(var(--role-premise) / <alpha-value>)',
        'role-pivot': 'rgb(var(--role-pivot) / <alpha-value>)',
        'role-opposing': 'rgb(var(--role-opposing) / <alpha-value>)',
        'role-concession': 'rgb(var(--role-concession) / <alpha-value>)',
        'role-background': 'rgb(var(--role-background) / <alpha-value>)',
        // semantic
        success: 'rgb(var(--success) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['ui-serif', 'Iowan Old Style', 'Apple Garamond', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // spec §3.1.2 token names mapped to Tailwind scale
        display: ['36px', { lineHeight: '1.1', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['21px', { lineHeight: '1.25', fontWeight: '600' }],
        h3: ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['14px', '1.6'],
        'body-prose': ['15px', '1.7'],
        small: ['12.5px', '1.55'],
        mono: ['11.5px', { lineHeight: '1.5', fontWeight: '600' }],
        label: ['10.5px', { lineHeight: '1.4', fontWeight: '700' }],
      },
      borderRadius: {
        '2': '4px', '3': '8px', '5': '14px', '8': '24px',
      },
      spacing: {
        // 4px base unit per spec §3.1.3
        '1': '4px', '2': '8px', '3': '12px', '4': '16px',
        '6': '24px', '8': '32px', '12': '48px', '16': '64px',
      },
      screens: {
        // spec §3.6.1
        phone: { max: '600px' },
        tablet: { min: '601px', max: '900px' },
        desktop: { min: '901px' },
      },
      transitionDuration: { '150': '150ms', '180': '180ms', '220': '220ms' },
      transitionTimingFunction: { 'eased': 'cubic-bezier(0.4, 0, 0.2, 1)' },
    },
  },
};
```

---

## 2. Folder Structure

```
main-conclusion-bootcamp/
├── README.md
├── CLAUDE.md
├── MAIN_CONCLUSION_HANDOFF.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
├── index.html
│
├── docs/
│   ├── scaffolding-plan.md          ← this file
│   ├── reference-study.md           ← Gate 1 deliverable
│   ├── gate-1-open-questions.md     ← Gate 1 deliverable
│   └── parity/                      ← Gate 2 lives here
│       ├── CONTENT_INVENTORY.md     (Gate 2)
│       ├── CONTENT_PARITY_MAP.md    (Gate 2)
│       └── NOT_INCLUDED_IN_V1.md    (Gate 2)
│
├── public/
│   └── fonts/                       ← Outfit + JetBrains Mono self-hosted
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes.tsx
    │
    ├── styles/
    │   ├── tokens.css               ← :root CSS variables (spec §3.1)
    │   ├── base.css                 ← reset, typography defaults
    │   └── print.css                ← spec §3.5 print stylesheet
    │
    ├── data/                       ← BUILD OUTPUT. Generated by scripts/import-content.ts.
    │   │                             Typed JSON emitted from canonical /Curriculum/. .gitignore-d.
    │   ├── lessons.generated.json
    │   ├── reference.generated.json
    │   ├── drills.generated.json
    │   ├── simulator.generated.json
    │   ├── hard-sentences.generated.json
    │   ├── named-tools.generated.json     ← 15 entries from lexicon
    │   ├── voice-passages.generated.json  ← preserve-verbatim registry
    │   └── manifest.generated.json        ← parity manifest (id → source path)
    │
    ├── content/                     ← AUTHORED in-repo only. Schemas, types, voice rules.
    │   │                             Real content does NOT live here; data/ is the runtime surface.
    │   └── schemas.ts               ← Zod schemas for every content shape
    │
    ├── modules/                     ← one folder per module route
    │   ├── lessons/
    │   ├── reference/
    │   ├── drills/
    │   ├── simulator/
    │   ├── hard-sentences/
    │   └── diagnostics/
    │
    ├── components/                  ← shared component library (spec §3.2)
    │   ├── primitives/              ← buttons, tabs, chips, inputs, drawer
    │   ├── stage-gate/              ← StageGateTracker, StageButton, etc.
    │   ├── indicator-vault/         ← chip card, category card
    │   ├── coachs-note/             ← per-question explanation card
    │   ├── x-ray-scan/              ← role-color overlay toggle
    │   ├── trap-master/             ← trait tag, deep-dive modal
    │   ├── argument-structure-map/  ← SVG component for valid/invalid
    │   ├── cluster-decomposer/      ← specifier peel-off
    │   ├── rr-recorder/             ← MediaRecorder + IndexedDB
    │   └── workspace-shell/         ← left rail / canvas / right drawer
    │
    ├── persistence/
    │   ├── Persistence.ts           ← interface (the contract)
    │   ├── LocalStoragePersistence.ts
    │   ├── IndexedDBPersistence.ts  ← R&R audio + large drill artifacts
    │   ├── records.ts               ← Zod schemas for every persisted record
    │   └── index.ts                 ← exposes the active adapter via factory
    │
    ├── hooks/
    │   ├── useUser.ts               ← stubbed user; LSAT U swap-in surface
    │   ├── usePersistence.ts        ← adapter access
    │   ├── useStageGate.ts          ← drill stage progression
    │   ├── useTrapTags.ts           ← simulator trait tagging
    │   └── useReducedMotion.ts      ← respects prefers-reduced-motion
    │
    ├── analytics/
    │   ├── events.ts                ← LSAT-U-ready event taxonomy
    │   └── recorder.ts              ← v1: writes to persistence; v1.5 swaps in real sink
    │
    ├── lib/
    │   ├── pdf.ts                   ← window.print() iframe technique
    │   ├── audio.ts                 ← MediaRecorder helpers
    │   └── ids.ts                   ← UUIDv4 + ISO-8601 helpers
    │
    └── types/
        └── source-slots.ts          ← source_item_id, question_id, etc. (handoff §6)
```

### Why this layout

- **`src/data/` is the runtime corpus, generated by `scripts/import-content.ts`.** Source of truth lives at `/Curriculum/Main Conclusion/...` — the build script reads canonical sources, validates against Zod schemas in `src/content/schemas.ts`, and emits typed `*.generated.json` plus a `manifest.generated.json` (id → canonical source path, used by Gate 5 parity verification). `src/data/` is `.gitignore`'d; CI runs `npm run import` before build.
- **`src/modules/` per-route**, not per-feature, because each module is its own pedagogical surface (Lessons vs Drills are not interchangeable).
- **`src/components/`** holds the spec §3.2 component library. `primitives/` is the only folder where 21st.dev MCP outputs land. Layouts (workspace-shell) come from direct reference study.
- **`src/persistence/` is firewalled** — only the index.ts factory exports the adapter. Grep for `localStorage` / `indexedDB` anywhere else = lint error.
- **`src/types/source-slots.ts`** holds the `source_item_id`, `question_id`, `lesson_id`, `named_tool_id`, `reference_id`, `trap_tag`, `correct_choice_id`, `review_queue_status`, `parity_status` slots from handoff §6. Components requiring these slots type-check against this file.

---

## 3. Persistence Adapter Sketch

```ts
// src/persistence/Persistence.ts
export interface Persistence {
  // generic typed records
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;

  // R&R audio (binary blobs, large)
  putBlob(key: string, blob: Blob): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  deleteBlob(key: string): Promise<void>;

  // batched writes (e.g. drill stage commit)
  transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T>;
}

export interface PersistenceTx {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}
```

```ts
// src/persistence/index.ts
import { LocalStoragePersistence } from './LocalStoragePersistence';
import { IndexedDBPersistence } from './IndexedDBPersistence';
import type { Persistence } from './Persistence';

// Composite: scalar records → localStorage; blobs and bulky records → IDB.
class V1Persistence implements Persistence { /* delegates by key prefix */ }

export const persistence: Persistence = new V1Persistence(
  new LocalStoragePersistence(),
  new IndexedDBPersistence(),
);

// LSAT U absorption: replace the export above with `new SupabasePersistence(...)`.
// One-file change.
```

### Schema design

- **UUIDv4** for every record id.
- **ISO 8601** for every timestamp.
- **Zod schemas** in `persistence/records.ts` are the canonical record shapes; same schemas serve as future Supabase table types via `zod-to-supabase` codegen at absorption time.
- **Partition keys** prefix all records with `student:{userId}:` so Supabase Row-Level Security maps cleanly later. v1 `userId` is the stub from `useUser()`.

### Record types (initial set, expand at Gate 2/3)

`progress.module.{moduleId}` · `progress.lesson.{lessonId}` · `drill.stagegate.{drillId}` · `simulator.attempt.{attemptId}` · `traps.tag.{questionId}.{attemptId}` · `rr.recording.{recordingId}` (blob) · `rr.review.{recordingId}` · `mistakes.profile` · `srs.queue` · `journal.entry.{entryId}` · `prefs.user`.

---

## 4. Design Tokens (lifted from spec §3.1, locked unless Joshua overrides)

### Brand
- `--accent: 232 208 139;` /* #E8D08B Aspiring Gold */
- `--accent-hover: 242 223 154;` /* #F2DF9A */
- `--accent-deep: 197 160 89;` /* #C5A059 */
- `--accent-dim: rgba(232,208,139,0.10);`

### Surfaces (dark default)
- `--bg: 5 7 10;` /* #05070a */
- `--bg-2: 11 17 32;` /* #0b1120 */
- `--surface: 18 21 30;` /* #12151e */
- `--surface-elev: 26 30 43;` /* #1a1e2b */
- `--border: rgba(255,255,255,0.08);`

### Argument-structure role colors
- `--role-conclusion: 16 185 129;` /* #10b981 green */
- `--role-premise: 96 165 250;` /* #60a5fa blue */
- `--role-pivot: 249 115 22;` /* #f97316 orange */
- `--role-opposing: 168 85 247;` /* #a855f7 purple */
- `--role-concession: 250 204 21;` /* #facc15 yellow */
- `--role-background: 148 163 184;` /* #94a3b8 slate */

### Semantic
- `--success: 16 185 129;` · `--warn: 250 204 21;` · `--error: 239 68 68;` · `--info: 56 189 248;`

### Type
- Outfit (sans), JetBrains Mono (mono), system serif (long-form prose).
- Scale: display 36/h1 28/h2 21/h3 17/body 14/body-prose 15/small 12.5/mono 11.5/label 10.5.
- Voice-to-typography: Register 2 (whimsical) → serif; Register 1 (decisive) → sans + mono callouts.

### Spacing & radius
- 4px base unit. `--s-1 4 / --s-2 8 / --s-3 12 / --s-4 16 / --s-6 24 / --s-8 32 / --s-12 48 / --s-16 64`.
- Radius: `--r-2 4 (chips/tags) / --r-3 8 (cards) / --r-5 14 (drill containers) / --r-8 24 (stage cards) / --r-full 9999`.

### Motion
- 150–220 ms, eased (`cubic-bezier(0.4, 0, 0.2, 1)`). No spring, no overshoot, no parallax.
- All animations gated on `prefers-reduced-motion`.

### Accessibility
- WCAG 2.1 AA contrast verified in spec §3.7.1 for every color × surface combination.
- Color is **never the only signal** — every role color paired with text label, icon, or numeric position.

---

## 5. Routing Map (locks at Gate 3)

```
/                         → Home / module index
/lessons                  → M1 list
/lessons/:lessonId        → individual lesson
/reference                → M2 vault landing
/reference/indicators     → indicator vault
/reference/named-tools    → named tools lexicon
/drills                   → M3 list
/drills/:drillId          → individual drill (Stage-Gate)
/simulator                → M4 simulator
/simulator/:questionId    → answer card + Coach's Note
/simulator/trap-master    → trap diagnostic
/hard-sentences           → M5 sub-module
/diagnostics              → M6 dashboard
/diagnostics/mistake-profile
/diagnostics/srs          → spaced-repetition queue
/journal                  → cross-cutting student journal (right drawer)
/settings                 → prefs (theme, motion, audio device)
```

Plus: command palette (Cmd+K) navigates anywhere; right drawer opens in-place for audit / coach / reference / journal (handoff §6 three-zone shell).

---

## 6. What Gate 1 deliberately does NOT decide

These wait for later gates so they aren't decided in a vacuum:
- **Final module count** (locks at Gate 3 after Gate 2 inventory).
- **Drill-by-drill Stage-Gate config** (Gate 2 surfaces actual drill content).
- **Trap Master 7-trait taxonomy data shape** (Gate 2 reads masterclass workbooks).
- **AI Tutor stub response templates** (Gate 4 per-module).
- **Diagnostic engine scoring math** (Gate 3 / Gate 4).

---

## 7. Initial dependency list

```
Production:
  react ^18, react-dom ^18, react-router-dom ^6.22
  zustand ^4, @tanstack/react-query ^5
  zod ^3.23, marked ^12, dompurify ^3
  uuid ^9, date-fns ^3
  idb ^8 (IndexedDB wrapper)
  clsx ^2, tailwind-merge ^2

Dev:
  vite ^5, @vitejs/plugin-react ^4
  typescript ^5.4
  tailwindcss ^3.4, postcss, autoprefixer
  eslint, @typescript-eslint/*, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y
  prettier
  vitest ^1, @testing-library/react, @testing-library/jest-dom, jsdom
  @playwright/test
```

---

## 8. What unlocks production code

Gate 1 sign-off → start Gate 2 (content inventory). **No production code lands until Gate 3 architecture sign-off.** Gate 2 work is read-only inventory plus parity-artifact authoring under `/docs/parity/`.

If Joshua approves Gate 1 + Gate 2 together, scaffolding can install dependencies and stand up the empty shell at the start of Gate 3 work, but module code waits for Gate 3 sign-off.
