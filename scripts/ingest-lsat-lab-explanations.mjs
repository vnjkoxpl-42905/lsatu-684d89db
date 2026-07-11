#!/usr/bin/env node
// Parse LSAT Lab explanation Markdown files into per-PT explanation sidecar JSONs.
// - Input: Explanations/PT<n>-explanations.md (or explicit paths as argv)
// - Output: public/data/explanations/PT<n>-explanations.json
//           scripts/out/explanation-ingest-report.md
//
// Cross-checks each parsed question against the existing question bank at
// public/data/PT<n>-S<k>-LR.json and reports mismatches; never mutates the
// question bank.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPL_DIR = path.join(ROOT, "Explanations");
const OUT_DIR = path.join(ROOT, "public/data/explanations");
const DATA_DIR = path.join(ROOT, "public/data");
const REPORT_PATH = path.join(ROOT, "scripts/out/explanation-ingest-report.md");

const STYLE_KEYS = { Standard: "standard", Brief: "brief", "Another Way": "anotherWay" };
const CHOICE_LETTERS = ["A", "B", "C", "D", "E"];

const CHOICE_LINE_RE = /^\*\*([A-E])\.\s+([\s\S]*?)\*\*\s+—\s+([^\n]+?)(?:\s+\((\d+)%\s+of students\))?\s*$/;

function splitQuestions(md) {
  // Split by "## S<k> · Q<n> — <type>" headings.
  const lines = md.split("\n");
  const questions = [];
  let current = null;
  const headerRe = /^##\s+S(\d+)\s*·\s*Q(\d+)\s*(?:—\s*(.+))?\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headerRe);
    if (m) {
      if (current) questions.push(current);
      current = {
        section: Number(m[1]),
        qnum: Number(m[2]),
        qtypeLabel: (m[3] || "").trim(),
        startLine: i + 1,
        bodyLines: [],
      };
    } else if (current) {
      // Stop at a top-level "# " or "---" separator.
      if (/^# /.test(lines[i])) {
        // start of a new top-level section like "# Section 3 (Logical Reasoning)"; keep collecting until next question
      }
      current.bodyLines.push(lines[i]);
    }
  }
  if (current) questions.push(current);
  return questions;
}

