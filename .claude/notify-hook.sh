#!/usr/bin/env bash
set -euo pipefail

payload="$(cat || true)"
message="Claude Code needs attention"
if command -v node >/dev/null 2>&1; then
  parsed="$(node -e '
let input = "";
process.stdin.on("data", (chunk) => input += chunk);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const text = data.message || data.notification || data.reason || "Claude Code needs attention";
    process.stdout.write(String(text).slice(0, 160));
  } catch {
    process.stdout.write("Claude Code needs attention");
  }
});
' <<<"$payload")" && message="$parsed"
fi

if command -v osascript >/dev/null 2>&1; then
  /usr/bin/osascript -e "display notification \"${message//\"/\\\"}\" with title \"LSAT U Claude\"" || printf '[LSAT U Claude] %s\n' "$message"
else
  printf '[LSAT U Claude] %s\n' "$message"
fi
