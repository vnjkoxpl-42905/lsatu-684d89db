/**
 * LRQuestionModal — shared LR Smart Drill–styled modal for any LSAT-format
 * multiple-choice question across the app.
 *
 * Two modes:
 *   1. Bank-backed: pass { initialQid, queue } — pulls from questionBank,
 *      logs an `attempts` row on submit (mode = `attemptMode`, default
 *      "bootcamp-pf").
 *   2. Inline: pass { inline: { ...item } } — used for bootcamp content
 *      that lives outside the LSAT U bank (e.g. Capstone, Simulator).
 *      Calls `onSubmit({ key, correct })` so the host can record progress.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import OfficialQuestionPane from "@/components/drill/official/OfficialQuestionPane";
import OfficialDrillToolbar from "@/components/drill/official/OfficialDrillToolbar";
import type { HighlightMode } from "@/lib/highlightUtils";
import { useQuestionHighlights } from "@/hooks/useQuestionHighlights";
import {
  type InlineChoiceNotes,
} from "@/components/drill/official/InlineChoiceExplanation";
import { useLrExplanation } from "@/hooks/useLrExplanation";
import { questionBank, type LRQuestion } from "@/lib/questionLoader";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClassId } from "@/hooks/useClassId";
import { supabase } from "@/integrations/supabase/client";

export interface InlineQuestionInput {
  /** Stable id for this item (used in header + persistence). */
  id: string;
  /** Optional display number (defaults to 1). */
  number?: number | string;
  stimulus: string;
  questionStem: string;
  /** Map of letter → choice text. Any A..E subset works. */
  answerChoices: Record<string, string>;
  correctAnswer: string;
  /** Optional per-choice explanation for the post-submit panel. */
  explanations?: Partial<
    Record<string, { verdict?: "correct" | "incorrect"; whyCorrect?: string; whyIncorrect?: string }>
  >;
  /** Optional eyebrow shown in the header strip (e.g. "Capstone · Q3"). */
  eyebrow?: string;
}

interface CommonProps {
  onClose: () => void;
  /** Mode tag stored on the attempts row when bank-backed. */
  attemptMode?: string;
}

interface BankProps extends CommonProps {
  initialQid: string;
  queue: string[];
  inline?: undefined;
  onSubmit?: undefined;
}

interface InlineProps extends CommonProps {
  inline: InlineQuestionInput;
  initialQid?: undefined;
  queue?: undefined;
  /** Host callback for picking — fires after Submit. */
  onSubmit?: (result: { key: string; correct: boolean }) => void;
}

type Props = BankProps | InlineProps;

