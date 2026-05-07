#!/usr/bin/env node
// Parse guided-drill markdown files into a normalized JSON seed.
// Output: data/guided-drills/_seed.json (array of drill rows ready for upsert).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '..', 'data', 'guided-drills');
const OUT = path.join(DIR, '_seed.json');

// Map markdown filename -> week number
function weekFromFile(name) {
  const m = name.match(/week[_-]?(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (/pre[_-]?week[_-]?4/i.test(name)) return 4; // treat pre-week4 as part of week 4
  return 0;
}

function parseTimeToMinutes(s) {
  if (!s) return null;
  let total = 0;
  const hr = s.match(/(\d+)\s*hr/i);
  const mn = s.match(/(\d+)\s*min/i);
  if (hr) total += parseInt(hr[1], 10) * 60;
  if (mn) total += parseInt(mn[1], 10);
  return total || null;
}

function parseDifficulty(s) {
  if (!s) return [null, null];
  const m = String(s).match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? [n, n] : [null, null];
}

function asArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  return [String(v).trim()].filter(Boolean);
}

// Tiny YAML subset parser tailored to these files
function parseYaml(text) {
  const out = {};
  const lines = text.split('\n');
  let key = null;
  let arr = null;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    if (/^\s+-\s+/.test(line) && arr) {
      arr.push(line.replace(/^\s+-\s+/, '').trim());
      continue;
    }
    const m = line.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (!m) continue;
    key = m[1];
    const val = m[2].trim();
    if (val === '') {
      arr = [];
      out[key] = arr;
    } else {
      arr = null;
      out[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// Reasoning-type inference from title hints
function inferReasoning(title, feature, qtypes) {
  const hay = `${title} ${feature} ${qtypes.join(' ')}`.toLowerCase();
  const out = new Set();
  if (/conditional|quantifier|must be (true|false)|inference/.test(hay)) out.add('Conditional Reasoning');
  if (/causal|causation|anti-causal|explain curious|curious fact/.test(hay)) out.add('Causation');
  if (/comparative|compar|relative|absolute|paradox|trait overlap/.test(hay)) out.add('Comparative Reasoning');
  return [...out];
}

function parseDrillBlock(block) {
  // block starts with "## N. Title"
  const titleLine = block.split('\n')[0];
  const titleMatch = titleLine.match(/^##\s+\d+\.\s+(.+?)\s*$/);
  if (!titleMatch) return null;
  const title = titleMatch[1].trim();

  // YAML
  const ymlMatch = block.match(/```yaml\s*\n([\s\S]*?)\n```/);
  const meta = ymlMatch ? parseYaml(ymlMatch[1]) : {};

  // Instruction card
  let leftMd = '', rightMd = '';
  const cardMatch = block.split(/###\s+Pre-Start Instruction Card/i)[1];
  if (cardMatch) {
    const lp = cardMatch.split(/####\s+Left Column/i)[1];
    if (lp) {
      const splitR = lp.split(/####\s+Right Column/i);
      leftMd = (splitR[0] || '').trim();
      rightMd = (splitR[1] || '').trim();
    }
  }

  const [dmin, dmax] = parseDifficulty(meta.difficulty_level);
  const qtypes = asArray(meta.question_type);
  const features = asArray(meta.question_feature);
  const explicitRT = asArray(meta.reasoning_type);
  const reasoning = explicitRT.length ? explicitRT : inferReasoning(title, features.join(' '), qtypes);

  return {
    title,
    slug: null, // filled later with week prefix
    category: meta.category || null,
    estimated_minutes: parseTimeToMinutes(meta.estimated_time),
    question_count: meta.question_count ? parseInt(meta.question_count, 10) : null,
    difficulty_min: dmin,
    difficulty_max: dmax,
    question_types: qtypes,
    question_features: features,
    reasoning_types: reasoning,
    start_button_label: meta.start_button_label || 'Start',
    instruction_card: { left_md: leftMd, right_md: rightMd },
    bank_filter: {
      qtypes,
      features,
      reasoning_types: reasoning,
      difficulty_min: dmin,
      difficulty_max: dmax,
      count: meta.question_count ? parseInt(meta.question_count, 10) : null,
    },
  };
}

function parseFile(file) {
  const week = weekFromFile(file);
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  // Split on top-level "## N. " drill headings
  const blocks = [];
  const re = /^## \d+\. .+$/gm;
  const positions = [];
  let m;
  while ((m = re.exec(text))) positions.push(m.index);
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : text.length;
    blocks.push(text.slice(start, end));
  }
  const drills = [];
  blocks.forEach((b, idx) => {
    const d = parseDrillBlock(b);
    if (!d) return;
    d.week = week;
    d.order_in_week = idx + 1;
    d.source_file = file;
    d.slug = `w${week}-${String(idx + 1).padStart(2, '0')}-${slugify(d.title)}`;
    drills.push(d);
  });
  return drills;
}

function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const all = [];
  for (const f of files.sort()) {
    const drills = parseFile(f);
    all.push(...drills);
    console.log(`${f}: ${drills.length} drills`);
  }
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${all.length} drills → ${OUT}`);

  // Coverage report
  const byWeek = all.reduce((acc, d) => { acc[d.week] = (acc[d.week] || 0) + 1; return acc; }, {});
  console.log('Per-week counts:', byWeek);
  const noQT = all.filter(d => d.question_types.length === 0);
  if (noQT.length) console.log(`WARN: ${noQT.length} drills with no question_type:`, noQT.map(d => d.slug));
}

main();
