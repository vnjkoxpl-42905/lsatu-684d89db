#!/usr/bin/env node
// Builds the local RC Recall media: 480p/30fps H.264/AAC derivatives of the worked
// examples, MP3 sidecars, checked WebVTT captions, and the combined
// "How and Why to Do RC Recall" video. Requires ffmpeg and ffprobe on PATH.
//
//   node scripts/rc-recall-media/build.mjs [--only examples|instruction]
//
// Sources are never modified. Output goes to OUTPUT_ROOT (ignored by Git, outside
// `public/`). Nothing is uploaded. Nothing here proves the output is correct:
// follow README.md "Edit boundary checks" before enabling the Watch Instructions button.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CLIPS, INSTRUCTION, OUTPUT_ROOT, PROFILE, SOURCE_ROOT } from "./config.mjs";

const FONT = process.env.RC_RECALL_FONT ?? "C:/Windows/Fonts/arial.ttf";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const reuseExisting = process.argv.includes("--reuse-existing");
const profileKey = JSON.stringify(PROFILE);
const oldProfileMatches = (() => {
  try {
    const old = JSON.parse(fs.readFileSync(path.resolve(OUTPUT_ROOT, "manifest.json"), "utf8"));
    return JSON.stringify(old.profile) === profileKey;
  } catch {
    return false;
  }
})();

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\n${r.stderr?.slice(-1500)}`);
  return r.stdout;
}
const duration = (file) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim());
const out = (...p) => path.join(OUTPUT_ROOT, ...p);
const ensure = (file) => fs.mkdirSync(path.dirname(file), { recursive: true });
const vf = `scale=-2:${PROFILE.height}:flags=lanczos,fps=${PROFILE.fps}`;

// ---- WebVTT ---------------------------------------------------------------
const toSec = (t) => { const [h, m, s] = t.split(":"); return Number(h) * 3600 + Number(m) * 60 + Number(s); };
const stamp = (s) => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`; };
function parseVtt(text) {
  const cues = [];
  for (const block of text.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->").map((x) => x.trim().split(" ")[0]);
    cues.push({ start: toSec(a.replace(/^(\d+):(\d+)\.(\d+)$/, "00:$1:$2.$3")), end: toSec(b.replace(/^(\d+):(\d+)\.(\d+)$/, "00:$1:$2.$3")), text: lines.slice(i + 1).join("\n") });
  }
  return cues;
}
const writeVtt = (file, cues, note) => fs.writeFileSync(file,
  `WEBVTT\n\nNOTE ${note}\n\n${cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join("\n\n")}\n`);
const writeTranscript = (file, cues) => fs.writeFileSync(file,
  `AUTO-GENERATED TRANSCRIPT. Not checked by a person.\n\n${cues.map((c) => c.text.replace(/<[^>]*>/g, "").trim()).filter(Boolean).join("\n\n")}\n`);

/** A caption file matches its video when it starts near 0 and ends within a few seconds of the end. */
function checkCaptions(cues, videoSeconds, label) {
  if (!cues.length) throw new Error(`${label}: no cues`);
  const last = cues[cues.length - 1].end;
  if (cues[0].start > 15 || last > videoSeconds + 2 || last < videoSeconds - 30) {
    throw new Error(`${label}: captions (${cues[0].start}s-${last}s) do not match video length ${videoSeconds.toFixed(1)}s`);
  }
}
const NOTE = "Auto-generated captions from the source lesson. Not verified by a person.";

// ---- encoding --------------------------------------------------------------
function encode(src, dest) {
  ensure(dest);
  run("ffmpeg", ["-y", "-v", "error", "-i", src, "-vf", vf, ...PROFILE.video, ...PROFILE.audio, "-movflags", "+faststart", dest]);
}

function buildExamples() {
  const report = [];
  for (const [folder, stem] of CLIPS) {
    const dir = path.join(SOURCE_ROOT, folder);
    const video = path.join(dir, "video.mp4");
    const secs = duration(video);
    const cues = parseVtt(fs.readFileSync(path.join(dir, "source.vtt"), "utf8"));
    checkCaptions(cues, secs, folder);
    const mp4 = out(`${stem}.mp4`), mp3 = out(`${stem}.mp3`), vtt = out(`${stem}.vtt`);
    writeTranscript(out(`${stem}.txt`), cues);
    const ready = [mp4, mp3, vtt].every(fs.existsSync);
    if (reuseExisting && ready && oldProfileMatches) {
      const existingCues = parseVtt(fs.readFileSync(vtt, "utf8"));
      checkCaptions(existingCues, duration(mp4), `${stem} existing derivatives`);
      if (fs.statSync(mp3).size === 0) throw new Error(`${stem}: existing MP3 is empty`);
      report.push({ stem, seconds: secs, bytes: fs.statSync(mp4).size, reused: true });
      continue;
    }
    encode(video, mp4);
    const audio = fs.existsSync(path.join(dir, "audio.m4a")) ? path.join(dir, "audio.m4a") : video;
    run("ffmpeg", ["-y", "-v", "error", "-i", audio, "-vn", ...PROFILE.mp3, mp3]);
    writeVtt(vtt, cues, NOTE);
    report.push({ stem, seconds: secs, bytes: fs.statSync(mp4).size, reused: false });
  }
  return report;
}

