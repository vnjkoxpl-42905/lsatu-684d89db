# Claude Code Project Context: Main Conclusion / Argument Structure Bootcamp

## YOUR PRIMARY INSTRUCTION SET

Read `MAIN_CONCLUSION_HANDOFF.md` in this folder. That is your control document. Follow it exactly. Do not skip gates.

Whenever you start a session in this folder, your first action is to confirm you have read `MAIN_CONCLUSION_HANDOFF.md` and to restate the 7-point understanding from Section 10 of that document.

## PROJECT TYPE

Standalone v1 web app. NOT inside the LSAT U repo. This folder is its own self-contained project. Future LSAT U absorption is planned but out of scope for v1.

## CRITICAL RULES (FROM THE HANDOFF, REPEATED HERE FOR EMPHASIS)

1. **The curriculum corpus is the product. A beautiful app that loses the question bank is a failed build.**
2. **No reviewed source question, drill, homework item, diagnostic item, example, named tool, voice passage, or reference section may be omitted silently. Missing content is a build failure.**
3. The six Netlify prototypes are reference sources AND extraction sources. Any question, answer choice, explanation, drill, diagnostic, widget idea, or interaction pattern inside them must be inventoried.
4. Architecture stays clean enough that future LSAT U absorption is a layer swap, not a rewrite.
5. Persistence is adapter-pattern: app code talks to a `Persistence` interface, never localStorage / IndexedDB / Supabase directly.
6. Quality bar: match or exceed Causation Station and Abstraction. Generic SaaS, gamification, marketing heroes, vanity metrics, decorative animations are rejected.
7. 21st.dev MCP is for primitive components only. Direct reference apps (Linear, Readwise, Superhuman, Anki, UWorld, Causation Station, Abstraction) are for layouts.
8. **User modifications are authoritative and must be emphasized, never silently absorbed.** Whenever Joshua edits any file in this project OR overrides a decision in chat, you MUST: (a) detect the change, (b) acknowledge it explicitly in the next response with a "JOSHUA OVERRIDE" or "JOSHUA EDIT" callout, (c) log it in the Decisions Log of PROJECT_MEMORY.md as a new dated row, (d) treat the user version as authoritative — never revert, (e) if the change conflicts with an existing rule or decision, surface the conflict and ask which wins before proceeding. Never silently absorb a user edit. See Rule 14 in PROJECT_MEMORY.md for the full text.

## GATE STRUCTURE

You do not skip gates. Each gate is explicit, blocking, and requires Joshua's written sign-off.

- **Gate 0**: Source-Access Check
- **Gate 1**: Project Scaffolding and Reference Study
- **Gate 2**: Content-Scope Inventory
- **Gate 3**: Architecture Plan
- **Gate 4**: Module-by-module build review (per module)
- **Gate 5**: Pre-merge final review

## SOURCE PATHS (CANONICAL)

The build references content at these locations. They are outside this project folder:

- **Stage 1 to 3 spec**: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/spec.html`
- **Notes corpus**: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Notes/`
- **Homework corpus**: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Homework/`
- **Netlify prototypes**: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Netlify/`
- **Rules / decisions / voice / named-tools lexicon**: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/_export_2026-04-29/rules/`

You must request access if Claude Code's working directory does not include these. Joshua will grant it.

## TECH STACK DEFAULTS (LOCK AT GATE 3)

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Persistence adapter pattern (LocalStorage + IndexedDB in v1, Supabase swap-in path)
- No backend in v1
- No auth in v1 (stubbed)

## NAMED TOOLS (PRESERVE EXACTLY, NEVER RENAME)

FABS, 2-Part Conclusion Check, Skeptic's Ear Check, Upside Down Argument, Trojan Horse Concession, Pre-Phrase Goal, X-Ray Scan, Trap Master, Stage-Gate Tracker, R&R Drill.

## VOICE (PRESERVE BOTH REGISTERS)

- **Register 1** (decisive, verdict-style, procedural): Reference, Question Simulator, drill instructions.
- **Register 2** (whimsical, parodic, metaphor-led): Lessons, drill setup.

Tighten ALL-CAPS. Cap confidence-calibration phrasing to once per module. Never rewrite Joshua's voice into generic editor tone.

## FIRST RESPONSE EVERY SESSION

1. Confirm you have read `MAIN_CONCLUSION_HANDOFF.md`.
2. Restate the 7-point understanding from Section 10 of the handoff.
3. Run Gate 0 (source-access check) per Section 2 of the handoff. Report results.
4. Wait for Joshua's approval before any further action.

Do not write production code, propose architecture, or make file modifications until Joshua has signed off the relevant gate.
