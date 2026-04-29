/* =========================================================================
   Structure Bootcamp · Main Conclusion mastery
   8 sequential modules, gated by completion, with embedded interactive
   checkpoints. Patterned on MainConclusionRole.tsx — not a tab grid.
   ========================================================================= */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';
import {
  Card, XRayBlock, XText, CoachQuiz, CompletionButton, HoverRevealGrid, ScenarioStepper,
} from '@/components/structure/blocks';
import { Simulator } from '@/components/structure/Simulator';
import { MODULES, TRAITS } from '@/components/structure/data';
import type { ModuleId } from '@/components/structure/data';

/* ─── Module: Foundations ───────────────────────────────────────────────── */
function FoundationsModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 01" title="Foundations">
        <p>Most stimuli on the LSAT are arguments. <strong className="text-foreground">An argument is a claim plus a reason.</strong> If there is no claim being defended, you are reading a fact set, not an argument.</p>
        <p>Your job on a Main Conclusion question is one thing only: find the claim the author is trying to prove. Not the most interesting sentence. Not the loudest sentence. The one that the rest of the stimulus is pointing at.</p>
        <p>This sounds simple. It is. The traps come from sentences that <em>look</em> like the conclusion — strong language, opinion words, important-sounding framing — but the argument never actually defends them.</p>
      </Card>
      <CoachQuiz questions={[
        { question: 'What separates an argument from a fact set?', options: ['It uses formal language', 'It contains a claim being supported by evidence', 'It is at least three sentences', 'It mentions a conclusion indicator'], correctAnswerIndex: 1, explanation: 'An argument has a claim (conclusion) backed by at least one reason (premise). A fact set is just a list of statements with no central claim being defended.' },
        { question: "What is your single job on a Main Conclusion question?", options: ['Find the most interesting sentence', "Find the claim the author is trying to prove", 'Find the sentence with the strongest language', 'Find the last sentence'], correctAnswerIndex: 1, explanation: 'The main conclusion is the claim the rest of the stimulus is built to support. Strong language and position do not determine it — the support structure does.' },
      ]} />
      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: 2-Part Conclusion Check ───────────────────────────────────── */
function TwoPartModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 02" title="The 2-Part Conclusion Check">
        <p>Two gates. A conclusion has to pass both. Most traps fail at gate 2.</p>
        <p><strong className="text-foreground">Gate 1 — Opinion check.</strong> Does this sound like an opinion or judgment, something that requires justification? Or is it just a fact about the world (background)?</p>
        <p><strong className="text-foreground">Gate 2 — Support check.</strong> Is this statement actually supported by other statements in the stimulus? Or is it just stated, with nothing else in the argument backing it up?</p>
        <p>A statement that passes Gate 1 but fails Gate 2 is a <em>premise</em> — true, opinion-like, but unsupported. A statement that passes both is a conclusion. Run this check on every candidate before choosing.</p>
      </Card>
      <ScenarioStepper scenarios={[
        { key: 'a', label: '"Tomatoes have seeds." (Just stated.)', result: 'fail', verdict: 'Fails Gate 1 — Premise', explanation: 'This is a fact, not an opinion. It does not require justification. It is background or premise material — not a conclusion.' },
        { key: 'b', label: '"Tomatoes are fruit." (Stated, with no support.)', result: 'fail', verdict: 'Fails Gate 2 — Premise', explanation: 'Sounds like an opinion (passes Gate 1). But if nothing in the stimulus supports it, it is being used AS a premise. Premise.' },
        { key: 'c', label: '"Tomatoes are not vegetables." (Author argues for it.)', result: 'pass', verdict: 'Passes Both — Conclusion', explanation: 'Opinion-style claim (Gate 1) that the rest of the stimulus is defending (Gate 2). This is the conclusion.' },
        { key: 'd', label: '"Tomatoes grow on a vine." (Just background.)', result: 'fail', verdict: 'Fails Gate 1 — Background', explanation: 'A fact about how tomatoes grow. Does not require justification. Background framing only.' },
      ]} />
      <CoachQuiz questions={[
        { question: 'A statement that passes Gate 1 but fails Gate 2 is what?', options: ['The conclusion', 'A premise', 'Background information', 'An indicator word'], correctAnswerIndex: 1, explanation: 'It sounds like an opinion (Gate 1 passes), but nothing in the stimulus supports it. It is being used to support something else. That makes it a premise.' },
        { question: 'Why is Gate 2 the gate that catches most traps?', options: ['Because most trap answers are not opinion-like', 'Because trap answers often look like conclusions but are unsupported', 'Because Gate 2 is harder to apply', 'Because the LSAT writes premises that look like opinions'], correctAnswerIndex: 1, explanation: 'Gate 1 is easy — most candidates sound like opinions. Gate 2 is the discriminator: the right conclusion has support behind it, traps do not.' },
      ]} />
      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: FABS ──────────────────────────────────────────────────────── */
function FABSModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 03" title="FABS — The Premise Quartet">
        <p>Four words that mean: <strong className="text-foreground">what follows is evidence, not the conclusion.</strong></p>
        <p>FABS — For · After all · Because · Since. When you see one of these pointing at a statement, that statement is a premise. The conclusion is somewhere else, usually right next door.</p>
        <p>FABS is the most reliable premise indicator on the LSAT. Memorize the acronym. When you can't find the conclusion, find FABS — then look at what FABS is supporting.</p>
      </Card>
      <HoverRevealGrid items={[
        { key: 'F', head: 'F', sub: 'For', body: <><strong className="text-foreground">Evidence.</strong> "You should try the curry, <em>for</em> you like spicy food." → "you like spicy food" is the premise.</> },
        { key: 'A', head: 'A', sub: 'After all', body: <><strong className="text-foreground">Support.</strong> "You should try the curry. <em>After all</em>, you like spicy food." → premise comes after.</> },
        { key: 'B', head: 'B', sub: 'Because', body: <><strong className="text-foreground">Reason.</strong> "You should try the curry <em>because</em> you like spicy food." → premise comes after.</> },
        { key: 'S', head: 'S', sub: 'Since', body: <><strong className="text-foreground">Fact.</strong> "<em>Since</em> you like spicy food, you should try the curry." → premise comes before.</> },
      ]} />
      <CoachQuiz questions={[
        { question: 'When you see "because" in a stimulus, the statement that follows is what?', options: ['The conclusion', 'A premise', 'Background information', 'An opposing view'], correctAnswerIndex: 1, explanation: '"Because" introduces a reason — the support for the claim. The conclusion is what "because" is defending, not what follows the word itself.' },
        { question: 'In: "Since the meeting ran late, we should reschedule." Which is the conclusion?', options: ['"The meeting ran late"', '"We should reschedule"', 'Both', 'Neither'], correctAnswerIndex: 1, explanation: '"Since" points at a premise (the meeting ran late). The claim being supported — "we should reschedule" — is the conclusion.' },
      ]} />
      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: X-Ray ─────────────────────────────────────────────────────── */
function XRayModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 04" title="X-Ray the Structure">
        <p>Conclusion indicators flag the verdict: <strong className="text-foreground">therefore, thus, hence, so, consequently, this means, this shows, it follows that, we can conclude.</strong> When you see one, the conclusion is what follows it.</p>
        <p>But indicators only get you so far. The deeper move is to <strong className="text-foreground">X-Ray every clause</strong> — assign each one a role (premise, conclusion, opposing, pivot, background, indicator). When the structure is colored, the conclusion is impossible to miss.</p>
        <p>Try it on the stimulus below. Toggle the X-Ray and watch each clause take on its role.</p>
      </Card>
      <XRayBlock label="PT58 S1 Q13 stimulus">
        {(x) => (
          <p>
            <XText type="background" xray={x}>It is a given that to be an intriguing person, one must be able to inspire the perpetual curiosity of others.</XText>{' '}
            <XText type="conclusion" xray={x}>Constantly broadening one's abilities and extending one's intellectual reach will enable one to inspire that curiosity.</XText>{' '}
            <XText type="indicator" xray={x}>For</XText>{' '}
            <XText type="premise" xray={x}>such a perpetual expansion of one's mind makes it impossible to be fully comprehended, making one a constant mystery to others.</XText>
          </p>
        )}
      </XRayBlock>
      <CoachQuiz questions={[
        { question: 'Which sentence is the conclusion of the stimulus above?', options: [
          'It is a given that to be an intriguing person, one must be able to inspire the perpetual curiosity of others.',
          'Constantly broadening one\'s abilities and extending one\'s intellectual reach will enable one to inspire that curiosity.',
          'Such a perpetual expansion of one\'s mind makes it impossible to be fully comprehended.',
          "There is no conclusion — it's a fact set.",
        ], correctAnswerIndex: 1, explanation: 'Sentence 2 is the conclusion. Sentence 1 sounds important but is unsupported background framing. Sentence 3 (after "For") is the premise that supports Sentence 2.' },
        { question: 'What role does "For" play in the stimulus?', options: ['Conclusion indicator', 'Premise indicator', 'Background', 'Opposing view'], correctAnswerIndex: 1, explanation: '"For" is a FABS premise indicator — what follows it is evidence, not the conclusion.' },
      ]} />
      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: Argument Shapes ───────────────────────────────────────────── */
function ShapesModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 05" title="Argument Shapes">
        <p>Arguments have shapes. Once you recognize the shape, you know where the conclusion lives. Two shapes dominate Main Conclusion questions:</p>
        <p><strong className="text-foreground">Shape 1 — First-Sentence Stash.</strong> The author opens with the conclusion ("X is essential / wrong / needed"), then defends it with evidence. The first sentence is loaded; the rest is support.</p>
        <p><strong className="text-foreground">Shape 2 — Rebuttal Structure.</strong> The author summarizes an opposing view, pivots with "But / Yet / However," then makes their own claim. The conclusion lives <em>after</em> the pivot. The opposing view can never be the main conclusion.</p>
      </Card>
      <XRayBlock label="Shape 1 — First-Sentence Stash">
        {(x) => (
          <p>
            <XText type="conclusion" xray={x}>Implementing a new recycling program in our community is essential.</XText>{' '}
            <XText type="premise" xray={x}>Many towns across the country have successfully reduced their environmental impact, and recycling programs have been shown to decrease the amount of waste in landfills.</XText>
          </p>
        )}
      </XRayBlock>
      <XRayBlock label="Shape 2 — Rebuttal Structure">
        {(x) => (
          <p>
            <XText type="opposing" xray={x}>The government argues that reducing educational spending will help address budget deficits.</XText>{' '}
            <XText type="pivot" xray={x}>But</XText>{' '}
            <XText type="conclusion" xray={x}>it is clear that the government's decision to cut funding for public education is misguided.</XText>{' '}
            <XText type="premise" xray={x}>Cutting funding for education can lead to a decline in the quality of public schools and hinder future economic development.</XText>
          </p>
        )}
      </XRayBlock>
      <CoachQuiz questions={[
        { question: 'In a Rebuttal Structure stimulus, where does the conclusion live?', options: ['In the opposing view', 'After the contrast pivot (but / yet / however)', 'At the very end of the stimulus', 'In the first sentence'], correctAnswerIndex: 1, explanation: 'The author concedes or summarizes an opposing view, then pivots and delivers their real claim. The conclusion is always after the pivot — never the opposing view itself.' },
        { question: "In a First-Sentence Stash stimulus, what is the role of the sentences after the first?", options: ['They are alternative conclusions', 'They are evidence supporting the first sentence', 'They are background framing', 'They are usually irrelevant'], correctAnswerIndex: 1, explanation: 'The first sentence is the claim. Everything after is evidence the author is using to defend it. Do not get lured by interesting facts in the support — the first sentence is what they prove.' },
      ]} />
      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: Trojan Horse ──────────────────────────────────────────────── */
function TrojanModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 06" title="Trojan Horse Concession">
        <p>The author appears to agree — and is still about to win the argument. Words like <strong className="text-foreground">although, granted, while, despite, even though, admittedly</strong> signal that the author is conceding a point to the opposition <em>before</em> making their real claim.</p>
        <p>The concession sounds like agreement. The conclusion comes after. <strong className="text-foreground">Do not mistake the concession for the conclusion</strong> — it is the setup, not the verdict.</p>
        <p>Toggle the X-Ray on the tomato stimulus below. Notice how Sentence 4 starts with "although" — that is the Trojan Horse, not the conclusion.</p>
      </Card>
      <XRayBlock label="The tomato/fruit stimulus">
        {(x) => (
          <p>
            <XText type="background" xray={x}>Tomatoes grow on a vine to about the size of a baseball.</XText>{' '}
            <XText type="opposing" xray={x}>Most people believe that tomatoes are vegetables, since tomatoes are often found in salads and savory dishes.</XText>{' '}
            <XText type="pivot" xray={x}>But</XText>{' '}
            <XText type="conclusion" xray={x}>they are wrong.</XText>{' '}
            <XText type="indicator" xray={x}>After all,</XText>{' '}
            <XText type="background" xray={x}>although tomatoes are never found in fruit salads,</XText>{' '}
            <XText type="premise" xray={x}>tomatoes have seeds and so they are fruit.</XText>
          </p>
        )}
      </XRayBlock>
      <CoachQuiz questions={[
        { question: 'In the tomato stimulus, what is the conclusion?', options: ['"Tomatoes are often found in salads."', '"They are wrong" → unpacked: "Tomatoes are not vegetables."', '"Tomatoes have seeds."', '"Tomatoes are never found in fruit salads."'], correctAnswerIndex: 1, explanation: '"They are wrong" is a referential rebuttal — it points back at the opposing view. Unpacked, it means "Tomatoes are not vegetables." That is the conclusion.' },
        { question: 'Which word in the stimulus is the Trojan Horse concession marker?', options: ['"But"', '"Although"', '"After all"', '"And"'], correctAnswerIndex: 1, explanation: '"Although tomatoes are never found in fruit salads" is a concession to the opposing view, made on the way to the real claim. The concession signal is "although."' },
      ]} />
      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: Trap Master ───────────────────────────────────────────────── */
function TrapsModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [activeN, setActiveN] = useState<number | null>(null);
  const active = TRAITS.find(t => t.n === activeN);

  return (
    <>
      <Card label="Module 07" title="The 7 Traps — Trap Master">
        <p>The test makers have a finite playbook. Seven moves cover almost every wrong Main Conclusion answer.</p>
        <p>Click each trait to read the body, the fingerprint (how to spot it on the page), and the defense (how to neutralize it). After this module, the simulator will tag every wrong answer you pick with the trait it exhibits — so you can build a trap profile.</p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TRAITS.map(t => (
          <button
            key={t.n}
            onClick={() => setActiveN(activeN === t.n ? null : t.n)}
            className={cn(
              'rounded-xl border p-3 text-left transition-all',
              activeN === t.n
                ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_24px_rgba(245,158,11,0.1)]'
                : 'border-border bg-card hover:border-amber-500/20',
            )}
          >
            <div className={cn('text-2xl font-black', activeN === t.n ? 'text-amber-400' : 'text-foreground')}>{t.n}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight">{t.name}</div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.n}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4 mt-3"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold">Trait {active.n} · Deep dive</span>
            <h3 className="text-base font-semibold text-foreground">{active.full_title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{active.body}</p>
            <div className="rounded-lg border border-border bg-card p-4 space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Fingerprint</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{active.fingerprint}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">Defense</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{active.defense}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CompletionButton isCompleted={done} onClick={onDone} />
    </>
  );
}

/* ─── Module: Simulator ─────────────────────────────────────────────────── */
function SimulatorModule({ done, onDone }: { done: boolean; onDone: () => void }) {
  return (
    <>
      <Card label="Module 08" title="Prove It — Simulator">
        <p>Six real LSAT-format Main Conclusion questions. Pick one. Submit. Get the Coach's Note: structure map, core move, per-answer audit. Every wrong answer is tagged with the trait it exhibits.</p>
        <p>This is not optional. The pedagogy is teach → calibrate → diagnose. The simulator is calibration. Run it now.</p>
      </Card>
      <Simulator onComplete={onDone} isCompleted={done} />
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
const Structure: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>('foundations');
  const [completed, setCompleted] = useState<Record<ModuleId, boolean>>({
    foundations: false, 'two-part': false, fabs: false, xray: false,
    shapes: false, trojan: false, traps: false, simulator: false,
  });

  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);
  if (!user) return null;

  const handleComplete = (id: ModuleId) => {
    setCompleted(prev => ({ ...prev, [id]: true }));
    const i = MODULES.findIndex(m => m.id === id);
    if (i !== -1 && i < MODULES.length - 1) {
      setTimeout(() => setActiveModule(MODULES[i + 1].id), 350);
    }
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((completedCount / MODULES.length) * 100);
  const allDone = completedCount === MODULES.length;

  const moduleComponents: Record<ModuleId, React.ReactNode> = {
    foundations: <FoundationsModule done={completed.foundations}     onDone={() => handleComplete('foundations')} />,
    'two-part':  <TwoPartModule     done={completed['two-part']}     onDone={() => handleComplete('two-part')} />,
    fabs:        <FABSModule        done={completed.fabs}            onDone={() => handleComplete('fabs')} />,
    xray:        <XRayModule        done={completed.xray}            onDone={() => handleComplete('xray')} />,
    shapes:      <ShapesModule      done={completed.shapes}          onDone={() => handleComplete('shapes')} />,
    trojan:      <TrojanModule      done={completed.trojan}          onDone={() => handleComplete('trojan')} />,
    traps:       <TrapsModule       done={completed.traps}           onDone={() => handleComplete('traps')} />,
    simulator:   <SimulatorModule   done={completed.simulator}       onDone={() => handleComplete('simulator')} />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/bootcamps')}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Bootcamps
          </Button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 font-bold select-none">Structure</span>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-72 border-r border-border p-6 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="space-y-1 mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 font-bold">Main Conclusion</p>
            <p className="text-[10px] text-muted-foreground">Bootcamp progress: {progress}%</p>
            <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 mt-3 text-[10px] uppercase tracking-widest text-amber-400 font-bold"
              >
                <Award className="w-3.5 h-3.5" /> Bootcamp complete
              </motion.div>
            )}
          </div>
          <nav className="space-y-1">
            {MODULES.map(mod => {
              const isActive = activeModule === mod.id;
              const isDone = completed[mod.id];
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all gap-2',
                    isActive ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={cn('font-mono text-[10px]', isActive ? 'text-amber-400/70' : 'text-muted-foreground/60')}>{mod.n}</span>
                    <span className="truncate">{mod.title}</span>
                  </span>
                  {isDone
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    : <Circle className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden sticky top-[65px] z-10 bg-background border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {MODULES.map(mod => {
              const isActive = activeModule === mod.id;
              const isDone = completed[mod.id];
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap flex items-center gap-1.5',
                    isActive ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground',
                  )}
                >
                  <span className="font-mono">{mod.n}</span>
                  <span>{mod.title}</span>
                  {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                </button>
              );
            })}
          </div>
          <div className="h-1 bg-accent">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-3xl space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {moduleComponents[activeModule]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Structure;