// ---- instruction video ------------------------------------------------------
function card(title, subtitle, dest) {
  ensure(dest);
  const textFile = out("_work", "card.txt");
  ensure(textFile);
  fs.writeFileSync(textFile, `${title}\n\n${subtitle}`);
  run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=#f4f1ea:s=1280x${PROFILE.height}:r=${PROFILE.fps}:d=${INSTRUCTION.cardSeconds}`,
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(INSTRUCTION.cardSeconds),
    "-vf", `drawtext=fontfile='${FONT.replace(":", "\\:")}':textfile='${textFile.replace(/\\/g, "/").replace(":", "\\:")}':fontcolor=#1b1b1b:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=18`,
    ...PROFILE.video, ...PROFILE.audio, "-shortest", dest]);
}

const keepRanges = (total, cuts) => {
  const ranges = []; let at = 0;
  for (const c of [...cuts].sort((a, b) => a.from - b.from)) { if (c.from > at) ranges.push([at, c.from]); at = c.to; }
  if (at < total) ranges.push([at, total]);
  return ranges;
};

function buildInstruction() {
  const pieces = []; const cues = []; let offset = 0; const joins = [];
  INSTRUCTION.parts.forEach((part, pi) => {
    const cardFile = out("_work", `card-${pi}.mp4`);
    card(part.card.title, part.card.subtitle, cardFile);
    pieces.push(cardFile);
    cues.push({ start: offset, end: offset + INSTRUCTION.cardSeconds, text: `Chapter: ${part.card.title}. ${part.card.subtitle}.` });
    offset += INSTRUCTION.cardSeconds;
    joins.push({ at: offset, label: `card -> ${part.card.title}` });

    const dir = path.join(SOURCE_ROOT, part.source);
    const video = path.join(dir, "video.mp4");
    const total = duration(video);
    const src = parseVtt(fs.readFileSync(path.join(dir, "source.vtt"), "utf8"));
    checkCaptions(src, total, part.source);
    const ranges = keepRanges(total, part.cuts);
    let cursor = offset;
    ranges.forEach(([a, b], ri) => {
      const piece = out("_work", `part-${pi}-${ri}.mp4`);
      ensure(piece);
      run("ffmpeg", ["-y", "-v", "error", "-i", video, "-ss", String(a), "-to", String(b), "-vf", vf, ...PROFILE.video, ...PROFILE.audio, piece]);
      pieces.push(piece);
      for (const c of src) {
        const s = Math.max(c.start, a), e = Math.min(c.end, b);
        if (e - s > 0.2) cues.push({ start: cursor + (s - a), end: cursor + (e - a), text: c.text });
      }
      cursor += b - a;
      if (ri > 0) joins.push({ at: cursor - (b - a), label: `${part.source}: cut before ${a.toFixed(1)}s` });
    });
    offset = cursor;
  });

  const list = out("_work", "concat.txt");
  fs.writeFileSync(list, pieces.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  const dest = out(`${INSTRUCTION.stem}.mp4`);
  run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", dest]);
  run("ffmpeg", ["-y", "-v", "error", "-i", dest, "-vn", ...PROFILE.mp3, out(`${INSTRUCTION.stem}.mp3`)]);
  cues.sort((a, b) => a.start - b.start);
  writeVtt(out(`${INSTRUCTION.stem}.vtt`), cues, NOTE);
  writeTranscript(out(`${INSTRUCTION.stem}.txt`), cues);
  const finalSecs = duration(dest);
  if (Math.abs(finalSecs - offset) > 1.5) throw new Error(`Edited video is ${finalSecs}s but captions were laid out for ${offset}s`);

  // One short audio clip and the nearby captions per join, for the by-ear spot check.
  joins.forEach((j, i) => {
    const qa = out("_qa", `join-${String(i + 1).padStart(2, "0")}.mp3`);
    ensure(qa);
    run("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0, j.at - 4)), "-t", "8", "-i", dest, "-vn", ...PROFILE.mp3, qa]);
    const near = cues.filter((c) => c.end > j.at - 4 && c.start < j.at + 4).map((c) => `  ${stamp(c.start)} ${c.text.replace(/\n/g, " ")}`);
    fs.writeFileSync(out("_qa", `join-${String(i + 1).padStart(2, "0")}.txt`), `${j.label} @ ${stamp(j.at)}\n${near.join("\n")}\n`);
  });
  return { stem: INSTRUCTION.stem, seconds: finalSecs, bytes: fs.statSync(dest).size, joins: joins.length };
}

// ---- main -------------------------------------------------------------------
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const results = {};
if (only !== "instruction") results.examples = buildExamples();
if (only !== "examples") results.instruction = buildInstruction();
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith("_")) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p !== out("manifest.json")) files.push(p); } })(OUTPUT_ROOT);
const total = files.reduce((n, f) => n + fs.statSync(f).size, 0);
fs.writeFileSync(out("manifest.json"), JSON.stringify({
  builtAt: new Date().toISOString(),
  verified: false,
  note: "Not verified. Complete the README edit-boundary checks, then set verified by hand.",
  profile: PROFILE,
  totalBytes: total, budgetBytes: PROFILE.budgetBytes, withinBudget: total <= PROFILE.budgetBytes,
  files: files.map((f) => ({ path: path.relative(OUTPUT_ROOT, f).replace(/\\/g, "/"), bytes: fs.statSync(f).size, sha256: sha(f) })),
  results,
}, null, 2));
console.log(`Wrote ${files.length} files, ${(total / 1048576).toFixed(1)} MB (budget ${(PROFILE.budgetBytes / 1048576).toFixed(0)} MB). Output: ${OUTPUT_ROOT}`);
if (total > PROFILE.budgetBytes) console.log("Over budget. Inspect text legibility before lowering quality; legibility controls.");
