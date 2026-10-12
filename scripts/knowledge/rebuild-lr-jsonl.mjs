#!/usr/bin/env node
// Legacy entry point. Real work lives in generate-lr-jsonl.mjs which is a
// deterministic MD → JSONL generator (with --check for CI). This wrapper
// delegates to `generate --check` so existing scripts/tests keep working.
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [resolve(here, "generate-lr-jsonl.mjs"), "--check"], { stdio: "inherit" });
process.exit(r.status ?? 1);
