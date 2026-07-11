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

function splitQuestions(md, sectionHint) {
  // Split by "## S<k> · Q<n> — <type>" headings.
  // Falls back to "## Question <n>" / "## Q<n>" headings when the file uses
  // that layout; in that case the section comes from `sectionHint` (derived
  // from the filename) or from a preceding "# Section N" header.
  const lines = md.split("\n");
  const questions = [];
  let current = null;
  let currentSection = sectionHint ?? null;
  const headerReA = /^##\s+S(\d+)\s*·\s*Q(\d+)\s*(?:—\s*(.+))?\s*$/;
  const headerReB = /^##\s+(?:Question|Q)\s*(\d+)\s*(?:—\s*(.+))?\s*$/i;
  const sectionHeaderRe = /^#\s+Section\s+(\d+)/i;
  for (let i = 0; i < lines.length; i++) {
    const sh = lines[i].match(sectionHeaderRe);
    if (sh) currentSection = Number(sh[1]);
    const mA = lines[i].match(headerReA);
    const mB = mA ? null : lines[i].match(headerReB);
    if (mA || mB) {
      if (current) questions.push(current);
      const section = mA ? Number(mA[1]) : currentSection;
      const qnum = Number((mA ? mA[2] : mB[1]));
      const qtypeLabel = ((mA ? mA[3] : mB[2]) || "").trim();
      current = { section, qnum, qtypeLabel, startLine: i + 1, bodyLines: [] };
    } else if (current) {
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

// Format C ("## Question N" layout used by PT155-S1 / PT155-S2 files):
//   ### Answer choices           — plain "**A.** text" (no tag/pct here)
//   ### Written explanation      — breakdown block
//   ### Answer choice explanations — "**A — Tag (N% of students)**" then paragraphs
function parseFormatCChoices(answerLines, explanationLines) {
  const choices = {};
  // 1) Plain choice text: **A.** text  (may span multiple lines)
  {
    let current = null;
    let buf = [];
    const flush = () => {
      if (!current) return;
      choices[current] = choices[current] || { text: null, tag: null, pct: null, explanation: "" };
      choices[current].text = buf.join(" ").replace(/\s+/g, " ").trim();
    };
    for (const line of answerLines) {
      const m = line.match(/^\*\*([A-E])\.\*\*\s+(.*)$/);
      if (m) {
        flush();
        current = m[1];
        buf = [m[2]];
      } else if (current) {
        if (line.trim()) buf.push(line.trim());
      }
    }
    flush();
  }
  // 2) Per-choice explanation blocks: **A — Tag (N% of students)**
  {
    let current = null;
    let buf = [];
    const headerRe = /^\*\*([A-E])\s+—\s+([^\n]+?)(?:\s*\((\d+)%\s+of students\))?\*\*\s*$/;
    const flush = () => {
      if (!current) return;
      const c = choices[current] || (choices[current] = { text: null, tag: null, pct: null, explanation: "" });
      c.explanation = buf.join("\n").trim();
    };
    for (const line of explanationLines) {
      const m = line.match(headerRe);
      if (m) {
        flush();
        current = m[1];
        buf = [];
        const c = choices[current] || (choices[current] = { text: null, tag: null, pct: null, explanation: "" });
        c.tag = m[2].trim();
        c.pct = m[3] != null ? Number(m[3]) : null;
      } else if (current) {
        buf.push(line);
      }
    }
    flush();
  }
  return choices;
}

async function processFile(mdPath, bank) {
  const filename = path.basename(mdPath);
  // Accept PT<n>-explanations.md and PT<n>-S<k>-explanations.md
  const ptMatch = filename.match(/^PT(\d+)(?:-S(\d+))?-explanations\.md$/);
  if (!ptMatch) throw new Error(`filename not recognized: ${filename}`);
  const ptNum = Number(ptMatch[1]);
  const ptId = `PT${ptNum}`;
  const sectionHint = ptMatch[2] ? Number(ptMatch[2]) : null;

  const md = await fs.readFile(mdPath, "utf8");
  const questions = splitQuestions(md, sectionHint);
  const output = {};
  const mismatches = [];
  let matched = 0;
  let unauthored = 0;

  for (const q of questions) {
    if (!q.section) {
      mismatches.push({
        qid: `${ptId}-S?-Q${q.qnum}`,
        line: q.startLine,
        kind: "unknown_section",
        detail: "no section header or filename hint",
      });
      continue;
    }
    const qid = `${ptId}-S${q.section}-Q${q.qnum}`;
    const h3Blocks = findH3Blocks(q.bodyLines);
    const styleMap = {};

    const styleBlocks = h3Blocks.filter((b) => STYLE_KEYS[b.heading]);
    const writtenBlock = h3Blocks.find((b) => /^Written\b/i.test(b.heading));
    const ansChoiceExplBlock = h3Blocks.find((b) => /^Answer choice explanations/i.test(b.heading));

    if (styleBlocks.length > 0) {
      for (const b of styleBlocks) {
        styleMap[STYLE_KEYS[b.heading]] = parseStyle(b.heading, b.lines);
      }
    } else if (ansChoiceExplBlock) {
      // Format C
      const stemBlock = h3Blocks.find((b) => /^Answer choices/i.test(b.heading));
      const writtenExpl = h3Blocks.find((b) => /^Written explanation/i.test(b.heading));
      const breakdown = writtenExpl ? trimBlock(writtenExpl.lines) : "";
      const choices = parseFormatCChoices(
        stemBlock ? stemBlock.lines : [],
        ansChoiceExplBlock.lines,
      );
      styleMap.standard = { breakdownMd: breakdown, choices };
    } else if (writtenBlock) {
      // Format B: "### Written*" contains the standard-style block content
      styleMap.standard = parseStyle("Written", writtenBlock.lines);
    } else {
      // Format A single-style (PT159): explicit "Argument breakdown" + "Answer choices"
      const abBlock = h3Blocks.find((b) => /^Argument breakdown/i.test(b.heading));
      const acBlock = h3Blocks.find((b) => /^Answer choices/i.test(b.heading));
      const breakdown = abBlock ? trimBlock(abBlock.lines) : "";
      const choices = acBlock ? parseChoiceBlock(acBlock.lines) : {};
      styleMap.standard = { breakdownMd: breakdown, choices };
    }

    const primary = styleMap.standard || styleMap.brief || styleMap.anotherWay;
    const correctChoice = correctLetterFromStyle(primary);

    const bankEntry = bank.map.get(qid);
    if (!bankEntry) {
      unauthored += 1;
      mismatches.push({ qid, line: q.startLine, kind: "missing_question", detail: `no question ${qid} in question bank` });
      continue;
    }
    if (correctChoice && bankEntry.correctAnswer && correctChoice !== bankEntry.correctAnswer) {
      mismatches.push({ qid, line: q.startLine, kind: "correct_answer_conflict", detail: `explanation marks ${correctChoice} correct; bank says ${bankEntry.correctAnswer}` });
    }
    if (!correctChoice && !bankEntry.correctAnswer) {
      mismatches.push({ qid, line: q.startLine, kind: "no_correct_tag", detail: "no choice tagged Correct in primary style and bank has no correctAnswer" });
    }
    const missingLetters = CHOICE_LETTERS.filter((L) => !primary?.choices?.[L]);
    if (missingLetters.length) {
      mismatches.push({ qid, line: q.startLine, kind: "missing_choices", detail: `primary style missing choices ${missingLetters.join(",")}` });
    }
    for (const [styleKey, style] of Object.entries(styleMap)) {
      for (const L of CHOICE_LETTERS) {
        const c = style.choices?.[L];
        if (c?.parseError) {
          mismatches.push({ qid, line: q.startLine, kind: "choice_parse_error", detail: `${styleKey}.${L}: ${c.parseError}` });
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

  return { ptId, mdPath, matched, unauthored, mismatches, totalParsed: questions.length, output };
}

async function main() {
  const argPaths = process.argv.slice(2);
  let mdFiles;
  if (argPaths.length) {
    mdFiles = argPaths.map((p) => path.resolve(p));
  } else {
    const entries = await fs.readdir(EXPL_DIR);
    mdFiles = entries
      .filter((f) => /^PT\d+(?:-S\d+)?-explanations\.md$/.test(f))
      .map((f) => path.join(EXPL_DIR, f));
  }
  mdFiles.sort();

  const bank = await loadQuestionBank();
  const perFile = [];
  for (const f of mdFiles) {
    perFile.push(await processFile(f, bank));
  }

  // Merge results per PT (multiple source files can contribute to one PT).
  const byPt = new Map(); // ptId -> merged output object
  for (const r of perFile) {
    if (!byPt.has(r.ptId)) byPt.set(r.ptId, {});
    Object.assign(byPt.get(r.ptId), r.output);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  const writtenPaths = new Map();
  for (const [ptId, output] of byPt.entries()) {
    const outPath = path.join(OUT_DIR, `${ptId}-explanations.json`);
    await fs.writeFile(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
    writtenPaths.set(ptId, outPath);
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const lines = [];
  lines.push(`# LSAT Lab explanation ingest report`);
  lines.push("");
  lines.push(`Source files processed: ${perFile.length}`);
  lines.push(`Sidecars written: ${byPt.size}`);
  lines.push("");
  for (const r of perFile) {
    lines.push(`## ${r.ptId} — \`${path.relative(ROOT, r.mdPath)}\``);
    lines.push(`- Output: \`${path.relative(ROOT, writtenPaths.get(r.ptId))}\``);
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
  console.log(`Wrote ${byPt.size} sidecar file(s) from ${perFile.length} source(s). Matched=${totalMatched} Warnings=${totalMismatch}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
