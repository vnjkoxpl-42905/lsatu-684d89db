import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { ROLE_CHOICE_INTRO_HTML } from "../../data/answerChoiceDrill";
import { RoleChoiceGuide, RoleChoicePracticeInstructions } from "./RoleChoiceLecture";
import { RequirementMatchingLesson, ReasoningMoveLesson, PreciseDescriptionLesson, CompleteProcedureLesson } from "./AdvancedChoiceLessons";

// The seven module notes for the Abstract bootcamp, one component per note.
// LessonReader maps lesson ids to these. Copy follows Joshua's teaching voice:
// say what the thing is first, show it on one example, then let the student
// do it. Modules 1 and 3 render the supplied Role introduction verbatim.

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

const ANSWER_CHOICE_TRAPS_HTML = "<h1>Answer Choice Traps</h1>\n\n<section class=\"section\">\n  <div class=\"section-number\">Answer Choice Type 1</div>\n  <h2>Half right half wrong answers</h2>\n\n  <p><strong>An essential habit to have for the hardest LR questions (and RC questions) is to carefully parse the answer choices, looking for suspicious keywords or concepts and connections that seem out of place.</strong></p>\n\n  <p>The test makers love to offer us an answer choice that is only partially correct. The first half of the answer may be correct, but the second half will contain out of scope information, for instance. So it’s crucial to review each answer word by word, looking for red flags.</p>\n</section>\n\n<section class=\"section\">\n  <div class=\"section-number\">Answer Choice Type 2</div>\n  <h2>Answers describing something that did not happen</h2>\n\n  <p>For questions whose correct answer describes a feature of the stimuli’s argument (Role, Method, Flaw), we need to keep a watchful eye for answer choices describing something that does not happen in the argument.</p>\n\n  <p>In fact, identifying answer choices that deviate from the stimulus is a sure-fire way to eliminate erroneous contenders from the selection. For these four types of questions, read the answer choice, think about what it means, <span class=\"underline\">isolate any suspicious words in them</span>, and ask yourself, “does the author do this in their argument?”</p>\n\n  <p>But of course, this depends on the question type we are working on. Similar to Out of Scope answer choices, answer choices describing something that does not occur in the stimulus can work as correct Strengthen/Weaken answers, among others.</p>\n</section>\n\n<section class=\"section\">\n  <div class=\"section-number\">Answer Choice Type 3</div>\n  <h2>Answer choices that are too vague/abstract</h2>\n\n  <p>Finally, we have seen how the correct answer can be vaguely worded. We have even practiced the art of extrapolating what an answer is referring to by analyzing its keywords.</p>\n\n  <p>Extracting certain keywords from vague or abstract answer choices in order to understand what that answer choice is actually talking about is also an invaluable skill. Unfortunately, it’s one of the most under-developed skills and often overlooked when students pursue speed at the expense of accuracy.</p>\n\n  \n\n  <p class=\"final\">Lastly, a common trick employed by the authors of the test is to have an almost perfect answer with a glaring error, usually due to one single word placed right next to the correct answer, which is worded vaguely. This is a trap that we shall see over and over again throughout the book.</p>\n</section>";
const SOURCE_NOTE_CLASSES = "space-y-5 leading-relaxed [&_p]:my-5 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:mb-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_.section]:mt-8 [&_.section-number]:font-bold [&_.underline]:underline [&_.final]:font-semibold [&_.section:last-child]:border-2 [&_.section:last-child]:border-brutal-ink [&_.section:last-child]:bg-brutal-yellow/30 [&_.section:last-child]:p-5";

export function WhyHardNote() {
  return (
    <div>
      <div className={SOURCE_NOTE_CLASSES} dangerouslySetInnerHTML={{ __html: ROLE_CHOICE_INTRO_HTML }} />
      <RoleChoiceGuide />
      <div className={SOURCE_NOTE_CLASSES} dangerouslySetInnerHTML={{ __html: ANSWER_CHOICE_TRAPS_HTML }} />
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

export function BreakItDownNote() {
  return (
    <div>
      <div
        className={SOURCE_NOTE_CLASSES}
        dangerouslySetInnerHTML={{ __html: ROLE_CHOICE_INTRO_HTML.slice(ROLE_CHOICE_INTRO_HTML.lastIndexOf("<p>")) }}
      />
      <RoleChoicePracticeInstructions />
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
  art_of_matching: RequirementMatchingLesson,
  master_keys: ReasoningMoveLesson,
  five_bucket_indicators: PreciseDescriptionLesson,
  abstract_15: CompleteProcedureLesson,
};
