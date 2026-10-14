import type { TABackend } from "@/hooks/useTAChat";
import type { TAStudentRow } from "@/hooks/useTAStudents";

export interface ComposerMention {
  studentId: string;
  displayName: string;
  token: string;
}

export type TACommandIntent =
  | {
      kind: "analyze";
      mode: "diagnose" | "plan" | "waj" | "status" | "next_work" | "prep";
      student?: ComposerMention;
      preview: string;
      sendText: string;
    }
  | {
      kind: "assign";
      student?: ComposerMention;
      resourceQuery: string;
      preview: string;
      sendText: string;
    }
  | {
      kind: "draft_or_message";
      mode: "draft_reply" | "inbox_message";
      student?: ComposerMention;
      body: string;
      preview: string;
      sendText: string;
      supported: boolean;
    }
  | { kind: "inspect"; target: string; preview: string; sendText: string }
  | { kind: "unknown"; preview: null; sendText: string };

function cleanSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripMentionMarker(value: string): string {
  return value.replace(/^@+/, "").trim();
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName.trim();
}

function findMentionByToken(text: string, mentions: ComposerMention[]): ComposerMention | undefined {
  const lower = text.toLowerCase();
  return mentions.find((mention) => lower.includes(mention.token.toLowerCase()));
}

function findStudentByName(text: string, students: TAStudentRow[]): ComposerMention | undefined {
  const lower = ` ${text.toLowerCase()} `;
  const candidates = students
    .map((student) => {
      const displayName = student.display_name?.trim();
      if (!displayName) return null;
      const first = firstName(displayName).toLowerCase();
      const full = displayName.toLowerCase();
      const fullHit = lower.includes(` ${full} `);
      const firstHit = lower.includes(` ${first} `);
      if (!fullHit && !firstHit) return null;
      return {
        studentId: student.class_id,
        displayName,
        token: `@${firstName(displayName)}`,
        score: fullHit ? full.length + 100 : first.length,
      };
    })
    .filter(Boolean) as Array<ComposerMention & { score: number }>;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return undefined;
  return { studentId: best.studentId, displayName: best.displayName, token: best.token };
}

function resolveStudent(
  text: string,
  mentions: ComposerMention[],
  students: TAStudentRow[],
): ComposerMention | undefined {
  return findMentionByToken(text, mentions) ?? findStudentByName(text, students);
}

function studentName(student: ComposerMention | undefined): string {
  return student ? firstName(student.displayName) : "the selected student";
}

function removeStudentReference(text: string, student: ComposerMention | undefined): string {
  if (!student) return text;
  const names = [
    student.token,
    student.displayName,
    firstName(student.displayName),
  ].filter(Boolean);
  let next = text;
  for (const name of names) {
    next = next.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "i"), " ");
    next = next.replace(new RegExp(`${escapeRegExp(name)}`, "i"), " ");
  }
  return cleanSpaces(next);
}

