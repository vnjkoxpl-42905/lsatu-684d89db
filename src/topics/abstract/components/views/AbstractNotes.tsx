import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "../../lib/utils";

// The seven module notes for the Abstract bootcamp, one component per note.
// LessonReader maps lesson ids to these. Copy follows Joshua's teaching voice:
// say what the thing is first, show it on one example, then let the student
// do it. The method itself is taught once, in BreakItDownNote (Module 3);
// every other note points back to it rather than restating it.

// ---------------------------------------------------------------- shared bits

function Panel({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "yellow" }) {
  return (
    <div
      className={cn(
        "border-4 border-brutal-ink p-6 md:p-7 my-8 brutal-shadow",
        tone === "ink" ? "bg-brutal-ink text-brutal-paper" : "bg-brutal-yellow text-brutal-ink",
      )}
    >
      <div className="text-lg md:text-xl font-bold leading-snug">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft mb-2">
      {children}
    </span>
  );
}

function AnswerChoice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border-4 border-brutal-ink p-5 md:p-6 my-4 brutal-shadow-sm">
      <Label>Answer choice</Label>
      <div className="text-lg md:text-xl font-semibold leading-snug">{children}</div>
    </div>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-3 border-2 border-brutal-ink p-4 flex gap-3 items-start",
        ok ? "bg-brutal-green/40" : "bg-brutal-red/15",
      )}
      role="status"
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
      <span className="text-base leading-relaxed">{children}</span>
    </div>
  );
}

