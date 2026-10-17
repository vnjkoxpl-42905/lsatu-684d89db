/**
 * Worked-example and instruction media.
 *
 * Nothing here ships in the app bundle or `public/`. Players render only when
 * `VITE_RC_RECALL_MEDIA_BASE` points at a media server (a local development
 * server for ignored derivatives, for now). Unset, every player stays hidden.
 * The instruction video additionally needs `VITE_RC_RECALL_INSTRUCTIONS_VERIFIED`
 * to be "true", set only after the edited video and its aligned captions have
 * been checked at every edit boundary.
 */
import type { RecallMode } from "./sequence";

export interface ExampleClip {
  id: string;
  mode: RecallMode;
  /** App-facing title. The source name is kept for provenance only. */
  title: string;
  sourceTitle: string;
  /** File stem under the media base; `<stem>.mp4` and `<stem>.vtt`. */
  stem: string;
  /** A correction clip is not a worked example. */
  kind: "example" | "note";
}

const decaf = (n: number, title: string, source: string): ExampleClip => ({
  id: `cumulative-${n}`, mode: "cumulative_recall", title, sourceTitle: source, stem: `examples/cumulative-${String(n).padStart(2, "0")}`, kind: "example",
});

export const CUMULATIVE_EXAMPLES: ExampleClip[] = [
  decaf(1, "Paragraph 1: read, translate, quip and recall", "Decaf RC Translation Demo - PT140.S4.P3 Paragraph 1 RTQ + Recap"),
  decaf(2, "Paragraph 2: read, translate, quip and recall", "Decaf RC Translation Demo - PT140.S4.P3 Paragraph 2 RTQ + Recap"),
  decaf(3, "Recall paragraphs 1 and 2 together", "Decaf RC Translation Demo - PT140.S4.P3 Partial Passage Recap 1"),
  decaf(4, "Paragraph 3: read, translate, quip and recall", "Decaf RC Translation Demo - PT140.S4.P3 Paragraph 3 RTQ + Recap"),
  decaf(5, "Recall paragraphs 1 to 3 together", "Decaf RC Translation Demo - PT140.S4.P3 Partial Passage Recap 2"),
  decaf(6, "Paragraph 4: read, translate, quip and recall", "Decaf RC Translation Demo - PT140.S4.P3 Paragraph 4 RTQ + Recap"),
  decaf(7, "Complete passage recap", "Decaf RC Translation Demo - PT140.S4 Complete Passage Recap"),
];

export const RC_RECALL_NOTE: ExampleClip = {
  id: "rc-recall-note", mode: "rc_recall", kind: "note", stem: "examples/rc-recall-note",
  title: "Before you watch: how this demo differs from the real thing",
  sourceTitle: "A Note on the Cappuccino RC Translation Demo You're About to Watch",
};

export const RC_RECALL_EXAMPLES: ExampleClip[] = [
  { id: "rc-recall-1", mode: "rc_recall", kind: "example", stem: "examples/rc-recall-01", title: "Passage A and its confirmation", sourceTitle: "Cappuccino RC Translation Demo - PT140.S4.P2 Passage A + Review" },
  { id: "rc-recall-2", mode: "rc_recall", kind: "example", stem: "examples/rc-recall-02", title: "Passage B and its confirmation", sourceTitle: "Cappuccino RC Translation Demo - PT140.S4.P2 Passage B + Review" },
  { id: "rc-recall-3", mode: "rc_recall", kind: "example", stem: "examples/rc-recall-03", title: "Full passage recap", sourceTitle: "Cappuccino RC Translation Demo - PT140.S4.P2 Full Passage Recap" },
];

export const INSTRUCTION_VIDEO = {
  title: "How and Why to Do RC Training",
  stem: "how-and-why-to-do-rc-recall",
} as const;

/** What the note on the demo says students must hear before the RC Recall examples. */
export const RC_RECALL_DEMO_CORRECTION = [
  "In the real drill, confirmations are silent.",
  "The spoken demo only approximates the process that happens in your head.",
  "You may confirm only the current sub-passage, or include Passage A while you work on Passage B.",
];

/** The names the source lesson uses, so app copy and footage line up. */
export const SOURCE_NAME_MAP = [
  { app: "RC Recall", source: "Decaf" },
  { app: "RC Flow", source: "Cappuccino" },
] as const;

export function mediaBase(env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>): string | null {
  const raw = env.VITE_RC_RECALL_MEDIA_BASE?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function instructionsVerified(env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>): boolean {
  return mediaBase(env) !== null && env.VITE_RC_RECALL_INSTRUCTIONS_VERIFIED === "true";
}

export function mediaUrls(stem: string, base: string | null = mediaBase()): { video: string; captions: string; audio: string; transcript: string } | null {
  if (!base) return null;
  const root = base.replace(/\/+$/, "");
  return { video: `${root}/${stem}.mp4`, captions: `${root}/${stem}.vtt`, audio: `${root}/${stem}.mp3`, transcript: `${root}/${stem}.txt` };
}

export const CAPTION_NOTICE = "Captions are auto-generated and have not been checked by a person.";
