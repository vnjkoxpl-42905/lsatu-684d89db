import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import OfficialQuestionPane from "@/components/drill/official/OfficialQuestionPane";
import type { InlineChoiceNotes } from "@/components/drill/official/InlineChoiceExplanation";
import { useLrExplanation } from "@/hooks/useLrExplanation";
import { normalizeQuestionTextFields } from "@/lib/questionLoader";
import { lrAddressLabel, lrSectionFile, parseLrAddress } from "@/lib/lrQuestionAddress";

const LETTERS = ["A", "B", "C", "D", "E"] as const;
type Letter = (typeof LETTERS)[number];

interface BankQuestion {
  questionNumber: number;
  questionType?: string;
  questionDifficulty?: number | string;
  stimulus?: string;
  questionStem?: string;
  answerChoices?: Record<Letter, string>;
  correctAnswer?: Letter;
}

type Load =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "failed" }
  | { status: "ready"; question: BankQuestion };

const NO_HIGHLIGHTS: never[] = [];

/**
 * One Logical Reasoning question by address. A note links here so the student can
 * open the exact question the lesson is about. It shows the question in the same
 * pane the drills use, reads only the section file that holds it, and records
 * nothing: no attempt, no answer, no history.
 */
export default function LrQuestionPage() {
  const { pt, section, qnum } = useParams();
  const navigate = useNavigate();
  const address = React.useMemo(() => parseLrAddress({ pt, section, qnum }), [pt, section, qnum]);
  const [load, setLoad] = React.useState<Load>({ status: "loading" });
  const [picked, setPicked] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [eliminated, setEliminated] = React.useState<Set<string>>(() => new Set());
  const [flagged, setFlagged] = React.useState(false);

  React.useEffect(() => {
    setPicked("");
    setChecked(false);
    setEliminated(new Set());
    setFlagged(false);
    if (!address) {
      setLoad({ status: "missing" });
      return;
    }
    let active = true;
    setLoad({ status: "loading" });
    fetch(lrSectionFile(address))
      .then((response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Section file returned ${response.status}`);
        return response.json();
      })
      .then((raw) => {
        if (!active) return;
        if (!Array.isArray(raw)) {
          setLoad({ status: "missing" });
          return;
        }
        const found = normalizeQuestionTextFields(raw as BankQuestion[]).find((q) => q.questionNumber === address.qnum);
        setLoad(found && found.answerChoices && found.questionStem ? { status: "ready", question: found } : { status: "missing" });
      })
      .catch(() => {
        if (active) setLoad({ status: "failed" });
      });
    return () => {
      active = false;
    };
  }, [address]);

  const { data: lrExplanation } = useLrExplanation(
    { pt: address?.pt, section: address?.section, questionNumber: address?.qnum },
    checked,
  );

  const correctAnswer = load.status === "ready" ? load.question.correctAnswer ?? "" : "";

  const inlineNotes = React.useMemo<InlineChoiceNotes | null>(() => {
    if (!checked) return null;
    const notes = lrExplanation?.styles[0]?.notesByLetter ?? {};
    const choices = new Map(lrExplanation?.choices.map((c) => [c.letter, c]) ?? []);
    const map: InlineChoiceNotes = {};
    for (const letter of LETTERS) {
      const choice = choices.get(letter);
      map[letter] = {
        tag: choice?.tag ?? null,
        studentPercent: choice?.studentPercent ?? null,
        note: notes[letter] || null,
      };
    }
    return map;
  }, [checked, lrExplanation]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/classroom");
  };

  const toggleEliminated = (key: string) =>
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const tryAgain = () => {
    setPicked("");
    setChecked(false);
    setEliminated(new Set());
  };

  const question = load.status === "ready" ? load.question : null;
  const correct = checked && picked === correctAnswer;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-xl lg:h-[calc(100dvh-3rem)] lg:min-h-[520px]">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-900 px-4 py-3 text-white sm:px-5">
          <button
            type="button"
            onClick={goBack}
            className="-ml-1 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Logical Reasoning</p>
            <h1 className="text-sm font-bold leading-tight sm:text-lg">{address ? lrAddressLabel(address) : "Question"}</h1>
          </div>
          {question?.questionType && (
            <div className="order-last basis-full sm:order-none sm:basis-auto">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/15">
                {question.questionType}
              </span>
            </div>
          )}
        </header>

        {load.status === "loading" && (
          <p role="status" className="p-10 text-center text-slate-500">
            Loading the question…
          </p>
        )}
        {load.status === "failed" && (
          <p role="alert" className="p-10 text-center text-red-700">
            The question could not be loaded. Check your connection and try again.
          </p>
        )}
        {load.status === "missing" && (
          <p role="status" className="p-10 text-center text-slate-600">
            {address ? `${lrAddressLabel(address)} is not in the question bank.` : "This question link is not valid."}
          </p>
        )}

        {question && address && (
          <>
            <OfficialQuestionPane
              question={{
                qid: `PT${address.pt}-S${address.section}-Q${address.qnum}`,
                qnum: address.qnum,
                stimulus: question.stimulus ?? "",
                questionStem: question.questionStem ?? "",
                answerChoices: question.answerChoices ?? {},
              }}
              displayNumber={address.qnum}
              selectedAnswer={picked}
              eliminatedAnswers={eliminated}
              isFlagged={flagged}
              answerRevealed={checked}
              correctAnswer={correctAnswer}
              inlineNotes={inlineNotes}
              choiceNoteExpanders
              highlights={NO_HIGHLIGHTS}
              highlightMode="none"
              onAnswerSelect={(key) => !checked && setPicked(key)}
              onEliminate={toggleEliminated}
              onToggleFlag={() => setFlagged((value) => !value)}
              onTextSelection={() => false}
              onHighlightClick={() => {}}
            />

            <footer className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
              <p className="mr-auto text-xs text-slate-500">This page does not save your answer.</p>
              {checked && (
                <span
                  className={
                    correct
                      ? "inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"
                      : "inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700"
                  }
                >
                  {correct ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                  {correct ? "Correct" : `Incorrect, the answer is ${correctAnswer}`}
                </span>
              )}
              {checked && (
                <button
                  type="button"
                  onClick={tryAgain}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                disabled={!picked || checked}
                onClick={() => setChecked(true)}
                className="min-h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-40"
              >
                Check answer
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
