#!/usr/bin/env bash
# Auto-pull from origin/main when entering this repo
# Safe: only pulls if there are NO modified tracked files (untracked files are OK)

set -e
cd "$(git rev-parse --show-toplevel)"

# Block only on modified or staged tracked files
DIRTY=$(git status --porcelain | grep -v '^??' || true)

if [ -z "$DIRTY" ]; then
  git fetch origin main --quiet
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)
  if [ "$LOCAL" != "$REMOTE" ]; then
    git pull --ff-only origin main
    echo "[auto-pull] Updated to $(git log -1 --format='%h %s')"
  else
    echo "[auto-pull] Up to date at $(git log -1 --format='%h %s')"
  fi
else
  echo "[auto-pull] Modified files detected. Skipping pull."
  echo "$DIRTY"
fi
