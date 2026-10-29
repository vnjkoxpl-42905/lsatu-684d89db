import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { linesFromWords, type TimedWord } from "./rrcLines.ts";

/**
 * Pairing her words with the lines she was rephrasing.
 *
 * The first cut keyed off silence alone: a burst of speech was one unit, and
 * bursts were dealt to lines in order. A student who retells three lines in one
 * breath then has all three retellings filed under line 1 and lines 2 and 3
 * shown as "You did not say anything for this line" -- on the same card whose
 * detail lists say she carried them. That is PT1.S3 stimulus 1 on 2026-09-08,
 * below, verbatim.
 */

/** Words at a steady pace, with an optional silence before the first. */
function say(text: string, startSec: number, gapSec = 0): TimedWord[] {
  const words = text.split(/\s+/).filter(Boolean);
  let t = startSec + gapSec;
  return words.map((word) => {
    const w = { word, start: t, end: t + 0.3 };
    t += 0.35;
    return w;
  });
}

const CELIA_Q1_LINES = [
  "It is difficult to keep deep wounds free of bacteria.",
  "Even strong antibiotics fail to kill the bacteria that live in such wounds.",
  "However, many physicians have succeeded in eliminating bacteria from deep wounds by packing the wound with a sweet substance like sugar.",
];

Deno.test("one breath covering three lines is cut into three", () => {
  const words = say(
    "It's hard to keep wounds free of bacteria, wounds that are deep, free of bacteria. " +
      "Even antibiotics that are strong still struggle to keep bacteria out of wounds. " +
      "Many physicians have managed to keep bacteria out of wounds by putting sugar in them or other sweet things.",
    2222,
  );
  const lines = linesFromWords(words, CELIA_Q1_LINES);

  assertEquals(lines.length, 3);
  for (const line of lines) assert(line.spoken.trim() !== "", `line ${line.n} came back empty`);
  assert(/antibiotics/i.test(lines[1].spoken), `line 2 should hold the antibiotics sentence, got: ${lines[1].spoken}`);
  assert(/physicians|sugar/i.test(lines[2].spoken), `line 3 should hold the sugar sentence, got: ${lines[2].spoken}`);
  assert(!/antibiotics/i.test(lines[0].spoken), `line 1 swallowed line 2: ${lines[0].spoken}`);
  // The clips still point somewhere real, and in order.
  assert(lines[0].startMs! < lines[1].startMs! && lines[1].startMs! < lines[2].startMs!);
  assert(lines[0].endMs! <= lines[1].startMs! && lines[1].endMs! <= lines[2].startMs!);
});

Deno.test("silence between lines still cuts where the silence is", () => {
  const words = [
    ...say("hard to keep deep wounds clear of bacteria", 0),
    ...say("even the strong antibiotics do not kill them", 10, 3),
    ...say("but doctors got rid of the bacteria by packing sugar into the wound", 20, 3),
  ];
  const lines = linesFromWords(words, CELIA_Q1_LINES);
  assertEquals(lines.map((l) => l.spoken), [
    "hard to keep deep wounds clear of bacteria",
    "even the strong antibiotics do not kill them",
    "but doctors got rid of the bacteria by packing sugar into the wound",
  ]);
});

Deno.test("a reaction stays with the line it followed", () => {
  const words = [
    ...say("hard to keep deep wounds clear of bacteria", 0),
    // Straight on from the line, with only a breath in between.
    ...say("okay sure that makes sense", 2.4, 0.4),
    ...say("even the strong antibiotics do not kill them", 12, 3),
  ];
  const lines = linesFromWords(words, CELIA_Q1_LINES);
  assert(/okay sure/.test(lines[0].spoken), `reaction left line 1: ${JSON.stringify(lines.map((l) => l.spoken))}`);
  assert(/antibiotics/.test(lines[1].spoken));
  assertEquals(lines[2].spoken, "");
});

Deno.test("a line she never spoke about is empty, not borrowed", () => {
  const words = [
    ...say("hard to keep deep wounds clear of bacteria", 0),
    ...say("but doctors got rid of the bacteria by packing sugar into the wound", 10, 3),
  ];
  const lines = linesFromWords(words, CELIA_Q1_LINES);
  assert(lines[0].spoken !== "");
  assertEquals(lines[1].spoken, "");
  assert(/sugar/.test(lines[2].spoken));
});

Deno.test("a cut lands at the sentence end, not inside a phrase", () => {
  // Celia, PT1.S3 Q4: "mathematical theory" straddled lines 1 and 2 because
  // "mathematical" is a line-1 word and "theory" is not.
  const words = say(
    "So this person is writing to an editor in 1960. In 1960, an astronomer proposed a mathematical theory for whether or not extraterrestrial life exists. " +
      "The mathematical theory was based on the assumption that life as we know it could only be based on a planet.",
    0,
  );
  const lines = linesFromWords(words, [
    "To the Editor: In 1960, an astronomer proposed a mathematical model for determining whether extraterrestrial life exists.",
    "It was based on the assumptions that life as we know it could exist only on a planet and that many stars are, like our Sun, orbited by planets.",
  ]);
  assert(/exists\.$/.test(lines[0].spoken), `line 1 should end at the full stop, got: …${lines[0].spoken.slice(-40)}`);
  assert(/^The mathematical theory/.test(lines[1].spoken), `line 2 should start the next sentence, got: ${lines[1].spoken.slice(0, 40)}`);
});

Deno.test("nothing said means every line is empty", () => {
  const lines = linesFromWords([], CELIA_Q1_LINES);
  assertEquals(lines.map((l) => l.spoken), ["", "", ""]);
  assertEquals(lines[0].startMs, undefined);
});
