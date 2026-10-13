import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { cn } from "../../lib/utils";
import {
  BREAKDOWN_ITEMS,
  BREAKDOWN_PARTS,
  type BreakdownItem,
  type BuildItem,
  type Choice,
  type DecodeItem,
  type MapItem,
} from "../../data/breakdownDrill";

// Module 3 drill runner. One item at a time, one operation at a time. A wrong
// pick shows why and the student tries again; the item only counts as correct
// if every step was right on the first try. The written example in decode
// items is a self-check, never auto-graded.

// Seeded shuffle so option order is stable for an item but not "correct first".
function seededOrder(length: number, seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function Feedback({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "mt-3 border-2 border-brutal-ink p-3 flex gap-3 items-start",
        ok ? "bg-brutal-green/40" : "bg-brutal-red/15",
      )}
    >
      <span
        className={cn(
          "shrink-0 inline-flex items-center gap-1 border-2 border-brutal-ink px-2 py-0.5 text-[11px] font-black uppercase tracking-wider",
          ok ? "bg-brutal-green" : "bg-brutal-red text-brutal-paper",
        )}
      >
        {ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <X className="w-3.5 h-3.5" aria-hidden />}
        {ok ? "Correct" : "Not quite"}
      </span>
      <span className="font-medium leading-relaxed">{children}</span>
    </div>
  );
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="font-black mb-3 mt-6 first:mt-0">
      <span className="inline-block bg-brutal-ink text-brutal-paper px-2 py-0.5 mr-2 text-xs uppercase tracking-widest">
        Step {n}
      </span>
      {children}
    </p>
  );
}

function OptionButton({
  children,
  state,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  state: "idle" | "right" | "wrong";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left border-2 border-brutal-ink p-3 md:p-4 font-medium leading-relaxed transition-colors",
        state === "idle" && "bg-white hover:bg-brutal-yellow/40 disabled:hover:bg-white",
        state === "right" && "bg-brutal-green",
        state === "wrong" && "bg-brutal-red/20 line-through decoration-2",
      )}
    >
      {children}
    </button>
  );
}

// Multiple-choice step with retry. Calls onSolved(firstTry) once the right
// option is picked.
function ChoiceStep({
  seed,
  choices,
  onSolved,
}: {
  seed: string;
  choices: Choice[];
  onSolved: (firstTry: boolean) => void;
}) {
  const order = useMemo(() => seededOrder(choices.length, seed), [choices.length, seed]);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  const pick = (i: number) => {
    if (solved) return;
    setLast(i);
    if (choices[i].correct) {
      setSolved(true);
      onSolved(wrongPicks.length === 0);
    } else if (!wrongPicks.includes(i)) {
      setWrongPicks((w) => [...w, i]);
    }
  };

  return (
    <div>
      <div className="space-y-2">
        {order.map((i) => (
          <OptionButton
            key={i}
            onClick={() => pick(i)}
            disabled={solved || wrongPicks.includes(i)}
            state={solved && choices[i].correct ? "right" : wrongPicks.includes(i) ? "wrong" : "idle"}
          >
            {choices[i].text}
          </OptionButton>
        ))}
      </div>
      {last !== null && <Feedback ok={choices[last].correct}>{choices[last].why}</Feedback>}
    </div>
  );
}

// ---------------------------------------------------------------- map

