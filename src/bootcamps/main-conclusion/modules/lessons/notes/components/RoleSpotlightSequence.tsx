import { useMemo, useState } from "react";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type SentenceId = "background" | "opposing" | "pivot" | "conclusion";

type Step = {
  id: string;
  prompt: string;
  target: SentenceId;
  success: string;
};

const sentences: Array<{ id: SentenceId; text: string; roleLabel: string }> = [
  {
    id: "background",
    text: "Large online retailers often sell books at lower prices than independent bookstores.",
    roleLabel: "Background",
  },
  {
    id: "opposing",
    text: "It is often assumed that local bookstores cannot compete with them.",
    roleLabel: "Other view",
  },
  {
    id: "pivot",
    text: "But local bookstores host community events, recommend books personally, and create spaces for readers to meet.",
    roleLabel: "Author's turn",
  },
  {
    id: "conclusion",
    text: "Therefore, independent bookstores can remain valuable even when they cannot match online prices.",
    roleLabel: "Author's conclusion",
  },
];

const steps: Step[] = [
  {
    id: "background-step",
    prompt: "First, find the background sentence.",
    target: "background",
    success: "Good. That sentence sets the scene but does not make the author's case yet.",
  },
  {
    id: "opposing-step",
    prompt: "Now find the sentence that gives someone else's view.",
    target: "opposing",
    success: "Right. That sentence belongs to the assumption being reported, not to the author's own position.",
  },
  {
    id: "pivot-step",
    prompt: "Now find the sentence where the author turns into the real case.",
    target: "pivot",
    success: "Exactly. The turn starts at 'But,' and the sentence begins the author's side of the argument.",
  },
  {
    id: "conclusion-step",
    prompt: "Last step: find the author's conclusion.",
    target: "conclusion",
    success: "Yes. That is the claim the earlier support is trying to prove.",
  },
];

const wrongFeedback: Record<SentenceId, string> = {
  background: "That one is setup, not the role this step is asking for.",
  opposing: "That sentence belongs to someone else's view, not to the target for this step.",
  pivot: "That is part of the author's case, but not the exact role this step is asking you to find.",
  conclusion: "That one is the author's point, not the setup or structural move this step is asking for.",
};

export function RoleSpotlightSequence() {
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lockedRoles, setLockedRoles] = useState<SentenceId[]>([]);

  const activeStep = steps[stepIndex] ?? null;
  const complete = stepIndex >= steps.length;
  const lockedRoleSet = useMemo(() => new Set(lockedRoles), [lockedRoles]);

  function handleSentencePick(sentenceId: SentenceId) {
    if (!activeStep) return;

    if (sentenceId === activeStep.target) {
      setLockedRoles((current) => (current.includes(sentenceId) ? current : [...current, sentenceId]));
      setFeedback(activeStep.success);
      setStepIndex((current) => current + 1);
      return;
    }

    setFeedback(wrongFeedback[sentenceId]);
  }

  function reset() {
    setStepIndex(0);
    setFeedback(null);
    setLockedRoles([]);
  }

  return (
    <InteractiveCard prominent className="bg-[#FFFDFC] p-6 md:p-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
            One guided pass
          </div>
          <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">
            Separate the author's argument from everything around it
          </h3>
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            Work through the stimulus in order. Each click asks what job the sentence is doing, not just what it says.
          </p>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="rounded-[14px] border border-[rgba(26,26,26,0.10)] bg-[rgba(255,255,255,0.74)] px-4 py-4"
        >
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.84)]">
            {complete
              ? "You separated the author's argument from everything around it."
              : activeStep?.prompt}
          </p>
          {feedback ? <p className="mt-2 text-[15px] leading-[1.6] text-[rgba(26,26,26,0.66)]">{feedback}</p> : null}
        </div>

        <div className="grid gap-3">
          {sentences.map((sentence, index) => {
            const locked = lockedRoleSet.has(sentence.id);
            const isCurrentTarget = !complete && activeStep?.target === sentence.id;

            return (
              <button
                key={sentence.id}
                type="button"
                onClick={() => handleSentencePick(sentence.id)}
                className={cn(
                  "w-full rounded-[14px] border px-4 py-4 text-left transition-[border-color,background,box-shadow,transform] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                  "hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(26,26,26,0.06)]",
                  locked
                    ? "border-[#B9D6B4] bg-[#F6FBF3]"
                    : "border-[rgba(26,26,26,0.10)] bg-white hover:border-[rgba(26,26,26,0.18)]",
                  isCurrentTarget && !locked && "border-[#C7D9E8] bg-[#F8FBFE]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(26,26,26,0.10)] bg-[rgba(26,26,26,0.03)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.84)]">{sentence.text}</div>
                    {locked ? (
                      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(47,91,53,0.76)]">
                        {sentence.roleLabel}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {complete ? (
          <div className="rounded-[14px] border border-[#C7D9E8] bg-[#F8FBFE] px-4 py-4">
            <div className="space-y-2 text-[15px] leading-[1.6] text-[rgba(26,26,26,0.72)]">
              <p><strong>Background:</strong> lower online prices set the context.</p>
              <p><strong>Other view:</strong> bookstores cannot compete.</p>
              <p><strong>Author's turn:</strong> the sentence starting with "But" begins the author's case.</p>
              <p><strong>Author's conclusion:</strong> local bookstores can still remain valuable.</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-3 rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
            >
              Run it again
            </button>
          </div>
        ) : null}
      </div>
    </InteractiveCard>
  );
}
