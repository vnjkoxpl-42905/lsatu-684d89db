/**
 * GuidedDrills — Practice Drills surface for the Fallacy & Famous Flaws
 * bootcamp. Replaced the legacy in-bootcamp drill UI with a single CTA
 * that routes students into the existing LR Smart Drill experience,
 * filtered to a randomly-picked Famous Flaws feature, easier-first.
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Target } from "lucide-react";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { isRenderableLRQuestion, questionBank, type LRQuestion } from "@/lib/questionLoader";
import type { TypeDrillConfig } from "@/types/drill";
import { DRILLS } from "../data/drills";
import { FLAW_ID_TO_FEATURES } from "./FlawDrillLauncher";
import { toast } from "sonner";

// Specific flaw-feature tags that co-occur with "Famous Flaws" in the
// LSAT U bank. Source of truth for routing into Smart Drill. We never
// keyword-match — we filter strictly on these tags.
const FAMOUS_FLAW_FEATURES: string[] = [
  "Sufficient vs. Necessary Flaw",
  "Sampling",
  "Part vs. Whole",
  "Anti-Causal",
  "Causal Chains",
  "Assumes Similarity",
  "Assumes Difference",
];

interface MatchedFeature {
  feature: string;
  questions: LRQuestion[];
}

function getMatchedFeatures(): MatchedFeature[] {
  if (!questionBank.isReady()) return [];
  const all = questionBank.getAllQuestions();
  const out: MatchedFeature[] = [];
  for (const feature of FAMOUS_FLAW_FEATURES) {
    const qs = all.filter(
      (q) =>
        q.qtype === "Flaw" &&
        isRenderableLRQuestion(q) &&
        (q.questionFeatures || []).includes("Famous Flaws") &&
        (q.questionFeatures || []).includes(feature),
    );
    if (qs.length > 0) {
      // Easier-first ordering.
      qs.sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
      out.push({ feature, questions: qs });
    }
  }
  return out;
}

export function GuidedDrills({
  initialDrillId,
  onClearInitialDrill,
}: {
  initialDrillId?: string;
  onClearInitialDrill?: () => void;
}) {
  const navigate = useNavigate();
  const { isLoading } = useQuestionBank();
  const permissions = useUserPermissions();

  const matches = useMemo(() => (isLoading ? [] : getMatchedFeatures()), [isLoading]);
  const selectedDrill = useMemo(
    () => DRILLS.find((drill) => drill.id === initialDrillId),
    [initialDrillId],
  );
  const targetedFeatures = selectedDrill ? FLAW_ID_TO_FEATURES[selectedDrill.id] ?? [] : [];
  const targetedMatches = targetedFeatures.length > 0
    ? matches.filter((match) => targetedFeatures.includes(match.feature))
    : [];
  const activeMatches = targetedMatches.length > 0 ? targetedMatches : matches;
  const totalAvailable = matches.reduce((n, m) => n + m.questions.length, 0);
  const activeAvailable = activeMatches.reduce((n, m) => n + m.questions.length, 0);
  const drillLocked =
    !permissions.loading && !permissions.is_admin && !permissions.has_drill_access;
  const disabled = isLoading || permissions.loading || drillLocked || activeMatches.length === 0;
  const focusLabel = selectedDrill?.name ?? "Famous Flaws";

  const startFlawPractice = () => {
    if (permissions.loading) return;
    if (drillLocked) {
      toast.error("LSAT question drills are not enabled for your account yet.");
      return;
    }
    if (activeMatches.length === 0) {
      toast.error("No renderable LSAT questions are available for this flaw yet.");
      return;
    }
    const pick = activeMatches[Math.floor(Math.random() * activeMatches.length)];
    // Already sorted easier-first.
    const queue = pick.questions.map((q) => q.qid);
    const config: TypeDrillConfig = {
      qtypes: ["Flaw"],
      difficulties: [],
      pts: [],
      count: queue.length,
      selectedQids: queue,
      qfeatures: ["Famous Flaws", pick.feature],
    };
    const qidsParam = encodeURIComponent(queue.join(","));
    navigate(`/drill?mode=type-drill&qids=${qidsParam}`, {
      state: {
        mode: "type-drill",
        config,
        practicingLabel: pick.feature,
      },
    });
    onClearInitialDrill?.();
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f5f2ed]">
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-20">
        <div className="space-y-3 mb-10">
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[#1a1a1a]/45">
            Fallacy lesson to LSAT application
          </p>
          <h2 className="text-4xl md:text-5xl font-serif tracking-tighter italic text-[#1a1a1a]">
            {focusLabel}
          </h2>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-[#1a1a1a]/10 bg-white rounded-sm px-6 py-10 md:px-12 md:py-12 shadow-sm"
        >
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-5">
              <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-[#1a1a1a]/40">
                Guided LSAT question flow
              </p>
              <h3 className="text-3xl md:text-4xl font-serif italic tracking-tighter text-[#1a1a1a]">
                Ready to start LSAT questions
              </h3>
              <p className="text-base text-[#1a1a1a]/65 max-w-xl leading-relaxed">
                Take the fallacy pattern you just studied and apply it to real Flaw questions from the LSAT U bank. Start easier-first, then use the normal drill tools to read, choose, and review.
              </p>
            </div>

            <div className="border border-[#1a1a1a]/10 bg-[#f5f2ed] rounded-sm p-5 space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-[#1a1a1a]/35">
                  Focus
                </p>
                <p className="mt-1 font-serif italic text-2xl leading-tight text-[#1a1a1a]">
                  {focusLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#1a1a1a]/45">
                <span>Lesson</span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span>LSAT questions</span>
              </div>
              <p className="text-xs leading-relaxed text-[#1a1a1a]/55">
                {activeAvailable > 0
                  ? `${activeAvailable} matched questions are ready for this start flow.`
                  : drillLocked
                  ? "LSAT question drills are not enabled for your account yet."
                  : "Matched questions will appear here once the question bank finishes loading."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-[#1a1a1a]/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#1a1a1a]/50 max-w-lg leading-relaxed">
              This keeps you inside the LSAT U drill system while narrowing the first application set to the fallacy work from this bootcamp.
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={startFlawPractice}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm hover:bg-[#1a1a1a]/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading questions...
                </>
              ) : permissions.loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking access...
                </>
              ) : drillLocked ? (
                "Drill Access Locked"
              ) : (
                <>
                  <Target className="h-3.5 w-3.5" />
                  Start LSAT Questions
                </>
              )}
            </button>
          </div>

          {!isLoading && totalAvailable === 0 && (
            <p className="mt-6 text-xs text-[#1a1a1a]/40">
              No Famous Flaws questions are tagged in the bank yet.
            </p>
          )}
          {!isLoading && totalAvailable > 0 && activeAvailable === 0 && (
            <p className="mt-6 text-xs text-[#1a1a1a]/40">
              No LSAT bank questions are tagged for this exact fallacy yet, so choose another fallacy from the catalog.
            </p>
          )}
          {drillLocked && (
            <p className="mt-6 text-xs text-[#1a1a1a]/50">
              You can view this bootcamp, but LSAT question drills need to be enabled for your account before this handoff can open.
            </p>
          )}
        </motion.section>
      </div>
    </div>
  );
}
