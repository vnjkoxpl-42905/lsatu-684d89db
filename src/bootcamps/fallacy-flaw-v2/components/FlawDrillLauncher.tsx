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
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { isRenderableLRQuestion, questionBank, type LRQuestion } from "@/lib/questionLoader";
import type { TypeDrillConfig } from "@/types/drill";
import { toast } from "sonner";

interface Props {
  flawId: string;
  flawName: string;
  variant?: "primary" | "ghost" | "compact";
  className?: string;
}

// Bootcamp flaw ids -> canonical questionFeatures tag(s) in the LSAT U bank.
// Only flaws that have a real Famous-Flaws-tagged feature are mapped.
export const FLAW_ID_TO_FEATURES: Record<string, string[]> = {
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
        isRenderableLRQuestion(q) &&
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
  const permissions = useUserPermissions();

  const questions = React.useMemo(
    () => (isLoading ? [] : getQuestionsForFlaw(flawId)),
    [flawId, isLoading],
  );

  const drillLocked =
    !permissions.loading && !permissions.is_admin && !permissions.has_drill_access;
  const disabled = isLoading || permissions.loading || questions.length === 0;

  const handleClick = () => {
    if (permissions.loading) return;
    if (drillLocked) {
      toast.error("LSAT question drills are not enabled for your account yet.");
      return;
    }
    if (questions.length === 0) {
      toast.error("No renderable LSAT questions are available for this flaw yet.");
      return;
    }
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
    const qidsParam = encodeURIComponent(queue.join(","));
    navigate(`/drill?mode=type-drill&qids=${qidsParam}`, {
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
          : permissions.loading
          ? "Checking drill access…"
          : drillLocked
          ? "LSAT question drills are not enabled for your account yet"
          : count === 0
          ? "No LSAT bank questions tagged for this flaw yet"
          : `Apply ${flawName} to ${count} LSAT questions`
      }
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Target className="h-3 w-3" />
      )}
      {isLoading
        ? "Loading…"
        : permissions.loading
        ? "Checking…"
        : drillLocked
        ? "Drill locked"
        : count === 0
        ? "Not yet available"
        : variant === "compact"
        ? "Apply"
        : "Start LSAT Questions"}
    </button>
  );
};

export default FlawDrillLauncher;
