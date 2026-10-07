// Parser for the older LSAT Lab explanation layout used by
// Explanations/PT155-S2-explanations.md:
//
//   ## Question 1
//   **Type:** Strengthen
//   **Correct answer:** A
//   ### Stimulus
//   ### Question stem
//   ### Answer choices        -> plain "**A.** text" lines (no tag, no percent)
//   ### Written explanation   -> bold label lines + prose
//   ### Answer choice explanations -> "**A — <heading> (<n>% of students)**" + prose
//
// The per-choice headings in this layout are not stored as tags or
// percentages (they are not part of the "### Answer choices" block the other
// corpus files use); only the verbatim prose is kept. Nothing is invented.

const QUESTION_SPLIT = /^## (?=Question \d+)/m;
const HEADING_RE = /^Question\s+(\d+)\s*$/;
const TYPE_RE = /^\*\*Type:\*\*\s*(.+?)\s*$/m;
const CORRECT_RE = /^\*\*Correct answer:\*\*\s*([A-E])\s*$/m;
const CHOICE_RE = /^\*\*([A-E])\.\*\*\s*([\s\S]+)$/;
const NOTE_HEAD_RE = /^\*\*([A-E])\s+\u2014\s+.*\*\*\s*$/;
const BOLD_ONLY_RE = /^\*\*(.+?)\*\*\s*$/;

function splitSubsections(body) {
  const out = [];
  let current = null;
  for (const line of body.split('\n')) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    if (m) {
      current = { heading: m[1], lines: [] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return out;
}

function parseChoices(lines) {
  const choices = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = CHOICE_RE.exec(line);
    if (m) {
      current = { letter: m[1], text: m[2].trim() };
      choices.push(current);
      continue;
    }
    if (current && line.trim()) current.text = `${current.text}\n${line.trim()}`;
  }
  return choices;
}

function parseWritten(lines) {
  const steps = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const h = BOLD_ONLY_RE.exec(line);
    if (h) {
      steps.push({ label: h[1].trim(), text: '' });
      continue;
    }
    if (!steps.length) continue;
    const prev = steps[steps.length - 1];
    prev.text = prev.text ? `${prev.text}\n${line}` : line;
  }
  return steps.filter((s) => s.text.trim());
}

function parseChoiceNotes(lines) {
  const notes = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = NOTE_HEAD_RE.exec(line);
    if (m) {
      current = { letter: m[1], prose: [] };
      notes.push(current);
      continue;
    }
    if (!current) continue;
    if (!line.trim()) {
      if (current.prose.length) current.prose.push('');
      continue;
    }
    current.prose.push(line);
  }
  return notes
    .map((n) => ({ letter: n.letter, prose: n.prose.join('\n').trim() }))
    .filter((n) => n.prose);
}

/** Parse one legacy "## Question N" explanations file. */
export function parseLegacyExplanationFile(text, fileName, { preptest, section }) {
  const questions = [];
  const skipped = [];

  for (const chunk of text.split(QUESTION_SPLIT).slice(1)) {
    const [headingLine, ...rest] = chunk.split('\n');
    const body = rest.join('\n');
    const hm = HEADING_RE.exec(headingLine.trim());
    if (!hm) {
      skipped.push({ id: `${fileName} ${headingLine.trim()}`, reason: 'unparseable question heading' });
      continue;
    }
    const questionNumber = Number(hm[1]);
    const qid = `PT${preptest}-S${section}-Q${questionNumber}`;

    const typeM = TYPE_RE.exec(body);
    const correctM = CORRECT_RE.exec(body);
    if (!typeM) {
      skipped.push({ id: qid, reason: 'missing "**Type:**" line' });
      continue;
    }
    if (!correctM) {
      skipped.push({ id: qid, reason: 'missing "**Correct answer:**" line' });
      continue;
    }
    const correctChoice = correctM[1];

    const subs = splitSubsections(body);
    const stimulus = subs.find((s) => s.heading === 'Stimulus');
    const stem = subs.find((s) => s.heading === 'Question stem');
    const choiceSec = subs.find((s) => s.heading === 'Answer choices');
    if (!stimulus || !stem || !choiceSec) {
      skipped.push({ id: qid, reason: 'missing Stimulus, Question stem, or Answer choices section' });
      continue;
    }

    const parsed = parseChoices(choiceSec.lines);
    if (parsed.length < 5) {
      skipped.push({ id: qid, reason: `only ${parsed.length} answer choices parsed (need 5)` });
      continue;
    }
    if (!parsed.some((c) => c.letter === correctChoice)) {
      skipped.push({ id: qid, reason: `stated correct answer ${correctChoice} is not among the parsed choices` });
      continue;
    }

    const writtenSec = subs.find((s) => s.heading === 'Written explanation');
    const notesSec = subs.find((s) => s.heading === 'Answer choice explanations');
    const steps = writtenSec ? parseWritten(writtenSec.lines) : [];
    const choiceProse = notesSec ? parseChoiceNotes(notesSec.lines) : [];
    const explanations = steps.length || choiceProse.length ? [{ style: 'single', steps, choiceProse }] : [];

    questions.push({
      preptest,
      section,
      questionNumber,
      qid,
      questionType: typeM[1].trim(),
      stimulus: stimulus.lines.join('\n').trim(),
      prompt: stem.lines.join('\n').trim(),
      sourceNote: null,
      isExplained: explanations.length > 0,
      correctChoice,
      // This layout carries no per-choice tag or percentage in the answer
      // choice block, so both stay null rather than being invented.
      choices: parsed.map((c) => ({
        letter: c.letter,
        text: c.text,
        tag: null,
        percent: null,
        isCorrect: c.letter === correctChoice,
      })),
      explanations,
    });
  }

  return { preptest, questions, skipped };
}
