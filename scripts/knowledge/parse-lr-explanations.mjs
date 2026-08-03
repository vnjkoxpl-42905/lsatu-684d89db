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
// v2 corpus states the correct letter explicitly, straight from LSAT Lab's
// `correctanswer` field. It is authoritative; the choice tag is not.
const CORRECT_ANSWER_RE = /^\*\*Correct answer:\*\*\s*([A-E])\s*$/m;
const CHOICE_RE =
  /^\*\*([A-E])\.\s+([\s\S]*?)\*\*(?:\s+\u2014\s+([\s\S]+?))?\s+\((\d+)% of students\)\s*$/;
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
    const m = STEP_RE.exec(line);
    if (m && (inBreakdown || true)) {
      inBreakdown = true;
      steps.push({ label: m[1].trim(), text: m[2].trim() });
      continue;
    }
    // Alternate authored shape: the label is its own bold line, with the step
    // text in the paragraph(s) below it (e.g. "**Given that ...**").
    const h = /^\*\*(.+?)\*\*\s*$/.exec(line);
    if (h) {
      inBreakdown = true;
      steps.push({ label: h[1].replace(/\s*\.\.\.\s*$/, '').trim(), text: '' });
      continue;
    }
    if (!inBreakdown) continue;
    if (line.trim() && steps.length) {
      const prev = steps[steps.length - 1];
      prev.text = prev.text ? `${prev.text}\n${line}` : line;
    }
  }
  return steps.filter((s) => s.text.trim());
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

    // Choices are repeated under every style, but some questions print them
    // only once (after the last style), so take the first block that is whole.
    const choiceBlocks = styleSections.map((s) => parseChoiceBlock(s.lines));
    const choices = choiceBlocks.find((b) => b.length >= 5) ?? choiceBlocks[0] ?? [];
    if (choices.length < 5) {
      skipped.push({ id: qid, reason: `only ${choices.length} answer choices parsed (need 5)` });
      continue;
    }
    // Correctness comes from the authored "**Correct answer:** X" line, which
    // is LSAT Lab's own `correctanswer` field. Choice tags are NOT reliable:
    // some correct choices carry no tag, others carry a descriptive one
    // ("Conclusion", "Weakens"). Only when the line is absent (older corpus
    // files) do we fall back to a tag reading "Correct".
    const stated = CORRECT_ANSWER_RE.exec(body);
    let correctChoice = null;
    if (stated) {
      correctChoice = stated[1];
      if (!choices.some((c) => c.letter === correctChoice)) {
        skipped.push({ id: qid, reason: `stated correct answer ${correctChoice} is not among the parsed choices` });
        continue;
      }
    } else {
      const tagged = choices.filter((c) => c.tag && /^Correct\b/i.test(c.tag));
      if (tagged.length === 1) {
        correctChoice = tagged[0].letter;
      } else if (!unexplained) {
        skipped.push({
          id: qid,
          reason:
            tagged.length === 0
              ? 'no "**Correct answer:**" line and no choice tagged "Correct"'
              : `no "**Correct answer:**" line and ${tagged.length} choices tagged "Correct"`,
        });
        continue;
      }
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
