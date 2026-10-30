---
name: lsat-u-topic-builder
description: Audit-driven bootstrap for a new LSAT U topic bootcamp. Walks the topic's source corpus, tier-grades every file (S/A/B/C/D), scans the Mac for related files outside /Curriculum/, identifies content gaps, anchors the quality bar to Causation Station / Abstraction (coaching tone, comprehensive, guiding), then generates the project folder with audit findings baked into all four files. Use when Joshua wants to start a new LSAT U topic bootcamp (Causation, Comparison, Necessary Assumption, Conditional Logic, etc.) and have the build start from real corpus knowledge, not generic templates. Trigger phrases include "create a new LSAT U topic bootcamp", "spin up a [topic] bootcamp", "audit and init [topic]", "replicate Main Conclusion for [topic]", "scaffold [topic] project".
---

# LSAT U Topic Builder (v2: Audit-Driven Bootstrap)

## When to use this skill

Trigger when Joshua wants to start a new LSAT U topic bootcamp build. The skill replicates the Main Conclusion four-stage workflow into a new topic project, but does the work upfront so Claude Code starts Gate 0 with audited corpus, identified gaps, and topic-specific quality bar already established.

Do NOT trigger mid-build on an existing topic, for shipped topic refactors, or for general workflow discussion.

## What changed from v1

v1 was folder bootstrap with placeholder templates. v2 actually does Stage 1 work (audit + grading + gap analysis) before generating files. The resulting handoff and PROJECT_MEMORY.md are pre-populated with real findings: tier-graded source list, identified named tools, content gaps, scan-discovered additional files, quality bar specifics. Claude Code starts at Gate 0 with substantive context, not "TBD at Gate 1" everywhere.

Trade-off: v2 takes ~20-40 minutes to run vs v1's ~3 minutes. The output is substantially better.

## Three phases

- **Phase A**: Topic Audit (scan, grade, gap-flag, Mac-wide search)
- **Phase B**: Quality Benchmarking (anchor to Causation Station / Abstraction + external references; lock coaching tone)
- **Phase C**: Project Bootstrap + Claude Code Handoff

---

## PHASE A: TOPIC AUDIT

### A1. Inventory the topic folder

Bash-list `/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/{Topic}/`. Capture:
- Files in `Notes/`: filename, extension, file size, modification date
- Files in `Homework/`: same
- Any `_scan_*` files (later additions)
- Any `_megadoc_*` files (pre-consolidated syntheses)
- Any `_export_*/` folder (prior Cowork audit work — if exists, mine it as starting point)

Report: total file count, breakdown by source type (original / megadoc / scan), list every file by name.

### A2. Scan the rest of the Mac for related files NOT already in /Curriculum/{Topic}/

Topics other than Main Conclusion may have related material scattered in other folders (Desktop, Downloads, iCloud Drive, other project folders). Find them.

**Recommended approach (in order of preference):**

1. **Spotlight via osascript** (driven by computer-use tool):
   - Open Terminal, run `mdfind -name {topic-keyword} | grep -v "Curriculum/{Topic}/"`
   - Examples for Causation: `mdfind "causation" -onlyin ~/Documents -onlyin ~/Desktop -onlyin ~/Downloads`
   - Capture results, dedupe by filename + size match against /Curriculum/{Topic}/
2. **Computer-use Finder Spotlight**:
   - Open Finder, Cmd+Space for Spotlight, search topic keywords
   - Filter results to file types: PDF, docx, md, txt
   - Compare against existing corpus
3. **Manual prompt to Joshua**:
   - If automated scan isn't feasible, ask Joshua: "Are there topic-related files outside /Curriculum/{Topic}/ that should be scanned? Common spots: Desktop, Downloads, iCloud, other project folders."

**Filter for non-duplicates:**
- Filename match against existing corpus
- File-size match within 5% (catches near-duplicates with renames)
- For PDFs, also compare first-100-bytes hash if size matches

**Report:**
- Found-and-relevant files (full path, why it looks relevant)
- Found-but-likely-duplicate files (with the duplicate-of pointer)
- Suggest moving relevant non-duplicate files into `/Curriculum/{Topic}/Notes/` or `/Homework/` as `_scan_{filename}`

### A3. Check for prior Cowork audit work

