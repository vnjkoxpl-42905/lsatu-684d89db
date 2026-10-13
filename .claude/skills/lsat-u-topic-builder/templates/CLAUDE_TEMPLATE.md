# Claude Code Project Context: {{TOPIC_NAME}} Bootcamp

## YOUR PRIMARY INSTRUCTION SET

Read `{{HANDOFF_FILENAME}}` in this folder. That is your control document. Follow it exactly. Do not skip gates.

Whenever you start a session in this folder, your first action is to confirm you have read `{{HANDOFF_FILENAME}}` and to restate the 8-point understanding from Section 10 of that document.

## PROJECT TYPE

{{TARGET_MODE}} v1 web app. Future LSAT U absorption is planned but out of scope for v1 (if standalone) or this is repo-native targeting `{{ROUTE_TARGET}}` (if repo-native).

## CRITICAL RULES

1. **The curriculum corpus is the product. A beautiful app that loses the question bank is a failed build.**
2. **No reviewed source question, drill, homework item, diagnostic item, example, named tool, voice passage, or reference section may be omitted silently. Missing content is a build failure.**
3. Netlify prototypes (where relevant to {{TOPIC_NAME}}) are reference sources AND extraction sources.
4. Architecture stays clean enough that future LSAT U absorption is a layer swap, not a rewrite.
5. Persistence is adapter-pattern: app code talks to a `Persistence` interface, never localStorage / IndexedDB / Supabase directly.
6. Quality bar: match or exceed Causation Station and Abstraction. Generic SaaS, gamification, marketing heroes, vanity metrics, decorative animations are rejected.
7. 21st.dev MCP is for primitive components only. Direct reference apps (Linear, Readwise, Superhuman, Anki, UWorld, Causation Station, Abstraction) are for layouts.
8. **User modifications are authoritative and must be emphasized, never silently absorbed.** Whenever Joshua edits any file in this project OR overrides a decision in chat, you MUST: (a) detect the change, (b) acknowledge it explicitly in the next response with a "JOSHUA OVERRIDE" or "JOSHUA EDIT" callout, (c) log it in the Decisions Log of PROJECT_MEMORY.md as a new dated row, (d) treat the user version as authoritative — never revert, (e) if the change conflicts with an existing rule or decision, surface the conflict and ask which wins before proceeding.

## GATE STRUCTURE

You do not skip gates. Each gate is explicit, blocking, and requires Joshua's written sign-off.

- **Gate 0**: Source-Access Check
- **Gate 1**: Project Scaffolding and Reference Study
- **Gate 2**: Content-Scope Inventory
- **Gate 3**: Architecture Plan
- **Gate 4**: Module-by-module build review (per module)
- **Gate 5**: Pre-merge final review

## SOURCE PATHS (CANONICAL)

- Topic Notes corpus: `{{CURRICULUM_PATH}}Notes/`
- Topic Homework corpus: `{{CURRICULUM_PATH}}Homework/`
- Prior audit export (if exists): `{{CURRICULUM_PATH}}_export_*/`
- Topic project memory (curriculum-level): `{{CURRICULUM_PATH}}_PROJECT.md` (if exists)
- Netlify prototypes: `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Netlify/`
- This project: `{{PROJECT_FOLDER}}`

## TECH STACK DEFAULTS (LOCK AT GATE 3)

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Persistence adapter pattern (LocalStorage + IndexedDB in v1, Supabase swap-in path)
- No backend in v1
- No auth in v1 (stubbed)

## NAMED TOOLS FOR THIS TOPIC (PRESERVE EXACTLY)

{{NAMED_TOOLS}}

(If "TBD at Gate 1," surface a named-tools inventory question to Joshua during Gate 1 corpus walk.)

## VOICE (PRESERVE BOTH REGISTERS)

- **Register 1** (decisive, verdict-style, procedural): Reference, Question Simulator, drill instructions.
- **Register 2** (whimsical, parodic, metaphor-led): Lessons, drill setup.

Tighten ALL-CAPS. Cap confidence-calibration phrasing to once per module. Never rewrite Joshua's voice into generic editor tone.

## FIRST RESPONSE EVERY SESSION

1. Confirm you have read `{{HANDOFF_FILENAME}}` and `PROJECT_MEMORY.md`.
2. Restate the 8-point understanding from the handoff Section 10.
3. Run Gate 0 (source-access check). Report results.
4. Wait for Joshua's approval before any further action.

Do not write production code, propose architecture, or make file modifications until Joshua has signed off the relevant gate.

Generated: {{DATE}}
