/**
 * scripts/extract-mcfirst.ts
 *
 * Build-time extractor for the canonical-20 simulator stimuli. Reads
 *   /Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Notes/MCFIRST SENTENCE : REBUTTAL.pdf
 * via pdfjs-dist (Node-side, build-time only) and emits
 *   src/data/mcfirst.extracted.json
 * with the per-question fields (stimulus, main_conclusion, why, structure_map, follow_up_answer).
 *
 * Idempotent: hashes the input PDF; skips re-extraction unless `--force` or the hash changes.
 *
 * Per JOSHUA DIRECTIVE 2026-04-30 Rec #2: scope is MCFIRST PDF only — NO DOCX OCR here.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PDF_PATH =
  '/Users/joshuaf/Documents/Claude/02_PROJECTS/lsat-u/Curriculum/Main Conclusion/Notes/MCFIRST SENTENCE : REBUTTAL.pdf';
const OUT_PATH = resolve(ROOT, 'src/data/mcfirst.extracted.json');

const FORCE = process.argv.includes('--force');

interface PerQuestion {
  question_id: string;
  number: number;
  title: string;
  structure_family: 'First-sentence' | 'Rebuttal';
  page: number;
  stimulus: string;
  main_conclusion: string;
  why: string;
  structure_map: string;
  follow_up_answer: string;
}

async function getPageText(pdf: any, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();
  // pdfjs items can lose linebreaks; reconstruct conservatively from `transform[5]` y-pos.
  let lastY: number | null = null;
  const lines: string[] = [];
  let buf = '';
  for (const item of content.items as any[]) {
    const y = Array.isArray(item.transform) ? item.transform[5] : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
      lines.push(buf.trim());
      buf = '';
    }
    buf += item.str;
    if (item.hasEOL) {
      lines.push(buf.trim());
      buf = '';
    }
    lastY = y;
  }
  if (buf.trim()) lines.push(buf.trim());
  return lines.filter(Boolean).join('\n');
}

async function main() {
  if (!existsSync(PDF_PATH)) {
    console.error(`[extract-mcfirst] missing PDF: ${PDF_PATH}`);
    process.exit(1);
  }
  const bytes = readFileSync(PDF_PATH);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);

  if (!FORCE && existsSync(OUT_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
      if (prev.source_hash === hash) {
        console.log('[extract-mcfirst] cache hit (hash match) — skipping');
        return;
      }
    } catch {
      /* fall through */
    }
  }

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const numPages = pdf.numPages;
  const questions: PerQuestion[] = [];

  // Read every page's text first.
  const pageTexts: string[] = [];
  for (let p = 1; p <= numPages; p++) {
    pageTexts.push(await getPageText(pdf, p));
  }

  // Use the smoke artifact as the question titles + family + page ground truth.
  const smoke = JSON.parse(
    readFileSync(resolve(ROOT, 'scripts/__smoke__/mcfirst.extracted.json'), 'utf-8'),
  );
  const titleByNum = new Map<number, { title: string; family: string; page: number }>();
  for (const q of smoke.questions as Array<{
    question_id: string;
    title: string;
    structure_family: string;
    page: number;
  }>) {
    const num = parseInt(q.question_id.replace(/\D/g, ''), 10);
    titleByNum.set(num, { title: q.title, family: q.structure_family, page: q.page });
  }

  // Concat all pages, then split by "Question N" headings and trim at "• • •".
  const fullText = pageTexts.join('\n');
  const blocks: Array<{ num: number; body: string }> = [];
  const headerRe = /(^|\n)\s*Question\s+(\d{1,2})\s*\n/g;
  const matches = [...fullText.matchAll(headerRe)];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]!;
    const num = parseInt(cur[2]!, 10);
    const start = cur.index! + cur[0].length;
    const next = matches[i + 1];
    const end = next ? next.index! : fullText.length;
    let body = fullText.slice(start, end);
    const sep = body.indexOf('• • •');
    if (sep !== -1) body = body.slice(0, sep);
    blocks.push({ num, body: body.trim() });
  }

  function grab(body: string, label: string, nextLabels: string[]): string {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*:?\\s*`, 'i');
    const m = body.match(re);
    if (!m) return '';
    const start = m.index! + m[0].length;
    let end = body.length;
    for (const nl of nextLabels) {
      const nre = new RegExp(`\\n\\s*${nl}\\s*:?\\s*`, 'i');
      const nm = body.slice(start).match(nre);
      if (nm && nm.index !== undefined) end = Math.min(end, start + nm.index);
    }
    return body
      .slice(start, end)
      .replace(/\n+/g, ' ')
      .trim();
  }

  const NEXT = ['Stimulus', 'Main conclusion', 'Structure family', 'Why', 'Structure map', 'Follow.?up answer', 'Question \\d+'];

  for (const { num, body } of blocks) {
    const meta = titleByNum.get(num);
    if (!meta) continue;
    const stimulus = grab(body, 'Stimulus', NEXT);
    const main_conclusion = grab(body, 'Main conclusion', NEXT);
    const why = grab(body, 'Why', NEXT);
    const structure_map = grab(body, 'Structure map', NEXT);
    const follow_up_answer = grab(body, 'Follow.?up answer', NEXT);

    questions.push({
      question_id: `MC-SIM-Q${num}`,
      number: num,
      title: meta.title,
      structure_family: meta.family as 'First-sentence' | 'Rebuttal',
      page: meta.page,
      stimulus,
      main_conclusion,
      why,
      structure_map,
      follow_up_answer,
    });
  }
  questions.sort((a, b) => a.number - b.number);

  const output = {
    $comment:
      'Generated by scripts/extract-mcfirst.ts. Do not hand-edit. Source: Notes/MCFIRST SENTENCE : REBUTTAL.pdf.',
    extracted_at: new Date().toISOString(),
    extractor: 'pdfjs-dist@4.0.379 (Node, legacy build)',
    source_path: PDF_PATH,
    source_hash: hash,
    page_count: numPages,
    questions,
    integrity: {
      total: questions.length,
      with_stimulus: questions.filter((q) => q.stimulus.length > 20).length,
      with_main_conclusion: questions.filter((q) => q.main_conclusion.length > 5).length,
      with_why: questions.filter((q) => q.why.length > 5).length,
      with_structure_map: questions.filter((q) => q.structure_map.length > 5).length,
      with_follow_up: questions.filter((q) => q.follow_up_answer.length > 5).length,
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(
    `[extract-mcfirst] wrote ${questions.length} questions → ${OUT_PATH}\n` +
      `  integrity: stim=${output.integrity.with_stimulus} mc=${output.integrity.with_main_conclusion} why=${output.integrity.with_why} map=${output.integrity.with_structure_map} fua=${output.integrity.with_follow_up}`,
  );
}

main().catch((e) => {
  console.error('[extract-mcfirst] failed:', e);
  process.exit(1);
});
