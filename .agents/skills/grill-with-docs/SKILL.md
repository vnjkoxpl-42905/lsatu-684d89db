---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADRs and a CONTEXT.md glossary) as we go. Use when the user says "grill with docs", or wants a plan stress-tested inside a codebase that has established terminology.
---

Call the Skill tool twice, for "grilling" and "domain-modeling".

**Load both, and confirm you did.** Upstream documents this as a real, unfixed rough edge: a skill that names another skill does not reliably cause that skill to load, and this one names two. The tell that it failed is a round that dumps every question at once with no recommendations attached, which is the model improvising an interview instead of running `grilling`. If that happens, stop and load both explicitly before continuing.

`domain-modeling` owns the formats. `CONTEXT.md` is a glossary and nothing else: never a spec, never a scratch pad, never a home for implementation decisions. ADRs are written only when a decision is hard to reverse, surprising without context, and the result of a real trade-off. Do not paraphrase either format from memory.

This session writes `CONTEXT.md` and ADRs. It does not write a `brainstorms/` capture file; that is `grill-me`.
