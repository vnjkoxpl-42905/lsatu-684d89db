#!/usr/bin/env node
// Compose the email that carries a drill artifact, as a .eml file ready to be
// uploaded to Gmail as a DRAFT.
//
// It is never sent from here. The draft lands in Joshua's mailbox, he reads it
// like any other message, and he presses send. That is both the safer default
// for anything a student receives and the only thing the permission model
// allows: gws gmail +send and users.drafts.send are denied.
//
// The body lists question IDENTIFIERS rather than question text, so a student
// can attempt the set on 7Sage, LSAT Lab, or paper without opening anything.
// The full questions travel as the attachment.
//
// Usage:
//   node scripts/build-drill-email.mjs \
//     --manifest scripts/out/drill-artifacts/<dir>/manifest.json \
//     --to student@example.com \
//     --why "You were guessing on necessary assumption once the stimulus got long."
//
//   --student "Casey"     override the name in the greeting
//   --timeframe <t>       today | tomorrow | day | week | none (default none).
//                         Only shapes the default opening line; --why overrides it.
//   --minutes <n>         adds the time estimate and the per-question pace
//   --list-only           send the identifiers and nothing else: no HTML, no PDF,
//                         no attachments at all. For a student who builds the set
//                         herself on 7Sage or LSAT Lab and does not want the
//                         questions written out for her.
//   --out <path>          default alongside the manifest as draft.eml
//   --platform-url <url>  the classroom link (default https://lsatprep.study/classroom)
//
// House rule, enforced by scripts/verify-guided-drills.mjs: no em-dashes
// anywhere in the rendered body. Joshua does not type them and a student
// reads this.

import fs from 'node:fs';
import path from 'node:path';
import { buildMimeMessage } from './lib/mime.mjs';
import { T, styles as S } from './lib/email-tokens.mjs';

const BANK_DIR = path.resolve('public/data');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    // A valueless flag (--list-only) must not swallow the flag that follows it,
    // or `--list-only --to x@y` silently loses the recipient.
    const next = argv[i + 1];
    out[argv[i].slice(2)] = next === undefined || next.startsWith('--') ? true : argv[++i];
  }
  return out;
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Question type per qid, read straight from the bank. */
function questionTypes(qids) {
  const byFile = new Map();
  for (const qid of qids) {
    const m = /^(PT\d+)-S(\d+)-Q(\d+)$/.exec(qid);
    if (!m) throw new Error(`not a qid: ${qid}`);
    const file = `${m[1]}-S${m[2]}-LR.json`;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ qid, pt: m[1], section: Number(m[2]), qnum: Number(m[3]) });
  }
  const types = new Map();
  for (const [file, entries] of byFile) {
    const arr = JSON.parse(fs.readFileSync(path.join(BANK_DIR, file), 'utf8'));
    for (const e of entries) {
      const q = arr.find(
        (x) => x.practiceTest === e.pt && x.sectionNumber === e.section && x.questionNumber === e.qnum,
      );
      types.set(e.qid, q?.questionType ?? '');
    }
  }
  return types;
}

const pretty = (qid) => {
  const m = /^(PT\d+)-S(\d+)-Q(\d+)$/.exec(qid);
  return `${m[1]} · S${m[2]} · Q${m[3]}`;
};

function renderHtml({ student, why, drill, qids, types, minutes, level, files, platformUrl, listOnly }) {
  const rows = qids
    .map(
      (qid, i) => `            <tr>
              <td style="${S.listRow}">
                <span style="${S.listNum}">${i + 1}</span>
                <span style="${S.listRef}">${esc(pretty(qid))}</span>
                <span style="${S.listType}">&nbsp;&nbsp;${esc(types.get(qid) ?? '')}</span>
              </td>
            </tr>`,
    )
    .join('\n');

  const perQuestion = minutes && qids.length ? Math.round((minutes / qids.length) * 60) : null;
  const pace = perQuestion ? `, about ${Math.floor(perQuestion / 60)}:${String(perQuestion % 60).padStart(2, '0')} each` : '';

  return `<!DOCTYPE html>
<html>
<body style="${S.wrap}">
  <div style="${S.container}">
    <p style="${S.greeting}">${esc(student)},</p>

    <p style="${S.para}">${esc(why)}</p>

    <div style="${S.card}">
      <p style="${S.cardTitle}">${esc(drill)}</p>
      <p style="${S.cardMeta}">${esc(level)} &nbsp;·&nbsp; ${qids.length} questions${
        minutes ? ` &nbsp;·&nbsp; about ${minutes} min` : ''
      }</p>
    </div>

    <p style="${S.kicker}">The set</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      <tbody>
${rows}
      </tbody>
    </table>

    <div style="${S.prompt}">
      <strong style="color:${T.ink};">Attempt these cold and timed${pace}.</strong><br><br>
      ${
        listOnly
          ? 'Build the set yourself from the list above, on 7Sage, LSAT Lab, or paper, whichever you actually use. Do not read ahead or check anything until the whole set is done.'
          : `Two ways to do it. Open the attached <strong>${esc(files.html)}</strong> and work straight through it. It keeps the answer hidden until you commit to a choice. Or pull the questions up from the list above on 7Sage, LSAT Lab, or paper, whichever you actually use.${
              files.pdf ? `<br><br>There is a printable version attached too (<strong>${esc(files.pdf)}</strong>) if you would rather work on paper. The answer key is on the last page.` : ''
            }`
      }
    </div>

    <p style="${S.para}">The same set is waiting for you in the classroom: <a href="${esc(platformUrl)}" style="${S.link}">open it on LSAT U</a>.</p>

    <p style="${S.footer}">Bring me the ones you missed. The wrong answer you picked usually tells us more than the right one.<br><br>Joshua</p>
  </div>
</body>
</html>`;
}

