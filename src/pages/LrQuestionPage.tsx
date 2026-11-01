import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LrChoiceNote } from "@/components/drill/shared/LrChoiceNote";
import { normalizeQuestionTextFields, normalizeStimulusText } from "@/lib/questionLoader";
import { lrAddressLabel, lrSectionFile, parseLrAddress } from "@/lib/lrQuestionAddress";

const LETTERS = ["A", "B", "C", "D", "E"] as const;
type Letter = (typeof LETTERS)[number];

interface BankQuestion {
  questionNumber: number;
  questionType?: string;
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

/**
 * One Logical Reasoning question by address. A note links here so the student can
 * open the exact question the lesson is about. It reads only the section file that
 * holds the question, never the whole bank, and records nothing: no attempt, no
 * answer, no history.
 */
export default function LrQuestionPage() {
  const { pt, section, qnum } = useParams();
  const navigate = useNavigate();
  const address = React.useMemo(() => parseLrAddress({ pt, section, qnum }), [pt, section, qnum]);
  const [load, setLoad] = React.useState<Load>({ status: "loading" });
  const [picked, setPicked] = React.useState<Letter | null>(null);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    setPicked(null);
    setChecked(false);
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

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/classroom");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6">
      <Button variant="ghost" type="button" onClick={goBack} className="mb-5 min-h-11">
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
      </Button>

      {load.status === "loading" && <p role="status">Loading the question…</p>}
      {load.status === "failed" && (
        <p role="alert" className="text-destructive">
          The question could not be loaded. Check your connection and try again.
        </p>
      )}
      {load.status === "missing" && (
        <p role="status" className="rounded-xl border border-border bg-card p-5">
          {address ? `${lrAddressLabel(address)} is not in the question bank.` : "This question link is not valid."}
        </p>
      )}

      {load.status === "ready" && address && (
        <article className="space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logical Reasoning</p>
            <h1 className="mt-2 text-2xl font-semibold">{lrAddressLabel(address)}</h1>
            {load.question.questionType && <p className="mt-2 text-sm text-muted-foreground">{load.question.questionType}</p>}
          </header>

          <section aria-label="Question and choices" className="space-y-4 rounded-xl border border-border bg-card p-5 leading-relaxed">
            {load.question.stimulus && <p className="whitespace-pre-wrap">{normalizeStimulusText(load.question.stimulus)}</p>}
            <p className="font-medium whitespace-pre-wrap">{load.question.questionStem.replace(/\s*\n\s*/g, " ")}</p>
            <ol className="space-y-2" aria-label="Answer choices">
              {LETTERS.map((letter) => {
                const isRight = checked && load.question.correctAnswer === letter;
                const isWrongPick = checked && picked === letter && load.question.correctAnswer !== letter;
                return (
                  <li key={letter}>
                    <button
                      type="button"
                      aria-pressed={picked === letter}
                      disabled={checked}
                      onClick={() => setPicked(letter)}
                      data-correct={isRight || undefined}
                      data-wrong={isWrongPick || undefined}
                      className={[
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        picked === letter ? "border-foreground" : "border-border",
                        isRight ? "bg-emerald-500/10 border-emerald-600" : "",
                        isWrongPick ? "bg-red-500/10 border-red-600" : "",
                      ].join(" ")}
                    >
                      <span className="font-semibold">{letter}. </span>
                      {load.question.answerChoices[letter]}
                      {isRight && <span className="ml-2 font-semibold">Correct answer</span>}
                    </button>
                    {checked && <LrChoiceNote pt={address.pt} section={address.section} qnum={address.qnum} letter={letter} className="mt-2 px-1 text-sm text-muted-foreground" />}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={!picked || checked} onClick={() => setChecked(true)} className="min-h-11">
                Check answer
              </Button>
              {checked && (
                <Button type="button" variant="outline" onClick={() => { setPicked(null); setChecked(false); }} className="min-h-11">
                  Try again
                </Button>
              )}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">This page does not save your answer.</p>
        </article>
      )}
    </div>
  );
}
