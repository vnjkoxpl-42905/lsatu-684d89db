/**
 * FlawDrillLauncher — routes the student into the real Smart Drill page
 * (/drill) with a queue of LSAT bank questions tagged with both
 * "Famous Flaws" and the specific flaw feature. No custom modal — uses
 * the exact same drill UI as Smart Drill / Adaptive Drill.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Target, Loader2 } from "lucide-react";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank, type LRQuestion } from "@/lib/questionLoader";
import type { TypeDrillConfig } from "@/types/drill";

interface Props {
  flawId: string;
  flawName: string;
  variant?: "primary" | "ghost" | "compact";
  className?: string;
}

// Bootcamp flaw ids → canonical questionFeatures tag(s) in the LSAT U bank.
// Only flaws that have a real Famous-Flaws-tagged feature are mapped.
const FLAW_ID_TO_FEATURES: Record<string, string[]> = {
  "necessary-vs-sufficient": ["Sufficient vs. Necessary Flaw"],
  "nec-suff": ["Sufficient vs. Necessary Flaw"],
  "causal-flaw": ["Anti-Causal", "Causal Chains"],
  causal: ["Anti-Causal", "Causal Chains"],
  "sampling-fallacy": ["Sampling"],
  "part-vs-whole": ["Part vs. Whole"],
};

function getQuestionsForFlaw(flawId: string): LRQuestion[] {
  if (!questionBank.isReady()) return [];
  const features = FLAW_ID_TO_FEATURES[flawId];
  if (!features || features.length === 0) return [];
  return questionBank
    .getAllQuestions()
    .filter(
      (q) =>
        q.qtype === "Flaw" &&
        (q.questionFeatures || []).includes("Famous Flaws") &&
        (q.questionFeatures || []).some((f) => features.includes(f)),
    )
    .sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
}

export const FlawDrillLauncher: React.FC<Props> = ({
  flawId,
  flawName,
  variant = "primary",
  className = "",
}) => {
  const navigate = useNavigate();
  const { isLoading } = useQuestionBank();

  const questions = React.useMemo(
    () => (isLoading ? [] : getQuestionsForFlaw(flawId)),
    [flawId, isLoading],
  );

  const disabled = isLoading || questions.length === 0;

  const handleClick = () => {
    if (questions.length === 0) return;
    const queue = questions.map((q) => q.qid);
    const features = FLAW_ID_TO_FEATURES[flawId] ?? [];
    const config: TypeDrillConfig = {
      qtypes: ["Flaw"],
      difficulties: [],
      pts: [],
      count: queue.length,
      selectedQids: queue,
      qfeatures: ["Famous Flaws", ...features],
    };
    navigate("/drill", {
      state: { mode: "type-drill", config, practicingLabel: flawName },
    });
  };

  const base =
    "inline-flex items-center gap-2 transition-all text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed";
  const variantCls =
    variant === "ghost"
      ? "px-3 py-2 border border-[#1a1a1a]/20 text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f2ed]"
      : variant === "compact"
      ? "px-2.5 py-1.5 border border-[#1a1a1a]/15 text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:border-[#1a1a1a]"
      : "px-5 py-3 bg-[#1a1a1a] text-[#f5f2ed] hover:bg-[#1a1a1a]/85";

  const count = questions.length;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`${base} ${variantCls} ${className}`}
      title={
        isLoading
          ? "Loading question bank…"
          : count === 0
          ? "No LSAT bank questions tagged for this flaw yet"
          : `Drill ${count} LSAT bank questions in Smart Drill`
      }
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Target className="h-3 w-3" />
      )}
      {isLoading
        ? "Loading…"
        : count === 0
        ? "Not yet available"
        : "Start Smart Drill"}
    </button>
  );
};

export default FlawDrillLauncher;
