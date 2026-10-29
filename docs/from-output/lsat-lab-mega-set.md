---
title: LSAT Lab Mega Set (skill pointer)
name: lsat-lab-mega-set
type: knowledge
tags: [lsat-u, lsat-lab, practice-sets, skill, pointer]
created: 2026-07-10
updated: 2026-07-10
status: active
---

# lsat-lab-mega-set (skill pointer)

The full skill now lives as an installed skill (single source of truth). This note is just a pointer so links resolve.

- **Canonical source:** `Claude/04_SKILLS/personal/lsat-lab-mega-set/SKILL.md`
- **Global runtime:** symlinked at `~/.claude/skills/lsat-lab-mega-set` (works in any session)
- **Data log:** [[lsat-lab-set-log]] (`output/lsat-lab-set-log.md`)

## What it does

PT number in -> one consolidated LR practice set with **every** LR question for that PrepTest, in order, built end to end on LSAT Lab.

## Trigger

`create set <num>` / `mega set <num>` / `make a set for PT <num>`. Runs autonomously to completion.

## Not to be confused with

- `lsat-lab-set-builder` - CSV/list of questions -> split into 100-question chunks (different input).
- `lsat-lab-transcribe` - captures written explanations, does not build sets.

Do not duplicate the procedure here; edit the SKILL.md.
