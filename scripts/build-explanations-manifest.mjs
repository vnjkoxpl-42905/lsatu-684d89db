/**
 * Lists which preptests actually have an LSAT Lab explanation sidecar.
 *
 * `mergeExplanationSidecars` used to derive its fetch list from the question
 * bank, so it asked for a sidecar for every PT the bank contains. The bank has
 * 59; 21 are authored. The other 38 requests 404 on every cold load of the
 * classroom. Nothing breaks — the loader treats a miss as "no explanations yet"
 * — but it is 38 wasted round-trips, and it fills the console with red on a
 * page where a real error would then be invisible.
 *
 * Unlike the finder address index, a glob over public/data IS the right source
 * of truth here: the sidecars are optional content, and a file's existence is
 * exactly the question being asked. A stray file can only add explanations to
 * questions that already exist, and the loader ignores ids it does not know.
 *
 *   node scripts/build-explanations-manifest.mjs
 */
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "public/data/explanations");
const out = resolve(dir, "index.json");

if (!existsSync(dir)) {
  console.error(`Explanations manifest: ${dir} does not exist; nothing to do.`);
  process.exit(0);
}

const pts = readdirSync(dir)
  .map((name) => /^PT(\d+)-explanations\.json$/.exec(name))
  .filter(Boolean)
  .map((m) => Number(m[1]))
  .sort((a, b) => a - b);

writeFileSync(out, JSON.stringify({ pts }, null, 2) + "\n", "utf8");
console.log(`Explanations manifest: ${pts.length} sidecar(s) -> ${out.slice(root.length + 1)}`);