Look for `/Curriculum/{Topic}/_export_*/`. If exists, use the prior tier grading and audit notes as the starting point for A5 (don't re-grade from scratch).

If no prior export exists, ask Joshua once: "Is there a prior Cowork conversation that audited this topic? If so, paste the export folder path or the audit summary."

### A4. Read every source file

Open and read every file from A1 + A2 (relevant non-duplicates). For each:
- Filename, format, length
- One-paragraph summary of unique teaching content
- Overlap with other files (which already-read files cover the same ground)
- Uniqueness (what does this file say that nothing else does)
- Quotable passages, strong examples, distinctive framings worth preserving
- Voice register samples (Register 1 decisive vs Register 2 whimsical)
- Named tools mentioned (with name and definition if given)
- Worked examples that should be preserved verbatim

This is the heaviest cognitive step. Process megadocs first (pre-consolidated), then originals, then scans.

### A5. Tier-grade each source file (S/A/B/C/D)

Use the rubric below. Score each file on each dimension, then assign overall tier.

**Rubric dimensions:**
1. Pedagogical clarity (does this teach well?)
2. Factual rigor (is this LSAT-correct?)
3. Completeness (does this cover the concept fully?)
4. Student-facing tone (would a student understand it?)
5. Voice strength (does Joshua's two-register voice come through?)
6. Visual teaching (does this use diagrams / tables / examples effectively?)
7. Interaction design (could this become a drill / simulator with minor adaptation?)
8. Technical polish (is the writing clean?)
9. LSAT U integration coherence (does this fit the rest of the curriculum?)
10. Uniqueness multiplier (does this say something nothing else does? Caps grade if fully redundant)

**Tier definitions:**
- **S**: Gold standard. Foundation of the bootcamp. Preserve verbatim where possible.
- **A**: Strong. Contributes substantially. Use heavily.
- **B**: Usable. Some unique pieces worth keeping; integrate selectively.
- **C**: Weak but at least one useful unique block. Mine that block, drop the rest.
- **D**: Low quality and no unique content. Recommend deletion.

**Output per file:** filename, tier, 1-3 sentence reasoning, what to preserve, what to drop.

### A6. Build the repetition map

Cluster files by content overlap. For each cluster (concept covered by multiple files), name the cleanest version and mark the rest as drops.

This produces the "use this version, drop these" list that feeds Gate 2 deduplication.

### A7. Identify content gaps

Compare the audited corpus against the six-module bootcamp structure:
1. **Lessons**: does the corpus have enough conceptual teaching for a progressive lesson sequence?
2. **Reference Vault**: enough reference material for a searchable concept reference?
3. **Indicator Vault**: applicable to this topic? If yes, enough indicator entries?
4. **Drills + Calibration**: enough drill items? Enough calibration questions (separate from drill content)?
5. **Question Simulator + Trap Master**: enough simulator-quality questions with answer choices?
6. **Reading Hard Sentences**: applicable to this topic? If yes, enough cluster-sentence material?
7. **Diagnostics + Mistake Profile**: enough material for diagnostic clustering?

For each module, output: `sufficient` / `marginal` / `insufficient`. If insufficient, note what's missing and recommend either (a) authoring new content, (b) deferring the module to v1.5, or (c) merging with another module.

### A8. Output the audit report

Save to `/Users/joshuaf/Documents/Claude/02_PROJECTS/{slug}-bootcamp/AUDIT_REPORT.md` (created in Phase C). Includes:
- File rankings (S/A/B/C/D, every file with reasoning)
- Repetition map (clusters with chosen-version + drops)
- Garbage list (Tier D, with reason)
- Mac-wide scan results (relevant non-duplicates + suggested moves)
- Per-module gap analysis (`sufficient` / `marginal` / `insufficient`)
- Visual / interaction opportunities specific to this topic
- "Golden version" brainstorm (what the topic's bootcamp should include given the corpus)
- Strong opinionated recommendations (combine / absorb / invent / drop)

This becomes the audit deliverable Joshua reviews before greenlighting Phase C.

---

## PHASE B: QUALITY BENCHMARKING

### B1. Anchor to internal LSAT U benchmarks

The bootcamp must match or exceed:
- **Causation Station** for dashboard, drills, flashcards, journal, progress, analytics. The LSAT U internal quality bar.
- **Abstraction** for progressive teaching, intro screens, reveal sequence, typed student response, coach translation, AI feedback pattern.

Note: the topic being built is NOT Main Conclusion (this skill is for OTHER topics). So Main Conclusion itself is also an internal benchmark once it ships.

### B2. Anchor to external references

- **Linear**: navigation density, command palette, sidebar hierarchy, status chips
- **Readwise Reader**: reading-first layout, source-backed highlights, annotation flow
- **Superhuman**: keyboard-first speed, command surfaces, dense action states
- **Anki**: review queue seriousness, spaced repetition flow
- **UWorld**: answer explanation seriousness, per-choice rationale

### B3. Lock the coaching tone

Every topic bootcamp feels like coaching, not testing. Specifically:
- The student is guided through concepts, not quizzed cold.
- Mistakes get diagnosed with named-tool callouts and specific rephrases, not "wrong, try again."
- Voice (both registers) is preserved verbatim where possible.
- Comprehensive: use the most material the corpus offers without padding.
- Interactive: every screen has a meaningful action surface (commit-before-reveal, audit drawer, role tagger, hard-sentence parser, etc.).
- Coach drawer surfaces named-tool guidance after every commit.

### B4. Define topic-specific quality bar

From the audit (Phase A), surface:
- **Topic's named tools** (FABS-style pedagogical instruments specific to this topic, found in the corpus). Pre-seed in PROJECT_MEMORY.md.
- **Topic's worked examples** (the cake-on-blocks-equivalent for this topic). Mark for verbatim preservation.
- **Topic's voicy passages** (Register 2 metaphors, ALL-CAPS character beats, named characters like "Sophie Spradlin"). Mark for verbatim preservation.
- **Topic-specific traps** (the Trojan-Horse-equivalent trap patterns for this topic).
- **Topic-specific module fit**: the six-module default may not fit. Some topics may need fewer modules or different modules. Surface the recommendation.

### B5. Mark topic-specific deviations from the Main Conclusion baseline

Some topics won't have:
- Netlify prototype source (Main Conclusion specific). Drop §4B from the inventory in this topic's handoff.
- 6 prototype apps as references. Adjust scouting plan accordingly.
- The same six-module fit. Allow architecture deviation at Gate 3.

Some topics may add:
- Additional named tools not in the cross-topic baseline.
- Topic-specific reference vault sections (e.g., for Conditional Logic: contrapositive rules, syllogism patterns).
- Topic-specific interaction patterns (e.g., for Conditional Logic: rule-translator drills).

Document these in the handoff under a new section "TOPIC-SPECIFIC DEVIATIONS FROM BASELINE."

---

## PHASE C: PROJECT BOOTSTRAP

### C1. Confirm inputs with Joshua (one batch)

After audit + benchmarking, ask Joshua:
- Confirm the proposed module list (default six, or audit-recommended deviation)
- Confirm the topic-specific named tools list (audit-extracted)
- Confirm worked examples to preserve verbatim
- Confirm the topic should ship standalone or repo-native
- Confirm route target if repo-native
- Confirm any audit-flagged gaps should be filled by author (Joshua), filled by Claude with review, or deferred to v1.5

### C2. Create the project folder

Use Write tool at `/Users/joshuaf/Documents/Claude/02_PROJECTS/{topic-slug}-bootcamp/{filename}`. Auto-creates folder.

### C3. Populate templates with AUDIT-INFORMED substitutions

Read each template in this skill's `templates/` folder. Substitute placeholders + bake in audit findings:

**Standard substitutions:**
- `{{TOPIC_NAME}}`, `{{TOPIC_SLUG}}`, `{{TOPIC_NAME_UPPER}}`, `{{PROJECT_FOLDER}}`, `{{CURRICULUM_PATH}}`, `{{NAMED_TOOLS}}`, `{{ROUTE_TARGET}}`, `{{NETLIFY_PROTOTYPES}}`, `{{DATE}}`, `{{HANDOFF_FILENAME}}`, `{{TARGET_MODE}}`

**v2 audit-informed substitutions:**
- `{{TIER_S_FILES}}`: list of S-tier files for this topic
- `{{TIER_A_FILES}}`: list of A-tier files
- `{{TIER_B_FILES}}`: list of B-tier files
- `{{TIER_C_FILES}}`: list of C-tier files (with which-block-only annotation)
- `{{TIER_D_FILES}}`: list of files recommended for deletion
- `{{REPETITION_CLUSTERS}}`: clusters with chosen-version + drops
- `{{CONTENT_GAPS}}`: per-module gap analysis with sufficient/marginal/insufficient + remediation
- `{{MAC_SCAN_RESULTS}}`: relevant non-duplicates found outside /Curriculum/{Topic}/
- `{{TOPIC_NAMED_TOOLS}}`: topic-specific named tools (audit-extracted)
- `{{TOPIC_WORKED_EXAMPLES}}`: worked examples to preserve verbatim
- `{{TOPIC_DEVIATIONS}}`: deviations from the Main Conclusion baseline

### C4. Generate AUDIT_REPORT.md

Write the full audit report (from Phase A8) to `/{slug}-bootcamp/AUDIT_REPORT.md`. This is Joshua's reference for Gate 2 inventory work.

### C5. Output Claude Code kickoff

```
Read {HANDOFF_FILENAME}, CLAUDE.md, PROJECT_MEMORY.md, and AUDIT_REPORT.md in this folder. The audit report is your starting baseline for Gate 2 — don't re-audit from scratch, build from it.

Step 1: Restate the 8-point understanding from the handoff.
Step 2: Run Gate 0 (source-access check). Verify every path in the handoff Section 9 exists and is readable. AUDIT_REPORT.md gives you the file list to verify.
Step 3: Wait for my approval before any further action.
```

### C6. Summarize and stop

Tell Joshua:
- Project folder path
- Files created (5 of them: handoff, CLAUDE, PROJECT_MEMORY, README, AUDIT_REPORT)
- Audit summary (file counts by tier, module sufficiency, gap-flagged modules)
- Pending items he owes (URLs, optional UX research packet, decisions on flagged gaps)
- The kickoff prompt to paste into Claude Code

Stop. Joshua opens Claude Code, points it at the new folder, pastes the kickoff.

---

## PHASE D: CLAUDE CODE HANDOFF

Same as v1 — Joshua opens Claude Code on the new folder, pastes the kickoff prompt, Gate 0 begins. The difference: Claude Code's Gate 1 and Gate 2 work starts from the audit report, not from scratch. ~50% time savings on those gates because the corpus walk is already done.

---

## What this skill does NOT do

- Does not run Gate 0. Joshua + Claude Code do that after kickoff.
- Does not modify Main Conclusion files or any other topic's files.
- Does not delete or move existing topic folders without Joshua's explicit approval.
- Does not commit to git or push anywhere.
- Does not connect to Claude Design or external services.
- Does not claim a topic has enough material when the audit says insufficient — surfaces the gap honestly.

---

## Cross-topic baseline rules (seeded into PROJECT_MEMORY.md)

The 14 rules from Main Conclusion are pre-seeded as the starting baseline. Each new topic project inherits them and adds topic-specific rules as patterns surface.

Same for Tools Approved / Rejected and the Quality Bar — pre-seeded from Main Conclusion's table.

---

## Versioning

This is v2: audit-driven bootstrap. v1 was placeholder-template bootstrap.

v3 (after 2-3 topic projects ship using v2): refine based on patterns observed. Specifically:
- Lock topic-specific named-tools registry per topic
- Auto-detect topic module fit (some topics = 6 modules, some = 4, some = 8)
- Auto-detect Mac-wide scan keywords from topic name + corpus content
- Lock the Gate 1 scaffolding plan template
- Optional: package as plugin for proper auto-trigger across Cowork + Claude Code

---

## How Joshua invokes this skill

In any Claude session (Cowork or Claude Code):
- "Run lsat-u-topic-builder for Causation"
- "Audit and init Necessary Assumption"
- "Spin up a Comparison bootcamp"
- "Bootstrap Conditional Logic with full audit"
- Or trigger by phrase

Manual invocation if not yet auto-installed:
> "Read the skill at `/Users/joshuaf/Documents/Claude/02_PROJECTS/skills/lsat-u-topic-builder/SKILL.md` and follow it to audit and bootstrap the {topic} bootcamp."
