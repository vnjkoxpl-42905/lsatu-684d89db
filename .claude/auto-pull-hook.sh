#!/usr/bin/env bash
# Auto-pull from origin/main when entering this repo
# Safe: only pulls if there are NO modified tracked files (untracked files are OK)

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "[auto-pull] Git checkout unavailable. Skipping."; exit 0; }
cd "$root" || { echo "[auto-pull] Checkout unavailable. Skipping."; exit 0; }

# A session hook must not move a task branch or fail when the network is down.
branch=$(git branch --show-current 2>/dev/null) || branch=""
if [ "$branch" != "main" ]; then
  echo "[auto-pull] Branch ${branch:-detached} is not main. Skipping."
  exit 0
fi

# Block only on modified or staged tracked files
DIRTY=$(git status --porcelain | grep -v '^??' || true)

if [ -z "$DIRTY" ]; then
  if ! git fetch origin main --quiet; then
    echo "[auto-pull] Fetch unavailable. Skipping."
    exit 0
  fi
  LOCAL=$(git rev-parse HEAD) || exit 0
  REMOTE=$(git rev-parse origin/main) || exit 0
  if [ "$LOCAL" != "$REMOTE" ]; then
    if git merge --ff-only origin/main; then
      echo "[auto-pull] Updated to $(git log -1 --format='%h %s')"
    else
      echo "[auto-pull] Cannot fast-forward. Skipping."
    fi
  else
    echo "[auto-pull] Up to date at $(git log -1 --format='%h %s')"
  fi
else
  echo "[auto-pull] Modified files detected. Skipping pull."
  echo "$DIRTY"
fi
