# INSTALL: lsat-u-topic-builder skill

## What this skill does

Bootstraps a new LSAT U topic bootcamp project end-to-end, from folder creation through Claude Code handoff. Replicates the proven Main Conclusion workflow into a new topic folder. Triggered when Joshua wants to start a new topic build (Causation, Comparison, Necessary Assumption, etc. — any of the 21 LSAT U topics).

Output: a new project folder at `/Users/joshuaf/Documents/Claude/02_PROJECTS/{topic-slug}-bootcamp/` with four pre-populated files (handoff, CLAUDE.md, PROJECT_MEMORY.md, README), source corpus verified, and a paste-ready Claude Code kickoff prompt.

## Three ways to invoke

### Option A: Manual invocation (works today, no install needed)

In any Claude session (Cowork mode or Claude Code), say:

> "Read the skill at `/Users/joshuaf/Documents/Claude/02_PROJECTS/skills/lsat-u-topic-builder/SKILL.md` and follow it to bootstrap the {topic} bootcamp."

Replace `{topic}` with the topic name (e.g., "Causation"). Claude reads SKILL.md, follows the six-step workflow, generates the project folder.

This is the recommended way to use the skill right now while it's still v1 and unpackaged.

### Option B: Project-local CLAUDE.md reference (works in Claude Code today)

Add a one-liner to your shell or Claude Code's project-level CLAUDE.md so the skill is discoverable from any project:

```
The lsat-u-topic-builder skill at /Users/joshuaf/Documents/Claude/02_PROJECTS/skills/lsat-u-topic-builder/SKILL.md bootstraps a new topic bootcamp. Trigger when Joshua says "create a new LSAT U topic bootcamp", "spin up a [topic] bootcamp", "init bootcamp for [topic]", or similar.
```

### Option C: Plugin packaging (future, after 2-3 topic projects ship)

Once the skill is refined based on real usage across multiple topics, package it as a Claude Code plugin so it auto-installs and auto-triggers across both Cowork and Claude Code without manual invocation.

Plugin structure (future):
```
lsat-u-topic-builder.plugin/
├── plugin.json
└── skills/
    └── lsat-u-topic-builder/
        ├── SKILL.md
        └── templates/
            ├── HANDOFF_TEMPLATE.md
            ├── CLAUDE_TEMPLATE.md
            ├── PROJECT_MEMORY_TEMPLATE.md
            └── README_TEMPLATE.md
```

Install via: `claude plugin install lsat-u-topic-builder.plugin` (or distributed via a marketplace).

## Folder layout

```
/Users/joshuaf/Documents/Claude/02_PROJECTS/skills/lsat-u-topic-builder/
├── SKILL.md            ← main skill file with workflow + metadata
├── INSTALL.md          ← this file
└── templates/
    ├── HANDOFF_TEMPLATE.md       ← {TOPIC}_HANDOFF.md template
    ├── CLAUDE_TEMPLATE.md        ← CLAUDE.md template
    ├── PROJECT_MEMORY_TEMPLATE.md ← PROJECT_MEMORY.md template (14-rule baseline)
    └── README_TEMPLATE.md        ← README.md template
```

## How to use after invocation

1. Joshua: "Run lsat-u-topic-builder for Causation"
2. Claude: verifies `/Curriculum/Causation/` exists, reports Notes + Homework counts, asks confirming questions (one batch)
3. Joshua: confirms or "use defaults, go"
4. Claude: writes the four files into `/02_PROJECTS/causation-bootcamp/`
5. Claude: outputs the paste-ready Claude Code kickoff prompt
6. Joshua: opens Claude Code on the new folder, pastes the kickoff
7. Claude Code: runs Gate 0, reports

That's the loop.

## Updating the skill

Edit `SKILL.md` or any file under `templates/`. Changes apply on the next invocation. No rebuild needed.

When 2-3 topic projects have shipped:
1. Review each project's `PROJECT_MEMORY.md` "Lessons For Next Topic Project" section.
2. Promote stable lessons into `SKILL.md` (workflow improvements) or template files (baseline rule additions).
3. Bump version in `SKILL.md` frontmatter.
4. Consider plugin packaging (Option C above).

## Cross-Cowork / Claude-Code compatibility

The skill is platform-agnostic. The SKILL.md is a workflow recipe; the templates are markdown with simple `{{PLACEHOLDER}}` substitutions. Any Claude with file-write access can execute it.

In Cowork mode, Claude uses the Write tool to create files at the project folder (auto-creates the folder).

In Claude Code, Claude uses its file tools the same way.

The same skill produces the same output regardless of which Claude runs it.

## Known limitations (v1)

- Module architecture defaults to the Main Conclusion six-module structure. Topics that don't fit (e.g., "Conditional Logic" might want a different breakdown) need Joshua to override at Gate 1.
- Named tools are either provided by Joshua at invocation or marked "TBD at Gate 1" — the skill doesn't yet know which named tools belong to which topic.
- Netlify prototype relevance per topic is a manual call.
- The Gate 3 architecture starter template doesn't exist yet; Claude Code drafts architecture from scratch each topic.

These limitations are acceptable for v1. v2 (after Main Conclusion + 1-2 more topics ship) tightens them.
