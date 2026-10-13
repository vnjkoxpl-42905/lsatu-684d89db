#!/usr/bin/env bash
set -euo pipefail

payload="$(cat || true)"
branch="$(git -C "${CLAUDE_PROJECT_DIR:-$PWD}" branch --show-current 2>/dev/null || true)"
dir="$(basename "${CLAUDE_PROJECT_DIR:-$PWD}")"

LSATU_STATUS_BRANCH="${branch:-detached}" LSATU_STATUS_DIR="$dir" node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
let data = {};
try { data = JSON.parse(input || "{}"); } catch {}
const model = data.model?.display_name || data.model?.name || data.model || "model";
const context =
  data.context?.percentage ??
  data.context_window?.used_percentage ??
  data.context_window?.usage_percentage ??
  data.context_window?.percent_used ??
  null;
const contextText = context == null ? "ctx n/a" : `ctx ${Math.round(Number(context))}%`;
process.stdout.write(`${model} | ${process.env.LSATU_STATUS_BRANCH || "branch"} | ${process.env.LSATU_STATUS_DIR || "dir"} | ${contextText}`);
' <<<"$payload"
