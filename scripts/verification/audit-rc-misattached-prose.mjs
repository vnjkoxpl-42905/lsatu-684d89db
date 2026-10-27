import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

// Read-only diagnostic. An exact foreign match is a review candidate, not an
// instruction to delete prose: two passages can legitimately discuss one topic.
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const files = readdirSync('public/data/rc').filter(file => /^RC-PT\d+\.json$/.test(file));
const passages = files.flatMap(file => JSON.parse(readFileSync(`public/data/rc/${file}`, 'utf8')).passages);
const summaries = passages.flatMap(p => Object.entries(p.summaries ?? {}).map(([variant, body]) => ({ p, variant, text: normalize(body) })).filter(x => x.text.length >= 100));
const candidates = [];
for (const p of passages) for (const q of p.questions) for (const [index, block] of (q.explanationBlocks ?? []).entries()) {
  const text = normalize(block.body);
  if (text.length < 100) continue;
  for (const other of summaries) {
    if (other.p.passageId === p.passageId) continue;
    if (text === other.text || (text.length >= 300 && other.text.includes(text)) || (other.text.length >= 300 && text.includes(other.text))) {
      candidates.push({ sourcePT: p.preptest, passageId: p.passageId, questionId: q.questionId, block: index,
        matchingPT: other.p.preptest, matchingPassage: other.p.passageId, variant: other.variant });
    }
  }
}
const lines = ['# RC foreign-prose fingerprint candidates', '',
  'Read-only exact/substantial inclusion comparison of question walkthroughs against other passages’ summaries. Whitespace is normalized; no semantic correctness claim follows. Reviewed removals may no longer appear in this current-bank report.', '',
  `Passages: ${passages.length}. Candidates: ${candidates.length}.`, '',
  '| PT | Passage | Question | Block | Matching PT / passage / variant |', '|---|---:|---:|---:|---|',
  ...candidates.map(c => `| ${c.sourcePT} | ${c.passageId} | ${c.questionId} | ${c.block} | ${c.matchingPT} / ${c.matchingPassage} / ${c.variant} |`), ''];
writeFileSync('docs/verification/rc-misattached-prose.md', lines.join('\n'));
console.log(JSON.stringify({ passages: passages.length, candidates }));
