# Platform motion verification, 2026-10-22

Implemented on `codex/platform-motion-20261022`. Local only. No push or deployment.

## What moves

- Main classroom sidebar active background: GSAP transform-only travel, 380ms power3.out.
- Classroom destination/view content: scoped GSAP entrances and native-scroll reveals; persistent headings/navigation remain still.
- Mobile left navigation and right section list: 300ms entrance, 180ms exit; modal focus and body scroll lock remain active through exit.
- Reading Center entry pages, teacher workspace rooms and student dossier tab bodies: local ownership prevents ancestor/descendant double animation.
- Whiteboard toolbar: entry only. Drawing canvas is explicitly excluded. Active reading, recall and drill work remains stable.
- Existing RC Sheet and question-finder portal animations retain their own lifecycle; GSAP does not transform their ancestors or replace their focus management.

## Signed-in browser checks

Used the real application at `http://127.0.0.1:8120`, signed in normally by Joshua. Normal backend, not the synthetic RC harness. Verified with Codex browser interactions and screenshots:

| Area | Checks |
|---|---|
| Classroom | Home, My Work, Review, Library, Progress, Practice, Inbox navigation; selected label contrast |
| Practice | LR/RC switching, RC builder entry, Customize drawer open/Cancel, question finder open/close |
| Progress | Overview, History, scroll layout; responsive matrix below |
| Reading Center | Dashboard and Speed Reading navigation; corrected selected label contrast; SVG icons replace broken icon-font words |
| Teacher | Workspace and student list entry, existing student dossier/Notes tab; surrounding navigation remains stable |
| Whiteboard | Toolbar entrance and untransformed drawing canvas, without choosing a student or drawing |
| Mobile panels | Left menu and right Notes list entrance/exit; background scroll lock; focus restored after close |
| Reduced motion | Real mobile menu opens with transform none; navigation closes it immediately and restores body overflow |

Progress page geometry at actual CSS viewport widths: 320, 390, 768, 980, 1440. No document horizontal overflow. Reading Center library additionally inspected at 390px. Internal analytics tables/carousels retain their intended horizontal scrolling.

Screenshots and a timestamp-preserving real-navigation recording are in `C:/Users/Joshu/Downloads/LSAT-U-Motion-Studies-2026-10-22/`. `platform-navigation.mp4` records Home, Library and Progress navigation from the signed-in application.

## Automated proof

- `npm run typecheck`: passed.
- `npm run build`, including prebuild content checks and postbuild canonical-content check: passed.
- 148 tests across 11 targeted files: passed. Covers motion identity and exclusions, rail measurements/cleanup/reduced motion, overlay presence/focus/scroll-lock/reopen/failure paths, shell navigation, destinations, Analytics, Practice and Reading Center navigation.
- Existing non-fatal build warnings remain: ambiguous Tailwind utilities, missing `/noise.png`, mixed static/dynamic imports, large chunks. No changes made to address unrelated warnings.
- The Lovable build regenerates the MCP bundle locally. Its unrelated output was restored exactly to HEAD and is excluded from this change.

## Limits

This verifies major navigation surfaces, not every button or full application workflow. No timed drills launched, no messages sent, no assignments or payments changed, and no drawing saved during browser checks. Existing records were read through normal UI navigation. Active exercise screens are deliberately excluded from choreography, rather than being exercised to completion for a presentation-only change.

The earlier motion implementation received exactly two Claude Opus inspection rounds. This later platform extension and its final corrections have automated and signed-in browser verification, but no additional independent Claude inspection. Do not label the extension Claude-approved.

Run `node scripts/verification/start-platform-motion-preview.mjs` for the real local app with normal authentication. It omits the development MCP bundler plugin. The live production site remains unchanged.