function MapRunner({ item, onComplete }: { item: MapItem; onComplete: (correct: boolean) => void }) {
  const [directionWrong, setDirectionWrong] = useState<number[]>([]);
  const [directionDone, setDirectionDone] = useState(false);
  const [lastPiece, setLastPiece] = useState<number | null>(null);
  const [letterWrong, setLetterWrong] = useState<string[]>([]);
  const [letterDone, setLetterDone] = useState(false);
  const [lastLetter, setLastLetter] = useState<string | null>(null);

  const isLetter = (p: string) => /^[XYZ],?$/.test(p.trim());

  const pickPiece = (i: number) => {
    if (directionDone) return;
    setLastPiece(i);
    if (i === item.directionIndex) setDirectionDone(true);
    else if (!directionWrong.includes(i)) setDirectionWrong((w) => [...w, i]);
  };

  const pickLetter = (l: "X" | "Y") => {
    if (letterDone) return;
    setLastLetter(l);
    if (l === item.conclusion) {
      setLetterDone(true);
      onComplete(directionWrong.length === 0 && letterWrong.length === 0);
    } else if (!letterWrong.includes(l)) {
      setLetterWrong((w) => [...w, l]);
    }
  };

  return (
    <div>
      <StepLabel n={1}>Tap the direction words.</StepLabel>
      <div className="flex flex-wrap gap-2 items-center bg-white border-2 border-brutal-ink p-4">
        {item.pieces.map((p, i) => {
          const right = directionDone && i === item.directionIndex;
          const wrong = directionWrong.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pickPiece(i)}
              disabled={directionDone || wrong}
              className={cn(
                "border-2 px-3 py-2 text-lg font-bold transition-colors",
                isLetter(p) ? "border-brutal-ink bg-brutal-cyan/40 min-w-[48px]" : "border-brutal-ink bg-white",
                !directionDone && !wrong && "hover:bg-brutal-yellow/50",
                right && "bg-brutal-green",
                wrong && "bg-brutal-red/20 line-through",
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
      {lastPiece !== null &&
        (lastPiece === item.directionIndex ? (
          <Feedback ok>{item.directionWhy}</Feedback>
        ) : (
          <Feedback ok={false}>
            {isLetter(item.pieces[lastPiece])
              ? "X and Y are placeholders. Look for the words that link them."
              : "That word names what the argument does. Look for the words that say which side supports which."}
          </Feedback>
        ))}

      {directionDone && (
        <>
          <StepLabel n={2}>Which letter is the conclusion?</StepLabel>
          <div className="flex gap-3">
            {(["X", "Y"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => pickLetter(l)}
                disabled={letterDone || letterWrong.includes(l)}
                className={cn(
                  "border-4 border-brutal-ink w-20 h-16 text-2xl font-black transition-colors",
                  letterDone && l === item.conclusion && "bg-brutal-green",
                  letterWrong.includes(l) && "bg-brutal-red/20 opacity-50",
                  !letterDone && !letterWrong.includes(l) && "bg-white hover:bg-brutal-yellow/50",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {lastLetter !== null &&
            (lastLetter === item.conclusion ? (
              <Feedback ok>{item.conclusionWhy}</Feedback>
            ) : (
              <Feedback ok={false}>
                {lastLetter} sits on the evidence side of "{item.pieces[item.directionIndex]}." Try the other letter.
              </Feedback>
            ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- decode

function DecodeRunner({ item, onComplete }: { item: DecodeItem; onComplete: (correct: boolean) => void }) {
  const [step, setStep] = useState(1);
  const firstTry = useRef(true);
  const [written, setWritten] = useState("");
  const [compared, setCompared] = useState(false);
  const [selfCheck, setSelfCheck] = useState<boolean | null>(null);

  return (
    <div>
      <div className="bg-white border-4 border-brutal-ink p-4 md:p-5 mb-2">
        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft mb-1">
          Answer choice
        </span>
        <p className="text-lg md:text-xl font-semibold leading-snug m-0">{item.answerChoice}</p>
      </div>

      <StepLabel n={1}>Which plain-English version is right?</StepLabel>
      <ChoiceStep
        seed={`${item.id}-t`}
        choices={item.translations}
        onSolved={(ok) => {
          if (!ok) firstTry.current = false;
          setStep(2);
        }}
      />

      {step >= 2 && (
        <>
          <StepLabel n={2}>Which argument does the answer choice describe?</StepLabel>
          <ChoiceStep
            seed={`${item.id}-a`}
            choices={item.arguments}
            onSolved={(ok) => {
              if (!ok) firstTry.current = false;
              setStep(3);
            }}
          />
        </>
      )}

      {step >= 3 && (
        <>
          <StepLabel n={3}>Make it concrete. {item.writePrompt}</StepLabel>
          <textarea
            value={written}
            onChange={(e) => {
              setWritten(e.target.value);
              setSelfCheck(null);
            }}
            placeholder="Write your own two-sentence argument here."
            className="w-full min-h-[96px] border-2 border-brutal-ink p-3 font-medium bg-white"
            aria-label="Your own example"
          />
          {!compared ? (
            <button
              type="button"
              disabled={written.trim().length < 20}
              onClick={() => setCompared(true)}
              className="brutal-btn bg-brutal-yellow mt-3 disabled:opacity-50"
            >
              Compare with a model
            </button>
          ) : (
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="bg-brutal-yellow/40 border-2 border-brutal-ink p-4">
                <span className="block text-[11px] font-black uppercase tracking-[0.18em] mb-2">A model answer</span>
                <p className="m-0 font-medium">{item.modelExample}</p>
              </div>
              <div className="bg-white border-2 border-brutal-ink p-4">
                <span className="block text-[11px] font-black uppercase tracking-[0.18em] mb-2">
                  Self-check: does yours have all of these?
                </span>
                <ul className="list-disc pl-5 m-0 space-y-1">
                  {item.modelCheck.map((c) => (
                    <li key={c} className="font-medium">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {compared && selfCheck === null && (
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setSelfCheck(true);
                  onComplete(firstTry.current);
                }}
                className="brutal-btn bg-brutal-green"
              >
                Yes, mine has all of them
              </button>
              <button
                type="button"
                onClick={() => setSelfCheck(false)}
                className="brutal-btn bg-white"
              >
                Not yet. Let me revise it.
              </button>
            </div>
          )}
          {selfCheck === false && (
            <p className="mt-3 font-medium">
              Edit your argument above until it has every piece on the list, then confirm.
              <button
                type="button"
                onClick={() => {
                  setSelfCheck(true);
                  onComplete(firstTry.current);
                }}
                className="brutal-btn bg-brutal-green ml-3"
              >
                Done revising
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- build

function BuildRunner({ item, onComplete }: { item: BuildItem; onComplete: (correct: boolean) => void }) {
  const orders = useMemo(
    () => item.slots.map((s, i) => seededOrder(s.options.length, `${item.id}-${i}`)),
    [item],
  );
  const [chosen, setChosen] = useState<(number | null)[]>(item.slots.map(() => null));
  const [checked, setChecked] = useState(false);
  const [everWrong, setEverWrong] = useState(false);
  const [done, setDone] = useState(false);

  const allChosen = chosen.every((c) => c !== null);
  const allRight = chosen.every((c, i) => c === item.slots[i].correct);

  const check = () => {
    setChecked(true);
    if (allRight) {
      setDone(true);
      onComplete(!everWrong);
    } else {
      setEverWrong(true);
    }
  };

  return (
    <div>
      <ol className="list-none p-0 m-0 space-y-2 mb-4">
        {item.sentences.map((s, i) => (
          <li
            key={i}
            className={cn(
              "border-2 border-brutal-ink p-3 font-medium leading-relaxed",
              item.focus === i ? "bg-brutal-yellow" : "bg-white",
            )}
          >
            <span className="font-black mr-2">({i + 1})</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="font-black">{item.prompt}</p>

      <div className="space-y-5 mt-4">
        {item.slots.map((slot, si) => {
          const picked = chosen[si];
          const slotRight = picked === slot.correct;
          return (
            <div key={si}>
              <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft mb-2">
                Blank {si + 1}
              </span>
              <div className="grid gap-2">
                {orders[si].map((oi) => (
                  <OptionButton
                    key={oi}
                    disabled={done}
                    onClick={() => {
                      setChosen((c) => c.map((v, k) => (k === si ? oi : v)));
                      setChecked(false);
                    }}
                    state={
                      picked === oi
                        ? checked
                          ? slotRight
                            ? "right"
                            : "wrong"
                          : "idle"
                        : "idle"
                    }
                  >
                    <span className={cn(picked === oi && !checked && "font-black")}>
                      {picked === oi && !checked ? "▸ " : ""}
                      {slot.options[oi]}
                    </span>
                  </OptionButton>
                ))}
              </div>
              {checked && picked !== null && (
                <Feedback ok={slotRight}>
                  {slotRight ? slot.why : `Not this one. ${slot.why}`}
                </Feedback>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white border-4 border-brutal-ink p-4 mt-6">
        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft mb-1">
          Your answer choice
        </span>
        <p className="m-0 text-lg font-semibold leading-snug">
          {item.template.map((t, i) => (
            <span key={i}>
              {t}
              {i < item.slots.length &&
                (chosen[i] !== null ? (
                  <span className="bg-brutal-yellow px-1">{item.slots[i].options[chosen[i] as number]}</span>
                ) : (
                  <span className="inline-block min-w-[80px] border-b-2 border-brutal-ink">&nbsp;</span>
                ))}
            </span>
          ))}
        </p>
      </div>

      {!done && (
        <button
          type="button"
          disabled={!allChosen}
          onClick={check}
          className="brutal-btn bg-brutal-yellow mt-4 disabled:opacity-50"
        >
          {checked && !allRight ? "Check again" : "Check"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- runner

export default function BreakdownDrill({ onDone }: { onDone: () => void }) {
  const { markDrillComplete, markModuleDrillComplete, addXp } = useApp();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  const item: BreakdownItem = BREAKDOWN_ITEMS[index];
  const part = BREAKDOWN_PARTS.find((p) => p.kind === item.kind)!;
  const firstOfPart = index === 0 || BREAKDOWN_ITEMS[index - 1].kind !== item.kind;
  const answered = results[item.id] !== undefined;
  const answeredCount = Object.keys(results).length;
  const pct = Math.round((answeredCount / BREAKDOWN_ITEMS.length) * 100);

  const complete = (correct: boolean) => {
    if (answered) return;
    setResults((r) => ({ ...r, [item.id]: correct }));
    if (correct) addXp(5);
    void markDrillComplete(item.id, "translation", correct, -1, undefined, undefined, Date.now() - startedAt.current);
  };

  const next = async () => {
    if (index + 1 >= BREAKDOWN_ITEMS.length) {
      await markModuleDrillComplete("m3");
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (finished) {
    const firstTry = Object.values(results).filter(Boolean).length;
    return (
      <div className="text-center bg-brutal-paper border-4 border-brutal-ink p-8 brutal-shadow">
        <h2 className="text-3xl font-black mb-3">Drill complete</h2>
        <p className="text-lg font-medium mb-6">
          {firstTry} of {BREAKDOWN_ITEMS.length} right on the first try.
        </p>
        <button type="button" onClick={onDone} className="brutal-btn bg-brutal-green inline-flex items-center gap-2">
          Finish module <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-black uppercase tracking-widest text-brutal-ink-soft">
            Item {index + 1} of {BREAKDOWN_ITEMS.length} · {part.title}
          </p>
          <p className="text-[11px] font-black uppercase tracking-widest">{pct}% done</p>
        </div>
        <div
          className="h-2.5 bg-brutal-ink-trace border-2 border-brutal-ink"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Drill progress"
        >
          <div className="h-full bg-brutal-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="bg-brutal-paper border-4 border-brutal-ink p-5 md:p-7 brutal-shadow">
        {firstOfPart && (
          <div className="mb-6 border-b-2 border-brutal-ink pb-4">
            <h3 className="text-xl font-black m-0">{part.title}</h3>
            <p className="m-0 mt-1 font-medium text-brutal-ink-soft">{part.instruction}</p>
          </div>
        )}
        {item.kind === "map" && <MapRunner key={item.id} item={item} onComplete={complete} />}
        {item.kind === "decode" && <DecodeRunner key={item.id} item={item} onComplete={complete} />}
        {item.kind === "build" && <BuildRunner key={item.id} item={item} onComplete={complete} />}

        {answered && (
          <div className="mt-6 pt-4 border-t-2 border-brutal-ink flex items-center justify-between gap-3 flex-wrap">
            <p className="m-0 font-black">
              {results[item.id] ? "Right on the first try." : "Done. This one took a second look."}
            </p>
            <button type="button" onClick={next} className="brutal-btn bg-brutal-yellow inline-flex items-center gap-2">
              {index + 1 >= BREAKDOWN_ITEMS.length ? "See results" : "Next item"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
