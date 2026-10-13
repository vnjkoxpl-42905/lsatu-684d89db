# Integrated Browser And Locked Lanes

## Persistent Browser Surface

Use one of these repo-backed entry points:

- Keybinding reference: `Cmd+Alt+B` -> `simpleBrowser.show` at `http://localhost:8080`
- Launch config: `LSAT U: Chrome (localhost:8080)`
- Launch config: `LSAT U: Edge (localhost:8080)`
- Task: `cockpit:launch` starts the local Vite server first.

## Recommended Layout

1. Open Explorer/Search/SCM/Todo Tree in the Primary Side Bar.
2. Keep Claude and Codex in the Secondary Side Bar.
3. Split the editor into two columns.
4. Put source files in the left editor group.
5. Open the integrated browser or Edge DevTools screencast in the right editor group.
6. Lock the browser editor group: right-click the editor tab -> `Lock Group`.
7. Move a terminal into the bottom panel or a lower-right editor group.
8. If using a terminal editor group, lock that group too.

VS Code stores locked editor groups as window UI state, not as a reliable tracked
workspace setting. The repo persists the commands, tasks, launch configs, profile
templates, and keybinding references; the final locked layout is a manual window action.

## Daily Start

```text
Tasks: Run Task -> cockpit:launch
Cmd+Alt+B
Lock the browser editor group if VS Code did not restore it.
```

## Notes

- Keep browser state workspace-scoped via the profile setting
  `workbench.browser.dataStorage: "workspace"`.
- Use the browser extension path in `docs/agent/locatorjs.md` for click-to-source.
- Do not use Live Preview/Live Server for the Vite app; use Vite on port `8080`.
