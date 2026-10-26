/**
 * The worked demonstrations on the Read, Recall, Colour briefing page.
 *
 * Three stimuli from one real section, each run the way the four steps
 * describe, filmed from the student's own eyes: face the page to read, turn
 * away to tell it back, come back to check, then the whole argument from
 * memory. Built in `projects/video` (Round 7, 2026-09-10); the files live in
 * `public/rrc-demos/` like the other bootcamp videos.
 *
 * The label is assembled from the numbers, never typed, so a new demo cannot
 * arrive with a mismatched caption.
 */
export interface RrcDemo {
  /** Stable id, also the file stem. */
  id: string;
  prepTest: number;
  section: number;
  question: number;
  src: string;
  poster: string;
  /** Seconds, for the little duration mark. */
  seconds: number;
}

export const RRC_DEMOS: RrcDemo[] = [
  { id: "pt105-s2-q1", prepTest: 105, section: 2, question: 1, src: "/rrc-demos/rrc-demo-pt105-s2-q1.mp4", poster: "/rrc-demos/rrc-demo-pt105-s2-q1.jpg", seconds: 140 },
  { id: "pt105-s2-q2", prepTest: 105, section: 2, question: 2, src: "/rrc-demos/rrc-demo-pt105-s2-q2.mp4", poster: "/rrc-demos/rrc-demo-pt105-s2-q2.jpg", seconds: 142 },
  { id: "pt105-s2-q3", prepTest: 105, section: 2, question: 3, src: "/rrc-demos/rrc-demo-pt105-s2-q3.mp4", poster: "/rrc-demos/rrc-demo-pt105-s2-q3.jpg", seconds: 110 },
];

export function demoLabel(d: RrcDemo): string {
  return `Demo · PrepTest ${d.prepTest} · Section ${d.section} · Question ${d.question}`;
}

export function demoDuration(d: RrcDemo): string {
  const m = Math.floor(d.seconds / 60);
  const s = d.seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