function RightWrongCard({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "border-2 border-brutal-ink p-4 flex gap-3 items-start",
        ok ? "bg-brutal-green/30" : "bg-brutal-red/10",
      )}
    >
      <span
        className={cn(
          "shrink-0 inline-flex items-center gap-1 border-2 border-brutal-ink px-2 py-0.5 text-[11px] font-black uppercase tracking-wider",
          ok ? "bg-brutal-green" : "bg-brutal-red text-brutal-paper",
        )}
      >
        {ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <X className="w-3.5 h-3.5" aria-hidden />}
        {ok ? "Right" : "Wrong"}
      </span>
      <div className="text-base leading-relaxed">
        <span className="font-bold">{title}</span> {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Module 1

const POOL_SENTENCES = [
  "The town should keep the public pool open through September.",
  "More families now stay in town into early fall.",
  "After all, the school year now starts two weeks later than it used to.",
];

function WhichSentence() {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = 1;
  return (
    <div className="my-6">
      <Label>The argument</Label>
      <div role="list" className="space-y-2">
        {POOL_SENTENCES.map((s, i) => {
          const isPicked = picked === i;
          return (
            <div role="listitem" key={i}>
              <button
                type="button"
                onClick={() => setPicked(i)}
                aria-pressed={isPicked}
                className={cn(
                  "w-full text-left border-2 border-brutal-ink p-3 md:p-4 text-base leading-relaxed transition-colors",
                  picked === null && "bg-white hover:bg-brutal-yellow/40",
                  picked !== null && i === correct && "bg-brutal-green/50",
                  picked !== null && isPicked && i !== correct && "bg-brutal-red/20",
                  picked !== null && !isPicked && i !== correct && "bg-white",
                )}
              >
                <span className="font-black mr-2">({i + 1})</span>
                {s}
              </button>
            </div>
          );
        })}
      </div>
      <AnswerChoice>It is supported by another statement, and it supports the main conclusion.</AnswerChoice>
      <p className="font-semibold">Click the sentence this answer choice is describing.</p>
      {picked !== null &&
        (picked === correct ? (
          <Verdict ok>
            Sentence 2. Sentence 3 supports it (later school year, so families stay), and it supports sentence 1
            (families are here, so keep the pool open).
          </Verdict>
        ) : (
          <Verdict ok={false}>
            {picked === 0
              ? "Sentence 1 is the main conclusion. The choice describes something that supports the main conclusion."
              : "Sentence 3 supports another statement, but nothing supports it. The choice describes a sentence that has support of its own."}{" "}
            Try again.
          </Verdict>
        ))}
      {picked === correct && (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white border-2 border-brutal-ink p-4">
            <Label>Concrete</Label>
            <p className="m-0">More families now stay in town into early fall.</p>
          </div>
          <div className="bg-brutal-yellow/50 border-2 border-brutal-ink p-4">
            <Label>Abstract</Label>
            <p className="m-0">A claim that is supported by another statement and supports the main conclusion.</p>
          </div>
          <p className="md:col-span-2 m-0">
            Same sentence, two descriptions. The abstract one strips out the pool and the families and keeps only the
            job the sentence does in the argument.
          </p>
        </div>
      )}
    </div>
  );
}

export function WhyHardNote() {
  return (
    <div>
      <Panel>
        An abstract answer choice describes what part of an argument does, without naming what the argument is
        about.
      </Panel>
      <p>
        Role, Method and Flaw questions are full of them. The stimulus talks about a pool, a library or a
        dentist. The answer choices never do. They talk about "a premise," "a claim," "the conclusion."
      </p>

      <h3>See one</h3>
      <WhichSentence />

      <h3>Why they feel hard</h3>
      <p>
        <strong>1. Everyday words, strict meanings.</strong> On the LSAT, "explanation" means cause and
        "presuppose" means require. Read them the everyday way and you misread the choice.
      </p>
      <p>
        <strong>2. Nothing to hold onto.</strong> There is no pool in the answer choice. You have to supply the
        content yourself by going back to the stimulus.
      </p>
      <p>
        <strong>3. One word can sink it.</strong> A choice can describe the argument perfectly except for one
        word, like "proves" where the author only "suggests." That one word makes it wrong.
      </p>

      <h3>How this bootcamp fixes it</h3>
      <p>
        First the words (Module 2). Then a routine for breaking any abstract choice into plain English (Module 3)
        and matching every piece to the stimulus (Module 4). Then methods and traps (Modules 5 and 6). Module 7
        puts it all together.
      </p>
      <Panel tone="yellow">An abstract choice is a description. Your job is to find what it describes.</Panel>

      <h3>Answer Choice Traps</h3>
      <p>
        For the hardest LR and RC questions, read each answer choice carefully. Look for suspicious keywords,
        concepts and connections that seem out of place. These three types show why that habit matters.
      </p>

      <h3>Type 1. Half right, half wrong</h3>
      <p>
        A choice can be only partially correct. The first half may match, while the second half adds something
        outside the scope of the argument. Read the whole answer word by word. One correct part doesn't make
        the rest correct.
      </p>

      <h3>Type 2. Describing something that did not happen</h3>
      <p>
        Role, Method and Flaw answers describe a feature of the stimulus's argument. A choice that describes
        something the author never does can be eliminated. Read it, think about what it means, isolate any
        suspicious words and ask: <strong>does the author do this in the argument?</strong>
      </p>
      <p>
        Keep the question type in mind. Strengthen and Weaken answers can introduce information that isn't in
        the stimulus. For those questions, being new information doesn't make an answer wrong.
      </p>

      <section className="border-4 border-brutal-ink bg-brutal-yellow/30 p-5 md:p-6 my-8" aria-labelledby="abstract-trap-type-three">
        <h3 id="abstract-trap-type-three" className="mt-0">Type 3. Vague or abstract answer choices</h3>
        <p>
          The correct answer can be vaguely worded. That makes it harder to recognize what the choice is
          referring to, but vagueness alone isn't a reason to eliminate it.
        </p>
        <p>
          Extract the keywords and think about what they mean on the LSAT. A noun names a concept you need to
          find in the stimulus. A verb names something the author needs to do. An adjective or adverb needs
          to describe the argument's tone or strength correctly.
        </p>
        <p>
          Then read the choice again and match what it describes to the stimulus's structure. Go back and
          forth as often as you need. This skill gets easier with practice, but rushing past the keywords
          gives you less practice at the very thing you need to learn.
        </p>
        <p>
          Module 3 gives you the seven steps on their own page before the drill. You'll use them to slow
          down, pull out the keywords and say what each choice means.
        </p>
        <p className="mb-0 font-semibold">
          Watch for an almost perfect answer with one word that makes it wrong, sitting beside a correct
          answer that's more vaguely worded. Check the word against the stimulus. The more specific-sounding
          answer doesn't win just because it's easier to picture.
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Module 2

const STATEMENT_WORDS: { term: string; meaning: string; note?: string }[] = [
  { term: "Premise", meaning: "A reason the author gives to support a conclusion." },
  { term: "Main conclusion", meaning: "The final point the author wants you to accept." },
  {
    term: "Intermediate conclusion",
    meaning: "A claim that gets support and then gives support to the main conclusion.",
    note: "Also called a supported premise.",
  },
  { term: "Fact", meaning: "A statement about the world, taken as true.", note: "\"Water boils at 100 degrees Celsius at sea level.\"" },
  { term: "Decision", meaning: "A choice someone made or will make.", note: "\"I'm taking the train instead of the bus.\"" },
  {
    term: "Principle (general principle)",
    meaning: "A rule about what should or shouldn't be done that covers many cases.",
    note: "\"People who are tired every morning should go to bed earlier\" is a principle. \"John is tired every morning, so he should go to bed earlier\" is not. It's about one person.",
  },
  {
    term: "Generalization",
    meaning: "A broad statement about what is.",
    note: "\"All swans are white.\" A principle says what should be. A generalization says what is.",
  },
  {
    term: "Hypothesis",
    meaning: "A possible explanation: a proposed cause.",
    note: "Not just any claim. A hypothesis is a guess about why something happened.",
  },
];

const ACTION_WORDS: { term: string; meaning: string; note?: string }[] = [
  { term: "Illustrate", meaning: "Give an example.", note: "\"It illustrates a principle\" means it's an example of the principle." },
  {
    term: "Presuppose",
    meaning: "Require.",
    note: "If the argument presupposes something, the argument falls apart without it.",
  },
  { term: "Explain", meaning: "Give the cause.", note: "Not add detail. An explanation is a cause." },
  { term: "Undermine", meaning: "Weaken. Push against." },
  {
    term: "Defend",
    meaning: "Argue that a position is right.",
    note: "Saying why someone holds a view is not defending it.",
  },
];

function WordGrid({ words, accent }: { words: typeof STATEMENT_WORDS; accent: "cyan" | "pink" }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 my-6">
      {words.map((w) => (
        <div key={w.term} className="bg-white border-2 border-brutal-ink p-4 brutal-shadow-sm">
          <div
            className={cn(
              "inline-block border-2 border-brutal-ink px-2 py-0.5 mb-2 text-sm font-black",
              accent === "cyan" ? "bg-brutal-cyan" : "bg-brutal-pink",
            )}
          >
            {w.term}
          </div>
          <p className="m-0 font-semibold">{w.meaning}</p>
          {w.note && <p className="m-0 mt-2 text-brutal-ink-soft">{w.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function WordsNote() {
  return (
    <div>
      <Panel>
        These words look ordinary. On the LSAT each one has a strict meaning, and abstract answer choices are built
        out of them.
      </Panel>
      <p>
        There are thirteen. The first eight name what a statement can be. The last five name what an argument can
        do.
      </p>
      <h3>What a statement can be</h3>
      <WordGrid words={STATEMENT_WORDS} accent="cyan" />
      <h3>What an argument can do</h3>
      <WordGrid words={ACTION_WORDS} accent="pink" />
      <p>
        When one of these shows up in an answer choice, swap in the strict meaning before you go back to the
        stimulus. That swap is Step 2 of the routine in Module 3.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Module 3

const DEMO_CHOICE =
  "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence.";
const DEMO_KEYWORDS = new Set(["hypothesis", "undermine", "sufficiency", "evidence"]);
const DEMO_NEUTRAL = new Set(["calling", "into", "question", "attempts"]);

const DEMO_TRANSLATIONS = [
  { word: "hypothesis", meaning: "a possible explanation (a proposed cause)" },
  { word: "undermine", meaning: "weaken, push against" },
  { word: "sufficiency of the evidence", meaning: "whether the evidence is enough" },
];

const DEMO_REQUIREMENTS = [
  "A possible explanation: someone proposes a cause.",
  "The argument pushes against that explanation.",
  "The push is that the evidence for it is too thin.",
];

const DEMO_STIMULI: { name: string; text: string; present: boolean[]; why: string[] }[] = [
  {
    name: "Stimulus A",
    text: "Some researchers blame a new pesticide for the drop in the town's songbirds. But they tested soil from only two farms, both right next to the highway. Two samples can't carry that conclusion.",
    present: [true, true, true],
    why: [
      "The researchers propose a cause: the pesticide.",
      "\"But\" starts the push against it.",
      "Two samples from two farms is the evidence being called too thin.",
    ],
  },
  {
    name: "Stimulus B",
    text: "Some researchers blame a new pesticide for the drop in the town's songbirds. But songbirds also vanished from the next town over, which has never used the pesticide.",
    present: [true, true, false],
    why: [
      "The researchers propose a cause: the pesticide.",
      "\"But\" starts the push against it.",
      "The author never says the researchers' evidence is too thin. The push is new counter-evidence, so this piece is missing.",
    ],
  },
];

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

function clean(word: string): string {
  return word.replace(/[.,;:?!"]/g, "").toLowerCase();
}

function BreakdownDemo() {
  const tokens = useMemo(() => tokenize(DEMO_CHOICE), []);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [translated, setTranslated] = useState<Set<number>>(new Set());
  const [stimIndex, setStimIndex] = useState(0);
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  const pickedWords = Array.from(picked).map((i) => clean(tokens[i]));
  const hits = Array.from(DEMO_KEYWORDS).filter((k) => pickedWords.includes(k));
  const filler = pickedWords.filter((w) => !DEMO_KEYWORDS.has(w) && !DEMO_NEUTRAL.has(w));
  const allTranslated = translated.size === DEMO_TRANSLATIONS.length;
  const stim = DEMO_STIMULI[stimIndex];
  const stimDone = stim.present.every((_, r) => marks[`${stimIndex}-${r}`] !== undefined);
  const stimSurvives = stim.present.every((p) => p);

  return (
    <div className="border-4 border-brutal-ink bg-brutal-paper p-5 md:p-7 my-8 brutal-shadow">
      <Label>Try it</Label>

      {/* Step 1 */}
      <p className="mb-3">
        <strong>Step 1. Click the words that carry the meaning.</strong> Leave the filler alone.
      </p>
      <div className="bg-white border-2 border-brutal-ink p-4 text-lg md:text-xl leading-loose">
        {tokens.map((t, i) => {
          if (/^\s+$/.test(t)) return <span key={i}>{t}</span>;
          const w = clean(t);
          const isPicked = picked.has(i);
          const isKey = DEMO_KEYWORDS.has(w);
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              aria-pressed={isPicked}
              onClick={() =>
                setPicked((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              className={cn(
                "px-0.5 border-b-2 border-transparent transition-colors font-semibold",
                !checked && isPicked && "bg-brutal-yellow border-brutal-ink",
                !checked && !isPicked && "hover:bg-brutal-yellow/40",
                checked && isKey && "bg-brutal-green/60 border-brutal-ink",
                checked && isPicked && !isKey && !DEMO_NEUTRAL.has(w) && "bg-brutal-red/30 line-through",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      {!checked ? (
        <button
          type="button"
          disabled={picked.size === 0}
          onClick={() => setChecked(true)}
          className="brutal-btn bg-brutal-yellow mt-4 disabled:opacity-50"
        >
          Check my words
        </button>
      ) : (
        <Verdict ok={hits.length === DEMO_KEYWORDS.size && filler.length === 0}>
          {hits.length === DEMO_KEYWORDS.size
            ? "You found all four: hypothesis, undermine, sufficiency, evidence."
            : `You found ${hits.length} of 4. The keywords are hypothesis, undermine, sufficiency and evidence (highlighted green).`}{" "}
          {filler.length > 0
            ? `"${filler.join('", "')}" ${filler.length === 1 ? "is" : "are"} filler. Words like it, is, the and argument appear in almost every choice, so they can't tell choices apart.`
            : ""}
        </Verdict>
      )}

      {/* Step 2 */}
      {checked && (
        <div className="mt-8">
          <p className="mb-3">
            <strong>Step 2. Translate each keyword.</strong> Click each one to swap in its strict meaning.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {DEMO_TRANSLATIONS.map((t, i) => {
              const open = translated.has(i);
              return (
                <button
                  key={t.word}
                  type="button"
                  aria-expanded={open}
                  onClick={() => setTranslated((prev) => new Set(prev).add(i))}
                  className={cn(
                    "text-left border-2 border-brutal-ink p-4 transition-colors min-h-[96px]",
                    open ? "bg-brutal-cyan/40" : "bg-white hover:bg-brutal-cyan/20",
                  )}
                >
                  <span className="block font-black">{t.word}</span>
                  <span className="block mt-1 text-base">{open ? `= ${t.meaning}` : "Click to translate"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {allTranslated && (
        <div className="mt-8">
          <p className="mb-3">
            <strong>Step 3. Say it as one plain sentence.</strong>
          </p>
          <div className="bg-brutal-yellow border-2 border-brutal-ink p-4 text-lg font-semibold">
            The argument tries to weaken a possible explanation by saying the evidence for it isn't enough.
          </div>
        </div>
      )}

      {/* Step 4 */}
      {allTranslated && (
        <div className="mt-8">
          <p className="mb-3">
            <strong>Step 4. List what the stimulus must contain, then check it.</strong> One item per piece. For
            each item, decide whether it is there.
          </p>
          <div className="flex gap-2 mb-3" role="tablist" aria-label="Stimuli to check">
            {DEMO_STIMULI.map((s, i) => (
              <button
                key={s.name}
                type="button"
                role="tab"
                aria-selected={stimIndex === i}
                onClick={() => setStimIndex(i)}
                className={cn(
                  "border-2 border-brutal-ink px-4 py-2 text-sm font-black",
                  stimIndex === i ? "bg-brutal-ink text-brutal-paper" : "bg-white",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="bg-white border-2 border-brutal-ink p-4 mb-4 text-base leading-relaxed">{stim.text}</div>
          <div role="list" className="space-y-3">
            {DEMO_REQUIREMENTS.map((req, r) => {
              const key = `${stimIndex}-${r}`;
              const mark = marks[key];
              const answered = mark !== undefined;
              const right = answered && mark === stim.present[r];
              return (
                <div role="listitem" key={key} className="border-2 border-brutal-ink bg-white p-3">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <span className="flex-1 font-semibold">
                      {r + 1}. {req}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      {[true, false].map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          disabled={answered}
                          aria-pressed={mark === val}
                          onClick={() => setMarks((m) => ({ ...m, [key]: val }))}
                          className={cn(
                            "border-2 border-brutal-ink px-3 py-1.5 text-sm font-black min-w-[88px]",
                            mark === val ? "bg-brutal-ink text-brutal-paper" : "bg-white hover:bg-brutal-yellow/40",
                          )}
                        >
                          {val ? "It's there" : "Missing"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {answered && (
                    <Verdict ok={right}>
                      {stim.present[r] ? "It's there. " : "It's missing. "}
                      {stim.why[r]}
                    </Verdict>
                  )}
                </div>
              );
            })}
          </div>
          {stimDone && (
            <div
              className={cn(
                "mt-4 border-4 border-brutal-ink p-4 text-lg font-black",
                stimSurvives ? "bg-brutal-green" : "bg-brutal-red text-brutal-paper",
              )}
            >
              {stimSurvives
                ? "Every piece is there. For this stimulus, the answer choice stays in."
                : "One piece is missing. For this stimulus, the answer choice is out."}
            </div>
          )}
          {stimDone && stimIndex === 0 && (
            <button type="button" onClick={() => setStimIndex(1)} className="brutal-btn bg-brutal-yellow mt-4">
              Now check Stimulus B
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const DIRECTION_EXAMPLES = [
  { phrase: "infers that X on the grounds that Y", conclusion: "X", evidence: "Y", word: "on the grounds that" },
  { phrase: "achieves X by doing Y", conclusion: "X (the goal)", evidence: "Y (the method)", word: "by" },
  { phrase: "treats X as evidence for Y", conclusion: "Y", evidence: "X", word: "evidence for" },
];

export function BreakItDownNote() {
  return (
    <div>
      <Panel>
        Breaking down an abstract answer choice means turning it into one plain sentence, then listing what the
        stimulus must contain for the choice to be right.
      </Panel>
      <p>Here's an answer choice from a Role question:</p>
      <AnswerChoice>{DEMO_CHOICE}</AnswerChoice>
      <p>That's a lot of words. The idea underneath is simple, and four steps get you to it.</p>

      <h3>The four steps</h3>
      <p>
        <strong>Step 1. Pull out the keywords.</strong> Keep the words that carry meaning: nouns, verbs and
        qualifiers. Skip filler like "it is" and "the argument."
      </p>
      <p>
        <strong>Step 2. Translate each keyword.</strong> Swap in the strict LSAT meaning from Module 2.
      </p>
      <p>
        <strong>Step 3. Say it as one plain sentence.</strong>
      </p>
      <p>
        <strong>Step 4. List what the stimulus must contain.</strong> One item for each piece. If the stimulus is
        missing any one of them, the choice is wrong.
      </p>

      <BreakdownDemo />

      <h3>Which part is the conclusion?</h3>
      <p>
        Some abstract choices describe the whole argument with placeholders, like "concludes X on the basis of Y."
        Before you can match one, you need to know which letter is the conclusion and which is the evidence. The
        direction words tell you.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full border-2 border-brutal-ink bg-white text-left text-base">
          <thead className="bg-brutal-ink text-brutal-paper">
            <tr>
              <th className="p-3">Abstract phrase</th>
              <th className="p-3">Direction word</th>
              <th className="p-3">Conclusion</th>
              <th className="p-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {DIRECTION_EXAMPLES.map((row) => (
              <tr key={row.phrase} className="border-t-2 border-brutal-ink">
                <td className="p-3 font-semibold">{row.phrase}</td>
                <td className="p-3">
                  <span className="bg-brutal-yellow px-1">{row.word}</span>
                </td>
                <td className="p-3">{row.conclusion}</td>
                <td className="p-3">{row.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Words like <strong>from</strong>, <strong>by</strong>, <strong>because</strong> and{" "}
        <strong>on the basis of</strong> point back to the evidence. The order of the letters doesn't matter. The
        direction word does.
      </p>

      <h3>Now go the other way</h3>
      <p>
        The best test of whether you understand an abstract choice is to make it concrete. Write a two-sentence
        argument that fits it. If you can't, you don't understand the choice yet.
      </p>
      <AnswerChoice>
        Presumes, without providing justification, that a condition necessary for an outcome is also sufficient to
        produce that outcome.
      </AnswerChoice>
      <div className="grid md:grid-cols-2 gap-4 my-4">
        <div className="bg-brutal-yellow/50 border-2 border-brutal-ink p-4">
          <Label>Plain English</Label>
          <p className="m-0">It treats a requirement as if it were a guarantee.</p>
        </div>
        <div className="bg-white border-2 border-brutal-ink p-4">
          <Label>Concrete</Label>
          <p className="m-0">To win the lottery, you need a ticket. I bought a ticket, so I'm going to win.</p>
        </div>
      </div>
      <p>
        The drill for this module gives you 15 abstract answer choices. For each one, tap the keywords, then
        write what the choice means in plain English. After you check your meaning, you'll see the seven steps
        applied to that choice and its full breakdown.
      </p>

      <h3>What breaking it down is not</h3>
      <div className="space-y-3 my-6">
        <RightWrongCard ok={false} title="Summarizing the stimulus.">
          You're translating the answer choice, not the argument.
        </RightWrongCard>
        <RightWrongCard ok={false} title="Asking whether the choice sounds related.">
          Related isn't enough. Every piece has to be there.
        </RightWrongCard>
        <RightWrongCard ok title="Asking whether you can point to every piece in the stimulus.">
          That's the whole test.
        </RightWrongCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Module 4

const MATCH_STIMULUS =
  "Store managers claim the self-checkout machines made lines longer. But average wait times are the same as they were last year. So the managers are wrong.";

const MATCH_CHOICES: { text: string; pieces: { piece: string; quote: string | null; note: string }[] }[] = [
  {
    text: "It cites evidence to reject a claim about an effect.",
    pieces: [
      { piece: "cites evidence", quote: "average wait times are the same as they were last year", note: "The evidence." },
      { piece: "to reject", quote: "So the managers are wrong", note: "The author rejects something." },
      { piece: "a claim about an effect", quote: "the self-checkout machines made lines longer", note: "Machines (cause) made lines longer (effect)." },
    ],
  },
  {
    text: "It cites evidence to show that a claim about an effect is exaggerated.",
    pieces: [
      { piece: "cites evidence", quote: "average wait times are the same as they were last year", note: "The evidence." },
      { piece: "a claim about an effect", quote: "the self-checkout machines made lines longer", note: "Same claim as before." },
      { piece: "is exaggerated", quote: null, note: "Nothing to point to. The author says the managers are wrong, not that they overstated it." },
    ],
  },
];

export function MatchingNote() {
  const [choice, setChoice] = useState(0);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const c = MATCH_CHOICES[choice];
  return (
    <div>
      <Panel>
        Breaking a choice down gives you a list. Matching means pointing to each item on that list in the stimulus.
        If you can't point to one, the choice is wrong.
      </Panel>

      <h3>How to point</h3>
      <p>Each kind of word gets its own check.</p>
      <p>
        <strong>Nouns: is the thing there?</strong> If the choice says "a principle," find the principle. If it says
        "an objection," find the objection.
      </p>
      <p>
        <strong>Verbs: does the author actually do it?</strong> "Rejects," "supports," "concludes." Find the words
        where the author does exactly that.
      </p>
      <p>
        <strong>Qualifiers: is the strength right?</strong> "Proves" is not "suggests." "All" is not "some."
        "False" is not "not shown."
      </p>

      <h3>See it</h3>
      <div className="bg-white border-2 border-brutal-ink p-4 my-4 text-base leading-relaxed">
        <Label>Stimulus</Label>
        {MATCH_STIMULUS}
      </div>
      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Answer choices">
        {MATCH_CHOICES.map((mc, i) => (
          <button
            key={mc.text}
            type="button"
            role="tab"
            aria-selected={choice === i}
            onClick={() => setChoice(i)}
            className={cn(
              "border-2 border-brutal-ink px-4 py-2 text-sm font-black",
              choice === i ? "bg-brutal-ink text-brutal-paper" : "bg-white",
            )}
          >
            Choice {i === 0 ? "A" : "B"}
          </button>
        ))}
      </div>
      <AnswerChoice>{c.text}</AnswerChoice>
      <p className="font-semibold">Click each piece to find it in the stimulus.</p>
      <div className="space-y-3">
        {c.pieces.map((p) => {
          const key = `${choice}-${p.piece}`;
          const open = shown.has(key);
          return (
            <button
              key={key}
              type="button"
              aria-expanded={open}
              onClick={() => setShown((prev) => new Set(prev).add(key))}
              className={cn(
                "w-full text-left border-2 border-brutal-ink p-4 transition-colors",
                !open && "bg-white hover:bg-brutal-yellow/40",
                open && p.quote && "bg-brutal-green/30",
                open && !p.quote && "bg-brutal-red/15",
              )}
            >
              <span className="block font-black">"{p.piece}"</span>
              {open ? (
                <span className="block mt-1 text-base">
                  {p.quote ? (
                    <>
                      Found: <span className="bg-brutal-yellow px-1">"{p.quote}"</span>. {p.note}
                    </>
                  ) : (
                    <>
                      <span className="font-black">Not found.</span> {p.note}
                    </>
                  )}
                </span>
              ) : (
                <span className="block mt-1 text-base text-brutal-ink-soft">Click to match</span>
              )}
            </button>
          );
        })}
      </div>
      {c.pieces.every((p) => shown.has(`${choice}-${p.piece}`)) && (
        <div
          className={cn(
            "mt-4 border-4 border-brutal-ink p-4 text-lg font-black",
            c.pieces.every((p) => p.quote) ? "bg-brutal-green" : "bg-brutal-red text-brutal-paper",
          )}
        >
          {c.pieces.every((p) => p.quote)
            ? "Every piece matches. Choice A stays in."
            : "One word has nothing to match. Choice B is out, even though the rest of it is fine."}
        </div>
      )}
      <p className="mt-6">
        Do this for every choice you're seriously considering, and always for the last two you're stuck between.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Module 5

const METHOD_FAMILIES: { family: string; methods: string[] }[] = [
  {
    family: "Arguing about causes",
    methods: [
      "Offering an alternative explanation",
      "Proving one cause by ruling out the others",
      "Showing the opponent's evidence fits another explanation too",
      "Inferring a cause from a correlation",
    ],
  },
  {
    family: "Leaning on an outside source",
    methods: ["Appealing to a definition", "Appealing to an authority"],
  },
  {
    family: "Going after the other side",
    methods: [
      "Pointing out undesirable consequences of a proposal",
      "Pointing out information the opponent overlooked",
      "Attacking a premise of the opponent's argument",
      "Exposing an erroneous assumption",
      "Showing the conclusion leads to an absurd result",
      "Using a counterexample against a general claim",
      "Criticizing an inappropriate comparison",
    ],
  },
  {
    family: "Moving between rules and cases",
    methods: [
      "Deriving a general principle from specific cases",
      "Applying a generalization to a specific case",
      "Inferring that two groups share a trait because they share others",
      "Using an analogy",
    ],
  },
];

export function MethodNote() {
  return (
    <div>
      <Panel>
        A Method question asks what the author does. The right answer describes the author's move, not the topic.
      </Panel>
      <p>
        Break each choice down exactly as in Module 3. Then ask one question: <strong>did the author do this?</strong>{" "}
        Not "is this true about the topic." Did the author make this move, in this argument?
      </p>

      <h3>The seventeen moves</h3>
      <p>Almost every method answer describes one of these. They fall into four families.</p>
      <div className="grid md:grid-cols-2 gap-4 my-6">
        {METHOD_FAMILIES.map((f) => (
          <div key={f.family} className="bg-white border-2 border-brutal-ink p-4 brutal-shadow-sm">
            <p className="m-0 mb-2 font-black">{f.family}</p>
            <ul className="m-0">
              {f.methods.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p>Each one has a worked example in the Methods Library in the sidebar.</p>

      <h3>What a method answer is not</h3>
      <div className="space-y-3 my-6">
        <RightWrongCard ok={false} title="A description of the topic.">
          "The argument discusses school funding" names a subject, not a move.
        </RightWrongCard>
        <RightWrongCard ok={false} title="A move the author could have made.">
          If the author never compares two things, "uses an analogy" is wrong, however reasonable it sounds.
        </RightWrongCard>
        <RightWrongCard ok title="The move the author actually made.">
          You should be able to point to the sentences where it happens.
        </RightWrongCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Module 6

const TRAPS: { name: string; what: string; example: string }[] = [
  {
    name: "Wrong role",
    what: "Gets the job of the statement wrong.",
    example: "Calls a premise the main conclusion, or calls the author's own support a concession.",
  },
  {
    name: "Wrong method",
    what: "Describes a move the author never makes.",
    example: "Says \"offers an analogy\" when nothing is compared.",
  },
  {
    name: "Structural mismatch",
    what: "Names a logical structure the argument doesn't have.",
    example:
      "Says \"confuses necessary and sufficient\" when there is no requirement in the argument, or \"mistakes time order for cause\" when nothing depends on time.",
  },
  {
    name: "Attractive language",
    what: "Close to right, but one word is too strong or out of scope.",
    example: "\"Proves\" for \"suggests.\" \"Always\" for \"often.\" \"False\" for \"not shown.\"",
  },
];

export function TrapsNote() {
  return (
    <div>
      <Panel>
        Most wrong answers to Role, Method and Flaw questions fall into four traps. Name the trap and the answer is
        easy to throw out.
      </Panel>
      <div className="space-y-4 my-6">
        {TRAPS.map((t, i) => (
          <div key={t.name} className="bg-white border-2 border-brutal-ink p-4 brutal-shadow-sm">
            <p className="m-0 font-black">
              {i + 1}. {t.name}
            </p>
            <p className="m-0 mt-1 font-semibold">{t.what}</p>
            <p className="m-0 mt-2 text-brutal-ink-soft">{t.example}</p>
          </div>
        ))}
      </div>

      <h3>The one-word trap</h3>
      <p>
        This is attractive language at its sneakiest. The answer describes the argument almost perfectly, except
        for one word. It often sits right next to the correct answer, which tends to be worded more cautiously.
      </p>
      <div className="bg-white border-2 border-brutal-ink p-4 my-4 text-base leading-relaxed">
        <Label>Stimulus</Label>
        The coach credits the new diet for the team's faster race times. But the team also started training at
        altitude this season.
      </div>
      <div className="space-y-3 my-6">
        <RightWrongCard ok={false} title="It proves that the diet had no effect.">
          The author only points to another possible cause. "Proves" and "no effect" are far too strong.
        </RightWrongCard>
        <RightWrongCard ok title="It points to another possible cause of the faster times.">
          Cautious, and every piece matches.
        </RightWrongCard>
      </div>
      <p>
        When two answers look nearly the same, read them word by word. Find the word that's different and ask
        whether the stimulus earns it.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Module 7

export function PutTogetherNote() {
  return (
    <div>
      <Panel>Every abstract answer choice gets the same routine. No exceptions for the one you like.</Panel>
      <p>
        <strong>1. Break it down.</strong> Keywords, strict meanings, one plain sentence.
      </p>
      <p>
        <strong>2. List what the stimulus must contain.</strong> One item per piece.
      </p>
      <p>
        <strong>3. Point to each piece in the stimulus.</strong> Nouns are there, verbs happen, qualifiers have the
        right strength.
      </p>
      <p>
        <strong>4. Check the strong words.</strong> One word too strong sinks the choice.
      </p>
      <p>
        The quiz gives you ten answer choices you haven't decoded yet. The drill gives you four full Flaw
        questions. Run the routine on every choice, not just the first one that sounds right.
      </p>
    </div>
  );
}

export const NOTE_COMPONENTS: Record<string, () => JSX.Element> = {
  why_hard: WhyHardNote,
  words_to_know: WordsNote,
  deabstractifying_method: BreakItDownNote,
  art_of_matching: MatchingNote,
  master_keys: MethodNote,
  five_bucket_indicators: TrapsNote,
  abstract_15: PutTogetherNote,
};
