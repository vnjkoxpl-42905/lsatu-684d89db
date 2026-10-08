# One-Command Cockpit Launch

`tmux` is not installed on this machine, so the LSAT U cockpit uses VS Code compound
tasks instead.

Run from the Command Palette:

```text
Tasks: Run Task -> cockpit:launch
```

That starts three dedicated task panes:

- `dev`: Vite on `http://localhost:8080`
- `test:watch`: Vitest watch mode
- `cockpit:status`: repeating branch, worktree, HEAD, and tracked-change summary

The task is intentionally VS Code-native so it works in the same operator surface as
Claude, Codex, browser, terminal, Problems, and Test Explorer.

Stop the panes with the normal VS Code task/terminal controls.
