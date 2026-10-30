#!/usr/bin/env bash
# Lint only the .ts/.tsx files changed versus origin/main (committed on this branch)
# plus anything modified or staged in the working tree.
#
# Why: the repo carries pre-existing ESLint debt. A repo-wide `eslint .` will always
# fail, which makes `verify-current-lane` useless. This scopes lint to the code you
# actually touched, so verify stays green on a clean change while still catching lint
# regressions you introduce. Use `npm run lint` for the full repo-wide picture.
#
# Compatible with macOS default bash 3.2 (no mapfile, null-delimited xargs for spaces).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Branch point. Falls back to HEAD if origin/main is unavailable.
BASE="$(git merge-base origin/main HEAD 2>/dev/null || echo HEAD)"

CHANGED="$(
  {
    git diff --name-only --diff-filter=ACMR "$BASE"...HEAD -- '*.ts' '*.tsx'  # committed on branch
    git diff --name-only --diff-filter=ACMR            -- '*.ts' '*.tsx'  # unstaged
    git diff --name-only --diff-filter=ACMR --cached   -- '*.ts' '*.tsx'  # staged
    git ls-files --others --exclude-standard           -- '*.ts' '*.tsx'  # new untracked
  } | sort -u | grep -vE '^dist/' || true
)"

if [ -z "$CHANGED" ]; then
  echo "lint:changed — no changed .ts/.tsx files vs ${BASE}. Nothing to lint."
  exit 0
fi

echo "lint:changed — linting these files:"
printf '  %s\n' $CHANGED

# Null-delimit so paths with spaces survive.
printf '%s\n' "$CHANGED" | tr '\n' '\0' | xargs -0 npx eslint
