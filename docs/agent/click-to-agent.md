# Click-to-Agent Automation

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
