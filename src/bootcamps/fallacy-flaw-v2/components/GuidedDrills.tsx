/**
 * GuidedDrills — Practice Drills surface for the Fallacy & Famous Flaws
 * bootcamp. Replaced the legacy in-bootcamp drill UI with a single CTA
 * that routes students into the existing LR Smart Drill experience,
 * filtered to a randomly-picked Famous Flaws feature, easier-first.
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Target, Loader2 } from "lucide-react";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank, type LRQuestion } from "@/lib/questionLoader";
import type { TypeDrillConfig } from "@/types/drill";

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

export function GuidedDrills(_: {
  initialDrillId?: string;
  onClearInitialDrill?: () => void;
}) {
  const navigate = useNavigate();
  const { isLoading } = useQuestionBank();

  const matches = useMemo(() => (isLoading ? [] : getMatchedFeatures()), [isLoading]);
  const totalAvailable = matches.reduce((n, m) => n + m.questions.length, 0);
  const disabled = isLoading || matches.length === 0;

  const startFlawPractice = () => {
    if (matches.length === 0) return;
    const pick = matches[Math.floor(Math.random() * matches.length)];
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
    navigate("/drill", {
      state: {
        mode: "type-drill",
        config,
        practicingLabel: pick.feature,
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f5f2ed]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-20">
        <div className="space-y-3 mb-12">
          <h2 className="text-4xl font-serif tracking-tighter italic">Practice Drills</h2>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-[#1a1a1a]/10 bg-white rounded-sm px-8 py-16 md:px-16 md:py-20 text-center space-y-8 shadow-sm"
        >
          <div className="space-y-4">
            <h3 className="text-3xl md:text-4xl font-serif italic tracking-tighter text-[#1a1a1a]">
              Ready to start LSAT questions?
            </h3>
            <p className="text-base text-[#1a1a1a]/60 max-w-xl mx-auto leading-relaxed">
              Start with an easier Flaw question based on the Famous Flaws from this bootcamp.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={disabled}
              onClick={startFlawPractice}
              className="inline-flex items-center gap-3 px-10 py-5 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.22em] rounded-sm hover:bg-[#1a1a1a]/85 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading questions…
                </>
              ) : (
                <>
                  <Target className="h-3.5 w-3.5" />
                  Start Flaw Practice
                </>
              )}
            </button>
          </div>

          {!isLoading && totalAvailable > 0 && (
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#1a1a1a]/35 pt-4">
              Drawing from {totalAvailable} official LSAT Flaw questions
            </p>
          )}
          {!isLoading && totalAvailable === 0 && (
            <p className="text-xs text-[#1a1a1a]/40 pt-4">
              No Famous Flaws questions are tagged in the bank yet.
            </p>
          )}
        </motion.section>
      </div>
    </div>
  );
}
