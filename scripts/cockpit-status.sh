#!/usr/bin/env bash
set -euo pipefail

while true; do
  clear 2>/dev/null || true
  echo "LSAT U Cockpit Status"
  echo "===================="
  echo "cwd: $(pwd)"
  echo "branch: $(git branch --show-current 2>/dev/null || echo detached)"
  echo "head: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo
  echo "Worktrees"
  git worktree list 2>/dev/null || true
  echo
  echo "Tracked changes"
  git status --short | grep -v '^??' || echo "clean tracked tree"
  echo
  echo "Useful tasks"
  echo "- dev: npm run dev"
  echo "- unit watch: npm run test:watch"
  echo "- lane verify: npm run lint:changed && npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run test"
  echo "- full verify: same plus npm run test:e2e"
  echo
  echo "Refreshes every 15s. Stop with Ctrl+C."
  sleep 15
done