function renderText({ student, why, drill, qids, types, minutes, level, files, platformUrl, listOnly }) {
  const list = qids.map((qid, i) => `  ${i + 1}. ${pretty(qid)}   ${types.get(qid) ?? ''}`).join('\n');
  const how = listOnly
    ? `Build the set yourself from the list above, on 7Sage, LSAT Lab, or paper, whichever
you actually use. Do not read ahead or check anything until the whole set is done.`
    : `Two ways to do it. Open the attached ${files.html} and work straight through it.
It keeps the answer hidden until you commit to a choice. Or pull the questions up from
the list above on 7Sage, LSAT Lab, or paper, whichever you actually use.${
        files.pdf ? `\n\nThere is a printable version attached too (${files.pdf}) if you would rather\nwork on paper. The answer key is on the last page.` : ''
      }`;
  return `${student},

${why}

${drill}
${level} · ${qids.length} questions${minutes ? ` · about ${minutes} min` : ''}

THE SET
${list}

Attempt these cold and timed.

${how}

The same set is waiting for you in the classroom: ${platformUrl}

Bring me the ones you missed. The wrong answer you picked usually tells us more
than the right one.

Joshua
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest) throw new Error('--manifest is required');
  if (!args.to) throw new Error('--to is required');

  const manifestPath = path.resolve(args.manifest);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const dir = path.dirname(manifestPath);

  const student = args.student ?? manifest.student ?? 'Hi';
  const listOnly = Boolean(args['list-only']);

  // A drill is not always a week's work. It can be one day's, or a set volume
  // Joshua named. The default line must not assert a timeframe he did not
  // choose, so --timeframe supplies the words and the neutral default asserts
  // nothing at all.
  const TIMEFRAMES = {
    today: 'Here is your drill for today',
    tomorrow: 'Here is your drill for tomorrow',
    day: 'Here is your drill for the day',
    week: 'Here is your drill for this week',
    none: 'Here is your drill',
  };
  const timeframe = args.timeframe ?? 'none';
  const lead = TIMEFRAMES[timeframe];
  if (!lead) {
    throw new Error(
      `--timeframe must be one of ${Object.keys(TIMEFRAMES).join(', ')} (got "${timeframe}")`,
    );
  }
  const why = args.why ?? `${lead}. It targets the thing we worked on in our last session.`;
  const level = manifest.level
    ? `${manifest.level[0].toUpperCase()}${manifest.level.slice(1)} level`
    : 'Standard';

  const qids = manifest.qids;
  const types = questionTypes(qids);

  const htmlFile = path.resolve(manifest.files.html.path);
  const pdfFile = manifest.files.pdf ? path.resolve(manifest.files.pdf.path) : null;

  const files = { html: path.basename(htmlFile), pdf: pdfFile ? path.basename(pdfFile) : null };
  const view = {
    student,
    why,
    drill: manifest.title,
    qids,
    types,
    minutes: args.minutes ? Number(args.minutes) : null,
    level,
    files,
    platformUrl: args['platform-url'] ?? 'https://lsatprep.study/classroom',
    listOnly,
  };

  // --list-only means the identifiers ARE the deliverable. A student who builds
  // her own set on 7Sage does not want the questions written out for her, and an
  // attachment she will not open is 400 KB of noise in her inbox.
  const attachments = listOnly
    ? []
    : [{ filename: files.html, contentType: 'text/html; charset=utf-8', content: fs.readFileSync(htmlFile) }];
  if (!listOnly && pdfFile) {
    attachments.push({ filename: files.pdf, contentType: 'application/pdf', content: fs.readFileSync(pdfFile) });
  }

  const eml = buildMimeMessage({
    to: args.to,
    subject: `Your drill: ${manifest.title}`,
    text: renderText(view),
    html: renderHtml(view),
    attachments,
  });

  const outPath = path.resolve(args.out ?? path.join(dir, 'draft.eml'));
  fs.writeFileSync(outPath, eml, 'utf8');

  // A preview of exactly what a human will read, so the approval gate in the
  // skill shows the message rather than a filename.
  fs.writeFileSync(path.join(dir, 'draft-preview.txt'), renderText(view), 'utf8');
  fs.writeFileSync(path.join(dir, 'draft-preview.html'), renderHtml(view), 'utf8');

  console.log(`wrote ${path.relative(process.cwd(), outPath)}`);
  console.log(`  to          : ${args.to}`);
  console.log(`  subject     : Your drill: ${manifest.title}`);
  console.log(`  questions   : ${qids.length}`);
  console.log(`  attachments : ${attachments.length ? attachments.map((a) => `${a.filename} (${(a.content.length / 1024).toFixed(0)} KB)`).join(', ') : 'none (list-only)'}`);
  console.log(`  message     : ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`);
  console.log(`  preview     : ${path.relative(process.cwd(), path.join(dir, 'draft-preview.html'))}`);
}

main();
