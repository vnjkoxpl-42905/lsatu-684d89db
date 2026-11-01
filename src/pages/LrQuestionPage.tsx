import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, StickyNote, XCircle } from "lucide-react";
import OfficialQuestionPane from "@/components/drill/official/OfficialQuestionPane";
import type { InlineChoiceNotes } from "@/components/drill/official/InlineChoiceExplanation";
import { useLrExplanation } from "@/hooks/useLrExplanation";
import type { Highlight } from "@/lib/highlightUtils";
import { normalizeQuestionTextFields } from "@/lib/questionLoader";
import { lrAddressLabel, lrSectionFile, parseLrAddress } from "@/lib/lrQuestionAddress";
import { annotationStimulus, lrAnnotationFor } from "@/lib/lrQuestionAnnotations";

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
  const [annotated, setAnnotated] = React.useState(false);
  const [activeSentence, setActiveSentence] = React.useState<number | null>(null);

  React.useEffect(() => {
    setPicked("");
    setChecked(false);
    setEliminated(new Set());
    setFlagged(false);
    setAnnotated(false);
    setActiveSentence(null);
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

  const annotation = React.useMemo(() => (address ? lrAnnotationFor(address) : null), [address]);
  const showNotes = annotated && !!annotation;
  const stimulusText = annotationStimulus(load.status === "ready" ? load.question.stimulus ?? "" : "");

  // The marked sentences ride on the pane's own highlight layer, so they look and
  // wrap exactly like a student's highlights. The open one turns orange.
  const highlights = React.useMemo<Highlight[]>(() => {
    if (!showNotes || !annotation) return [];
    const marks: Highlight[] = [];
    annotation.sentences.forEach((sentence, index) => {
      const start = stimulusText.indexOf(sentence.text);
      if (start < 0) return;
      marks.push({
        id: `ann-${index}`,
        start,
        end: start + sentence.text.length,
        text: sentence.text,
        color: activeSentence === index ? "orange" : "yellow",
        section: "stimulus",
      });
    });
    return marks;
  }, [showNotes, annotation, stimulusText, activeSentence]);

  const inlineNotes = React.useMemo<InlineChoiceNotes | null>(() => {
    if (!checked && !showNotes) return null;
    const notes = checked ? lrExplanation?.styles[0]?.notesByLetter ?? {} : {};
    const choices = new Map((checked ? lrExplanation?.choices : undefined)?.map((c) => [c.letter, c]) ?? []);
    const map: InlineChoiceNotes = {};
    for (const letter of LETTERS) {
      const choice = choices.get(letter);
      const verdict = showNotes ? annotation?.verdicts[letter] : undefined;
      map[letter] = {
        tag: verdict?.tag ?? choice?.tag ?? null,
        studentPercent: choice?.studentPercent ?? null,
        note: verdict?.text ?? (notes[letter] || null),
      };
    }
    return map;
  }, [checked, showNotes, annotation, lrExplanation]);

  const onPaneClick = (event: React.MouseEvent) => {
    const mark = (event.target as HTMLElement).closest<HTMLElement>("[data-highlight-id]");
    const id = mark?.dataset.highlightId;
    if (!id?.startsWith("ann-")) return;
    const index = Number(id.slice(4));
    setActiveSentence((current) => (current === index ? null : index));
  };

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
          {(question?.questionType || (question && annotation)) && (
            <div className="order-last flex basis-full flex-wrap items-center gap-2 sm:order-none sm:basis-auto">
              {question?.questionType && (
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/15">
                  {question.questionType}
                </span>
              )}
              {question && annotation && (
                <button
                  type="button"
                  aria-pressed={annotated}
                  onClick={() => {
                    setAnnotated((value) => !value);
                    setActiveSentence(null);
                  }}
                  className={
                    annotated
                      ? "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-amber-300 px-3 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-200"
                      : "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-100 ring-1 ring-white/30 transition-colors hover:bg-white/10"
                  }
                >
                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                  {annotated ? "Session notes on" : "Show session notes"}
                </button>
              )}
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
            <div className="flex min-h-0 flex-1 flex-col [&_.hl]:cursor-pointer" onClick={onPaneClick}>
              <OfficialQuestionPane
                question={{
                  qid: `PT${address.pt}-S${address.section}-Q${address.qnum}`,
                  qnum: address.qnum,
                  stimulus: stimulusText,
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
                choiceNoteExpanders={!showNotes}
                highlights={showNotes ? highlights : NO_HIGHLIGHTS}
                highlightMode="none"
                onAnswerSelect={(key) => !checked && setPicked(key)}
                onEliminate={toggleEliminated}
                onToggleFlag={() => setFlagged((value) => !value)}
                onTextSelection={() => false}
                onHighlightClick={() => {}}
                stimulusSurfaceClassName="bg-indigo-50 lg:border-indigo-200"
                belowStimulus={
                  showNotes && annotation ? (
                    <aside aria-label="Session notes" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-slate-900">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">Notes from the session</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {annotation.sentences.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            aria-pressed={activeSentence === index}
                            onClick={() => setActiveSentence((current) => (current === index ? null : index))}
                            className={
                              activeSentence === index
                                ? "min-h-8 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white"
                                : "min-h-8 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-amber-300 hover:bg-amber-100"
                            }
                          >
                            Sentence {index + 1}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-snug" aria-live="polite">
                        {activeSentence !== null
                          ? annotation.sentences[activeSentence].note
                          : "Tap a marked sentence, or a button above, to see what it is doing."}
                      </p>
                      <p className="mt-3 text-sm leading-snug text-slate-700">{annotation.wrapUp}</p>
                      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">Lessons from this question</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {annotation.lessons.map((lesson) => (
                          <li key={lesson} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-amber-300">
                            {lesson}
                          </li>
                        ))}
                      </ul>
                    </aside>
                  ) : undefined
                }
              />
            </div>

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
