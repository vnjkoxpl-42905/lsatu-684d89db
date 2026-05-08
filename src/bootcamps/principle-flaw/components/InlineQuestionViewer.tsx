import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import OfficialQuestionPane from "@/components/drill/official/OfficialQuestionPane";
import { questionBank, type LRQuestion } from "@/lib/questionLoader";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClassId } from "@/hooks/useClassId";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  initialQid: string;
  queue: string[]; // ordered list of qids in the same set
  onClose: () => void;
}

export default function InlineQuestionViewer({ initialQid, queue, onClose }: Props) {
  const { isLoading: qbLoading } = useQuestionBank();
  const { user } = useAuth();
  const { classId } = useClassId();

  const startIdx = Math.max(0, queue.indexOf(initialQid));
  const [idx, setIdx] = React.useState(startIdx);
  const qid = queue[idx] ?? initialQid;

  const [question, setQuestion] = React.useState<LRQuestion | undefined>(undefined);
  const [selected, setSelected] = React.useState<string>("");
  const [eliminated, setEliminated] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [showExplain, setShowExplain] = React.useState(false);
  const startTsRef = React.useRef<number>(Date.now());

  // Resolve current question (reactive to bank-load completion)
  React.useEffect(() => {
    setQuestion(questionBank.getQuestion(qid));
  }, [qid, qbLoading]);

  // Reset state when question changes
  React.useEffect(() => {
    setSelected("");
    setEliminated(new Set());
    setSubmitted(false);
    setShowExplain(false);
    startTsRef.current = Date.now();
  }, [qid]);

  // ESC to close
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleEliminate = (key: string) => {
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!question || !selected || submitted) return;
    setSubmitted(true);
    setShowExplain(true);
    const correct = selected === question.correctAnswer;
    const timeMs = Date.now() - startTsRef.current;
    const resolvedClassId = classId || user?.id;
    if (!resolvedClassId) return;
    const { error } = await supabase.from("attempts").insert({
      user_id: user?.id,
      class_id: resolvedClassId,
      qid: question.qid,
      pt: question.pt,
      section: question.section,
      qnum: question.qnum,
      qtype: question.qtype,
      level: question.difficulty,
      correct,
      time_ms: timeMs,
      confidence: null,
      mode: "bootcamp-pf",
      selected_answer: selected,
      timestamp_iso: new Date().toISOString(),
    });
    if (error) {
      console.error("[pf:inline-viewer] attempt insert failed", error);
      toast.error("Couldn't save your answer", {
        description: "Your attempt wasn't recorded. Check your connection and try again.",
      });
    }
  };

  const goPrev = () => idx > 0 && setIdx(idx - 1);
  const goNext = () => idx < queue.length - 1 && setIdx(idx + 1);

  const correct = !!question && selected === question.correctAnswer;

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
              <span className="font-bold text-slate-800">
                {question ? `PT${question.pt} · S${question.section} · Q${question.qnum}` : "Loading…"}
              </span>
              {question && (
                <span className="text-[11px] uppercase tracking-widest text-slate-500">
                  {question.qtype} · L{question.difficulty}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {idx + 1} / {queue.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
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
              <button
                onClick={onClose}
                className="ml-1 p-1.5 rounded hover:bg-slate-200 active:scale-[0.92] transition-transform duration-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {qbLoading || !question ? (
              <div className="p-12 text-center text-slate-500">
                {qbLoading ? "Loading question bank…" : "This question is not in the LSAT U bank yet."}
              </div>
            ) : (
              <>
                <OfficialQuestionPane
                  question={{
                    qid: question.qid,
                    qnum: question.qnum,
                    stimulus: question.stimulus || "",
                    questionStem: question.questionStem,
                    answerChoices: question.answerChoices,
                  }}
                  displayNumber={question.qnum || idx + 1}
                  selectedAnswer={selected}
                  eliminatedAnswers={eliminated}
                  isFlagged={false}
                  highlights={[]}
                  highlightMode="none"
                  onAnswerSelect={(k) => !submitted && setSelected(k)}
                  onEliminate={handleEliminate}
                  onToggleFlag={() => {}}
                  onTextSelection={() => {}}
                  onHighlightClick={() => {}}
                />

                {/* Result + explanation */}
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
                        {correct ? "Correct" : `Incorrect — answer is ${question.correctAnswer}`}
                      </span>
                    </div>

                    {showExplain && question.answerChoiceExplanations && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <BookOpen className="w-4 h-4" /> Explanations
                        </div>
                        {(["A", "B", "C", "D", "E"] as const).map((k) => {
                          const exp = question.answerChoiceExplanations?.[k];
                          if (!exp) return null;
                          const isCorrect = exp.verdict === "correct";
                          return (
                            <div
                              key={k}
                              className={`p-3 rounded-lg border text-sm ${
                                isCorrect
                                  ? "bg-emerald-50/50 border-emerald-200"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <span className="font-bold mr-2">{k}.</span>
                              <span className="text-slate-700">
                                {isCorrect ? exp.whyCorrect : exp.whyIncorrect}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selected || !question}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-slate-700 transition-colors active:scale-[0.97] transition-transform duration-100"
                >
                  Submit answer
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={idx >= queue.length - 1}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-500 transition-colors active:scale-[0.97] transition-transform duration-100 inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
