#!/usr/bin/env node
// Parse PT152 markdown bank → public/data/PT152-S1-LR.json and PT152-S3-LR.json
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || '/tmp/pt159.md';
const DATA_DIR = path.resolve('public/data');
const md = fs.readFileSync(SRC, 'utf8');

// Map source-format question types to canonical bank types
const QTYPE_MAP = {
  'Flaw or descriptive weakening': 'Flaw',
  'Method of reasoning or descriptive': 'Method of Reasoning',
  'Point at issue: disagree': 'Agree/Disagree',
  'Point at issue: agree': 'Agree/Disagree',
  'Resolve, reconcile, or explain': 'Paradox',
  'Weaken': 'Weaken',
  'Necessary assumption': 'Necessary Assumption',
  'Strengthen': 'Strengthen',
  'Fill in the blank': 'Most Strongly Supported',
  'Most strongly supported': 'Most Strongly Supported',
  'Principle': 'Principle-Conform',
  'Must be true': 'Must Be True',
  'Parallel method of reasoning': 'Parallel Reasoning',
  'Parallel flawed method of reasoning': 'Parallel Flaw',
  'Sufficient assumption': 'Sufficient Assumption',
  'Argument part': 'Role',
  'Main conclusion or main point': 'Main Conclusion',
  'PSA - Find or complete the application': 'Principle-Conform',
  'PSA - Find or complete the principle': 'Principle-Strengthen',
};

// Split on `## PT152-` headers
const blocks = md.split(/\n## (?=PT152-S\d+-Q\d+)/).slice(1);
console.log(`Found ${blocks.length} question blocks`);

const sections = { 1: [], 2: [], 4: [] };

for (const block of blocks) {
  const headerMatch = block.match(/^PT152-S(\d+)-Q(\d+)/);
  if (!headerMatch) continue;
  const section = +headerMatch[1];
  const qnum = +headerMatch[2];

  // Parse YAML front block
  const yamlMatch = block.match(/```yaml\n([\s\S]*?)\n```/);
  if (!yamlMatch) { console.warn(`No yaml in S${section}-Q${qnum}`); continue; }
  const yaml = yamlMatch[1];
  const get = (k) => {
    const m = yaml.match(new RegExp(`^${k}:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|(.+))$`, 'm'));
    if (!m) return null;
    return m[1] !== undefined ? m[1].replace(/\\"/g, '"') : m[2].trim();
  };
  const difficulty = parseInt(get('difficulty'), 10);
  const rawType = get('question_type') || '';
  const reasoning = get('reasoning_type');
  const correct = get('correct_answer');

  const qtype = QTYPE_MAP[rawType] || rawType;
  if (!QTYPE_MAP[rawType]) console.warn(`Unmapped question_type "${rawType}" at S${section}-Q${qnum}`);

  // Question text — between "### Question" and "### Answer Choices"
  const qm = block.match(/### Question\n+([\s\S]*?)\n+### Answer Choices/);
  if (!qm) { console.warn(`No question text S${section}-Q${qnum}`); continue; }
  const fullQuestion = qm[1].trim().replace(/\s+/g, ' ');
  // Split into stimulus + stem: stem is the final sentence containing "Which one" / "The" / question mark
  // Heuristic: split on the LAST sentence ending with '?' or matching common stem cues
  let stimulus = fullQuestion;
  let questionStem = '';
  // Try to find a stem at the end
  const stemPatterns = [
    /(.*?)\s+(Which one of the following[^?]*\?)\s*$/s,
    /(.*?)\s+(The (?:argument|reasoning|conclusion|author|passage)[^?]*\?)\s*$/s,
    /(.*?)\s+(In the passage[^?]*\?)\s*$/s,
    /(.*?)\s+([A-Z][^.?!]*\?)\s*$/s,
  ];
  for (const re of stemPatterns) {
    const m = fullQuestion.match(re);
    if (m) { stimulus = m[1].trim(); questionStem = m[2].trim(); break; }
  }
  if (!questionStem) {
    // fallback: split last sentence
    const idx = fullQuestion.lastIndexOf('. ');
    if (idx > 0) {
      stimulus = fullQuestion.slice(0, idx + 1).trim();
      questionStem = fullQuestion.slice(idx + 2).trim();
    } else {
      questionStem = fullQuestion;
      stimulus = '';
    }
  }

  // Answer choices
  const choices = {};
  const choiceRe = /\*\*\(([A-E])\)\*\*\s+([\s\S]*?)(?=\n\n\*\*\(|\n+### Correct Answer)/g;
  let cm;
  while ((cm = choiceRe.exec(block)) !== null) {
    choices[cm[1]] = cm[2].trim().replace(/\s+/g, ' ');
  }
  if (Object.keys(choices).length !== 5) {
    console.warn(`S${section}-Q${qnum}: ${Object.keys(choices).length} choices parsed`);
  }

  const obj = {
    practiceTest: 'PT152',
    sectionNumber: section,
    questionNumber: qnum,
    questionType: qtype,
    reasoningType: reasoning || null,
    questionDifficulty: difficulty,
    stimulus,
    questionStem,
    answerChoices: choices,
    correctAnswer: correct,
  };
  sections[section].push(obj);
}

for (const s of [1, 2, 4]) {
  sections[s].sort((a, b) => a.questionNumber - b.questionNumber);
  const fp = path.join(DATA_DIR, `PT152-S${s}-LR.json`);
  fs.writeFileSync(fp, JSON.stringify(sections[s], null, 2) + '\n');
  console.log(`Wrote ${fp}: ${sections[s].length} questions`);
}
