import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, BookOpen, LayoutGrid, Zap, Bug, BarChart2, ChevronRight, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type View = 'lessons' | 'reference' | 'simulator' | 'trapmaster' | 'diagnostics';

interface Choice { letter: string; text: string; }
interface AuditEntry { letter: string; verdict?: string; text: string; correct?: boolean; }
interface Question {
  id: string; ref: string; structure_family: string;
  stimulus: string; stem: string;
  choices: Choice[]; correct_letter: string;
  trait_tags: Record<string, number | null>;
  coach: { structure_map: string; core_move: string; audit: AuditEntry[]; };
}
interface Attempt { q_id: string; picked: string; correct: boolean; trait_tag: number | null; }
interface Trait { n: number; name: string; full_title: string; body: string; fingerprint: string; defense: string; }

/* ─── Simulator Questions ────────────────────────────────────────────────── */
const SIM_QUESTIONS: Question[] = [
  {
    id: 'sim-pt58-s1-q13', ref: 'PT58 S1 Q13', structure_family: 'first-sentence',
    stimulus: "It is a given that to be an intriguing person, one must be able to inspire the perpetual curiosity of others. Constantly broadening one's abilities and extending one's intellectual reach will enable one to inspire that curiosity. For such a perpetual expansion of one's mind makes it impossible to be fully comprehended, making one a constant mystery to others.",
    stem: 'Which one of the following most accurately expresses the conclusion drawn in the argument?',
    choices: [
      { letter: 'A', text: "To be an intriguing person, one must be able to inspire the perpetual curiosity of others." },
      { letter: 'B', text: "If one constantly broadens one's abilities and extends one's intellectual reach, one will be able to inspire the perpetual curiosity of others." },
      { letter: 'C', text: "If one's mind becomes impossible to fully comprehend, one will always be a mystery to others." },
      { letter: 'D', text: "To inspire the perpetual curiosity of others, one must constantly broaden one's abilities." },
      { letter: 'E', text: "If one constantly broadens one's abilities, one will always have curiosity." },
    ],
    correct_letter: 'B',
    trait_tags: { A: 1, C: null, D: 7, E: 4 },
    coach: {
      structure_map: 'Sentence 1 sets a standard for being intriguing (background framing). Sentence 2 makes the key claim: what will enable that curiosity. Sentence 3 gives the reason — why expansion makes you a mystery. The conclusion is Sentence 2 because Sentence 3 supports it.',
      core_move: 'The trap is that Sentence 1 sounds like a conclusion — it is broad and confident. But it is not supported. The conclusion is the statement the argument earns with support.',
      audit: [
        { letter: 'A', verdict: 'UNSUPPORTED', text: 'Restates the opening framing sentence. It sounds important, but the argument never proves it. Unsupported statements are not conclusions.' },
        { letter: 'B', text: 'Matches the supported claim in Sentence 2. Sentence 3 is offered as its reason — B is the conclusion.', correct: true },
        { letter: 'C', text: 'A supporting point. The stimulus uses it to explain the mechanism, not to deliver a verdict.' },
        { letter: 'D', text: 'Reverses the dependency. The stimulus said expansion enables curiosity, not that curiosity requires expansion as the only path.' },
        { letter: 'E', verdict: 'SCOPE DRIFT', text: 'Drops "perpetual curiosity" and substitutes "always have curiosity." Scope drift.' },
      ],
    },
  },
  {
    id: 'sim-pt24-s2-q12', ref: 'PT24 S2 Q12', structure_family: 'rebuttal',
    stimulus: "For years scientists have been scanning the skies in the hope of finding life on other planets. But in spite of the ever-increasing sophistication of the equipment they employ, some of it costing hundreds of millions of dollars, not the first shred of evidence of such life has been forthcoming. And there is no reason to think that these scientists will be any more successful in the future, no matter how much money is invested in the search. The dream of finding extraterrestrial life is destined to remain a dream, as science's experience up to this point should indicate.",
    stem: 'Which one of the following most accurately expresses the main conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'There is no reason to believe that life exists on other planets.' },
      { letter: 'B', text: 'The equipment that scientists employ is not as sophisticated as it should be.' },
      { letter: 'C', text: 'Scientists searching for extraterrestrial life will not find it.' },
      { letter: 'D', text: 'Only if scientists had already found evidence of life on other planets would continued search be justified.' },
      { letter: 'E', text: 'We should not spend money on sophisticated equipment to aid in the search for extraterrestrial life.' },
    ],
    correct_letter: 'C',
    trait_tags: { A: 2, B: 1, D: 4, E: 5 },
    coach: {
      structure_map: 'Sentence 1 is background framing. Sentence 2 reports a fact (no evidence found). Sentence 3 extends the claim into the future. Sentence 4 delivers the verdict — the dream is destined to remain a dream.',
      core_move: 'Trait 5 traps you with answers that sound like sensible advice. Stay narrow. The conclusion is a prediction about the outcome of the search — not a policy about funding. (E) is a sensible-sounding policy claim, but the author argued about whether the search will succeed, not whether to fund it.',
      audit: [
        { letter: 'A', verdict: 'SCOPE DRIFT', text: 'Too broad. The author argued about whether the search will find evidence — not about whether life exists.' },
        { letter: 'B', verdict: 'UNSUPPORTED', text: 'The stimulus mentions equipment but never argues it is insufficient.' },
        { letter: 'C', text: 'Matches the verdict in Sentence 4 — the dream of finding extraterrestrial life is destined to remain a dream.', correct: true },
        { letter: 'D', verdict: 'SCOPE DRIFT', text: 'Reverses the implication and adds a conditional the stimulus never supported.' },
        { letter: 'E', verdict: 'POLICY CREEP', text: 'A recommendation the author would likely endorse — but not what they argued for. Stay narrow.' },
      ],
    },
  },
  {
    id: 'sim-tomato', ref: 'tomato/fruit', structure_family: 'rebuttal',
    stimulus: "Tomatoes grow on a vine to about the size of a baseball. Most people believe that tomatoes are vegetables, since tomatoes are often found in salads and savory dishes. But they are wrong. After all, although tomatoes are never found in fruit salads, tomatoes have seeds and so they are fruit.",
    stem: 'Which one of the following most accurately expresses the conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'Tomatoes are often found in salads and savory dishes.' },
      { letter: 'B', text: 'Tomatoes have seeds.' },
      { letter: 'C', text: 'Tomatoes are not vegetables.' },
      { letter: 'D', text: 'Tomatoes grow on a vine to about the size of a baseball.' },
      { letter: 'E', text: 'Most people are wrong about what counts as a fruit.' },
    ],
    correct_letter: 'C',
    trait_tags: { A: 1, B: 1, D: null, E: 5 },
    coach: {
      structure_map: 'Sentence 1 is background. Sentence 2 is the opposing view. Sentence 3 ("But they are wrong") is the rebuttal — the implicit conclusion. Sentence 4 supplies support: tomatoes have seeds, so they are fruit.',
      core_move: 'The conclusion is "Tomatoes are not vegetables" — but this exact sentence is never written. The author says "they are wrong," pointing back at the opposing view. Pre-phrase: unpack what "they are wrong" means, then match it.',
      audit: [
        { letter: 'A', verdict: 'PREMISE TRAP', text: 'Words from the opposing view\'s premise — not what the author argued for.' },
        { letter: 'B', verdict: 'PREMISE TRAP', text: 'A premise the author uses to support the intermediate conclusion. Not the main conclusion.' },
        { letter: 'C', text: 'The unpacked rebuttal. "They are wrong" + the opposing view = "Tomatoes are not vegetables."', correct: true },
        { letter: 'D', text: 'Background framing. Not part of the argument\'s logical core.' },
        { letter: 'E', verdict: 'TOO STRONG', text: 'A bigger-picture claim the author might agree with — but not what was argued.' },
      ],
    },
  },
  {
    id: 'sim-recycling', ref: 'recycling', structure_family: 'first-sentence',
    stimulus: "Implementing a new recycling program in our community is essential. Many towns across the country have successfully reduced their environmental impact, and recycling programs have been shown to decrease the amount of waste in landfills.",
    stem: 'Which one of the following most accurately expresses the conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'Implementing a new recycling program in our community is essential.' },
      { letter: 'B', text: 'Many towns have successfully reduced their environmental impact.' },
      { letter: 'C', text: 'Recycling programs decrease the amount of waste in landfills.' },
      { letter: 'D', text: 'Every community should adopt a recycling program.' },
      { letter: 'E', text: 'Without recycling, communities cannot reduce waste.' },
    ],
    correct_letter: 'A',
    trait_tags: { B: 1, C: 1, D: 5, E: 4 },
    coach: {
      structure_map: 'Sentence 1 is the conclusion ("essential" is an opinion indicator). Sentence 2 supplies two parallel premises as support.',
      core_move: 'First-sentence stash. The author opens with the recommendation, then defends it with two facts. 2-Part Check: does it sound like opinion? Yes ("essential"). Is it supported? Yes. Confirmed.',
      audit: [
        { letter: 'A', text: 'Matches the opinion-marked first sentence with full support behind it.', correct: true },
        { letter: 'B', verdict: 'PREMISE TRAP', text: 'Premise. Used to support the conclusion, not the conclusion itself.' },
        { letter: 'C', verdict: 'PREMISE TRAP', text: 'Premise. Describes evidence, not the verdict.' },
        { letter: 'D', verdict: 'TOO STRONG', text: 'A bigger claim the author might endorse, but they argued only about their own community.' },
        { letter: 'E', verdict: 'SCOPE DRIFT', text: 'Modal shift to "cannot." The author said recycling is essential — not that nothing else could work.' },
      ],
    },
  },
];

