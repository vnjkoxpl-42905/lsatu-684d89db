// Deterministic parser for the authored LR explanation markdown files
// (PT<NNN>-explanations.md). Pure: given a file's text it returns structured
// records. It never invents a tag, a percentage, or any prose — anything it
// cannot read verbatim becomes a skip with a reason.
//
// Recognised shapes (all present in the PT101-PT140 corpus):
//   ## S<n> · Q<n> — <question type>
//   > no explanation given                     -> unexplained question
//   ### Stimulus / ### Prompt
//   ### Written (single style)                 -> one explanation, style "single"
//   ### Written (Standard|Brief|Another Way)   -> three explanations
//   ### Standard | ### Brief | ### Another Way -> three explanations (alt spelling)
//   ### Answer-choice notes (no authored breakdown)
//   ### Answer-choice tags (no authored prose)
//   ### Answer choices                         -> unexplained question's choices
//
// Choice line:
//   **A. <text>** — <tag> (<N>% of students)
//   **A. <text>** (<N>% of students)           -> tag stays null

const QUESTION_SPLIT = /^## (?=S\d+ \u00B7 Q)/m;
const HEADING_RE = /^S(\d+)\s\u00B7\sQ(\d+)\s\u2014\s(.+)$/;
const CHOICE_RE =
  /^\*\*([A-E])\.\s+([\s\S]*?)\*\*(?:\s+\u2014\s+(.+?))?\s+\((\d+)% of students\)\s*$/;
const STEP_RE = /^-\s+\*\*(.+?):\*\*\s*([\s\S]*)$/;

const STYLE_HEADINGS = new Map([
  ['Written (single style)', 'single'],
  ['Written (Standard)', 'standard'],
  ['Written (Brief)', 'brief'],
  ['Written (Another Way)', 'another_way'],
  ['Standard', 'standard'],
  ['Brief', 'brief'],
  ['Another Way', 'another_way'],
  ['Answer-choice notes (no authored breakdown)', 'single'],
  ['Answer-choice tags (no authored prose)', 'single'],
  ['Answer choices', null], // unexplained question: choices only
]);

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

function parseChoiceBlock(lines) {
  const choices = [];
  let current = null;
  // A choice header may wrap across lines when the tag is a dual label, e.g.
  //   **A. text** — Bad Conclusion Match
  //   Bad Validity Match (2% of students)
  // so we buffer from the "**X. " opener until the percentage terminator.
  let header = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\*\*Answer choices\*\*\s*$/.test(line)) continue;

    if (header !== null) {
      header = `${header}\n${line}`;
    } else if (/^\*\*[A-E]\.\s/.test(line)) {
      header = line;
    }

    if (header !== null) {
      const m = CHOICE_RE.exec(header);
      if (m) {
        current = {
          letter: m[1],
          text: m[2].trim(),
          tag: m[3] ? m[3].trim() : null,
          percent: Number(m[4]),
          prose: [],
        };
        choices.push(current);
        header = null;
      } else if (header.split('\n').length > 6) {
        header = null; // not a choice header after all; drop the buffer
      }
      continue;
    }

    if (!current) continue;
    if (line.trim() === '') {
      if (current.prose.length) current.prose.push('');
      continue;
    }
    current.prose.push(line);
  }
  return choices.map((c) => ({
    ...c,
    prose: c.prose.join('\n').trim() || null,
  }));
}

function parseBreakdown(lines) {
  const steps = [];
  let inBreakdown = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\*\*Argument breakdown\*\*\s*$/.test(line)) {
      inBreakdown = true;
      continue;
    }
    if (/^\*\*Answer choices\*\*\s*$/.test(line)) break;
    if (!inBreakdown) continue;
    const m = STEP_RE.exec(line);
    if (m) {
      steps.push({ label: m[1].trim(), text: m[2].trim() });
    } else if (line.trim() && steps.length) {
      // continuation line of the previous step
      steps[steps.length - 1].text += `\n${line}`;
    }
  }
  return steps;
}

/** Parse one PT<NNN>-explanations.md file. */
export function parseExplanationFile(text, fileName) {
  const preptestMatch = /^#\s+PrepTest\s+(\d+)/m.exec(text);
  if (!preptestMatch) throw new Error(`${fileName}: no "# PrepTest <n>" header`);
  const preptest = Number(preptestMatch[1]);

  const questions = [];
  const skipped = [];

  for (const chunk of text.split(QUESTION_SPLIT).slice(1)) {
    const [headingLine, ...rest] = chunk.split('\n');
    const body = rest.join('\n');
    const hm = HEADING_RE.exec(headingLine.trim());
    if (!hm) {
      skipped.push({ id: `PT${preptest} ${headingLine.trim()}`, reason: 'unparseable question heading' });
      continue;
    }
    const section = Number(hm[1]);
    const questionNumber = Number(hm[2]);
    const qid = `PT${preptest}-S${section}-Q${questionNumber}`;
    const questionType = hm[3].trim();

    const noteMatch = /^>\s+(.*)$/m.exec(body);
    const sourceNote = noteMatch ? noteMatch[1].trim() : null;
    const unexplained = /^>\s+no explanation given\s*$/im.test(body);

    const subs = splitSubsections(body);
    const stimulus = subs.find((s) => s.heading === 'Stimulus');
    const prompt = subs.find((s) => s.heading === 'Prompt');
    if (!stimulus || !prompt) {
      skipped.push({ id: qid, reason: 'missing Stimulus or Prompt section' });
      continue;
    }

    const styleSections = subs.filter((s) => STYLE_HEADINGS.has(s.heading));
    if (!styleSections.length) {
      skipped.push({ id: qid, reason: 'no recognised answer-choice / explanation section' });
      continue;
    }

    // Choices come from the first style section; every style repeats them.
    const choices = parseChoiceBlock(styleSections[0].lines);
    if (choices.length < 5) {
      skipped.push({ id: qid, reason: `only ${choices.length} answer choices parsed (need 5)` });
      continue;
    }
    const correct = choices.filter((c) => c.tag === 'Correct');
    if (correct.length !== 1) {
      skipped.push({
        id: qid,
        reason: correct.length === 0 ? 'no choice tagged "Correct"' : `${correct.length} choices tagged "Correct"`,
      });
      continue;
    }
    const pctSum = choices.reduce((a, c) => a + c.percent, 0);
    if (pctSum < 95 || pctSum > 105) {
      skipped.push({ id: qid, reason: `percentages sum to ${pctSum} (outside 95-105)` });
      continue;
    }

    const explanations = [];
    for (const sec of styleSections) {
      const style = STYLE_HEADINGS.get(sec.heading);
      if (!style) continue; // "### Answer choices" on an unexplained question
      const styleChoices = parseChoiceBlock(sec.lines);
      const steps = parseBreakdown(sec.lines);
      const choiceProse = styleChoices
        .filter((c) => c.prose)
        .map((c) => ({ letter: c.letter, prose: c.prose }));
      if (!steps.length && !choiceProse.length) continue;
      explanations.push({ style, steps, choiceProse });
    }

    questions.push({
      preptest,
      section,
      questionNumber,
      qid,
      questionType,
      stimulus: stimulus.lines.join('\n').trim(),
      prompt: prompt.lines.join('\n').trim(),
      sourceNote,
      isExplained: !unexplained && explanations.length > 0,
      choices: choices.map(({ prose, ...c }) => c),
      explanations,
    });
  }

  return { preptest, questions, skipped };
}