function findH3Blocks(bodyLines) {
  // Returns array of {heading, lines, startLine}
  const blocks = [];
  let cur = null;
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { heading: m[1].trim(), lines: [], startIndex: i };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function trimBlock(lines) {
  const arr = [...lines];
  while (arr.length && !arr[0].trim()) arr.shift();
  while (arr.length && !arr[arr.length - 1].trim()) arr.pop();
  return arr.join("\n");
}

// Terse fallback used by "no written explanation" questions (e.g. PT159-S1-Q2):
//   **A.** choice text — N% of students          (optionally "(Correct)")
const TERSE_CHOICE_RE = /^\*\*([A-E])\.\*\*\s+(.+?)\s+—\s+(\d+)%\s+of students(?:\s*\((Correct)\))?\s*$/;

function parseChoiceBlock(lines) {
  const choices = {};
  let currentLetter = null;
  let currentBuf = [];
  const flush = () => {
    if (!currentLetter) return;
    const raw = currentBuf.join("\n").trim();
    const firstNl = raw.indexOf("\n");
    const headerLine = firstNl === -1 ? raw : raw.slice(0, firstNl);
    const rest = firstNl === -1 ? "" : raw.slice(firstNl + 1).trim();
    const m = headerLine.match(CHOICE_LINE_RE);
    if (m) {
      choices[currentLetter] = {
        text: m[2].trim(),
        tag: m[3].trim(),
        pct: m[4] != null ? Number(m[4]) : null,
        explanation: rest,
      };
    } else {
      choices[currentLetter] = {
        text: null,
        tag: null,
        pct: null,
        explanation: raw,
        parseError: "choice header did not match expected format",
      };
    }
  };
  // Prefer the bold-title form; only fall back to terse if no `**A. ` header exists.
  const hasStandard = lines.some((l) => /^\*\*([A-E])\.\s/.test(l));
  if (!hasStandard) {
    for (const line of lines) {
      const t = line.match(TERSE_CHOICE_RE);
      if (t) {
        choices[t[1]] = {
          text: t[2].trim(),
          tag: t[4] === "Correct" ? "Correct" : null,
          pct: Number(t[3]),
          explanation: "",
        };
      }
    }
    return choices;
  }
  for (const line of lines) {
    const m = line.match(/^\*\*([A-E])\.\s/);
    if (m) {
      flush();
      currentLetter = m[1];
      currentBuf = [line];
    } else if (currentLetter) {
      currentBuf.push(line);
    }
  }
  flush();
  return choices;
}

function parseStyle(styleName, blockLines) {
  // Within a style block, the "Argument breakdown" is everything until a line
  // that reads "**Answer choices**" (or the first line starting with "**A. ").
  let breakdownEndIdx = -1;
  for (let i = 0; i < blockLines.length; i++) {
    const l = blockLines[i].trim();
    if (l === "**Answer choices**" || /^\*\*A\.\s/.test(blockLines[i])) {
      breakdownEndIdx = i;
      break;
    }
  }
  let breakdown, choiceLines;
  if (breakdownEndIdx === -1) {
    breakdown = trimBlock(blockLines);
    choiceLines = [];
  } else {
    breakdown = trimBlock(blockLines.slice(0, breakdownEndIdx));
    // Skip the "**Answer choices**" marker line if present.
    let start = breakdownEndIdx;
    if (blockLines[start].trim() === "**Answer choices**") start += 1;
    choiceLines = blockLines.slice(start);
  }
  return {
    breakdownMd: breakdown,
    choices: parseChoiceBlock(choiceLines),
  };
}

function correctLetterFromStyle(style) {
  if (!style || !style.choices) return null;
  const found = [];
  for (const L of CHOICE_LETTERS) {
    const c = style.choices[L];
    if (c && c.tag && /\bcorrect\b/i.test(c.tag)) found.push(L);
  }
  return found.length === 1 ? found[0] : null;
}

async function loadQuestionBank() {
  const files = (await fs.readdir(DATA_DIR)).filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f));
  const map = new Map(); // qid -> { pt, section, qnum, correctAnswer, hasChoices:bool }
  const byPtSection = new Map(); // "PT157|2" -> Set<qnum>
  for (const f of files) {
    const raw = await fs.readFile(path.join(DATA_DIR, f), "utf8");
    let arr;
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      console.warn(`skip malformed ${f}: ${e.message}`);
      continue;
    }
    for (const q of arr) {
      const pt = q.practiceTest;
      const section = q.sectionNumber;
      const qnum = q.questionNumber;
      const qid = `${pt}-S${section}-Q${qnum}`;
      map.set(qid, {
        pt,
        section,
        qnum,
        correctAnswer: q.correctAnswer,
        answerChoices: q.answerChoices,
      });
      const key = `${pt}|${section}`;
      if (!byPtSection.has(key)) byPtSection.set(key, new Set());
      byPtSection.get(key).add(qnum);
    }
  }
  return { map, byPtSection };
}