/* ─── Traits ──────────────────────────────────────────────────────────────── */
const TRAITS: Trait[] = [
  { n: 1, name: 'Premise Impersonator', full_title: 'Trait 1 — Premise Impersonator', body: 'The answer restates a premise or a piece of evidence from the stimulus. It is a true statement about the stimulus — it just doesn\'t have anything supporting it. The test makers bank on you confusing "said in the stimulus" with "what the argument proves."', fingerprint: 'Words from the stimulus, usually early sentences. Often sounds important or factual. Passes the 2-Part Check\'s first gate (sounds like a claim) but fails the second (is it supported?).' , defense: 'For every candidate, ask: is there any support for this in the stimulus, or is it just stated? If just stated, it is a premise — eliminate.' },
  { n: 2, name: 'Unsupported Framing', full_title: 'Trait 2 — Unsupported Framing', body: 'A broader claim the author seems to believe but never actually argues for. It often sounds like the "point" of the whole discussion — but the argument doesn\'t earn it.', fingerprint: 'Bigger-picture language. Sounds like what the argument is "really about." Would require additional evidence the stimulus doesn\'t provide.', defense: 'Stay inside the stimulus. If the answer adds a dimension the stimulus never addressed, it is unsupported framing.' },
  { n: 3, name: 'Intermediate Conclusion', full_title: 'Trait 3 — Intermediate Conclusion', body: 'The argument has multiple conclusions. One supports the other. The trap answer picks a conclusion that is real — just not the main one. It is supported by premises AND supports the main conclusion.', fingerprint: 'A claim that is both "because" and "therefore" at the same time. Appears in multi-step arguments where one deduction leads to another.', defense: 'Map every claim. For each, ask: does it support anything else? If yes, it is intermediate. The main conclusion is the one that supports nothing further.' },
  { n: 4, name: 'Scope Drift', full_title: 'Trait 4 — Scope Drift', body: 'The answer looks like the conclusion but swaps a key term, shifts from one group to another, adds a modal ("must," "always," "never"), or removes a qualifier. Close — but wrong.', fingerprint: 'Starts strong, then changes something specific. Often adds absolute language the stimulus doesn\'t use. Compare the answer word-for-word against the stimulus.', defense: 'Pre-phrase the conclusion before you read the choices. Then match exactly. Any deviation is a red flag — check it carefully.' },
  { n: 5, name: 'Policy Creep', full_title: 'Trait 5 — Policy Creep', body: 'The argument concludes something descriptive (this is the case) but the trap answer turns it into a prescription (we should do X). Or the argument is local but the answer universalizes it.', fingerprint: 'Language like "should," "ought to," "we must invest in," or "everyone should." The stimulus never made a recommendation — only a claim about how things are.', defense: 'Notice whether the argument is descriptive or prescriptive. Match type.' },
  { n: 6, name: 'Reversal', full_title: 'Trait 6 — Reversal', body: 'The answer reverses the logical direction of the argument. Instead of A → B, it says B → A. The terms are the same — the relationship between them is backwards.', fingerprint: 'If/then structures that switch the antecedent and consequent. "In order to X, you must Y" reversed from "Y will lead to X."', defense: 'Draw a quick arrow diagram. Which thing supports which? The answer must match the direction.' },
  { n: 7, name: 'Correct-But-Not-Conclusion', full_title: 'Trait 7 — Correct But Not the Conclusion', body: 'The answer is true, accurate, and even follows from the stimulus — it just isn\'t the main conclusion. It might be a corollary, a restatement in different terms, or an accurate implication. True ≠ conclusion.', fingerprint: 'Feels right. Passes casual inspection. Usually is a valid inference from the stimulus — but the argument itself concluded something more specific or different.', defense: 'Truth is not the test. The test is: is this the point the argument was trying to prove? Ask what the support structure points at.' },
];

