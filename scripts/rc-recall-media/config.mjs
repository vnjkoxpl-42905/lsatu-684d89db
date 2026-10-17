// Source map, edit list and encoding profile for the RC Recall media pipeline.
// Sources are read-only. Everything written goes to OUTPUT_ROOT, which is ignored by Git
// and is never inside `public/`.
import path from "node:path";

export const SOURCE_ROOT = process.env.RC_RECALL_SOURCE_ROOT
  ?? "C:/Users/Joshu/dev/ai-os/Loophole Lecture";
export const OUTPUT_ROOT = path.resolve(process.env.RC_RECALL_MEDIA_OUT ?? ".local-media/rc-recall");

/** One tested profile for every derivative, including the new instruction video. */
export const PROFILE = {
  height: 480,
  fps: 30,
  video: ["-c:v", "libx264", "-preset", "medium", "-crf", "32", "-pix_fmt", "yuv420p", "-profile:v", "high"],
  audio: ["-c:a", "aac", "-b:a", "64k", "-ac", "1", "-ar", "44100"],
  mp3: ["-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1"],
  // Preserve a clear presenter image while targeting a compact local preview set.
  budgetBytes: 200 * 1024 * 1024,
};

const d1 = "Day One";
const d6 = "Day Six";

// [source folder under SOURCE_ROOT, output stem]
export const CLIPS = [
  [`${d1}/Decaf RC Translation Demo - PT140.S4.P3 Paragraph 1 RTQ + Recap`, "examples/cumulative-01"],
  [`${d1}/Decaf RC Translation Demo - PT140.S4.P3 Paragraph 2 RTQ + Recap`, "examples/cumulative-02"],
  [`${d1}/Decaf RC Translation Demo - PT140.S4.P3 Partial Passage Recap 1`, "examples/cumulative-03"],
  [`${d1}/Decaf RC Translation Demo - PT140.S4.P3 Paragraph 3 RTQ + Recap`, "examples/cumulative-04"],
  [`${d1}/Decaf RC Translation Demo - PT140.S4.P3 Partial Passage Recap 2`, "examples/cumulative-05"],
  [`${d1}/Decaf RC Translation Demo - PT140.S4.P3 Paragraph 4 RTQ + Recap`, "examples/cumulative-06"],
  [`${d1}/Decaf RC Translation Demo - PT140.S4 Complete Passage Recap`, "examples/cumulative-07"],
  [`${d6}/A Note on the Cappuccino RC Translation Demo You're About to Watch`, "examples/rc-recall-note"],
  [`${d6}/Cappuccino RC Translation Demo - PT140.S4.P2 Passage A + Review`, "examples/rc-recall-01"],
  [`${d6}/Cappuccino RC Translation Demo - PT140.S4.P2 Passage B + Review`, "examples/rc-recall-02"],
  [`${d6}/Cappuccino RC Translation Demo - PT140.S4.P2 Full Passage Recap`, "examples/rc-recall-03"],
];

/**
 * How and Why to Do RC Recall: the two full strategy videos, joined with chapter cards.
 * `cuts` are seconds to REMOVE from a source. They take out the Cappuccino 35-minute
 * variant, which this activity does not offer. Boundaries come from the source's own
 * captions (cue times) and MUST be spot-checked by ear and by caption at every join
 * before the video is shown (see README, "Edit boundary checks").
 */
export const INSTRUCTION = {
  stem: "how-and-why-to-do-rc-recall",
  parts: [
    {
      card: {
        title: "Cumulative Recall",
        subtitle: "The source calls Cumulative Recall “Decaf”",
      },
      source: `${d1}/How and Why to Do Decaf RC Translation`,
      cuts: [],
    },
    {
      card: {
        title: "RC Recall",
        subtitle: "The source calls RC Recall “Cappuccino”",
      },
      source: `${d6}/How and Why to Do Cappuccino RC Translation`,
      cuts: [
        // Cues 35-45: "two versions of cappuccino ... not the 35 version".
        { from: 75.125, to: 102.265, why: "introduces the 35-minute version" },
        // Cues 179-206: the 35 version's walkthrough. Resumes at "Got it. And like I said...".
        { from: 404.365, to: 469.385, why: "walks through Cappuccino 35 (not offered)" },
      ],
    },
  ],
  cardSeconds: 3,
};
