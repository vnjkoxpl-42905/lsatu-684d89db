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

// Fields the markdown is the author of. Everything else on an existing row is
// carried forward: `level` is set by hand in the DB, and question_types /
// reasoning_types / bank_filter are normalized afterwards by
// apply-guided-drill-taxonomy.mjs (which also rewrites question_features to
// real bank feature names). Overwriting them from a fresh parse reverts
// both, which is how 98 level tags and 108 taxonomy fixes were silently lost
// on 2026-08-26. Pass --overwrite-taxonomy to take the parsed values anyway.
const MARKDOWN_OWNS = [
  'title', 'category', 'estimated_minutes', 'question_count',
  'difficulty_min', 'difficulty_max',
  'start_button_label', 'instruction_card', 'week', 'order_in_week',
  'source_file', 'slug',
];

// A parsed value only wins when the parse actually found something. Several of
// the week 4+ files use a layout this parser reads only partially, so a fresh
// parse yields null difficulty ranges, null counts, and empty instruction
// cards for drills whose committed rows are complete. Letting those nulls
// through is a silent erase, not an update.
function meaningful(v) {
  if (v == null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v).some(meaningful);
  return true;
}

function mergeRow(existing, parsed, overwriteTaxonomy) {
  if (!existing) return parsed;
  const out = { ...existing };
  for (const k of MARKDOWN_OWNS) {
    if (meaningful(parsed[k]) || !meaningful(existing[k])) out[k] = parsed[k];
  }
  if (overwriteTaxonomy) {
    out.question_types = parsed.question_types;
    out.question_features = parsed.question_features;
    out.reasoning_types = parsed.reasoning_types;
    out.bank_filter = parsed.bank_filter;
  } else {
    // The count and difficulty window still come from the markdown even when
    // the taxonomy fields are preserved, or editing a drill's size would do
    // nothing.
    out.bank_filter = {
      ...(existing.bank_filter || {}),
      difficulty_min: out.difficulty_min,
      difficulty_max: out.difficulty_max,
      count: out.question_count,
    };
  }
  return out;
}

function main() {
  const overwriteTaxonomy = process.argv.includes('--overwrite-taxonomy');
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const parsed = [];
  for (const f of files.sort()) {
    const drills = parseFile(f);
    parsed.push(...drills);
    console.log(`${f}: ${drills.length} drills`);
  }

  const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
  const priorBySlug = new Map(prior.map(d => [d.slug, d]));
  const parsedSlugs = new Set(parsed.map(d => d.slug));

  const merged = parsed.map(d => mergeRow(priorBySlug.get(d.slug), d, overwriteTaxonomy));

  // Any existing row the markdown actually changes is named, not applied
  // silently. These are real divergences between the markdown and whatever
  // edited the seed afterwards, and they deserve a human's eye.
  const touched = [];
  for (const row of merged) {
    const before = priorBySlug.get(row.slug);
    if (!before) continue;
    const fields = Object.keys(row).filter(
      k => JSON.stringify(before[k] ?? null) !== JSON.stringify(row[k] ?? null),
    );
    if (fields.length) touched.push(`${row.slug}: ${fields.join(', ')}`);
  }

  // Rows that no markdown file produces (the lsatlab-studyplan drills, merged
  // in by a different generator) survive rather than being deleted.
  const carried = prior.filter(d => !parsedSlugs.has(d.slug));
  const all = [...merged, ...carried];

  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));

  const added = parsed.filter(d => !priorBySlug.has(d.slug)).map(d => d.slug);
  console.log(`\nWrote ${all.length} drills → ${OUT}`);
  console.log(`  ${merged.length} from markdown (${added.length} new), ${carried.length} carried forward`);
  if (added.length) console.log('  new:', added.join(', '));
  if (carried.length) console.log('  carried (no markdown source):', carried.map(d => d.slug).join(', '));
  if (touched.length) {
    console.log(`  CHANGED ${touched.length} existing rows from markdown:`);
    for (const t of touched) console.log(`    ${t}`);
  }
  console.log(`  taxonomy fields: ${overwriteTaxonomy ? 'OVERWRITTEN from markdown' : 'preserved on existing rows'}`);

  // Coverage report
  const byWeek = all.reduce((acc, d) => { acc[d.week] = (acc[d.week] || 0) + 1; return acc; }, {});
  console.log('Per-week counts:', byWeek);
  const noQT = all.filter(d => (d.question_types || []).length === 0);
  if (noQT.length) console.log(`WARN: ${noQT.length} drills with no question_type:`, noQT.map(d => d.slug));
}

main();
