/**
 * FlawDrillLauncher — routes the student into the real Smart Drill page
 * (/drill) with a queue of LSAT bank questions tagged "Famous Flaws"
 * and matched to the selected flaw. No custom modal — uses the exact
 * same drill UI as Smart Drill / Adaptive Drill.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Target, Loader2 } from "lucide-react";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import type { TypeDrillConfig } from "@/types/drill";
import { toast } from "sonner";
import {
  getFeaturesForFlaw,
  getQuestionsForFlaw,
} from "../lib/flawQuestionMapping";

interface Props {
  flawId: string;
  flawName: string;
  variant?: "primary" | "ghost" | "compact";
  className?: string;
}

// Below this many tagged bank questions, a flaw does not have a robust drill
// queue. We present it as lesson-only rather than launching a 1-3 question
// "drill" that misrepresents the inventory.
export const MIN_DRILL_QUESTIONS = 4;

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

  const lessonOnly = questions.length > 0 && questions.length < MIN_DRILL_QUESTIONS;
  const drillLocked =
    !permissions.loading && !permissions.is_admin && !permissions.has_drill_access;
  const disabled =
    isLoading || permissions.loading || questions.length === 0 || lessonOnly;

  const handleClick = () => {
    if (permissions.loading) return;
    if (drillLocked) {
      toast.error("LSAT question drills are not enabled for your account yet.");
      return;
    }
    if (lessonOnly) {
      toast.info("This flaw is lesson-only for now. Study the flaw card; a full drill queue is coming as more questions are tagged.");
      return;
    }
    if (questions.length === 0) {
      toast.error("No renderable LSAT questions are available for this flaw yet.");
      return;
    }
    const queue = questions.map((q) => q.qid);
    const features = getFeaturesForFlaw(flawId);
    const config: TypeDrillConfig = {
      qtypes: ["Flaw"],
      difficulties: [],
      pts: [],
      count: queue.length,
      selectedQids: queue,
      qfeatures: ["Famous Flaws", ...features],
    };
    const qidsParam = encodeURIComponent(queue.join(","));
    const contextParams = `&origin=fallacy-flaw&returnTo=${encodeURIComponent("/bootcamp/fallacy-flaw")}&label=${encodeURIComponent("Flaw Bootcamp")}&focus=${encodeURIComponent(flawName)}`;
    navigate(`/drill?mode=type-drill&qids=${qidsParam}${contextParams}`, {
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
          : lessonOnly
          ? `Lesson only for now (${count} tagged question${count === 1 ? '' : 's'})`
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
        : lessonOnly
        ? "Lesson only"
        : variant === "compact"
        ? "Apply"
        : "Start LSAT Questions"}
    </button>
  );
};

export default FlawDrillLauncher;
