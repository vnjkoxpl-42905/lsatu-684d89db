import {
  scheduleData,
  questionBank,
  practiceSets,
  flashcards,
  flawHubData,
  principleHubData,
} from '../data';
import { moduleOverviewSections } from '../content/module-overview';

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function rule(width = 60) {
  return '─'.repeat(width);
}

export function downloadSchedule() {
  const lines: string[] = [];
  lines.push('Flaw + Principle Module — 14-Day Schedule');
  lines.push(rule());
  lines.push('');
  for (const day of scheduleData) {
    lines.push(`Day ${day.day} (${day.label}) — ${day.focus}`);
    lines.push(`Time: ${day.time}    Intensity: ${day.intensity}`);
    lines.push('');
    lines.push(`Goal: ${day.plainGoal}`);
    if (day.open?.length) lines.push(`Open: ${day.open.join(', ')}`);
    if (day.read?.length) lines.push(`Read: ${day.read.join(', ')}`);
    if (day.do?.length) lines.push(`Do: ${day.do.join(', ')}`);
    if (day.review?.length) lines.push(`Review: ${day.review.join(', ')}`);
    if (day.deliverable) lines.push(`Deliverable: ${day.deliverable}`);
    lines.push('');
    lines.push(rule());
    lines.push('');
  }
  downloadText('flaw-principle-schedule.txt', lines.join('\n'));
}

export function downloadQuestionList() {
  const lines: string[] = [];
  lines.push('Flaw + Principle Module — Assigned Question List');
  lines.push('Open the actual PT for each question. The app does not reproduce LSAT text.');
  lines.push(rule());
  lines.push('');
  for (const set of practiceSets) {
    if (set.questions.length === 0) continue;
    lines.push(`${set.title} (${set.stage})`);
    lines.push(`When: ${set.whenToDo}`);
    lines.push(`Purpose: ${set.purpose}`);
    lines.push('');
    set.questions.forEach((qid, idx) => {
      const q = questionBank.find(qb => qb.id === qid);
      if (!q) return;
      lines.push(`  ${(idx + 1).toString().padStart(2, ' ')}. PT ${q.pt}, S ${q.section}, Q ${q.question}    [${q.topic}]`);
    });
    lines.push('');
    lines.push(rule());
    lines.push('');
  }
  downloadText('flaw-principle-question-list.txt', lines.join('\n'));
}

export function downloadFlawNotes() {
  const lines: string[] = [];
  lines.push('Flaw Notes');
  lines.push(rule());
  lines.push('');
  lines.push('THE 4-STEP METHOD');
  lines.push('1. Conclusion — what is the author trying to prove?');
  lines.push('2. Evidence — what support is given?');
  lines.push('3. Assumption — name the missing link. Negate it; if the argument dies, that was the assumption.');
  lines.push('4. Flaw — state the gap in one plain-English sentence.');
  lines.push('');
  lines.push(rule());
  lines.push('');
  lines.push('ANSWER-CHOICE STYLES');
  lines.push('');
  for (const s of flawHubData.styles) {
    lines.push(`• ${s.style}`);
    lines.push(`    Meaning: ${s.meaning}`);
    lines.push(`    How to spot: ${s.language.map(l => `"${l}"`).join(', ')}`);
    lines.push(`    Test: ${s.test}`);
    lines.push(`    Common mistake: ${s.wrongBehavior}`);
    lines.push(`    Review prompt: ${s.reviewPrompt}`);
    lines.push('');
  }
  lines.push(rule());
  lines.push('');
  lines.push('FAMOUS FLAW MAP');
  lines.push('');
  for (const f of flawHubData.famousFlaws) {
    lines.push(`• ${f.flaw}`);
    lines.push(`    Logical failure: ${f.meaning}`);
    lines.push(`    Spot pattern: ${f.spot}`);
    lines.push(`    Crucial question: ${f.ask}`);
    lines.push('');
  }
  lines.push(rule());
  lines.push('');
  lines.push('COMMON TRAPS');
  for (const t of flawHubData.traps) {
    lines.push(`• ${t.trap}: ${t.meaning}`);
    lines.push(`    Trick: "${t.trick}"`);
    lines.push(`    Defense: ${t.avoid}`);
    lines.push('');
  }
  lines.push(rule());
  lines.push('');
  lines.push('REVIEW TEMPLATE (use on every miss)');
  for (const item of flawHubData.reviewTemplate) {
    lines.push(`  - ${item.label}: ${item.prompt}`);
  }
  downloadText('flaw-notes.txt', lines.join('\n'));
}