/* ─── Lesson Summaries ────────────────────────────────────────────────────── */
const LESSONS = [
  { id: '1.1', title: 'What Is an Argument?', hook: 'Not everything is an argument. A set of facts is just information. An argument is a claim plus a reason.', body: 'An argument has two structural elements: a conclusion (the claim being made) and at least one premise (the evidence or reason supporting it). If there is no claim being defended, there is no argument. The moment you see support for a position, you are in an argument.' },
  { id: '1.2', title: 'What Is a Conclusion?', hook: 'The conclusion is the point the author is trying to prove — not the most important sentence, not the last sentence, not the loudest sentence. The one being supported.', body: 'The 2-Part Conclusion Check: (1) Does it sound like an opinion or judgment — something that requires justification? (2) Is it actually supported by the other sentences? If both are yes, you have a conclusion. If it is just stated without backup, it is a premise. If it supports something else further up the chain, it is an intermediate conclusion.' },
  { id: '1.3', title: 'Premises and Support', hook: 'The premises are doing the work. The conclusion is the result.', body: 'Premises are the evidence, data, facts, and reasons the author uses to support the conclusion. A premise is never wrong inside the argument — you accept all premises as given. Your job is not to evaluate whether the premises are true, but to identify which statement they support.' },
  { id: '1.4', title: 'Conclusion Indicators', hook: 'TATTOO IT IF YOU HAVE TO: therefore, thus, hence, so, consequently, this means, this shows, it follows that, we can conclude.', body: 'Conclusion indicators are words and phrases that introduce the conclusion. When you see one, the conclusion is what follows it. They work like an arrow pointing at the endpoint of the argument. The flip side: premise indicators (because, since, for, after all) point AWAY from the conclusion, toward the support.' },
  { id: '1.5', title: 'The 2-Part Conclusion Check', hook: 'Two gates. A conclusion has to pass both. Most traps fail at gate 2.', body: 'Gate 1: Does it sound like an opinion — something that requires justification rather than just being a fact about the world? Gate 2: Is it actually supported by other claims in the stimulus? A statement that passes Gate 1 but fails Gate 2 is a premise (just stated). A statement that passes both is a conclusion. Run this on every candidate before choosing.' },
  { id: '1.6', title: 'FABS — The Premise Quartet', hook: 'Four words that tell you: this is evidence, not the conclusion.', body: 'FABS: For · After all · Because · Since. When you see any of these pointing at a statement, that statement is a premise. The conclusion is somewhere else. These are the most reliable premise indicators on the LSAT. Memorize the acronym. When in doubt, find FABS.' },
  { id: '1.7', title: 'Argument Structure Patterns', hook: 'Arguments have shapes. Once you recognize the shape, you know where the conclusion lives.', body: 'The two dominant shapes in Main Conclusion questions: (1) First-Sentence Stash — the author opens with the conclusion ("X is essential / wrong / needed"), then defends it. (2) Rebuttal Structure — the author presents an opposing view, then says "But..." and makes their real claim. The conclusion lives after the "But." Recognizing the shape in the first two seconds is a massive advantage.' },
  { id: '1.8', title: 'Trojan Horse Concession', hook: 'The author is agreeing — and still winning the argument.', body: 'Words like although, granted, while, despite, even though signal that the author is conceding a point to the opposition before making their real claim. The concession sounds like agreement. The conclusion comes after. Do not mistake the concession for the conclusion — the concession is the setup, not the verdict.' },
  { id: '1.9', title: 'First-Sentence Main Conclusion', hook: 'The conclusion is not hiding. It is right there at the start. The author said it first, then defended it.', body: 'In first-sentence stash stimuli, the author opens with a recommendation or judgment, then supplies reasons. The test makers try to make you overlook the first sentence by filling the rest of the stimulus with interesting evidence. The evidence is there to support the first sentence — not to replace it. If you find yourself drawn to a fact from the middle of the stimulus, ask whether it is actually supported, or just stated.' },
  { id: '1.10', title: 'Rebuttal Structure', hook: 'Opposing view → "But" → Author\'s claim. The conclusion lives after the "But."', body: 'The rebuttal pattern: first the author summarizes or attributes a position they disagree with (often with "people think," "critics argue," "the government claims"), then pivots with a contrast word (but, yet, however, nevertheless), then makes their own claim. The conclusion is always the author\'s claim after the pivot — never the opposing view.' },
  { id: '1.11', title: 'Intermediate Conclusions', hook: 'Some arguments have two conclusions. One is a stepping stone. One is the destination.', body: 'An intermediate conclusion is a statement that is BOTH supported by premises AND supports the main conclusion. It is like a sub-verdict that feeds into the master verdict. The test makers build intermediate conclusions as trap answers — they are real conclusions, just not the main one. Map the support structure: the claim that nothing else supports is the main conclusion.' },
  { id: '1.12', title: 'Pre-Phrase Goal', hook: 'Name the conclusion before you read the answers. Then you are hunting, not choosing.', body: 'Before reading answer choices, articulate the conclusion in your own words. Even a rough paraphrase is enough: "author is saying X." Then read choices and ask: which one matches what I pre-phrased? This prevents the test makers from luring you with well-written traps. If you have a target, the traps bounce off.' },
  { id: '1.13', title: 'End-of-Module Calibration', hook: 'Everything you have learned, applied to real questions. This is the diagnostic — it shows where the method holds and where it leaks.', body: 'This calibration drill uses real LSAT-format Main Conclusion questions. Every wrong answer reveals which trap trait caught you. The diagnostic engine will track your trait profile and surface your most frequent error pattern. Complete at least 4 questions to generate a meaningful recommendation.', capstone: true },
];

