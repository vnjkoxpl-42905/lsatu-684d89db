# LSAT U Cockpit Keybindings

VS Code does not load workspace keybindings from `.vscode/` the way it loads tasks or
launch configs. Import the committed reference file into the user keybindings JSON:

```text
docs/agent/keybindings/lsatu-cockpit.keybindings.json
```

## Bindings

| Key | Command | Purpose |
|---|---|---|
| `Cmd+Alt+C` | `chatgpt.newCodexPanel` | New Codex agent panel |
| `Cmd+Alt+A` | `claude-vscode.focus` | Focus Claude input |
| `Cmd+Alt+T` | `workbench.action.terminal.toggleTerminal` | Toggle terminal |
| `Cmd+Alt+B` | `simpleBrowser.show` | Open integrated browser at `http://localhost:8080` |
| `Cmd+Alt+R` | `workbench.action.tasks.reRunTask` | Run last task |
| `Cmd+Alt+V` | `workbench.action.tasks.runTask` with `verify-current-lane` | Run the lane verification task |

## Command IDs Verified Locally

- Codex/OpenAI extension: `chatgpt.newCodexPanel`
- Claude Code extension: `claude-vscode.focus`
- Built-in terminal task commands: `workbench.action.terminal.toggleTerminal`,
  `workbench.action.tasks.reRunTask`, `workbench.action.tasks.runTask`
- Built-in simple browser command: `simpleBrowser.show`

If `simpleBrowser.show` is unavailable in a VS Code build, use
`vscode-edge-devtools-view.launchScreencast` or the launch config
`LSAT U: Edge (localhost:8080)`.
