# Claude Cockpit

## Committed Settings

The repo-level Claude Code settings live in `.claude/settings.json`.

Added cockpit pieces:

- `Notification` hook: runs `.claude/notify-hook.sh`.
- `statusLine`: runs `.claude/statusline.sh`.

The local override `.claude/settings.local.json` remains untracked and unchanged.

## Notification Hook

The notification hook reads Claude's hook JSON from stdin. On macOS it calls
`osascript` to show a desktop notification titled `LSAT U Claude`; otherwise it prints
the message to stdout.

Manual check:

```bash
printf '{"message":"Cockpit notification test"}' | CLAUDE_PROJECT_DIR="$PWD" bash .claude/notify-hook.sh
```

## Statusline

The statusline shows:

```text
model | branch | dir | context %
```

Manual check:

```bash
printf '{"model":{"display_name":"Fable"},"context_window":{"used_percentage":42}}' | CLAUDE_PROJECT_DIR="$PWD" bash .claude/statusline.sh
```

Expected shape:

```text
Fable | main | LSATU | ctx 42%
```