/* ─── Utility ─────────────────────────────────────────────────────────────── */
const TRAIT_LABELS: Record<number, string> = { 1: 'Premise Impersonator', 2: 'Unsupported Framing', 3: 'Intermediate Conclusion', 4: 'Scope Drift', 5: 'Policy Creep', 6: 'Reversal', 7: 'Correct-But-Not-Conclusion' };

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium', className)}>{children}</span>;
}

/* ─── SimulatorView ──────────────────────────────────────────────────────── */
function SimulatorView() {
  const [pool] = useState(() => [...SIM_QUESTIONS].sort(() => Math.random() - 0.5));
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [done, setDone] = useState(false);
  const [redoMode, setRedoMode] = useState(false);
  const [redoPicked, setRedoPicked] = useState<string | null>(null);

  const q = pool[cursor];

  function handleSubmit() {
    if (!picked || revealed) return;
    const isCorrect = picked === q.correct_letter;
    const traitTag = !isCorrect ? (q.trait_tags[picked] ?? null) : null;
    setAttempts(prev => [...prev, { q_id: q.id, picked, correct: isCorrect, trait_tag: traitTag }]);
    setRevealed(true);
  }

  function handleNext() {
    if (cursor + 1 >= pool.length) { setDone(true); return; }
    setCursor(c => c + 1);
    setPicked(null);
    setRevealed(false);
    setRedoMode(false);
    setRedoPicked(null);
  }

  function handleRedo() { setRedoMode(true); setRedoPicked(null); }

  function handleRedoPick(letter: string) {
    setRedoPicked(letter);
    if (letter === q.correct_letter) setTimeout(handleNext, 600);
  }

  if (done) return <SessionSummary attempts={attempts} onRestart={() => { setCursor(0); setPicked(null); setRevealed(false); setAttempts([]); setDone(false); setRedoMode(false); }} />;

  const isCorrect = revealed && picked === q.correct_letter;
  const traitTag = revealed && picked !== q.correct_letter ? q.trait_tags[picked] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Label>Question {cursor + 1} / {pool.length} · {q.ref}</Label>
        <Label>{q.structure_family}</Label>
      </div>

      {/* Stimulus */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="block mb-3">Stimulus</Label>
        <p className="text-sm text-foreground leading-relaxed italic">{q.stimulus}</p>
      </div>

      {/* Stem */}
      <p className="text-sm font-semibold text-foreground px-1">{q.stem}</p>

      {/* Choices — normal or redo mode */}
      <div className="space-y-2">
        {q.choices.map(c => {
          const choices = redoMode ? redoPicked : picked;
          const isSelected = !revealed && choices === c.letter;
          const isCorrectChoice = revealed && c.letter === q.correct_letter;
          const isWrongPick = revealed && c.letter === picked && picked !== q.correct_letter;
          const redoCorrect = redoMode && redoPicked === c.letter && c.letter === q.correct_letter;
          const redoWrong = redoMode && redoPicked === c.letter && c.letter !== q.correct_letter;

          return (
            <motion.button
              key={c.letter}
              onClick={() => {
                if (revealed && !redoMode) return;
                if (redoMode) { handleRedoPick(c.letter); return; }
                setPicked(c.letter);
              }}
              whileHover={!revealed || redoMode ? { x: 2 } : {}}
              className={cn(
                'w-full text-left rounded-lg border p-4 flex gap-3 items-start transition-colors duration-150',
                isSelected && 'border-amber-500/40 bg-amber-500/5',
                isCorrectChoice && 'border-emerald-500/40 bg-emerald-500/5',
                isWrongPick && 'border-red-500/30 bg-red-500/5',
                redoCorrect && 'border-emerald-500/40 bg-emerald-500/5',
                redoWrong && 'border-red-500/30 bg-red-500/5',
                !isSelected && !isCorrectChoice && !isWrongPick && !redoCorrect && !redoWrong && 'border-border bg-card hover:bg-accent/30',
              )}
            >
              <span className={cn(
                'font-mono text-xs font-bold mt-0.5 min-w-[18px]',
                isCorrectChoice || redoCorrect ? 'text-emerald-400' : isWrongPick || redoWrong ? 'text-red-400' : 'text-muted-foreground',
              )}>{c.letter}</span>
              <span className="text-sm text-foreground leading-relaxed flex-1">{c.text}</span>
              {isCorrectChoice && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
              {isWrongPick && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {traitTag && <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">Trait {traitTag}</span>}
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={!picked}
          className="w-full rounded-lg bg-foreground text-background text-sm font-semibold py-3 hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Submit answer
        </button>
      ) : (
        <div className="flex gap-2">
          {!isCorrect && !redoMode && (
            <button onClick={handleRedo} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Re-attempt with explanation visible
            </button>
          )}
          {(!redoMode || isCorrect) && (
            <button onClick={handleNext} className="flex-1 rounded-lg bg-foreground text-background text-sm font-semibold py-2.5 hover:bg-foreground/90 transition-colors">
              {cursor + 1 < pool.length ? 'Next question →' : 'Finish session'}
            </button>
          )}
        </div>
      )}

      {/* Coach's Note */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4"
          >
            <Label className="text-amber-400">Coach's Note</Label>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Structure map</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.coach.structure_map}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Core move</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.coach.core_move}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Per-answer audit</p>
                <div className="space-y-2">
                  {q.coach.audit.map(a => (
                    <div key={a.letter} className={cn('flex gap-3 rounded-lg p-3 text-sm', a.correct ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-card border border-border')}>
                      <span className={cn('font-mono text-xs font-bold min-w-[14px]', a.correct ? 'text-emerald-400' : 'text-muted-foreground')}>{a.letter}</span>
                      <div className="flex-1 space-y-0.5">
                        {a.verdict && <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold block">{a.verdict}</span>}
                        <p className={cn('leading-relaxed', a.correct ? 'text-emerald-300' : 'text-muted-foreground')}>{a.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionSummary({ attempts, onRestart }: { attempts: Attempt[]; onRestart: () => void }) {
  const correct = attempts.filter(a => a.correct).length;
  const traitMisses: Record<number, number> = {};
  attempts.forEach(a => { if (!a.correct && a.trait_tag) traitMisses[a.trait_tag] = (traitMisses[a.trait_tag] || 0) + 1; });
  const sorted = Object.entries(traitMisses).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
        <p className="text-4xl font-bold text-foreground">{correct}/{attempts.length}</p>
        <p className="text-sm text-muted-foreground">Session complete</p>
      </div>

      {sorted.length > 0 && (
        <div className="space-y-3">
          <Label>Trap breakdown</Label>
          {sorted.map(([tn, count]) => {
            const trait = TRAITS.find(t => t.n === Number(tn));
            return (
              <div key={tn} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Trait {tn} — {TRAIT_LABELS[Number(tn)]}</span>
                  <span className="text-xs text-amber-400 font-mono">{count}×</span>
                </div>
                {trait && <p className="text-xs text-muted-foreground leading-relaxed">{trait.defense}</p>}
              </div>
            );
          })}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-sm text-emerald-400 font-semibold">Clean session — no traps caught you.</p>
        </div>
      )}

      <button onClick={onRestart} className="w-full rounded-lg bg-foreground text-background text-sm font-semibold py-3 hover:bg-foreground/90 transition-colors">
        New session
      </button>
    </div>
  );
}

/* ─── LessonsView ────────────────────────────────────────────────────────── */
function LessonsView() {
  const [activeId, setActiveId] = useState('1.1');
  const lesson = LESSONS.find(l => l.id === activeId)!;

  return (
    <div className="flex gap-6 h-full">
      {/* Lesson list */}
      <aside className="w-56 flex-shrink-0 space-y-0.5">
        <Label className="block px-2 pb-2">Lessons</Label>
        {LESSONS.map(l => (
          <button
            key={l.id}
            onClick={() => setActiveId(l.id)}
            className={cn(
              'w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              activeId === l.id ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
              l.capstone && activeId !== l.id && 'border-l-2 border-amber-500/40 rounded-l-none',
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground min-w-[24px]">{l.id}</span>
            <span className="truncate">{l.title}</span>
          </button>
        ))}
      </aside>

      {/* Lesson content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-w-0 rounded-xl border border-border bg-card p-8 space-y-5"
        >
          <div>
            <Label className="block mb-2">Lesson {lesson.id}{lesson.capstone ? ' · Capstone' : ''}</Label>
            <h2 className="text-xl font-semibold text-foreground">{lesson.title}</h2>
          </div>
          <div className="rounded-lg bg-accent/20 border border-border px-5 py-4">
            <p className="text-sm text-foreground italic leading-relaxed">{lesson.hook}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{lesson.body}</p>
          {lesson.capstone && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">Complete the calibration in the Simulator tab after finishing all lessons.</p>
              <button className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background text-sm font-semibold px-5 py-2.5 hover:bg-foreground/90 transition-colors">
                Go to Simulator <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── TrapMasterView ─────────────────────────────────────────────────────── */
function TrapMasterView() {
  const [activeN, setActiveN] = useState<number | null>(null);
  const active = TRAITS.find(t => t.n === activeN);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Trap Master — the 7 traits</h2>
        <p className="text-xs text-muted-foreground mt-1">The test makers have a finite playbook. Seven moves cover almost every wrong answer.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TRAITS.map(t => (
          <button
            key={t.n}
            onClick={() => setActiveN(activeN === t.n ? null : t.n)}
            className={cn(
              'text-left rounded-xl border p-4 space-y-1.5 transition-colors',
              activeN === t.n ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card hover:bg-accent/30',
            )}
          >
            <Label className={cn(activeN === t.n && 'text-amber-400')}>Trait {t.n}</Label>
            <p className="text-sm font-semibold text-foreground">{t.name}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key={active.n}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4"
          >
            <Label className="text-amber-400">Trait {active.n} — Deep dive</Label>
            <h3 className="text-base font-semibold text-foreground">{active.full_title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{active.body}</p>
            <div className="rounded-lg border border-border bg-card p-4 space-y-1.5">
              <Label>Fingerprint</Label>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{active.fingerprint}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
              <Label className="text-emerald-400">Defense</Label>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{active.defense}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── ReferenceView ──────────────────────────────────────────────────────── */
function ReferenceView() {
  const refs = [
    { id: '2-part', label: '2-Part Conclusion Check', body: 'Gate 1: Does it sound like an opinion or judgment? Gate 2: Is it supported by other claims in the stimulus? Both gates must pass. If Gate 1 fails → background fact. If Gate 2 fails → premise.' },
    { id: 'fabs', label: 'FABS — Premise Indicators', body: 'For · After all · Because · Since. When any FABS word points at a claim, that claim is a premise — not the conclusion. The conclusion is somewhere upstream.' },
    { id: 'conclusion-indicators', label: 'Conclusion Indicators', body: 'Therefore · thus · hence · so · consequently · this means · this shows · it follows that · we can conclude · clearly (opinion marker) · obviously · must.' },
    { id: 'trojan', label: 'Trojan Horse Concession', body: 'Although · granted · while · despite · even though · admittedly. The author appears to concede, then pivots to their real claim. The concession is setup, not the conclusion.' },
    { id: 'rebuttal', label: 'Rebuttal Structure', body: 'Opposing view → contrast pivot (but / yet / however / nevertheless) → author\'s claim. The conclusion always lives after the pivot. The opposing view can never be the main conclusion.' },
    { id: 'xray', label: 'X-Ray Scan', body: 'For each clause, assign a role: CONCLUSION (what\'s being proved), PREMISE (evidence offered), PIVOT (contrast), BACKGROUND (context only), OPPOSING (a view the author disagrees with). The conclusion is the claim that premises point at.' },
  ];
  return (
    <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
      {refs.map(r => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
          <Label>{r.label}</Label>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{r.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── DiagnosticsView ────────────────────────────────────────────────────── */
function DiagnosticsView() {
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
        <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium text-foreground">Diagnostics build after your first session</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">Run a Simulator session — every wrong answer is trait-tagged. Your breakdown will surface here automatically.</p>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'lessons',     label: 'Lessons',    icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'reference',   label: 'Reference',  icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'simulator',   label: 'Simulator',  icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'trapmaster',  label: 'Trap Master', icon: <Bug className="w-3.5 h-3.5" /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
];

const Structure: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<View>('lessons');

  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/bootcamps')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Bootcamps
          </button>

          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-500/70 font-medium mr-3 flex-shrink-0">Structure</span>
            <nav className="flex items-center gap-0.5">
              {NAV.map(n => (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
                    view === n.id
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  {n.icon}
                  <span className="hidden sm:inline">{n.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {view === 'lessons'     && <LessonsView />}
            {view === 'reference'   && <ReferenceView />}
            {view === 'simulator'   && <SimulatorView />}
            {view === 'trapmaster'  && <TrapMasterView />}
            {view === 'diagnostics' && <DiagnosticsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Structure;
