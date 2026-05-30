import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type ClaimId = "claim-a" | "claim-b" | "claim-c";
type Answer = "yes" | "no" | null;

type ClaimConfig = {
  id: ClaimId;
  shortLabel: string;
  sentence: string;
  correct: { q1: Exclude<Answer, null>; q2: Exclude<Answer, null> };
  pass: boolean;
  successTitle: string;
  explanation: string;
};

const claims: ClaimConfig[] = [
  {
    id: "claim-a",
    shortLabel: "Claim A",
    sentence: "Some paleontologists suggest the Apatosaurus was able to gallop.",
    correct: { q1: "no", q2: "no" },
    pass: false,
    successTitle: "Claim A does not pass the check.",
    explanation: "It belongs to some paleontologists, not to the author, and nothing in the stimulus is trying to prove that attribution.",
  },
  {
    id: "claim-b",
    shortLabel: "Claim B",
    sentence: "However, this is unlikely.",
    correct: { q1: "yes", q2: "yes" },
    pass: true,
    successTitle: "Claim B passes both questions.",
    explanation: "That makes Claim B the main conclusion, because it is the author's view and the experiment sentence is offered to support it.",
  },
  {
    id: "claim-c",
    shortLabel: "Claim C",
    sentence: "Experiments show the strain of galloping would have broken their legs.",
    correct: { q1: "no", q2: "no" },
    pass: false,
    successTitle: "Claim C does not pass the check.",
    explanation: "This sentence is being used as support. The author is not trying to prove the experiment report with another statement in the stimulus.",
  },
];

export function TwoPartConclusionCheckMachine() {
  const [activeClaimId, setActiveClaimId] = useState<ClaimId>("claim-a");
  const [answers, setAnswers] = useState<Record<ClaimId, { q1: Answer; q2: Answer }>>({
    "claim-a": { q1: null, q2: null },
    "claim-b": { q1: null, q2: null },
    "claim-c": { q1: null, q2: null },
  });
  const [submittedClaimId, setSubmittedClaimId] = useState<ClaimId | null>(null);

  const activeClaim = useMemo(
    () => claims.find((claim) => claim.id === activeClaimId) ?? claims[0],
    [activeClaimId],
  );
  const activeAnswers = answers[activeClaim.id];
  const submittedClaim = submittedClaimId ? claims.find((claim) => claim.id === submittedClaimId) ?? null : null;
  const submittedAnswers = submittedClaim ? answers[submittedClaim.id] : null;
  const activeMatches =
    activeAnswers.q1 === activeClaim.correct.q1 && activeAnswers.q2 === activeClaim.correct.q2;

  function setAnswer(question: "q1" | "q2", value: Exclude<Answer, null>) {
    setAnswers((current) => ({
      ...current,
      [activeClaim.id]: {
        ...current[activeClaim.id],
        [question]: value,
      },
    }));
    setSubmittedClaimId(null);
  }

  function submit() {
    if (!activeAnswers.q1 || !activeAnswers.q2) return;
    setSubmittedClaimId(activeClaim.id);
  }

  function resetClaim() {
    setAnswers((current) => ({
      ...current,
      [activeClaim.id]: { q1: null, q2: null },
    }));
    setSubmittedClaimId((current) => (current === activeClaim.id ? null : current));
  }

  return (
    <InteractiveCard prominent className="bg-[#FFFDFC] p-6 md:p-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
            Run the filter
          </div>
          <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">
            Check each claim with the same two questions
          </h3>
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            Pick a claim, answer both questions, and see whether it survives the filter.
          </p>
        </div>

        <div className="rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.76)] p-5 text-[18px] leading-[1.75] text-[rgba(26,26,26,0.82)]">
          <em>
            Some paleontologists suggest the Apatosaurus was able to gallop. However, this is unlikely. Experiments show the strain of galloping would have broken their legs.
          </em>
        </div>

        <div className="flex flex-wrap gap-3">
          {claims.map((claim) => {
            const active = claim.id === activeClaim.id;
            return (
              <motion.button
                key={claim.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setActiveClaimId(claim.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                  active
                    ? "border-[rgba(26,26,26,0.18)] bg-[#1a1a1a] text-[#F5F2ED]"
                    : "border-[rgba(26,26,26,0.12)] bg-white text-[#1a1a1a] hover:bg-[#F8F5EE]",
                )}
              >
                {claim.shortLabel}
              </motion.button>
            );
          })}
        </div>

        <div className="rounded-[14px] border border-[rgba(26,26,26,0.10)] bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
            {activeClaim.shortLabel}
          </p>
          <p className="mt-2 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            <em>{activeClaim.sentence}</em>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              id: "q1" as const,
              prompt: "Question 1: Is this the author's own opinion?",
            },
            {
              id: "q2" as const,
              prompt: "Question 2: Is this supported by another explicit statement here?",
            },
          ].map((question) => (
            <div key={question.id} className="rounded-[14px] border border-[rgba(26,26,26,0.10)] bg-white p-4">
              <p className="text-[16px] leading-[1.55] text-[rgba(26,26,26,0.82)]">{question.prompt}</p>
              <div className="mt-3 flex gap-3" role="radiogroup" aria-label={question.prompt}>
                {(["yes", "no"] as const).map((value) => {
                  const checked = activeAnswers[question.id] === value;
                  return (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={`${question.id === "q1" ? "Question 1" : "Question 2"} ${value}`}
                      onClick={() => setAnswer(question.id, value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                        checked
                          ? "border-[#C7D9E8] bg-[#F8FBFE] text-[#24425D]"
                          : "border-[rgba(26,26,26,0.12)] bg-[#FCFBF8] text-[#1a1a1a] hover:bg-white",
                      )}
                    >
                      {value}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={submit}
            disabled={!activeAnswers.q1 || !activeAnswers.q2}
            className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
          >
            Check this claim
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={resetClaim}
            className="rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
          >
            Clear this claim
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {submittedClaim && submittedAnswers ? (
            <motion.div
              key={submittedClaim.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="status"
              aria-live="polite"
              className={cn(
                "rounded-[14px] border px-4 py-4 flex gap-3",
                activeMatches ? "border-[#B9D6B4] bg-[#F6FBF3]" : "border-[#E6D6B2] bg-[#FEFBF2]",
              )}
            >
              {activeMatches ? (
                <CheckCircle2 className="h-6 w-6 text-[#2F5B35] flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-[#74541B] flex-shrink-0" />
              )}
              <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.82)]">
                <strong>{submittedClaim.successTitle}</strong>{" "}
                {activeMatches
                  ? submittedClaim.explanation
                  : `The right pattern is ${submittedClaim.correct.q1.toUpperCase()} on question 1 and ${submittedClaim.correct.q2.toUpperCase()} on question 2. ${submittedClaim.explanation}`}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </InteractiveCard>
  );
}
