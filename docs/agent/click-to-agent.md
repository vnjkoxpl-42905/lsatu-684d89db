# Click-to-Agent Automation

This is the preferred Codex/Claude handoff path for VS Code cockpit work. Keep the
actual handoff content in one place:

```text
docs/agent/handoffs/click-to-agent.md
```

`docs/agent/handoffs/current-handoff.md` may point here, but it should not duplicate
the same task brief.

Run:

```text
Tasks: Run Task -> click-to-agent
```

The task writes:

```text
docs/agent/handoffs/click-to-agent.md
```

## What It Captures

- Active file: passed by VS Code as `${file}`.
- Target lane: prompted as `Codex` or `Claude`.
- Manual selection/range/note: prompted by the task.

The active file must be a saved workspace file. If VS Code passes an unsaved buffer such
as `Untitled-1`, the task exits instead of overwriting the existing handoff with useless
context.

VS Code tasks cannot pass the live selected editor text directly. If the relevant context
is a selection, enter a line range such as `src/App.tsx:40-75` or paste a short selection
summary into the prompt.

## Shell Use

```bash
bash scripts/click-to-agent-handoff.sh src/App.tsx "lines 40-75: route registration" Codex
```

Then tell the target agent:

```text
Read docs/agent/handoffs/click-to-agent.md and stay within that scope.
```

## Browser Element Context

The browser menu item `Add Element to Chat` is owned by VS Code's integrated
browser/chat experience. It sends the selected element screenshot/context to the generic
VS Code chat composer, not directly to the Codex or Claude Code side panels.

Use it only as a capture aid:

1. Use `Add Element to Chat` if you want VS Code to capture an element screenshot.
2. Add a short note in that generic chat box if needed.
3. Move the useful context into `docs/agent/handoffs/click-to-agent.md` or paste it into
   the Codex/Claude panel.

For Codex or Claude Code, the reliable cockpit path is:

```text
Tasks: Run Task -> click-to-agent
```

Then in the Codex or Claude Code panel, send:

```text
Read docs/agent/handoffs/click-to-agent.md and inspect the referenced route/element.
```

Do not rely on `Add Element to Chat` as the agent handoff path unless the VS Code
extension that owns that command adds a direct Codex/Claude target.
