#!/usr/bin/env node
// Build a self-contained drill a student can open from an email and attempt
// without visiting the platform.
//
// The 108 curated pages in public/guided-drill-html/ are already offline-safe
// and beautiful, and they dead-end: their START button posts a message to a
// parent frame that does not exist outside the app, and they carry no question
// content at all. This produces the missing half — the same cover and notes,
// followed by the actual questions, with the answer gated behind an attempt.
//
// It takes a FROZEN qid list as input and does no band arithmetic of its own.
// That list must be the one written to guided_drill_assignments.question_qids,
// read back from the database rather than recomputed, so the file in the
// student's inbox and the drill on the platform are provably the same set.
//
// Usage:
//   node scripts/build-drill-artifact.mjs \
//     --slug w2-07-necessary-assumption-first-taste \
//     --level beginner \
//     --qids PT104-S2-Q14,PT112-S3-Q7 \
//     --student "Casey" \
//     --assignment-id <uuid>
//
//   --qids-file <path>   newline or comma separated, instead of --qids
//   --out-dir <path>     default scripts/out/drill-artifacts/<slug>-<level>
//   --no-pdf             skip the PDF leg

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildGuidedDrillLaunchHtml, escapeHtml } from './lib/drill-launch.mjs';
import { renderPdf } from './lib/render-pdf.mjs';

const SEED = path.resolve('data/guided-drills/_seed.json');
const BANK_DIR = path.resolve('public/data');
const STATS = path.resolve('public/data/question-stats.json');

/* ---------------------------------------------------------------- inputs -- */

