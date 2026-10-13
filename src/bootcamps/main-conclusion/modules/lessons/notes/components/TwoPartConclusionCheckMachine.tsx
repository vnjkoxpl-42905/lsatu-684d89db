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
    <InteractiveCard prominent className="bg-[oklch(0.98_0.005_60)] p-8 md:p-10 shadow-[0_32px_80px_-20px_oklch(0.2_0.01_60/0.08)] border-[oklch(0.2_0.01_60/0.04)]">
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[oklch(0.2_0.01_60/0.4)]">
            The Decision Machine
          </div>
          <h3 className="font-serif text-[32px] italic leading-tight text-[oklch(0.15_0.01_60)] tracking-tight">
            Check each claim with the same two questions
          </h3>
          <p className="text-[17px] leading-relaxed text-[oklch(0.2_0.01_60/0.64)] max-w-[54ch]">
            Pick a claim, answer both questions, and see whether it survives the filter.
          </p>
        </div>

        <div className="rounded-[20px] border border-[oklch(0.2_0.01_60/0.08)] bg-white p-6 text-[19px] leading-relaxed text-[oklch(0.15_0.01_60)] shadow-sm italic">
          "Some paleontologists suggest the Apatosaurus was able to gallop. However, this is unlikely. Experiments show the strain of galloping would have broken their legs."
        </div>

        <div className="flex flex-wrap gap-3">
          {claims.map((claim) => {
            const active = claim.id === activeClaim.id;
            return (
              <motion.button
                key={claim.id}
                whileHover={{ y: -1 }}
                whileTap={{ y: 0, scale: 0.98 }}
                type="button"
                onClick={() => setActiveClaimId(claim.id)}
                className={cn(
                  "rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ease-eased",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2",
                  active
                    ? "border-[oklch(0.15_0.01_60)] bg-[oklch(0.15_0.01_60)] text-[oklch(0.96_0.01_60)] shadow-md"
                    : "border-[oklch(0.2_0.01_60/0.1)] bg-white text-[oklch(0.2_0.01_60)] hover:border-[oklch(0.2_0.01_60/0.2)] hover:bg-[oklch(0.98_0.005_60)]",
                )}
              >
                {claim.shortLabel}
              </motion.button>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-[oklch(0.2_0.01_60/0.06)] bg-[oklch(0.98_0.005_60/0.5)] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)] mb-3">
            Current Candidate: {activeClaim.shortLabel}
          </p>
          <p className="text-[20px] leading-relaxed text-[oklch(0.15_0.01_60)] font-serif italic">
            "{activeClaim.sentence}"
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              id: "q1" as const,
              prompt: "1. Is this the author's own opinion?",
            },
            {
              id: "q2" as const,
              prompt: "2. Is this claim supported by another explicit statement?",
            },
          ].map((question) => (
            <div key={question.id} className="rounded-[18px] border border-[oklch(0.2_0.01_60/0.08)] bg-white p-6 flex flex-col justify-between gap-6 transition-all duration-300 hover:border-[oklch(0.2_0.01_60/0.15)] shadow-sm">
              <p className="text-[17px] font-medium leading-tight text-[oklch(0.15_0.01_60)]">{question.prompt}</p>
              <div className="flex gap-3" role="radiogroup" aria-label={question.prompt}>
                {(["yes", "no"] as const).map((value) => {
                  const checked = activeAnswers[question.id] === value;
                  return (
                    <motion.button
                      key={value}
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0, scale: 0.95 }}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={`${question.id === "q1" ? "Question 1" : "Question 2"} ${value}`}
                      onClick={() => setAnswer(question.id, value)}
                      className={cn(
                        "flex-1 rounded-xl border py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ease-eased",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2",
                        checked
                          ? value === "yes" 
                            ? "border-mc-success/40 bg-mc-success/5 text-mc-success shadow-[inset_0_0_0_1px_oklch(0.6_0.15_150/0.2)]" 
                            : "border-mc-error/40 bg-mc-error/5 text-mc-error shadow-[inset_0_0_0_1px_oklch(0.6_0.2_20/0.2)]"
                          : "border-[oklch(0.2_0.01_60/0.08)] bg-[oklch(0.99_0_0)] text-[oklch(0.2_0.01_60/0.4)] hover:text-[oklch(0.2_0.01_60)] hover:border-[oklch(0.2_0.01_60/0.2)]",
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

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ y: 0, scale: 0.98 }}
            type="button"
            onClick={submit}
            disabled={!activeAnswers.q1 || !activeAnswers.q2}
            className="rounded-full bg-[oklch(0.15_0.01_60)] px-8 py-3 text-[12px] font-bold uppercase tracking-[0.2em] text-[oklch(0.96_0.01_60)] transition-all duration-300 ease-eased hover:bg-[oklch(0.1_0.01_60)] shadow-lg disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
          >
            Check this claim
          </motion.button>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ y: 0, scale: 0.98 }}
            type="button"
            onClick={resetClaim}
            className="rounded-full border border-[oklch(0.2_0.01_60/0.1)] bg-white px-8 py-3 text-[12px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60)] transition-all duration-300 ease-eased hover:bg-[oklch(0.98_0.005_60)] hover:border-[oklch(0.2_0.01_60/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
          >
            Reset
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {submittedClaim && submittedAnswers ? (
            <motion.div
              key={submittedClaim.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              role="status"
              aria-live="polite"
              className={cn(
                "rounded-[20px] border p-8 flex gap-6 shadow-xl transition-all duration-500",
                activeMatches 
                  ? "border-mc-success/20 bg-mc-success/5 shadow-mc-success/5" 
                  : "border-mc-error/20 bg-mc-error/5 shadow-mc-error/5",
              )}
            >
              <div className="flex-shrink-0 pt-1">
                {activeMatches ? (
                  <div className="rounded-full bg-mc-success/20 p-2 text-mc-success">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="rounded-full bg-mc-error/20 p-2 text-mc-error">
                    <XCircle className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[20px] font-serif italic text-[oklch(0.15_0.01_60)] leading-tight">
                  {submittedClaim.successTitle}
                </p>
                <p className="text-[17px] leading-relaxed text-[oklch(0.2_0.01_60/0.76)]">
                  {activeMatches
                    ? submittedClaim.explanation
                    : `The right pattern is ${submittedClaim.correct.q1.toUpperCase()} on question 1 and ${submittedClaim.correct.q2.toUpperCase()} on question 2. ${submittedClaim.explanation}`}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </InteractiveCard>
  );
}