function cleanDraftBody(text: string): string {
  return cleanSpaces(text.replace(/^(a|an|the)\s+/i, ""));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForAgent(text: string, student: ComposerMention | undefined): string {
  if (!student) return text.replace(/@/g, "");
  return text
    .replace(new RegExp(escapeRegExp(student.token), "gi"), student.displayName)
    .replace(/@/g, "");
}

function assignmentFromText(text: string, student: ComposerMention | undefined): string | null {
  const noAt = text.replace(/@/g, "");
  const assignTo = noAt.match(/\bassign\s+(.+?)\s+to\s+(.+?)$/i);
  if (assignTo) return cleanSpaces(assignTo[1]);

  if (student) {
    const give = noAt.match(/\b(?:give|assign)\s+(.+?)$/i);
    if (give) {
      const withoutStudent = removeStudentReference(give[1], student);
      return cleanSpaces(withoutStudent.replace(/\b(to|work|drill|practice)\b/gi, " "));
    }
  }

  const giveName = noAt.match(/\bgive\s+(.+?)\s+(.+?)$/i);
  if (giveName && student) {
    return cleanSpaces(removeStudentReference(noAt.replace(/^.*?\bgive\b/i, ""), student));
  }
  return null;
}

export function normalizeTACommand(input: {
  text: string;
  backend: TABackend;
  mentions: ComposerMention[];
  students: TAStudentRow[];
}): TACommandIntent {
  const raw = input.text.trim();
  const normalized = cleanSpaces(raw);
  const lower = normalized.toLowerCase();
  const student = resolveStudent(normalized, input.mentions, input.students);

  const inspect = normalized.match(/^\/inspect\b\s*(.*)$/i);
  if (inspect) {
    const target = inspect[1]?.trim() ?? "";
    return {
      kind: "inspect",
      target,
      preview: target ? `Inspect ${target}` : "Inspect a platform area",
      sendText: normalized,
    };
  }

  if (/^\/?(prep|prepare)\b/i.test(normalized) || /\bprep\b.*\b(session|with|for)\b/i.test(lower)) {
    return {
      kind: "analyze",
      mode: "prep",
      student,
      preview: `Prepare session briefing for ${studentName(student)}`,
      sendText: normalizeForAgent(normalized.replace(/^\/prep\b/i, "Prepare me for"), student),
    };
  }

  if (
    /^\/?next\b/i.test(normalized) ||
    /\bwhat should\b.+\b(do next|work on)\b/i.test(lower) ||
    /\bnext work\b/i.test(lower)
  ) {
    return {
      kind: "analyze",
      mode: "next_work",
      student,
      preview: `Recommend next work for ${studentName(student)}`,
      sendText: normalizeForAgent(normalized, student),
    };
  }

  const assignResource = assignmentFromText(normalized, student);
  if (assignResource && /\S/.test(assignResource)) {
    return {
      kind: "assign",
      student,
      resourceQuery: assignResource,
      preview: `Prepare assignment proposal: ${assignResource} for ${studentName(student)}`,
      sendText: student
        ? `assign ${assignResource} to ${student.displayName}`
        : normalizeForAgent(normalized, student),
    };
  }

  if (/^\/?reply\b/i.test(normalized) || /\bdraft reply\b/i.test(lower)) {
    const body = cleanDraftBody(removeStudentReference(
      normalized.replace(/^\/?reply\b/i, "").replace(/\bdraft reply\b/i, ""),
      student,
    ));
    return {
      kind: "draft_or_message",
      mode: "draft_reply",
      student,
      body,
      preview: `Draft reply for ${studentName(student)}${body ? `: "${body}"` : ""}`,
      sendText: normalizeForAgent(normalized, student),
      supported: input.backend === "ta-chat",
    };
  }

  if (/^\/?message\b/i.test(normalized) || /\bsend\b.+\bmessage\b/i.test(lower)) {
    const body = cleanDraftBody(removeStudentReference(
      normalized.replace(/^\/?message\b/i, "").replace(/\bsend\b/i, "").replace(/\bmessage\b/i, ""),
      student,
    ));
    return {
      kind: "draft_or_message",
      mode: "inbox_message",
      student,
      body,
      preview: `Draft message for ${studentName(student)}${body ? `: "${body}"` : ""}`,
      sendText: normalizeForAgent(normalized, student),
      supported: false,
    };
  }

  const analysisPatterns = [
    {
      mode: "diagnose",
      label: "Run diagnostic for",
      matches: lower.startsWith("/diagnose") || /\b(diagnose|diagnostic)\b/.test(lower),
    },
    {
      mode: "plan",
      label: "Build study plan for",
      matches: lower.startsWith("/plan") || /\b(study plan|4-week|multi-week)\b/.test(lower),
    },
    {
      mode: "waj",
      label: "Review WAJ for",
      matches: lower.startsWith("/waj") || /\b(waj|wrong answers?|wrong-answer|journal)\b/.test(lower),
    },
    {
      mode: "status",
      label: "Summarize assignment status for",
      matches:
        lower.startsWith("/status") ||
        /\b(assignment statuses|assignment status|every assignment|overdue)\b/.test(lower),
    },
  ] as const;

  const analysis = analysisPatterns.find((candidate) => candidate.matches);
  if (analysis) {
    return {
      kind: "analyze",
      mode: analysis.mode,
      student,
      preview: `${analysis.label} ${studentName(student)}`,
      sendText: normalizeForAgent(normalized, student),
    };
  }

  return { kind: "unknown", preview: null, sendText: normalizeForAgent(normalized, student) };
}

export function commandRequiresComingSoon(intent: TACommandIntent): boolean {
  return intent.kind === "draft_or_message" && !intent.supported;
}
