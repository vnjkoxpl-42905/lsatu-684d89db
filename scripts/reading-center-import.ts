/**
 * Bulk-import Reading Center passages from a folder of .md / .txt files.
 *
 *   npx vite-node scripts/reading-center-import.ts -- <folder>           # dry run, changes nothing
 *   npx vite-node scripts/reading-center-import.ts -- <folder> --apply   # upsert NEW and CHANGED
 *
 * Each file: optional front matter (title, author, sort_order, cover) between
 * `---` lines, then an optional `# Title` line, then the body. Paragraphs are
 * separated by a blank line. Passages are matched by slug and never deleted.
 *
 * Credentials come from ~/ai-os/.env (git-ignored), signing in as the admin
 * user, the same way scripts/assign.ts does. No key is ever printed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";
import { countWords, slugify } from "../src/features/reading-center/lib/tokenize";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = {
  ...readEnv(path.resolve(REPO, "../../.env")),
  // Repos now live in dev/ai-os-projects/, a sibling of dev/ai-os.
  ...readEnv(path.resolve(REPO, "../../ai-os/.env")),
  ...readEnv(path.join(REPO, ".env")),
};

// The rc tables are not in the generated types yet (same cast as lib/db.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rc = (table: string) => (supabase as any).from(table);

interface ParsedFile {
  file: string;
  slug: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  sort_order: number | null;
  body: string;
  word_count: number;
}

interface ExistingRow {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  sort_order: number;
  body: string;
}

export function parsePassageFile(file: string, raw: string): ParsedFile {
  let text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const meta: Record<string, string> = {};
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
    text = text.slice(fm[0].length);
  }
  let title = meta.title;
  const heading = /^# (.+)$/m.exec(text);
  if (heading) {
    if (!title) title = heading[1].trim();
    text = text.replace(heading[0], "");
  }
  if (!title) title = path.basename(file, path.extname(file));
  const body = text.trim();
  const order = meta.sort_order ? Number(meta.sort_order) : NaN;
  return {
    file,
    slug: slugify(title),
    title,
    author: meta.author || null,
    cover_url: meta.cover || null,
    sort_order: Number.isFinite(order) ? order : null,
    body,
    word_count: countWords(body),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const apply = args.includes("--apply");
  const folder = args.find((a) => !a.startsWith("--"));
  if (!folder || !fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error("usage: vite-node scripts/reading-center-import.ts -- <folder> [--apply]");
    process.exit(2);
  }

  const files = fs
    .readdirSync(folder)
    .filter((f) => /\.(md|txt)$/i.test(f))
    .sort((a, b) => a.localeCompare(b));
  const parsed = files.map((f) => parsePassageFile(f, fs.readFileSync(path.join(folder, f), "utf8")));
  const empty = parsed.filter((p) => !p.body);
  if (empty.length) {
    console.error(`Empty body in: ${empty.map((p) => p.file).join(", ")}`);
    process.exit(1);
  }

  const email = env.LSATPREP_ADMIN_EMAIL;
  const password = env.LSATPREP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("reading-center-import: LSATPREP_ADMIN_EMAIL / LSATPREP_ADMIN_PASSWORD are not set in ~/ai-os/.env.");
    process.exit(2);
  }
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error(`reading-center-import: sign-in failed: ${signInError.message}`);
    process.exit(1);
  }

  const { data, error } = await rc("reading_center_passages").select(
    "id, slug, title, author, cover_url, sort_order, body",
  );
  let existing: ExistingRow[] = [];
  if (error) {
    if (apply) {
      console.error(`Could not read passages: ${error.message}`);
      process.exit(1);
    }
    console.warn(`! Could not read existing passages (${error.message}). Is the migration applied? Treating all as NEW.`);
  } else {
    existing = (data ?? []) as ExistingRow[];
  }
  const bySlug = new Map(existing.map((r) => [r.slug, r]));
  let nextOrder = existing.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1;

  const totals = { NEW: 0, CHANGED: 0, SAME: 0 };
  const writes: Record<string, unknown>[] = [];
  for (const p of parsed) {
    const row = bySlug.get(p.slug);
    let status: keyof typeof totals;
    if (!row) status = "NEW";
    else
      status =
        row.body !== p.body ||
        row.title !== p.title ||
        (row.author ?? null) !== p.author ||
        (row.cover_url ?? null) !== p.cover_url ||
        (p.sort_order !== null && row.sort_order !== p.sort_order)
          ? "CHANGED"
          : "SAME";
    totals[status]++;
    console.log(`${status.padEnd(7)} ${p.title} (${p.word_count} words)  [${p.file}]`);
    if (status === "SAME") continue;
    writes.push({
      slug: p.slug,
      title: p.title,
      author: p.author,
      cover_url: p.cover_url,
      body: p.body,
      word_count: p.word_count,
      sort_order: p.sort_order ?? row?.sort_order ?? nextOrder++,
      updated_at: new Date().toISOString(),
    });
  }
  console.log(`\n${totals.NEW} new, ${totals.CHANGED} changed, ${totals.SAME} unchanged.`);

  if (!apply) {
    console.log("Dry run: nothing written. Re-run with --apply to write.");
    return;
  }
  if (writes.length === 0) return;
  const { error: upsertError } = await rc("reading_center_passages").upsert(writes, { onConflict: "slug" });
  if (upsertError) {
    console.error(`Upsert failed: ${upsertError.message}`);
    process.exit(1);
  }
  console.log(`Wrote ${writes.length} passage(s).`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