export default function LRQuestionModal(props: Props) {
  const isInline = !!props.inline;
  const { isLoading: qbLoading } = useQuestionBank();
  const { user } = useAuth();
  const { classId } = useClassId();

  // Bank-backed nav state
  const queue = props.queue ?? [];
  const initialQid = props.initialQid ?? "";
  const startIdx = Math.max(0, queue.indexOf(initialQid));
  const [idx, setIdx] = React.useState(startIdx);
  const qid = isInline ? props.inline!.id : queue[idx] ?? initialQid;

  const [bankQuestion, setBankQuestion] = React.useState<LRQuestion | undefined>(undefined);
  React.useEffect(() => {
    if (!isInline) setBankQuestion(questionBank.getQuestion(qid));
  }, [qid, qbLoading, isInline]);

  const inline = isInline ? props.inline! : null;

  // Normalized question for OfficialQuestionPane
  const renderQuestion = React.useMemo(() => {
    if (inline) {
      return {
        qid: inline.id,
        qnum: inline.number,
        stimulus: inline.stimulus || "",
        questionStem: inline.questionStem || "",
        answerChoices: inline.answerChoices,
      };
    }
    if (!bankQuestion) return null;
    return {
      qid: bankQuestion.qid,
      qnum: bankQuestion.qnum,
      stimulus: bankQuestion.stimulus || "",
      questionStem: bankQuestion.questionStem,
      answerChoices: bankQuestion.answerChoices,
    };
  }, [inline, bankQuestion]);

  const correctAnswer = inline?.correctAnswer ?? bankQuestion?.correctAnswer ?? "";
  const explanations = inline?.explanations ?? bankQuestion?.answerChoiceExplanations;

  const [selected, setSelected] = React.useState("");
  const [eliminated, setEliminated] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const startTsRef = React.useRef<number>(Date.now());
  // The same marker tools the drill has. A capstone question is still a
  // question the student works, and the choices are where the work is.
  const [highlightMode, setHighlightMode] = React.useState<HighlightMode>("none");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [fontScale, setFontScale] = React.useState(1);
  const questionHighlights = useQuestionHighlights();

  React.useEffect(() => {
    setSelected("");
    setEliminated(new Set());
    setSubmitted(false);
    startTsRef.current = Date.now();
  }, [qid]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // The toolbar's Aa popover claims Escape first (Radix marks the event
      // handled); Escape in the Find box clears the box, not the modal.
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest("input, textarea")) return;
      props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  const handleEliminate = (key: string) => {
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!renderQuestion || !selected || submitted) return;
    setSubmitted(true);
    const correct = selected === correctAnswer;
    const timeMs = Date.now() - startTsRef.current;

    if (inline) {
      // Inline mode: defer persistence to host.
      props.onSubmit?.({ key: selected, correct });
      return;
    }

    // Bank-backed: log attempt directly.
    const q = bankQuestion!;
    const resolvedClassId = classId || user?.id;
    if (!resolvedClassId) return;
    const { error } = await supabase.from("attempts").insert({
      user_id: user?.id,
      class_id: resolvedClassId,
      qid: q.qid,
      pt: q.pt,
      section: q.section,
      qnum: q.qnum,
      qtype: q.qtype,
      level: q.difficulty,
      correct,
      time_ms: timeMs,
      confidence: null,
      mode: props.attemptMode ?? "bootcamp-pf",
      selected_answer: selected,
      timestamp_iso: new Date().toISOString(),
    });
    if (error) {
      console.error("[LRQuestionModal] attempt insert failed", error);
      toast.error("Couldn't save your answer", {
        description: "Your attempt wasn't recorded. Check your connection and try again.",
      });
    }
  };

  const goPrev = () => !isInline && idx > 0 && setIdx(idx - 1);
  const goNext = () => !isInline && idx < queue.length - 1 && setIdx(idx + 1);

  const correct = !!renderQuestion && selected === correctAnswer;

  const headerLabel = inline
    ? inline.eyebrow || `Question ${inline.number ?? ""}`.trim()
    : bankQuestion
      ? `PT${bankQuestion.pt} · S${bankQuestion.section} · Q${bankQuestion.qnum}`
      : "Loading…";

  const headerMeta = inline
    ? null
    : bankQuestion
      ? `${bankQuestion.qtype} · L${bankQuestion.difficulty}`
      : null;

  const showQueueNav = !isInline && queue.length > 1;
  const loading = !isInline && (qbLoading || !bankQuestion);

  // Inline per-choice explanations, shared with the drill runner so the format
  // is identical everywhere. Precedence is per choice: Joshua's authored
  // bootcamp copy wins, and LSAT Lab fills only the letters that have none.
  const { data: lrExplanation } = useLrExplanation(
    {
      pt: bankQuestion?.pt,
      section: bankQuestion?.section,
      questionNumber: bankQuestion?.qnum,
    },
    submitted && !isInline,
  );

  const inlineNotes = React.useMemo<InlineChoiceNotes | null>(() => {
    if (!submitted || !renderQuestion) return null;
    const labNotes = lrExplanation?.styles[0]?.notesByLetter ?? {};
    const labChoices = new Map(lrExplanation?.choices.map((c) => [c.letter, c]) ?? []);

    const map: InlineChoiceNotes = {};
    for (const letter of Object.keys(renderQuestion.answerChoices)) {
      const authored = explanations?.[letter];
      const isCorrect = authored?.verdict === "correct" || letter === correctAnswer;
      const authoredNote = isCorrect ? authored?.whyCorrect : authored?.whyIncorrect;
      const lab = labChoices.get(letter);
      map[letter] = {
        tag: lab?.tag ?? null,
        studentPercent: lab?.studentPercent ?? null,
        note: authoredNote || labNotes[letter] || null,
      };
    }
    return map;
  }, [submitted, renderQuestion, explanations, correctAnswer, lrExplanation]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-stretch justify-center"
      >
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.99 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="w-full h-full sm:h-auto sm:my-6 sm:max-h-[94vh] sm:max-w-6xl sm:mx-auto bg-white text-black sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold text-slate-800">{headerLabel}</span>
              {headerMeta && (
                <span className="text-[11px] uppercase tracking-widest text-slate-500">
                  {headerMeta}
                </span>
              )}
              {showQueueNav && (
                <span className="text-[11px] text-slate-400">
                  {idx + 1} / {queue.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {showQueueNav && (
                <>
                  <button
                    onClick={goPrev}
                    disabled={idx === 0}
                    className="p-1.5 rounded hover:bg-slate-200 active:scale-[0.92] transition-transform duration-100 disabled:opacity-30"
                    aria-label="Previous question"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goNext}
                    disabled={idx >= queue.length - 1}
                    className="p-1.5 rounded hover:bg-slate-200 active:scale-[0.92] transition-transform duration-100 disabled:opacity-30"
                    aria-label="Next question"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={props.onClose}
                className="ml-1 p-1.5 rounded hover:bg-slate-200 active:scale-[0.92] transition-transform duration-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading || !renderQuestion ? (
              <div className="p-12 text-center text-slate-500">
                {qbLoading ? "Loading question bank…" : "This question is not in the LSAT U bank yet."}
              </div>
            ) : (
              <>
                {/* No Directions here: the dialog would open beneath this
                    modal's own layer, and a capstone item carries its own
                    framing. */}
                <OfficialDrillToolbar
                  highlightMode={highlightMode}
                  setHighlightMode={setHighlightMode}
                  timerLabel=""
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  fontScale={fontScale}
                  setFontScale={setFontScale}
                  directions={null}
                />
                <OfficialQuestionPane
                  question={renderQuestion}
                  displayNumber={Number(renderQuestion.qnum) || idx + 1}
                  selectedAnswer={selected}
                  eliminatedAnswers={eliminated}
                  isFlagged={false}
                  answerRevealed={submitted}
                  correctAnswer={correctAnswer}
                  inlineNotes={inlineNotes}
                  highlights={questionHighlights.highlightsFor(renderQuestion.qid)}
                  highlightMode={highlightMode}
                  searchTerm={searchTerm}
                  fontScale={fontScale}
                  onAnswerSelect={(k) => !submitted && setSelected(k)}
                  onEliminate={handleEliminate}
                  onToggleFlag={() => {}}
                  onTextSelection={(regions) =>
                    questionHighlights.applySelection(renderQuestion.qid, highlightMode, regions)
                  }
                  onHighlightClick={(id) => {
                    if (highlightMode === "erase") {
                      questionHighlights.removeHighlight(renderQuestion.qid, id);
                    }
                  }}
                />

                {submitted && (
                  <div className="px-6 sm:px-8 pb-8">
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg border ${
                        correct
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span className="font-semibold">
                        {correct ? "Correct" : `Incorrect — answer is ${correctAnswer}`}
                      </span>
                    </div>
                    {/* Per-choice explanations render inline under each choice
                        above, not as a separate block down here. */}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            <button
              onClick={props.onClose}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selected || !renderQuestion}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-slate-700 transition-colors active:scale-[0.97] transition-transform duration-100"
                >
                  Submit answer
                </button>
              ) : showQueueNav ? (
                <button
                  onClick={goNext}
                  disabled={idx >= queue.length - 1}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-500 transition-colors active:scale-[0.97] transition-transform duration-100 inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={props.onClose}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors active:scale-[0.97] transition-transform duration-100"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