export function downloadPrincipleNotes() {
  const lines: string[] = [];
  lines.push('Principle Notes');
  lines.push(rule());
  lines.push('');
  lines.push(principleHubData.intro);
  lines.push('');
  lines.push('THE FOUR PILLARS');
  for (const p of principleHubData.framework) {
    lines.push(`• ${p.t} — ${p.d}`);
    lines.push(`    Example: "${p.detail}"`);
    lines.push('');
  }
  lines.push(rule());
  lines.push('');
  lines.push('VARIETIES');
  for (const v of principleHubData.varieties) {
    lines.push(`• ${v.t}: ${v.d}`);
  }
  lines.push('');
  lines.push(rule());
  lines.push('');
  lines.push('MAJOR TYPES');
  for (const t of principleHubData.majorTypes) {
    lines.push(`• ${t.type}`);
    lines.push(`    Meaning: ${t.meaning}`);
    if ((t as { recognition?: string }).recognition) lines.push(`    Recognition: ${(t as { recognition?: string }).recognition}`);
    if ((t as { action?: string }).action) lines.push(`    Action: ${(t as { action?: string }).action}`);
    if ((t as { commonMistake?: string }).commonMistake) lines.push(`    Common mistake: ${(t as { commonMistake?: string }).commonMistake}`);
    if ((t as { reviewPrompt?: string }).reviewPrompt) lines.push(`    Review prompt: ${(t as { reviewPrompt?: string }).reviewPrompt}`);
    lines.push('');
  }
  downloadText('principle-notes.txt', lines.join('\n'));
}

export function downloadFlashcards() {
  const lines: string[] = [];
  lines.push('Flashcards — Flaw + Principle Module');
  lines.push('Format: front || back || topic || tag');
  lines.push(rule());
  lines.push('');
  for (const c of flashcards) {
    lines.push(`Q: ${c.front}`);
    lines.push(`A: ${c.back}`);
    lines.push(`   topic: ${c.topic}    tag: ${c.tag}`);
    lines.push('');
  }
  downloadText('flashcards.txt', lines.join('\n'));
}

export function downloadModuleOverview() {
  const lines: string[] = [];
  lines.push('Module Overview — Flaw + Principle');
  lines.push(rule());
  lines.push('');
  for (const s of moduleOverviewSections) {
    lines.push(s.heading.toUpperCase());
    for (const para of s.body) lines.push(`  ${para}`);
    lines.push('');
  }
  downloadText('module-overview.txt', lines.join('\n'));
}

export function downloadAllAsZip() {
  // Single combined .txt — keeps the dep surface tiny (no JSZip).
  const sections: Array<[string, () => string]> = [
    ['SCHEDULE', () => buildSchedule()],
    ['QUESTION LIST', () => buildQuestionList()],
    ['FLAW NOTES', () => buildFlawNotes()],
    ['PRINCIPLE NOTES', () => buildPrincipleNotes()],
    ['FLASHCARDS', () => buildFlashcards()],
    ['MODULE OVERVIEW', () => buildModuleOverview()],
  ];
  const combined = sections
    .map(([title, fn]) => `\n\n${rule(72)}\n${title}\n${rule(72)}\n\n${fn()}`)
    .join('\n');
  downloadText('flaw-principle-all.txt', combined.trimStart());
}

// String builders so we can compose all-in-one without re-triggering downloads.
function buildSchedule(): string {
  const lines: string[] = [];
  for (const day of scheduleData) {
    lines.push(`Day ${day.day} (${day.label}) — ${day.focus}`);
    lines.push(`Goal: ${day.plainGoal}`);
    if (day.do?.length) lines.push(`Do: ${day.do.join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}
function buildQuestionList(): string {
  const lines: string[] = [];
  for (const set of practiceSets) {
    if (set.questions.length === 0) continue;
    lines.push(`${set.title}`);
    set.questions.forEach((qid) => {
      const q = questionBank.find((qb) => qb.id === qid);
      if (!q) return;
      lines.push(`  PT ${q.pt}, S ${q.section}, Q ${q.question}  [${q.topic}]`);
    });
    lines.push('');
  }
  return lines.join('\n');
}
function buildFlawNotes(): string {
  return flawHubData.styles
    .map((s) => `${s.style}\n  ${s.meaning}\n  Test: ${s.test}\n  Review: ${s.reviewPrompt}`)
    .join('\n\n');
}
function buildPrincipleNotes(): string {
  return principleHubData.framework
    .map((p) => `${p.t} — ${p.d}\n  Example: ${p.detail}`)
    .join('\n\n');
}
function buildFlashcards(): string {
  return flashcards.map((c) => `Q: ${c.front}\nA: ${c.back}`).join('\n\n');
}
function buildModuleOverview(): string {
  return moduleOverviewSections
    .map((s) => `${s.heading}\n${s.body.map((b) => `  ${b}`).join('\n')}`)
    .join('\n\n');
}
