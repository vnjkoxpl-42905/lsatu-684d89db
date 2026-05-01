/**
 * scripts/wire-calibration-stimuli.ts
 *
 * One-shot: maps OCR'd DOCX paragraphs into calibration.generated.json's
 * `stimulus` field for each item, flipping `stimulus_pending_ocr` → false.
 *
 * Sources:
 *   - main_conclusion_student_dup1.extracted.json → MC-CAL-M1-Q1..Q7 (Q1..Q7 paragraphs)
 *   - Cluster-Sentences-Review.extracted.json → MC-CAL-M5-Q1..Q5 (mapping documented as best-guess)
 *
 * For M5 items: the DOCX has many candidate sentences; we pick 5 representative
 * cluster sentences and document the rationale. Joshua can override after walking
 * the live capstone surface.
 *
 * Idempotent: re-runs are safe.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CAL_PATH = resolve(ROOT, 'src/data/calibration.generated.json');
const STUDENT_PATH = resolve(ROOT, 'src/data/main_conclusion_student_dup1.extracted.json');
const CLUSTER_PATH = resolve(ROOT, 'src/data/Cluster-Sentences-Review.extracted.json');

interface CalibrationFile {
  $comment: string;
  $schema: string;
  generated_at: string;
  generator: string;
  items: Array<any>;
}

const cal = JSON.parse(readFileSync(CAL_PATH, 'utf-8')) as CalibrationFile;
const student = JSON.parse(readFileSync(STUDENT_PATH, 'utf-8')) as { paragraphs: string[] };
const cluster = JSON.parse(readFileSync(CLUSTER_PATH, 'utf-8')) as { paragraphs: string[] };

// ── Map M1 (Q1..Q7) ────────────────────────────────────────────────────────
// student.paragraphs: 0=title, 1='Question 1', 2=stimulus1, 3='Question 2', 4=stim2, ...
const m1Stimuli: string[] = [];
for (let qn = 1; qn <= 7; qn++) {
  // Find "Question N" header.
  const headerIdx = student.paragraphs.findIndex((p) => p.trim().toLowerCase() === `question ${qn}`);
  if (headerIdx === -1) {
    console.warn(`[wire-calibration] missing Question ${qn} in student docx`);
    continue;
  }
  const stim = student.paragraphs[headerIdx + 1] ?? '';
  m1Stimuli.push(stim);
}

// ── Map M5: 5 representative cluster sentences ─────────────────────────────
// Pick paragraphs that contain commas + relative clauses (markers of cluster structure).
// Simple heuristic: paragraphs with > 2 commas and > 25 words.
function isClusterCandidate(p: string): boolean {
  const commas = (p.match(/,/g) ?? []).length;
  const words = p.trim().split(/\s+/).length;
  return commas >= 2 && words >= 25 && words <= 60;
}
const candidates = cluster.paragraphs.filter(isClusterCandidate).slice(0, 12);
// Take 5 evenly spaced.
const step = Math.max(1, Math.floor(candidates.length / 5));
const m5Stimuli: string[] = [];
for (let i = 0; i < 5 && i * step < candidates.length; i++) {
  m5Stimuli.push(candidates[i * step]!);
}

let m1Patched = 0;
let m5Patched = 0;

for (const item of cal.items) {
  if (item.calibration_module === 'M1' && item.stimulus_pending_ocr) {
    const m = item.id.match(/MC-CAL-M1-Q(\d+)/);
    if (m) {
      const qn = Number(m[1]);
      if (qn <= m1Stimuli.length) {
        const stim = m1Stimuli[qn - 1];
        if (stim) {
          item.stimulus = stim;
          item.stimulus_pending_ocr = false;
          item.ocr_status = 'captured';
          if (item.source_anchor) item.source_anchor.ocr_required = false;
          m1Patched += 1;
        }
      }
    }
  }
  if (item.calibration_module === 'M5' && item.stimulus_pending_ocr) {
    const m = item.id.match(/MC-CAL-M5-Q(\d+)/);
    if (m) {
      const qn = Number(m[1]);
      if (qn <= m5Stimuli.length) {
        const stim = m5Stimuli[qn - 1];
        if (stim) {
          item.stimulus = stim;
          item.stimulus_pending_ocr = false;
          item.ocr_status = 'captured';
          if (item.source_anchor) item.source_anchor.ocr_required = false;
          m5Patched += 1;
        }
      }
    }
  }
}

cal.generated_at = new Date().toISOString();
cal.$comment =
  (cal.$comment ?? '') +
  ` | Phase H.1 OCR wire-up at ${cal.generated_at}: M1 Q1-Q7 from main_conclusion_student docx; M5 Q1-Q5 from Cluster Sentences Review docx (heuristic match — Joshua to verify).`;

writeFileSync(CAL_PATH, JSON.stringify(cal, null, 2));
console.log(`[wire-calibration] patched M1=${m1Patched}, M5=${m5Patched}`);
