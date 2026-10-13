# VS Code Profiles

Tracked profile templates live in:

```text
docs/agent/profiles/
```

## Profiles

| Profile | Use | Color |
|---|---|---|
| `LSAT U Builder` | Claude-primary implementation lane | `#2f6f5e` |
| `LSAT U Reviewer` | Codex review / diff lane | `#6f4aa8` |
| `LSAT U Writing` | Prompt, handoff, docs, curriculum writing | `#8a6f2a` |

## Open With A Profile

```bash
code --profile "LSAT U Builder" /Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU
code --profile "LSAT U Reviewer" /Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU-practice
code --profile "LSAT U Writing" /Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU
```

VS Code profile export/import is user-level UI state, not workspace-enforced repo state.
The committed `.code-profile` files are the canonical templates for recreating or
importing the three cockpit modes.

After importing, also import:

```text
docs/agent/keybindings/lsatu-cockpit.keybindings.json
```
