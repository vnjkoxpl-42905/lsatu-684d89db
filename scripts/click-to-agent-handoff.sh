#!/usr/bin/env bash
set -euo pipefail

file="${1:-}"
selection="${2:-}"
agent="${3:-Codex}"
out="docs/agent/handoffs/click-to-agent.md"

if [[ -z "$file" ]]; then
  echo "Usage: $0 <active-file> [manual-selection-or-note] [agent]" >&2
  exit 2
fi

mkdir -p "$(dirname "$out")"

{
  echo "# Click-to-Agent Handoff"
  echo
  echo "- Created: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "- Target agent: $agent"
  echo "- Active file: $file"
  echo "- Manual selection/range/note: ${selection:-none provided}"
  echo
  echo "## Instruction"
  echo
  echo "Inspect the active file and the manual selection/range/note above. Stay within the"
  echo "current LSAT U task scope. Do not broaden into unrelated app behavior."
  echo
  echo "## Context"
  echo
  echo "VS Code tasks can pass the active file via \\\`${file}\\\`, but they cannot pass"
  echo "the current editor selection text directly. Put the selected line range or pasted"
  echo "selection summary into the task prompt when running this handoff."
} > "$out"

echo "Wrote $out"
