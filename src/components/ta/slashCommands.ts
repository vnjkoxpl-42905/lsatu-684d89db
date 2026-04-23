import type { LucideIcon } from "lucide-react";
import {
  Stethoscope,
  ClipboardList,
  CalendarRange,
  Target,
  BookMarked,
  ListChecks,
  Presentation,
} from "lucide-react";

export interface SlashCommand {
  /** Command token typed after `/`. Lowercase, no spaces. */
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  /**
   * Structured instruction pushed into the textarea when the command is
   * selected. The admin can edit before sending. Designed to give the TA
   * enough context to do useful work without further prompting.
   */
  prefill: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "diagnose",
    icon: Stethoscope,
    label: "/diagnose",
    description: "Full diagnostic summary of the student",
    prefill:
      "Give me a full diagnostic of this student. Cover: recent accuracy trends, strongest and weakest question types, notable WAJ patterns, and where they should focus next. Do not draft an assignment yet — just the diagnosis.",
  },
  {
    id: "assign",
    icon: ClipboardList,
    label: "/assign",
    description: "Search the library and draft an assignment",
    prefill:
      "Search the teaching library and draft an assignment that targets this student's current weak spots. Include a clear objective, the relevant curriculum reference(s), 2–4 practice items, and a short rubric for me to review before I approve.",
  },
  {
    id: "plan",
    icon: CalendarRange,
    label: "/plan",
    description: "Build a multi-week study plan",
    prefill:
      "Build a 4-week study plan for this student based on their performance data. Week-by-week: focus area, reading/curriculum, practice volume, checkpoint for how I'll measure progress. Do not draft an assignment.",
  },
  {
    id: "bootcamp",
    icon: Target,
    label: "/bootcamp",
    description: "Recommend the next bootcamp based on analytics",
    prefill:
      "Which bootcamp should this student enroll in next, and why? Cite the specific accuracy/time data that supports the recommendation. Mention the runner-up and when it would become the right choice.",
  },
  {
    id: "waj",
    icon: BookMarked,
    label: "/waj",
    description: "Review WAJ and suggest targeted practice",
    prefill:
      "Review this student's Wrong Answer Journal. Cluster the entries by root cause (not just by question type). For the two largest clusters, suggest a targeted drill and the teaching library reference I should send with it. Do not draft the assignment yet.",
  },
  {
    id: "status",
    icon: ListChecks,
    label: "/status",
    description: "Show all assignment statuses for this student",
    prefill:
      "Summarize every assignment I've sent this student: title, date assigned, current status, score if completed, and one line on whether follow-up is warranted. Flag anything overdue.",
  },
  {
    id: "prep",
    icon: Presentation,
    label: "/prep",
    description: "Prepare for the next session with this student",
    prefill:
      "Prepare me for my next session with this student. Use the most recent transcript, session notes, and any screenshots in their context. Output: agenda (bulleted), 3 discussion prompts, and the single most important follow-up from last session.",
  },
];

/** Filter commands by typed query (after the leading `/`). Case-insensitive
 * substring match on id OR label OR description. Returns original order. */
export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (c) =>
      c.id.includes(q) ||
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  );
}
