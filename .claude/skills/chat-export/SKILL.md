---
name: chat-export
description: Save the current conversation as a structured markdown file and generate a handoff prompt for continuing in a new chat. Use this skill whenever the user says "export this chat", "save this conversation", "create a handoff", "save this for later", "export to my chat exports folder", or anything indicating they want to preserve a conversation and carry context into a new session. Always trigger this skill proactively when a conversation has been long, complex, or has produced decisions, files, or code — even if the user hasn't explicitly asked yet.
---

# Chat Export Skill

Saves the current conversation as a structured markdown file to
`~/Documents/Claude/08_CHAT_EXPORTS/` with a full transcript,
summary, and a paste-ready handoff prompt.

## Output path

```
~/Documents/Claude/08_CHAT_EXPORTS/YYYY-MM-DD_short-title.md
```

Use today's date. Make the short title 3-5 words, kebab-case,
describing what the chat was about.

Example: `2026-04-28_claude-folder-cleanup-notebooklm.md`

## Steps

1. **Reconstruct the full transcript** from the conversation in context.
   Write every user message and every Claude reply verbatim under
   `### User` and `### Claude` headings. Do not paraphrase or skip.

2. **Write the structured summary** (see template below).

3. **Write the handoff prompt** — a single paste-ready block the user
   can drop into a new chat to resume instantly. It should:
   - Point to the file: `Read ~/Documents/Claude/08_CHAT_EXPORTS/<filename>.md`
   - State what was done
   - State what to do next (ask the user if unclear)

4. **Save the file** using Desktop Commander's `write_file` to the
   output path above.

5. **Tell the user**:
   - The filename
   - The handoff prompt (show it in a code block so it's easy to copy)

## File template

```markdown
# <Chat title>

**Date:** YYYY-MM-DD
**Topic:** one-line description
**Tags:** (pick relevant: lsat-u | lsat-content | applications | tooling | drive-organizer | theology | general)
**File:** ~/Documents/Claude/08_CHAT_EXPORTS/<filename>.md

---

## Summary

One paragraph. What was this chat about, what was the goal, what was accomplished.

## What was decided / built

- bullet list of concrete outcomes, decisions, files created, commands run

## Open threads

- things not finished
- questions still unresolved
- next steps

## Handoff prompt

> Paste this into a new chat to continue:
>
> ```
> Read ~/Documents/Claude/08_CHAT_EXPORTS/<filename>.md and continue
> from where we left off. [Specific next thing to do goes here.]
> ```

---

## Full transcript

### User
[message]

### Claude
[reply]

[...repeat for every message in the conversation...]
```

## Notes

- Never truncate the transcript. If it's long, write all of it.
- The "Open threads" section is the most important part for handoffs —
  be precise about what is unfinished.
- If the user specifies a subfolder (e.g. "save this under lsat-u"),
  save to `~/Documents/Claude/08_CHAT_EXPORTS/lsat-u/<filename>.md`
  and create the folder if it doesn't exist.
- After saving, always show the handoff prompt in a fenced code block
  so the user can copy it in one click.