async function processFile(mdPath, bank) {
  const filename = path.basename(mdPath);
  const ptMatch = filename.match(/^PT(\d+)-explanations\.md$/);
  if (!ptMatch) throw new Error(`filename not recognized: ${filename}`);
  const ptNum = Number(ptMatch[1]);
  const ptId = `PT${ptNum}`;

  const md = await fs.readFile(mdPath, "utf8");
  const questions = splitQuestions(md);
  const output = {};
  const mismatches = [];
  let matched = 0;
  let unauthored = 0;

  for (const q of questions) {
    const qid = `${ptId}-S${q.section}-Q${q.qnum}`;
    const h3Blocks = findH3Blocks(q.bodyLines);
    const styleMap = {}; // key -> { breakdownMd, choices }

    // Determine if there are named style headings.
    const styleBlocks = h3Blocks.filter((b) => STYLE_KEYS[b.heading]);
    if (styleBlocks.length > 0) {
      for (const b of styleBlocks) {
        styleMap[STYLE_KEYS[b.heading]] = parseStyle(b.heading, b.lines);
      }
    } else {
      // Single-style format (PT159): breakdown lives in "### Argument breakdown"
      // (optional) and choices in "### Answer choices".
      const abBlock = h3Blocks.find((b) => /^Argument breakdown/i.test(b.heading));
      const acBlock = h3Blocks.find((b) => /^Answer choices/i.test(b.heading));
      const breakdown = abBlock ? trimBlock(abBlock.lines) : "";
      const choices = acBlock ? parseChoiceBlock(acBlock.lines) : {};
      styleMap.standard = { breakdownMd: breakdown, choices };
    }

    // Determine correct letter (prefer standard).
    const primary = styleMap.standard || styleMap.brief || styleMap.anotherWay;
    const correctChoice = correctLetterFromStyle(primary);

    // Cross-check against bank.
    const bankEntry = bank.map.get(qid);
    if (!bankEntry) {
      unauthored += 1;
      mismatches.push({
        qid,
        line: q.startLine,
        kind: "missing_question",
        detail: `no question ${qid} in question bank`,
      });
      continue;
    }
    if (correctChoice && bankEntry.correctAnswer && correctChoice !== bankEntry.correctAnswer) {
      mismatches.push({
        qid,
        line: q.startLine,
        kind: "correct_answer_conflict",
        detail: `explanation marks ${correctChoice} correct; bank says ${bankEntry.correctAnswer}`,
      });
    }
    if (!correctChoice) {
      mismatches.push({
        qid,
        line: q.startLine,
        kind: "no_correct_tag",
        detail: "no choice tagged Correct in standard style",
      });
    }
    // Check we have 5 choices in the primary style.
    const missingLetters = CHOICE_LETTERS.filter((L) => !primary?.choices?.[L]);
    if (missingLetters.length) {
      mismatches.push({
        qid,
        line: q.startLine,
        kind: "missing_choices",
        detail: `standard style missing choices ${missingLetters.join(",")}`,
      });
    }
    // Check any parse errors on any choice.
    for (const [styleKey, style] of Object.entries(styleMap)) {
      for (const L of CHOICE_LETTERS) {
        const c = style.choices?.[L];
        if (c?.parseError) {
          mismatches.push({
            qid,
            line: q.startLine,
            kind: "choice_parse_error",
            detail: `${styleKey}.${L}: ${c.parseError}`,
          });
        }
      }
    }

    output[qid] = {
      pt: ptId,
      section: q.section,
      qnum: q.qnum,
      qtypeLabel: q.qtypeLabel,
      correctChoice: correctChoice || bankEntry.correctAnswer || null,
      styles: styleMap,
    };
    matched += 1;
  }

  const outPath = path.join(OUT_DIR, `${ptId}-explanations.json`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");

  return { ptId, mdPath, outPath, matched, unauthored, mismatches, totalParsed: questions.length };
}

async function main() {
  const argPaths = process.argv.slice(2);
  let mdFiles;
  if (argPaths.length) {
    mdFiles = argPaths.map((p) => path.resolve(p));
  } else {
    const entries = await fs.readdir(EXPL_DIR);
    mdFiles = entries
      .filter((f) => /^PT\d+-explanations\.md$/.test(f))
      .map((f) => path.join(EXPL_DIR, f));
  }
  mdFiles.sort();

  const bank = await loadQuestionBank();
  const perFile = [];
  for (const f of mdFiles) {
    perFile.push(await processFile(f, bank));
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const lines = [];
  lines.push(`# LSAT Lab explanation ingest report`);
  lines.push("");
  lines.push(`Files processed: ${perFile.length}`);
  lines.push("");
  for (const r of perFile) {
    lines.push(`## ${r.ptId}`);
    lines.push(`- Source: \`${path.relative(ROOT, r.mdPath)}\``);
    lines.push(`- Output: \`${path.relative(ROOT, r.outPath)}\``);
    lines.push(`- Parsed questions: ${r.totalParsed}`);
    lines.push(`- Matched to bank: ${r.matched}`);
    lines.push(`- Not in bank: ${r.unauthored}`);
    lines.push(`- Mismatches / warnings: ${r.mismatches.length}`);
    if (r.mismatches.length) {
      lines.push("");
      lines.push(`| qid | line | kind | detail |`);
      lines.push(`|---|---|---|---|`);
      for (const m of r.mismatches) {
        lines.push(`| ${m.qid} | ${m.line} | ${m.kind} | ${m.detail.replace(/\|/g, "\\|")} |`);
      }
    }
    lines.push("");
  }
  await fs.writeFile(REPORT_PATH, lines.join("\n"), "utf8");

  const totalMismatch = perFile.reduce((a, r) => a + r.mismatches.length, 0);
  const totalMatched = perFile.reduce((a, r) => a + r.matched, 0);
  console.log(`Wrote ${perFile.length} sidecar file(s). Matched=${totalMatched} Warnings=${totalMismatch}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
