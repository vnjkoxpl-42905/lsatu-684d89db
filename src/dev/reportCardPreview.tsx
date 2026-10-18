/**
 * A preview harness for the Report Card. Development only.
 *
 * It exists so the card can be looked at in a real browser, at real density,
 * without signing in and without a graded section sitting in the database. The
 * lab at `/activity-lab` renders the same component, but it goes through
 * `App.tsx` and therefore through every stylesheet in the product; this entry
 * mounts the card and nothing else, which is what makes it usable while another
 * part of the app is mid-edit.
 *
 * Twenty-two stimuli, because that is what a real section is and because the
 * things most likely to be wrong on this card are wrong at twenty-two and fine
 * at four: the ledger, the measure, and whether she can find her way back to a
 * stimulus she has already read.
 *
 * Not routed and not imported by the app. Reached at
 * `/src/dev/report-card-preview.html` on the dev server. It is not an entry
 * point in the Vite build, which only builds `index.html`, so it never ships.
 *
 * `?state=faults|clean|partial` · `?playing=N` to freeze the playhead on line N
 * of the open stimulus, which is the one state a static screenshot cannot reach
 * on its own because there is no recording behind a fixture.
 */
import { createRoot } from "react-dom/client";
import { SectionReportCard } from "../features/activity-centre/components/SectionReportCard";
import type { SectionGrade, SectionStimulusGrade } from "../features/activity-centre/api/types";
import "../index.css";
import "../features/activity-centre/activity-centre.css";

const params = new URLSearchParams(location.search);
const state = params.get("state") ?? "faults";
const freezeLine = params.get("playing");
/*
 * `?frame=runner` wraps the card in the EXACT element the runner's report phase
 * uses, cream ground, emerald focus ring and all. Without it the harness renders
 * the card on a neutral field the student never sees, which is how a plum card
 * on warm cream got as far as it did.
 */
const frame = params.get("frame");

const WALKTHROUGH =
  "> Ace Manufacturing's consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.\n\n" +
  "So a management consultant is telling us how to run the company, and the idea is to move every single employee so they are doing the things they enjoy and the things they are good at.\n\n" +
  '> This, she says, will "increase productivity by fully exploiting our available resources."\n\n' +
  "And her claim is that this raises productivity, because you would be getting everything you can out of the people you already have.";

function stim(n: number, over: Partial<SectionStimulusGrade> = {}): SectionStimulusGrade {
  return {
    slug: `PT102_S3_Q${n}`,
    item_order: n,
    carried: 20,
    total: 21,
    percent: 95,
    band: "at-the-standard",
    missed: [],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    readGiven: true,
    readMatches: true,
    dead_air_seconds: 0.4,
    spoken:
      "so the director says their consultant wants people moved around so that everyone is doing what they like and what they are actually good at, and she reckons that gets more out of the place",
    window_ms: { start: 12000, end: 48000 },
    recall_window_ms: { start: 26000, end: 48000 },
    stimulus_text:
      "Ace Manufacturing's consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well. " +
      'This, she says, will "increase productivity by fully exploiting our available resources."',
    the_read: "What if exploit is doing two jobs in this argument?",
    readReason:
      "She said the consultant may be assuming everyone wants to move, which is a different move from the one the argument turns on.",
    nextTime:
      "Say the quantifier on purpose as you read: all employees, not the staff. It is the one word this argument leans on.",
    lines: [
      {
        n: 1,
        text: "Ace Manufacturing's consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.",
        spoken:
          "so the director says their consultant wants people moved around so everyone is doing what they like and what they are good at",
        startMs: 12000,
        endMs: 26000,
        verdict: "partial",
        note: "Dropped that it applies to all employees. You said everyone, which is close, but the staff being reassigned was every employee.",
        carried: [
          "A consultant is proposing this.",
          "Staff would be reassigned.",
          "People would do what they like and what they do well.",
        ],
        dropped: ["This applies to all employees."],
      },
      {
        n: 2,
        text: 'This, she says, will "increase productivity by fully exploiting our available resources."',
        spoken: "and she thinks that makes the place more productive because you get the most out of everyone",
        startMs: 26000,
        endMs: 40000,
        verdict: "strong",
        note: "",
        carried: ["This is the conclusion.", "Productivity would increase.", "The reason is fully exploiting resources."],
        dropped: [],
      },
    ],
    recall: {
      verdict: "partial",
      note: "The recall kept the proposal and the claim, and lost the quantifier again.",
    },
    bigMisses: ["all employees"],
    ...over,
  };
}

