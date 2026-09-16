#!/usr/bin/env bash
# Safe push to origin/main when Lovable may have committed in parallel.
# Fetches, fast-forwards or merges (never rebases, never force-pushes), then pushes.

set -e
cd "$(git rev-parse --show-toplevel)"

# Typecheck gate: tsc does not run during `vite build` (esbuild strips types), so a
# type error (e.g. a missing import that crashes at runtime) would otherwise ship to
# main and auto-deploy. Block the push on any compile error. Set SKIP_TYPECHECK=1 to
# bypass for an emergency push.
if [ "${SKIP_TYPECHECK:-0}" != "1" ]; then
  echo "[safe-push] Typechecking (npm run typecheck)..."
  if ! npm run --silent typecheck; then
    echo "[safe-push] Typecheck FAILED. Fix the errors above or push with SKIP_TYPECHECK=1." >&2
    exit 1
  fi
  echo "[safe-push] Typecheck passed."
fi

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base HEAD origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[safe-push] Already up to date with origin/main."
elif [ "$REMOTE" = "$BASE" ]; then
  echo "[safe-push] origin/main has no new commits. Pushing."
else
  echo "[safe-push] origin/main has diverged (Lovable likely committed). Merging."
  git merge origin/main --no-edit
fi

# Push the checkout that passed the gate, including an isolated detached worktree.
git push origin HEAD:main
echo "[safe-push] Pushed $(git log -1 --format='%h %s')"
