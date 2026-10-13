import { useEffect, useMemo, useRef, useState } from "react";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type RoleTone = "background" | "opposing" | "concession" | "pivot" | "premise" | "conclusion";

export type RoleLabelerRole = {
  id: string;
  label: string;
  tone: RoleTone;
};

type StimulusSegment = {
  id: string;
  text: string;
};

type RoleLabelerProps = {
  title: string;
  stimulus: StimulusSegment[];
  roles: RoleLabelerRole[];
  answerKey: Record<string, string>;
  teachingSummary?: string[];
};

type FeedbackState = {
  kind: "idle" | "success" | "error" | "locked" | "complete";
  message: string;
};

const toneStyles: Record<RoleTone, { chip: string; surface: string; text: string; badge: string; flash: string }> = {
  background: {
    chip: "border-[#D7CEC1] bg-[#F7F1E8] text-[#62554A]",
    surface: "border-[#E6DCCF] bg-[#FCF8F2]",
    text: "text-[#62554A]",
    badge: "bg-[#F4EBDD] text-[#62554A]",
    flash: "border-[#C9B69D] bg-[#FAF3E8]",
  },
  opposing: {
    chip: "border-[#C9BED9] bg-[#F6F1FB] text-[#4D3F68]",
    surface: "border-[#DED4EA] bg-[#FBF8FE]",
    text: "text-[#4D3F68]",
    badge: "bg-[#F0E9FA] text-[#4D3F68]",
    flash: "border-[#C7B8DE] bg-[#F7F1FD]",
  },
  concession: {
    chip: "border-[#D8C49B] bg-[#FBF4E6] text-[#7A5B25]",
    surface: "border-[#E8DAB9] bg-[#FEFAF2]",
    text: "text-[#7A5B25]",
    badge: "bg-[#F7ECD4] text-[#7A5B25]",
    flash: "border-[#DAB874] bg-[#FFF6E8]",
  },
  pivot: {
    chip: "border-[#DABB7E] bg-[#FCF7EA] text-[#74541B]",
    surface: "border-[#E6D6B2] bg-[#FEFBF2]",
    text: "text-[#74541B]",
    badge: "bg-[#F8EFD8] text-[#74541B]",
    flash: "border-[#D5AD5F] bg-[#FFF8EA]",
  },
  premise: {
    chip: "border-[#A6C2D8] bg-[#EEF5FB] text-[#24425D]",
    surface: "border-[#CBDDEB] bg-[#F8FBFE]",
    text: "text-[#24425D]",
    badge: "bg-[#EAF4FB] text-[#24425D]",
    flash: "border-[#A6C2D8] bg-[#F4FAFE]",
  },
  conclusion: {
    chip: "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]",
    surface: "border-[#D5E7CF] bg-[#FBFDF8]",
    text: "text-[#2F5B35]",
    badge: "bg-[#EDF7E9] text-[#2F5B35]",
    flash: "border-[#A9CDA3] bg-[#F6FBF3]",
  },
};

function triggerButtonWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function RoleLabeler({ title, stimulus, roles, answerKey, teachingSummary = [] }: RoleLabelerProps) {
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    message: "Pick a role, then label each sentence by the job it is doing.",
  });
  const [flashSentenceId, setFlashSentenceId] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const complete = stimulus.every((segment) => assignments[segment.id] === answerKey[segment.id]);

  useEffect(() => {
    if (!flashSentenceId) return;

    timeoutRef.current = window.setTimeout(() => {
      setFlashSentenceId(null);
      timeoutRef.current = null;
    }, 700);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [flashSentenceId]);

  useEffect(() => {
    if (!complete) return;
    setFeedback({
      kind: "complete",
      message: "You labeled every sentence in the stimulus. Now read the structure back as a whole.",
    });
  }, [complete]);

  function handleRolePick(roleId: string) {
    setActiveRoleId((current) => (current === roleId ? null : roleId));
  }

  function handleSentencePick(sentenceId: string) {
    if (!activeRoleId) {
      setFeedback({
        kind: "error",
        message: "Choose a role chip first so the page knows what you are trying to label.",
      });
      return;
    }

    if (assignments[sentenceId]) {
      setFeedback({
        kind: "locked",
        message: "That sentence is already locked. Move to one of the remaining unlabeled sentences.",
      });
      return;
    }

    const correctRoleId = answerKey[sentenceId];
    const correctRole = roleMap.get(correctRoleId);
    const chosenRole = roleMap.get(activeRoleId);

    if (!correctRole || !chosenRole) return;

    if (correctRoleId === activeRoleId) {
      setAssignments((current) => ({ ...current, [sentenceId]: activeRoleId }));
      // Clear the active role after a correct label so the student picks a fresh
      // role for the next sentence. Without this, re-picking the same role for two
      // consecutive sentences toggles it back off (handleRolePick toggles), which
      // silently strands the next sentence unlabeled.
      setActiveRoleId(null);
      setFeedback({
        kind: "success",
        message: `Locked in: that sentence is doing ${correctRole.label.toLowerCase()} work.`,
      });
      return;
    }

    setFlashSentenceId(sentenceId);
    setFeedback({
      kind: "error",
      message: `Not quite. That sentence is ${correctRole.label.toLowerCase()}, not ${chosenRole.label.toLowerCase()}.`,
    });
  }

  function reset() {
    setActiveRoleId(null);
    setAssignments({});
    setFlashSentenceId(null);
    setFeedback({
      kind: "idle",
      message: "Pick a role, then label each sentence by the job it is doing.",
    });
  }

  return (
    <InteractiveCard prominent className="overflow-hidden rounded-[24px] border-[#DEC9A0] bg-[linear-gradient(180deg,#FFFEFB_0%,#FCF5E8_100%)] p-5 shadow-[0_24px_50px_rgba(92,67,20,0.08)] md:p-7">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6A2F]">Label the stimulus yourself</div>
          <h3 className="font-serif text-[28px] italic leading-tight text-[#1a1a1a]">{title}</h3>
          <p className="max-w-3xl text-[17px] leading-[1.68] text-[rgba(26,26,26,0.76)]">
            Choose a role from the rail, then click the sentence that does that job in the argument.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {roles.map((role) => {
            const active = role.id === activeRoleId;
            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleRolePick(role.id)}
                onKeyDown={(event) => triggerButtonWithKeyboard(event, () => handleRolePick(role.id))}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                  active
                    ? `${toneStyles[role.tone].chip} translate-y-[-1px] shadow-[0_12px_20px_rgba(26,26,26,0.08)]`
                    : "border-[rgba(26,26,26,0.12)] bg-white/90 text-[rgba(26,26,26,0.72)] hover:bg-white",
                )}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        <div
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-[14px] border px-4 py-4 text-[16px] leading-[1.6]",
            feedback.kind === "error" && "border-[#E3C0B2] bg-[#FFF7F4] text-[#8A4E3B]",
            feedback.kind === "success" && "border-[#C7D9E8] bg-[#F8FBFE] text-[#24425D]",
            feedback.kind === "locked" && "border-[#D7CEC1] bg-[#FBF6EE] text-[#62554A]",
            feedback.kind === "complete" && "border-[#B9D6B4] bg-[#F6FBF3] text-[#2F5B35]",
            (feedback.kind === "idle" || feedback.kind === "success") &&
              "border-[rgba(26,26,26,0.10)] bg-[rgba(255,255,255,0.74)] text-[rgba(26,26,26,0.78)]",

          )}
        >
          {feedback.message}
        </div>

        <div className="grid gap-3">
          {stimulus.map((segment, index) => {
            const assignedRoleId = assignments[segment.id];
            const assignedRole = assignedRoleId ? roleMap.get(assignedRoleId) ?? null : null;
            const correctRole = roleMap.get(answerKey[segment.id]) ?? null;
            const locked = Boolean(assignedRole);
            const flashing = flashSentenceId === segment.id && correctRole;
            const tone = assignedRole ? toneStyles[assignedRole.tone] : correctRole ? toneStyles[correctRole.tone] : null;

            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => handleSentencePick(segment.id)}
                onKeyDown={(event) => triggerButtonWithKeyboard(event, () => handleSentencePick(segment.id))}
                className={cn(
                  "w-full rounded-[16px] border px-4 py-4 text-left transition-[border-color,background,box-shadow,transform] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                  "hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(26,26,26,0.06)]",
                  locked && tone ? `${tone.surface} ${tone.text}` : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.84)] hover:border-[rgba(26,26,26,0.18)]",
                  flashing && tone && tone.flash,
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(26,26,26,0.10)] bg-[rgba(26,26,26,0.03)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="text-[17px] leading-[1.65]">{segment.text}</div>
                    {locked && assignedRole ? (
                      <div className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", toneStyles[assignedRole.tone].badge)}>
                        {assignedRole.label}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {complete ? (
          <div className="rounded-[16px] border border-[#CFE0C8] bg-[#FBFDF8] px-5 py-5">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2F5B35]">Whole structure</p>
              <div className="space-y-2 text-[15px] leading-[1.6] text-[rgba(26,26,26,0.74)]">
                {teachingSummary.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </InteractiveCard>
  );
}