/** Twenty-two, shaped like a real run rather than twenty-two of the same one. */
function stimuli(kind: string): SectionStimulusGrade[] {
  if (kind === "meaning") {
    return [stim(1, { percent: 64, band: "thin", meaning_percent: 100,
      meaning_carried: 10, meaning_total: 10,
      missed: ["The office walls were blue."],
      incidental_misses: ["The office walls were blue."],
      bigMisses: [], nextTime: "", readReason: "", lines: undefined })];
  }
  if (kind === "clean")
    return Array.from({ length: 22 }, (_, i) =>
      stim(i + 1, {
        percent: 100,
        carried: 21,
        missed: [],
        nextTime: "",
        lines: undefined,
        bigMisses: [],
        recall: { verdict: "strong", note: "" },
      }),
    );

  const shape: Partial<SectionStimulusGrade>[] = [
    { percent: 95, missed: ["This applies to all employees."], readMatches: false },
    { percent: 100, carried: 21, missed: [], nextTime: "" },
    { percent: 88 },
    { percent: 74, band: "nearly-there", carried: 14, total: 19, coloured: false, readGiven: false, readMatches: false, missed: ["The figure is an average.", "This is a contrast."] },
    { percent: 91 },
    { percent: 100, carried: 21, missed: [], reciting: true, spoken: "the director of ace manufacturing company says our management consultant proposes that we reassign staff" },
    { percent: 57, band: "thin", carried: 12, dead_air_seconds: 7, missed: ["The study ran for four years.", "The nurses were in Sweden."], readMatches: false },
    { percent: 86 },
    { percent: 75, band: "nearly-there", carried: 15, total: 20, colourSpecific: false, missed: ["The comparison is with last year."] },
    { percent: 100, carried: 21, missed: [] },
    { percent: 69, band: "nearly-there", carried: 13, total: 19, missed: ["Reserves stayed flat."] },
    { percent: 94 },
    { percent: 11, band: "lost-it", carried: 2, total: 18, listing: true, coloured: false, readGiven: false, readMatches: false, missed: ["The whole second half."], spoken: "" },
    { percent: 85 },
    { percent: 85 },
    { percent: 46, band: "lost-it", carried: 9, total: 20, missed: ["No new oil fields were found."], readMatches: false },
    { percent: 76, band: "nearly-there", carried: 16, total: 21, missed: ["The word was exclusively."] },
    { percent: 94 },
    { percent: 86 },
    { percent: 89 },
    { percent: 87 },
    { percent: 83, ungraded: undefined },
  ];
  if (kind === "partial") shape[3] = { ...shape[3], ungraded: "the judge returned nothing" };
  return shape.map((over, i) => stim(i + 1, over));
}

const list = stimuli(state);

const grade: SectionGrade = {
  assignment_id: "preview",
  attempt_no: 2,
  student_id: "preview",
  source_section: "PT102.S3",
  transcript_engine: "deepgram/nova-3",
  transcript_text: "…",
  grader_version: 7,
  graded_at: "2026-09-08T08:05:24Z",
  stimuli: list,
  section: {
    accommodation: "standard",
    audio_bucket: "drill-recordings",
    audio_path: "preview.webm",
    goal_minutes: 25,
    total_seconds: state === "clean" ? 1440 : 1712,
    within_time: state !== "clean",
    within_goal: state === "clean",
    mean_coverage: state === "clean" ? 96 : 82,
    ...(state === "meaning" ? { mean_coverage: 64, mean_meaning: 100 } : {}),
    stimuli_graded: list.length,
    stimuli_in_section: 22,
    // A clean run has to look clean, or the harness cannot show what one looks
    // like: the habit notes are the half of the console that should vanish.
    reciting_count: state === "clean" ? 0 : 1,
    listing_count: state === "clean" ? 0 : 1,
    uncoloured_count: state === "clean" ? 0 : 3,
    read_given_count: state === "clean" ? 22 : 19,
    read_matched_count: state === "clean" ? 22 : 15,
    no_read_count: state === "clean" ? 0 : 3,
    chunks_read_aloud: state === "clean" ? 0 : 2,
    ungraded_count: state === "partial" ? 1 : 0,
    worst_dead_air_seconds: state === "clean" ? 0.4 : 7,
    dead_air_threshold_seconds: 4,
    decoy_failures: 0,
    clock: {},
    ...(state === "meaning" ? {
      stimuli_in_section: 1, reciting_count: 0, listing_count: 0,
      uncoloured_count: 0, read_given_count: 1, read_matched_count: 1,
      no_read_count: 0, chunks_read_aloud: 0, worst_dead_air_seconds: 0.4,
    } : {}),
  },
};

createRoot(document.getElementById("root")!).render(
  <div
    className={frame === "runner" ? "activity-centre rc-ground min-h-screen px-4 py-12" : undefined}
    style={
      frame === "runner"
        ? undefined
        : { minHeight: "100vh", background: "oklch(0.925 0.014 312)", padding: "40px 24px" }
    }
  >
    <SectionReportCard
      grade={grade}
      loadModelRuns={async () =>
        Object.fromEntries(list.map((s) => [s.slug, { audio: null, walkthrough: WALKTHROUGH }]))
      }
    />
  </div>,
);

/*
 * The playhead, without a recording.
 *
 * The highlight is driven by the audio element's own clock, so on a fixture it
 * can never fire. Rather than fake an <audio> element, the harness sets the one
 * attribute the CSS reads, which is exactly what the component sets when the
 * clock lands inside a line's window. What is being checked here is the
 * treatment, not the arithmetic; the arithmetic is a unit test.
 */
if (freezeLine) {
  setTimeout(() => {
    const line = document.querySelectorAll(".rc__line")[Number(freezeLine) - 1];
    line?.setAttribute("data-playing", "true");
  }, 300);
}