function parseArgs(argv) {
  const out = { pdf: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-pdf') out.pdf = false;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function readQids(args) {
  const raw = args['qids-file']
    ? fs.readFileSync(path.resolve(args['qids-file']), 'utf8')
    : (args.qids ?? '');
  const qids = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (qids.length === 0) throw new Error('no qids given: pass --qids or --qids-file');
  const seen = new Set();
  for (const qid of qids) {
    if (seen.has(qid)) throw new Error(`qid ${qid} appears twice; the frozen list must be exact`);
    seen.add(qid);
  }
  return qids;
}

/* ------------------------------------------------------------------ data -- */

/** Only the bank files the frozen qids actually touch. */
function loadQuestions(qids) {
  const wanted = new Map();
  for (const qid of qids) {
    const m = /^(PT\d+)-S(\d+)-Q(\d+)$/.exec(qid);
    if (!m) throw new Error(`not a qid: ${qid}`);
    const file = `${m[1]}-S${m[2]}-LR.json`;
    if (!wanted.has(file)) wanted.set(file, []);
    wanted.get(file).push({ qid, pt: m[1], section: Number(m[2]), qnum: Number(m[3]) });
  }

  const byQid = new Map();
  for (const [file, entries] of wanted) {
    const full = path.join(BANK_DIR, file);
    if (!fs.existsSync(full)) throw new Error(`bank file missing: ${file}`);
    const arr = JSON.parse(fs.readFileSync(full, 'utf8'));
    for (const e of entries) {
      const q = arr.find(
        (x) => x.practiceTest === e.pt && x.sectionNumber === e.section && x.questionNumber === e.qnum,
      );
      // A missing question is fatal. Silently dropping one would email a drill
      // shorter than the assignment the platform holds.
      if (!q) throw new Error(`${e.qid} is not in ${file}`);
      byQid.set(e.qid, q);
    }
  }
  return byQid;
}

function loadStats() {
  if (!fs.existsSync(STATS)) return new Map();
  const payload = JSON.parse(fs.readFileSync(STATS, 'utf8'));
  return new Map(Object.entries(payload.q ?? {}));
}

/* -------------------------------------------------------------- rendering -- */

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Stimulus text keeps its authored line breaks; CSS renders them. */
const asText = (s) => escapeHtml(String(s ?? '').trim());

function renderQuestion(qid, q, stat, index) {
  const choices = LETTERS.filter((L) => q.answerChoices?.[L] != null)
    .map((L) => {
      const correct = L === q.correctAnswer;
      return `          <li>
            <button class="choice" type="button" data-letter="${L}" data-correct="${correct}" aria-pressed="false">
              <span class="choice-letter">${L}</span>
              <span class="choice-text">${asText(q.answerChoices[L])}</span>
            </button>
          </li>`;
    })
    .join('\n');

  // The reveal says what the answer is and what most people fell for instead.
  // Naming the trap is the part that teaches; the bare letter is not.
  const trapLine =
    stat && stat.tl && stat.tl !== q.correctAnswer
      ? `<p class="trap">Most people who missed it chose <strong>${stat.tl}</strong>${
          stat.ttr ? ` — ${escapeHtml(stat.ttr)}` : ''
        } (${stat.tp}%).</p>`
      : '';
  const cohortLine = stat
    ? `<p class="trap">${stat.cp}% of test takers got this right.</p>`
    : '';

  return `      <section class="question" id="q${index + 1}" data-qid="${qid}" data-answer="${q.correctAnswer}" data-locked="false" data-toc-title="Q${index + 1} · ${escapeHtml(q.questionType ?? '')}">
        <div class="q-head">
          <span class="q-num">Question ${index + 1}</span>
          <span>${escapeHtml(q.questionType ?? '')}</span>
          <span class="q-ref">${escapeHtml(q.practiceTest)} · S${q.sectionNumber} · Q${q.questionNumber}</span>
        </div>
        <p class="stimulus">${asText(q.stimulus)}</p>
        <p class="stem">${asText(q.questionStem)}</p>
        <ol class="choices">
${choices}
        </ol>
        <button class="submit" type="button" disabled>Lock in answer</button>
        <div class="answer-reveal" hidden>
          <div class="section-kicker">The answer</div>
          <p class="verdict"></p>
          ${trapLine}
          ${cohortLine}
        </div>
      </section>`;
}

function renderAnswerKey(qids, byQid) {
  const rows = qids
    .map(
      (qid, i) =>
        `        <tr><td>${i + 1}</td><td>${escapeHtml(qid)}</td><td>${escapeHtml(
          byQid.get(qid).questionType ?? '',
        )}</td><td><strong>${byQid.get(qid).correctAnswer}</strong></td></tr>`,
    )
    .join('\n');
  return `    <section id="answer-key">
      <div class="section-kicker">Answer key</div>
      <table>
        <thead><tr><th>#</th><th>Question</th><th>Type</th><th>Answer</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </section>`;
}

function renderQuestionsSection({ qids, byQid, stats, student }) {
  const questions = qids.map((qid, i) => renderQuestion(qid, byQid.get(qid), stats.get(qid), i)).join('\n\n');

  const intro = student
    ? `${escapeHtml(student)}, work these cold and timed.`
    : 'Work these cold and timed.';

  return `<section class="questions">
      <div class="questions-head">
        <div class="section-kicker">The set</div>
        <h2>Attempt these.</h2>
        <p>${intro} Commit to an answer before you look — the explanation stays hidden until you do. If you would rather work on paper or in another tool, every question is labelled with its PrepTest, section and number.</p>
      </div>

${questions}

      <div class="scoreboard" id="scoreboard" hidden>
        <h3>That is the set.</h3>
        <p id="scoreline"></p>
        <p>Bring the ones you missed to our next session — the wrong answer you picked is usually more useful than the right one.</p>
      </div>
    </section>

${renderAnswerKey(qids, byQid)}

    <script>
    (function () {
      /*
       * Sandbox-safe storage, copied from public/reference-drills/. Gmail's
       * viewer and Apple Mail's preview both block localStorage, and an
       * unguarded setItem throws on the student's first answer.
       */
      var Storage = {
        memory: {}, ok: false,
        init: function () {
          try {
            window.localStorage.setItem('__t__', '1');
            window.localStorage.removeItem('__t__');
            this.ok = true;
          } catch (e) { this.ok = false; }
        },
        get: function (k) { return this.ok ? window.localStorage.getItem(k) : (this.memory[k] || null); },
        set: function (k, v) { if (this.ok) { window.localStorage.setItem(k, v); } else { this.memory[k] = v; } }
      };
      Storage.init();

      var KEY = 'lsatu-drill-' + (document.body.dataset.drill || 'drill');
      var saved = {};
      try { saved = JSON.parse(Storage.get(KEY) || '{}'); } catch (e) { saved = {}; }

      var questions = Array.prototype.slice.call(document.querySelectorAll('.question'));

      function commit(section, letter) {
        var answer = section.dataset.answer;
        var correct = letter === answer;
        section.dataset.locked = 'true';
        section.querySelector('.submit').disabled = true;
        var reveal = section.querySelector('.answer-reveal');
        reveal.querySelector('.verdict').textContent = correct
          ? 'Correct — ' + answer + '.'
          : 'The answer is ' + answer + '. You chose ' + letter + '.';
        reveal.hidden = false;
        saved[section.dataset.qid] = letter;
        Storage.set(KEY, JSON.stringify(saved));
        score();
      }

      function score() {
        var done = questions.filter(function (s) { return s.dataset.locked === 'true'; });
        if (done.length !== questions.length) return;
        var right = done.filter(function (s) {
          var picked = s.querySelector('.choice[aria-pressed="true"]');
          return picked && picked.dataset.letter === s.dataset.answer;
        }).length;
        var board = document.getElementById('scoreboard');
        document.getElementById('scoreline').textContent =
          right + ' of ' + questions.length + ' correct.';
        board.hidden = false;
      }

      questions.forEach(function (section) {
        var choices = Array.prototype.slice.call(section.querySelectorAll('.choice'));
        var submit = section.querySelector('.submit');
        var picked = null;

        choices.forEach(function (choice) {
          choice.addEventListener('click', function () {
            if (section.dataset.locked === 'true') return;
            choices.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
            choice.setAttribute('aria-pressed', 'true');
            picked = choice.dataset.letter;
            submit.disabled = false;
          });
        });

        submit.addEventListener('click', function () {
          if (!picked || section.dataset.locked === 'true') return;
          commit(section, picked);
        });

        // Restore a part-finished attempt.
        var previous = saved[section.dataset.qid];
        if (previous) {
          var match = choices.filter(function (c) { return c.dataset.letter === previous; })[0];
          if (match) {
            match.setAttribute('aria-pressed', 'true');
            picked = previous;
            commit(section, previous);
          }
        }
      });
    })();
    </script>`;
}

/* ------------------------------------------------------------------ main -- */

/**
 * One stray font or CDN reference turns a self-contained file into a request
 * the student's mail client makes to a third party, and breaks the drill
 * entirely when they open it on a plane. A hard failure, not a warning.
 */
function assertSelfContained(html) {
  const offenders = [];
  const re = /(?:src|href|url\(|@import\s+)["'(]?\s*(?:https?:)?\/\/[^\s"')]+/gi;
    let m;
  while ((m = re.exec(html)) !== null) offenders.push(m[0].slice(0, 80));
  if (offenders.length > 0) {
    throw new Error(`artifact references external resources:\n  ${offenders.join('\n  ')}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) throw new Error('--slug is required');

  const qids = readQids(args);
  const level = args.level && args.level !== 'none' ? args.level : null;

  const drills = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const drill = drills.find((d) => d.slug === args.slug);
  if (!drill) throw new Error(`no drill with slug ${args.slug}`);

  const byQid = loadQuestions(qids);
  const stats = loadStats();

  const questionsHtml = renderQuestionsSection({ qids, byQid, stats, student: args.student });

  let html = buildGuidedDrillLaunchHtml({
    title: drill.title,
    estimatedMinutes: drill.estimated_minutes,
    questionCount: qids.length,
    leftMd: drill.instruction_card?.left_md ?? null,
    rightMd: drill.instruction_card?.right_md ?? null,
    questionsHtml,
    mode: 'artifact',
  });
  // The storage key is per drill+level, so two drills open in one browser do
  // not overwrite each other's answers.
  html = html.replace(
    '<body data-mode="artifact">',
    `<body data-mode="artifact" data-drill="${escapeHtml(`${args.slug}-${level ?? 'any'}`)}">`,
  );

  assertSelfContained(html);

  const outDir = path.resolve(args['out-dir'] ?? `scripts/out/drill-artifacts/${args.slug}-${level ?? 'any'}`);
  fs.mkdirSync(outDir, { recursive: true });

  const base = `LSATU-${args.slug}-${level ?? 'any'}`;
  const htmlPath = path.join(outDir, `${base}.html`);
  fs.writeFileSync(htmlPath, html);

  const measured = qids.map((qid) => stats.get(qid)).filter(Boolean);
  const meanCorrectPct = measured.length
    ? Math.round((measured.reduce((a, s) => a + s.cp, 0) / measured.length) * 10) / 10
    : null;

  const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

  const finish = (pdfPath) => {
    const manifest = {
      slug: args.slug,
      title: drill.title,
      level,
      student: args.student ?? null,
      assignmentId: args['assignment-id'] ?? null,
      qids,
      counts: { questions: qids.length, measured: measured.length },
      meanCorrectPct,
      // The timestamp lives here and never inside the HTML, so the same input
      // hashes the same twice and the hash is worth quoting.
      generatedAt: new Date().toISOString(),
      files: {
        html: { path: path.relative(process.cwd(), htmlPath), bytes: fs.statSync(htmlPath).size, sha256: sha(htmlPath) },
        ...(pdfPath
          ? { pdf: { path: path.relative(process.cwd(), pdfPath), bytes: fs.statSync(pdfPath).size, sha256: sha(pdfPath) } }
          : {}),
      },
    };
    fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(`wrote ${path.relative(process.cwd(), outDir)}`);
    console.log(`  questions   : ${qids.length}${meanCorrectPct != null ? ` (avg ${meanCorrectPct}% correct, ${measured.length} measured)` : ''}`);
    console.log(`  html        : ${(manifest.files.html.bytes / 1024).toFixed(0)} KB  ${manifest.files.html.sha256.slice(0, 12)}`);
    if (pdfPath) console.log(`  pdf         : ${(manifest.files.pdf.bytes / 1024).toFixed(0)} KB  ${manifest.files.pdf.sha256.slice(0, 12)}`);
  };

  if (!args.pdf) return finish(null);

  const pdfPath = path.join(outDir, `${base}.pdf`);
  return renderPdf(html, pdfPath)
    .then(() => finish(pdfPath))
    .catch((e) => {
      // The HTML is the deliverable; the PDF is a convenience. Say which one
      // is missing rather than failing the whole run.
      console.error(`PDF failed: ${e.message}`);
      finish(null);
      process.exitCode = 1;
    });
}

main();
