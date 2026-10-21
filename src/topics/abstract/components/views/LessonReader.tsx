import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { LESSONS, ABSTRACT_CHOICES } from '../../data/mockData';
import { CheckCircle, CheckCircle2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, MessageSquare, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CalloutProps { title: string; children: React.ReactNode; variant?: 'default' | 'plain'; }
const Callout = ({ title, children, variant = 'default' }: CalloutProps) => (
  <div className={cn("p-6 md:p-7 border-2 border-brutal-ink mb-6", variant === 'default' ? "bg-brutal-yellow" : "bg-white")}>
    <h4 className="text-xs font-black uppercase tracking-widest mb-3 text-brutal-ink">{title}</h4>
    <div className="text-brutal-ink">{children}</div>
  </div>
);

const Checklist = ({ items }: { items: string[] }) => (
  <div className="bg-brutal-cyan border-4 border-brutal-ink p-8 rounded-xl my-8 brutal-shadow">
    <h4 className="text-xs font-black text-brutal-ink uppercase tracking-widest mb-6">Check the match</h4>
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-4 text-brutal-ink font-bold">
          <div className="w-6 h-6 border-2 border-brutal-ink bg-white flex-shrink-0" />
          {item}
        </div>
      ))}
    </div>
  </div>
);

const RuleCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white border-4 border-brutal-ink p-8 rounded-xl my-10 brutal-shadow-lg relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-8 bg-brutal-pink border-b-4 border-l-4 border-brutal-ink -mr-2 -mt-2"></div>
    <h4 className="text-xs font-black text-brutal-ink uppercase tracking-widest mb-4">TAKEAWAY</h4>
    <p className="text-2xl text-brutal-ink font-black leading-tight tracking-tight uppercase">{children}</p>
  </div>
);

const MethodStep = ({ step, title, explanation, action }: { step: number; title: string; explanation: string; action: string }) => (
  <div className="bg-white p-6 rounded-xl border-4 border-brutal-ink mb-6 brutal-shadow">
    <div className="text-brutal-ink font-black text-xl mb-2 uppercase tracking-tighter italic">Step {step}: {title}</div>
    <p className="text-brutal-ink font-bold mb-4 leading-tight">{explanation}</p>
    <div className="bg-brutal-green border-2 border-brutal-ink p-5 rounded-lg text-sm text-brutal-ink font-bold brutal-shadow-sm">
      <span className="font-black block mb-2 uppercase tracking-widest text-xs">What to do:</span>
      {action}
    </div>
  </div>
);

const DecodePracticeCard = () => {
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-8">
      <div className="bg-white border-4 border-brutal-ink p-8 brutal-shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <span className="text-brutal-ink font-black text-xs uppercase tracking-widest">1. Extract the keywords</span>
          {step === 0 && (
            <button 
              onClick={() => setStep(1)} 
              className="px-6 py-2 bg-brutal-cyan border-2 border-brutal-ink text-brutal-ink text-xs font-black hover:bg-brutal-cyan/80 transition-all uppercase brutal-shadow-sm"
            >
              Reveal Keywords
            </button>
          )}
        </div>
        {step >= 1 && (
          <div className="flex gap-3 flex-wrap">
            <span className="px-4 py-2 bg-brutal-yellow border-2 border-brutal-ink text-brutal-ink font-black text-sm uppercase italic rotate-[-1deg]">hypothesis</span>
            <span className="px-4 py-2 bg-brutal-pink border-2 border-brutal-ink text-brutal-ink font-black text-sm uppercase italic rotate-[2deg]">undermine</span>
            <span className="px-4 py-2 bg-brutal-cyan border-2 border-brutal-ink text-brutal-ink font-black text-sm uppercase italic rotate-[-2deg]">sufficiency of the evidence</span>
          </div>
        )}
      </div>

      {step >= 1 && (
        <div className="bg-white border-4 border-brutal-ink p-8 brutal-shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <span className="text-brutal-ink font-black text-xs uppercase tracking-widest">2. Translate into LSAT meanings</span>
            {step === 1 && (
              <button 
                onClick={() => setStep(2)} 
                className="px-6 py-2 bg-brutal-pink border-2 border-brutal-ink text-brutal-ink text-xs font-black hover:bg-brutal-pink/80 transition-all uppercase brutal-shadow-sm"
              >
                Reveal Meanings
              </button>
            )}
          </div>
          {step >= 2 && (
            <div className="space-y-4">
              {[
                { t: 'hypothesis', m: 'potential explanation or potential causation' },
                { t: 'undermine', m: 'weaken or attack' },
                { t: 'sufficiency of the evidence', m: 'whether the evidence is enough' }
              ].map((item, i) => (
                <div key={i} className="bg-brutal-green/20 border-2 border-brutal-ink p-4">
                  <span className="text-[10px] font-black uppercase text-brutal-ink-soft tracking-[0.15em] block">{item.t}</span>
                  <p className="text-brutal-ink font-bold">{item.m}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step >= 2 && (
        <div className="bg-white border-4 border-brutal-ink p-8 brutal-shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <span className="text-brutal-ink font-black text-xs uppercase tracking-widest">3. Plain English Translation</span>
            {step === 2 && (
              <button 
                onClick={() => setStep(3)} 
                className="px-6 py-2 bg-brutal-yellow border-2 border-brutal-ink text-brutal-ink text-xs font-black hover:bg-brutal-yellow/80 transition-all uppercase brutal-shadow-sm"
              >
                Reveal Translation
              </button>
            )}
          </div>
          {step >= 3 && (
            <p className="text-2xl text-brutal-ink font-black leading-none uppercase tracking-tighter italic border-4 border-brutal-ink p-6 bg-brutal-green/10 rotate-[1deg]">
              “The argument is trying to weaken a potential explanation by saying the available evidence is not enough to support it.”
            </p>
          )}
        </div>
      )}

      {step >= 3 && (
        <div className="bg-white border-4 border-brutal-ink p-8 brutal-shadow animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <span className="text-brutal-ink font-black text-xs uppercase tracking-widest">4. What must match in the stimulus?</span>
            {step === 3 && (
              <button 
                onClick={() => setStep(4)} 
                className="px-6 py-2 bg-brutal-ink border-2 border-brutal-ink text-white text-xs font-black hover:bg-brutal-ink/90 transition-all uppercase brutal-shadow-sm"
              >
                Reveal Checklist
              </button>
            )}
          </div>
          {step >= 4 && (
            <div className="space-y-4">
              {[
                "Is there a hypothesis, meaning a potential explanation or causal theory?",
                "Does the argument try to weaken that hypothesis?",
                "Does it weaken it by saying the evidence is insufficient?"
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-4 text-brutal-ink font-medium">
                  <div className="w-6 h-6 border-2 border-brutal-ink bg-white flex-shrink-0 mt-0.5" />
                  <p className="font-bold leading-tight">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DecodeGauntlet = ({ onComplete }: { onComplete: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [selectedKeywords, setSelectedKeywords] = useState<Record<number, string[]>>({});
  const [translation, setTranslation] = useState<Record<number, string>>({});
  const [checkedRequirements, setCheckedRequirements] = useState<Record<number, number[]>>({});

  const item = ABSTRACT_CHOICES[currentIndex];
  const isApplied = submitted[currentIndex];

  const allKeywords = React.useMemo(() => [...item.correctKeywords, ...item.distractorKeywords].sort(), [item]);
  const allRequirements = React.useMemo(() => [...item.stimulusRequirements, ...item.trapRequirements].sort(), [item]);

  const handleKeywordToggle = (kw: string) => {
    if (isApplied) return;
    setSelectedKeywords(prev => {
      const current = prev[currentIndex] || [];
      if (current.includes(kw)) {
        return { ...prev, [currentIndex]: current.filter(k => k !== kw) };
      }
      return { ...prev, [currentIndex]: [...current, kw] };
    });
  };

  const handleRequirementToggle = (reqIndex: number) => {
    if (isApplied) return;
    setCheckedRequirements(prev => {
      const current = prev[currentIndex] || [];
      if (current.includes(reqIndex)) {
        return { ...prev, [currentIndex]: current.filter(i => i !== reqIndex) };
      }
      return { ...prev, [currentIndex]: [...current, reqIndex] };
    });
  };

  const handleSubmit = () => {
    setSubmitted(prev => ({ ...prev, [currentIndex]: true }));
    setAttempted(prev => ({ ...prev, [currentIndex]: true }));
  };

  const next = () => {
    if (currentIndex < ABSTRACT_CHOICES.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-12 max-w-[760px] mx-auto">
      {/* Progress Rail */}
      <div className="flex flex-wrap gap-3 justify-center pb-8 border-b-4 border-brutal-ink">
        {ABSTRACT_CHOICES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={cn(
              "w-10 h-10 border-2 border-brutal-ink flex items-center justify-center text-sm font-black transition-all brutal-shadow-sm",
              currentIndex === i 
                ? "bg-brutal-ink text-white translate-x-[2px] translate-y-[2px] shadow-none" 
                : attempted[i]
                  ? "bg-brutal-green text-brutal-ink"
                  : "bg-white text-brutal-ink/40 hover:bg-brutal-cyan/20"
            )}
          >
            {attempted[i] ? <CheckCircle className="w-4 h-4 fill-brutal-ink text-brutal-green" /> : i + 1}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <span className="text-[12px] font-black text-brutal-ink bg-brutal-cyan px-2 py-1 border-2 border-brutal-ink uppercase tracking-widest">GAUNTLET ITEM {currentIndex + 1}/15</span>
        <div className="bg-white p-10 border-4 border-brutal-ink brutal-shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-8 h-8 bg-brutal-yellow border-l-4 border-b-4 border-brutal-ink" />
          <p className="text-2xl leading-tight text-brutal-ink font-black uppercase italic tracking-tighter">
            "{item.original}"
          </p>
        </div>
      </div>

      <div className="grid gap-12">
        {/* Step 1: Keywords */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-white border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm">1. Pick the keywords doing the work</h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {allKeywords.map((kw) => {
              const selected = (selectedKeywords[currentIndex] || []).includes(kw);
              const correct = item.correctKeywords.includes(kw);
              return (
                <button
                  key={kw}
                  disabled={isApplied}
                  onClick={() => handleKeywordToggle(kw)}
                  className={cn(
                    "px-4 py-2 border-3 font-black transition-all brutal-shadow-sm uppercase tracking-tight text-sm",
                    isApplied
                      ? correct
                        ? "bg-brutal-green text-brutal-ink border-brutal-ink"
                        : selected
                          ? "bg-brutal-red text-white border-brutal-ink"
                          : "bg-white border-brutal-ink opacity-20"
                      : selected
                        ? "bg-brutal-ink text-white border-brutal-ink translate-x-[1px] translate-y-[1px] shadow-none"
                        : "bg-white border-brutal-ink text-brutal-ink hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000]"
                  )}
                >
                  {kw}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Translation */}
        <section className="space-y-6">
          <h4 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-white border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">2. Translate into plain English</h4>
          <textarea
            disabled={isApplied}
            value={translation[currentIndex] || ''}
            onChange={(e) => setTranslation(prev => ({ ...prev, [currentIndex]: e.target.value }))}
            placeholder="DECODE THE CHOICE..."
            className="w-full bg-white border-4 border-brutal-ink p-6 text-xl font-black text-brutal-ink placeholder:text-brutal-ink/20 focus:outline-none brutal-shadow-lg min-h-[140px] uppercase tracking-tighter italic"
          />
        </section>

        {/* Step 3: Requirements */}
        <section className="space-y-6">
          <h4 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-white border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">3. Stimulus checklist</h4>
          <div className="grid gap-4">
            {allRequirements.map((req, i) => {
              const checked = (checkedRequirements[currentIndex] || []).includes(i);
              const isCorrect = item.stimulusRequirements.includes(req);
              return (
                <button
                  key={i}
                  disabled={isApplied}
                  onClick={() => handleRequirementToggle(i)}
                  className={cn(
                    "flex items-start gap-4 p-6 border-4 transition-all text-left brutal-shadow-sm",
                    isApplied
                      ? isCorrect
                        ? "bg-brutal-green border-brutal-ink text-brutal-ink font-black"
                        : checked
                          ? "bg-brutal-red border-brutal-ink text-white font-black"
                          : "bg-white border-brutal-ink opacity-20"
                      : checked
                        ? "bg-brutal-cyan border-brutal-ink text-brutal-ink font-black"
                        : "bg-white border-brutal-ink text-brutal-ink hover:bg-brutal-cyan/10"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 border-2 border-brutal-ink mt-0.5 flex-shrink-0 flex items-center justify-center",
                    checked ? "bg-brutal-ink text-white" : "bg-white"
                  )}>
                    {/*
                      The glyph has to agree with the fill. It used to render a
                      CheckCircle whenever `checked || (isApplied && isCorrect)`,
                      which put a tick on a wrongly-checked row — the icon said
                      "right" while the red fill said "wrong", and for anyone who
                      cannot separate brutal-green from brutal-red the tick was the
                      only signal they had. Post-grading the glyph now states the
                      verdict for this row on its own.
                    */}
                    {isApplied
                      ? checked
                        ? isCorrect
                          ? <CheckCircle className="w-4 h-4" aria-label="Correctly selected" />
                          : <X className="w-4 h-4" strokeWidth={3} aria-label="Wrongly selected" />
                        : isCorrect
                          ? <CheckCircle className="w-4 h-4 opacity-60" aria-label="Missed — should have been selected" />
                          : null
                      : checked && <CheckCircle className="w-4 h-4" aria-label="Selected" />}
                  </div>
                  <span className="text-[17px] font-bold leading-tight uppercase tracking-tight">{req}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Action / Reveal Area */}
        <div className="pt-10 border-t-4 border-brutal-ink">
          {!isApplied ? (
            <button
              onClick={handleSubmit}
              className="w-full py-6 bg-brutal-ink text-white border-4 border-brutal-ink font-black text-xl tracking-widest hover:bg-brutal-ink/90 transition-all uppercase brutal-shadow"
            >
              Confirm Translation
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <div className="grid gap-8">
                <div className="bg-brutal-green border-4 border-brutal-ink p-8 brutal-shadow">
                  <h5 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest mb-4">Official Translation</h5>
                  <p className="text-[24px] text-brutal-ink font-black italic uppercase leading-none tracking-tighter">"{item.plainEnglish}"</p>
                </div>

                <div className="bg-white border-4 border-brutal-ink p-8 brutal-shadow">
                  <h5 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest mb-4">Coach Note</h5>
                  <p className="text-[18px] text-brutal-ink font-bold leading-tight mb-6">{item.coachNote}</p>
                  {item.example && (
                    <div className="bg-brutal-yellow p-6 border-2 border-brutal-ink brutal-shadow-sm">
                      <span className="text-[10px] font-black text-brutal-ink uppercase tracking-widest block mb-2">Concrete Example</span>
                      <p className="text-md text-brutal-ink font-bold italic leading-snug">{item.example}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={prev}
                  disabled={currentIndex === 0}
                  className="px-8 py-5 bg-white border-4 border-brutal-ink text-brutal-ink font-black text-sm hover:bg-brutal-ink hover:text-white transition-all brutal-shadow disabled:opacity-30 disabled:cursor-not-allowed uppercase"
                >
                  PREV
                </button>
                <button
                  onClick={next}
                  className="flex-1 py-5 bg-brutal-pink text-brutal-ink border-4 border-brutal-ink font-black text-sm tracking-widest hover:bg-brutal-pink/90 transition-all uppercase brutal-shadow"
                >
                  {currentIndex === ABSTRACT_CHOICES.length - 1 ? 'Finish Gauntlet' : 'Next Item'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LessonReaderProps {
  lockedLessonId?: string;
  hideNav?: boolean;
  hideComplete?: boolean;
  hideTitle?: boolean;
  hideCard?: boolean;
  casedBody?: boolean;
  onComplete?: () => void;
}

export default function LessonReader({
  lockedLessonId,
  hideNav,
  hideComplete,
  hideTitle,
  hideCard,
  casedBody,
  onComplete,
}: LessonReaderProps = {}) {
  const { bootcampState, markLessonComplete, setCurrentView } = useApp();

  const firstUncompletedId = LESSONS.find(l => !bootcampState.completedLessons.includes(l.id))?.id || LESSONS[0].id;
  const [internalLessonId, setCurrentLessonId] = useState(firstUncompletedId);
  const currentLessonId = lockedLessonId ?? internalLessonId;
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<'hypothesis' | 'undermine' | 'sufficiency'>('hypothesis');
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);

  const keywordKeys = ['hypothesis', 'undermine', 'sufficiency'] as const;
  const activeIndex = keywordKeys.indexOf(activeKeyword);

  const handlePrevKeyword = () => {
    const prevIndex = (activeIndex - 1 + keywordKeys.length) % keywordKeys.length;
    setActiveKeyword(keywordKeys[prevIndex]);
  };

  const handleNextKeyword = () => {
    const nextIndex = (activeIndex + 1) % keywordKeys.length;
    setActiveKeyword(keywordKeys[nextIndex]);
  };

  const decodeData = {
    hypothesis: {
      term: "Hypothesis",
      helper: "Hypothesis means a potential explanation, not just any claim.",
      meaning: "A potential explanation or potential causation.",
      coach: "Do not flatten this into “claim.” A hypothesis is trying to explain why something happened or why something is the way it is.",
      check: "Is the quoted idea being offered as a possible explanation?"
    },
    undermine: {
      term: "Undermine",
      helper: "Undermine means the argument is pushing against the idea.",
      meaning: "To weaken or attack.",
      coach: "The argument is not supporting the hypothesis. It is pushing against it.",
      check: "Does the argument challenge the hypothesis?"
    },
    sufficiency: {
      term: "Sufficiency of the evidence",
      helper: "This is about whether the evidence is strong enough.",
      meaning: "Whether the evidence is enough.",
      coach: "The issue is not just whether evidence exists. The issue is whether the evidence is strong enough.",
      check: "Is the attack specifically about weak or insufficient evidence?"
    }
  };

  const currentIndex = LESSONS.findIndex(l => l.id === currentLessonId);
  const lesson = LESSONS[currentIndex];
  const isCompleted = bootcampState.completedLessons.includes(lesson.id);
  const [gauntletFinished, setGauntletFinished] = useState(false);

  const handleComplete = () => {
    markLessonComplete(lesson.id);
    if (onComplete) {
      onComplete();
      return;
    }
    if (currentIndex < LESSONS.length - 1) {
      setCurrentLessonId(LESSONS[currentIndex + 1].id);
      setOpenCardId(null);
      setGauntletFinished(false);
    } else {
      setCurrentView('dashboard');
    }
  };

  const toggleCard = (id: number) => {
    setOpenCardId(prev => prev === id ? null : id);
  };

  const renderContent = () => {
    switch (lesson.id) {
      case 'why_hard':
        return (
          <div className="space-y-8 text-brutal-ink max-w-[720px] mx-auto">
            <p className="text-2xl font-black tracking-tight text-brutal-ink">The LSAT is not written in English.</p>
            <p>It looks like English. The words are English. But answer choices often use normal words in a very specific LSAT way.</p>
            <p>The hard part is not always understanding the stimulus. The hard part is understanding what the answer choice is <span className="font-semibold bg-brutal-yellow/60 px-1">actually describing</span>.</p>

            <div>
              <Callout title="THE CHALLENGE">
                <p className="text-lg leading-relaxed">Abstract answer choices are hard because they describe simple ideas in abstract language.</p>
                <p className="mt-4 leading-relaxed">Your job is to translate that language into <span className="font-semibold bg-brutal-paper/80 px-1">the exact thing it refers to in the stimulus</span>.</p>
              </Callout>
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase font-black tracking-widest text-brutal-ink-soft">Example answer choice</p>
              <div className="bg-white p-7 md:p-8 border-4 border-brutal-ink brutal-shadow relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-brutal-red border-l-4 border-b-4 border-brutal-ink"></div>
                <p className="text-[24px] leading-tight text-brutal-ink font-black tracking-tighter uppercase italic text-center">
                  “It is a <span className={cn("transition-colors duration-300 rounded px-1 border-2 border-transparent", activeKeyword === 'hypothesis' ? "bg-brutal-yellow border-brutal-ink" : "")}>hypothesis</span> that the argument attempts to <span className={cn("transition-colors duration-300 rounded px-1 border-2 border-transparent", activeKeyword === 'undermine' ? "bg-brutal-pink border-brutal-ink" : "")}>undermine</span> by calling into question the <span className={cn("transition-colors duration-300 rounded px-1 border-2 border-transparent", activeKeyword === 'sufficiency' ? "bg-brutal-cyan border-brutal-ink" : "")}>sufficiency of the evidence</span>.”
                </p>
              </div>
              <p className="text-sm font-black italic pt-4">Yep, that is a lot. But the idea underneath it is not nearly as complicated as the wording makes it seem.</p>
            </div>

            <div className="pt-16 space-y-16 max-w-[760px] mx-auto">
              {/* STEP 1 */}
              <div className="space-y-8">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 1</span>
                  <h4 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter">Find the words doing the work</h4>
                  <p className="text-brutal-ink opacity-70">Do not read the sentence as one big blob. Pull out the words that control the meaning.</p>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  {(['hypothesis', 'undermine', 'sufficiency'] as const).map((key) => {
                    const isActive = activeKeyword === key;
                    const isHovered = hoveredKeyword === key;
                    return (
                      <div key={key} className="relative">
                        <button
                          onClick={() => setActiveKeyword(key)}
                          onMouseEnter={() => {
                            setActiveKeyword(key);
                            setHoveredKeyword(key);
                          }}
                          onMouseLeave={() => setHoveredKeyword(null)}
                          onFocus={() => setActiveKeyword(key)}
                          aria-pressed={isActive}
                          className={cn(
                            "px-6 py-3 border-4 font-black transition-all duration-150 uppercase tracking-tight text-lg brutal-shadow-sm",
                            isActive 
                              ? "bg-brutal-ink text-white border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none" 
                              : "bg-white border-brutal-ink text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000] hover:brightness-110 hover:border-indigo-400"
                          )}
                        >
                          {key === 'sufficiency' ? 'sufficiency of the evidence' : key}
                        </button>

                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 z-[60] w-72 p-6 bg-white border-4 border-brutal-ink brutal-shadow-lg pointer-events-none"
                            >
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-brutal-ink uppercase tracking-widest block opacity-50">LSAT Translation</span>
                                <p className="text-2xl font-black leading-none text-brutal-ink uppercase italic italic tracking-tighter">
                                  {decodeData[key].meaning}
                                </p>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-4 border-b-4 border-brutal-ink rotate-45 -mt-[10px]" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-brutal-ink text-white px-6 py-3 border-4 border-brutal-ink inline-block brutal-shadow-sm">
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={activeKeyword}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="text-sm font-black uppercase tracking-widest"
                    >
                      {decodeData[activeKeyword].helper}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="space-y-8">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 2</span>
                  <h4 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter">Translate each word</h4>
                  <p className="text-brutal-ink opacity-70">Each word changes what the answer choice is saying.</p>
                </div>

                <div className="relative group">
                  <div className="absolute top-1/2 -left-12 -translate-y-1/2 hidden md:block">
                    <button 
                      onClick={handlePrevKeyword}
                      className="p-3 bg-white border-4 border-brutal-ink hover:bg-brutal-yellow text-brutal-ink transition-all brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                  </div>

                  <div className="absolute top-1/2 -right-12 -translate-y-1/2 hidden md:block">
                    <button 
                      onClick={handleNextKeyword}
                      className="p-3 bg-white border-4 border-brutal-ink hover:bg-brutal-yellow text-brutal-ink transition-all brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeKeyword}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "p-12 border-4 bg-white border-brutal-ink brutal-shadow-lg min-h-[450px] flex flex-col justify-between"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-12">
                          <h5 className="font-black text-6xl tracking-tighter text-brutal-ink uppercase italic leading-none">{decodeData[activeKeyword].term}</h5>
                          <motion.span 
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs font-black bg-brutal-ink text-white px-4 py-1.5 rotate-2 uppercase tracking-widest"
                          >
                            Step {activeIndex + 1}
                          </motion.span>
                        </div>
                        
                        <div className="space-y-12">
                          <div className="bg-brutal-green/20 border-4 border-brutal-ink p-6">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft mb-2 block">LSAT Meaning</span>
                            <p className="text-[32px] text-brutal-ink font-black leading-[1.1] uppercase tracking-tighter italic">{decodeData[activeKeyword].meaning}</p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-10">
                            <div className="bg-white p-6 border-4 border-brutal-ink brutal-shadow-sm rotate-[-1deg]">
                              <div className="flex items-center gap-2 mb-3">
                                <MessageSquare className="w-4 h-4 text-brutal-red" />
                                <span className="text-brutal-ink opacity-40 uppercase tracking-[0.2em] text-[10px] font-black">Coach Note</span>
                              </div>
                              <p className="text-[17px] text-brutal-ink font-bold leading-tight">{decodeData[activeKeyword].coach}</p>
                            </div>

                            <div className="bg-white p-6 border-4 border-brutal-ink brutal-shadow-sm rotate-[1deg]">
                              <div className="flex items-center gap-2 mb-3">
                                <Search className="w-4 h-4 text-brutal-cyan" />
                                <span className="text-brutal-ink opacity-40 uppercase tracking-[0.2em] text-[10px] font-black">Stimulus Check</span>
                              </div>
                              <p className="text-[17px] text-brutal-ink font-bold leading-tight">{decodeData[activeKeyword].check}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-14 flex justify-center gap-4">
                        {keywordKeys.map((key, i) => (
                          <button
                            key={key}
                            onClick={() => setActiveKeyword(key)}
                            className={cn(
                              "w-4 h-4 border-2 border-brutal-ink transition-all duration-300",
                              activeIndex === i ? "w-12 bg-brutal-ink" : "bg-white hover:bg-brutal-ink/10"
                            )}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

                  <div className="flex md:hidden justify-between mt-10">
                    <button 
                      onClick={handlePrevKeyword}
                      className="px-8 py-4 bg-white border-4 border-brutal-ink text-brutal-ink font-black uppercase brutal-shadow"
                    >
                      PREV
                    </button>
                    <button 
                      onClick={handleNextKeyword}
                      className="px-8 py-4 bg-brutal-ink text-white border-4 border-brutal-ink font-black uppercase brutal-shadow"
                    >
                      NEXT
                    </button>
                  </div>

              {/* STEP 3 */}
              <div className="space-y-10">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 3</span>
                  <h4 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter">Put the pieces together</h4>
                  <p className="text-brutal-ink opacity-70">Now combine the three translations into one plain-English sentence.</p>
                </div>
                
                <div className="bg-brutal-green/20 border-4 border-brutal-ink p-12 brutal-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:opacity-10 transition-opacity">
                    <CheckCircle2 className="w-24 h-24 text-brutal-ink" />
                  </div>
                  <h5 className="text-xs font-black text-brutal-ink uppercase tracking-widest mb-6 inline-block bg-white px-2 border-2 border-brutal-ink">Plain English Translation</h5>
                  <p className="text-3xl font-black text-brutal-ink leading-tight uppercase tracking-tighter italic">
                    “The argument is trying to weaken a potential explanation by saying the available evidence is not enough to support it.”
                  </p>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="space-y-10 pt-8">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 4</span>
                  <h4 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter">Check the stimulus</h4>
                  <p className="text-brutal-ink opacity-70">Use this checklist to verify every part of the answer choice.</p>
                </div>
                
                <div className="bg-white border-4 border-brutal-ink p-12 brutal-shadow-lg space-y-12">
                  <div className="space-y-6">
                    {[
                      "Is there a hypothesis, meaning a potential explanation or causal theory?",
                      "Does the argument try to weaken that hypothesis?",
                      "Is the attack specifically about weak or insufficient evidence?"
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-6 group">
                        <div className="w-8 h-8 border-4 border-brutal-ink bg-white flex-shrink-0 mt-1 flex items-center justify-center transition-colors group-hover:bg-brutal-cyan">
                          {/* Checkbox placeholder */}
                        </div>
                        <p className="text-xl font-bold text-brutal-ink uppercase tracking-tight italic leading-none py-2">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-10 border-t-4 border-brutal-ink flex flex-col md:flex-row gap-12">
                    <div className="space-y-2">
                      <span className="text-xs font-black text-brutal-green uppercase tracking-widest bg-brutal-ink px-2">Match</span>
                      <p className="text-brutal-ink font-black text-lg uppercase italic leading-none">All pieces present? The answer is <span className="bg-brutal-green border-2 border-brutal-ink px-1">alive</span>.</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-black text-brutal-pink uppercase tracking-widest bg-brutal-ink px-2">Mismatch</span>
                      <p className="text-brutal-ink font-black text-lg uppercase italic leading-none">One piece missing? The answer is <span className="bg-brutal-pink border-2 border-brutal-ink px-1 text-white">dead</span>.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FINAL TAKEAWAY */}
              <div className="bg-brutal-ink text-white p-12 border-4 border-brutal-ink brutal-shadow mt-16 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 translate-x-12 translate-y-12 rotate-45" />
                <span className="text-xs font-black text-brutal-yellow uppercase tracking-[0.2em] block mb-6">TAKEAWAY</span>
                <div className="space-y-6">
                  <p className="text-4xl font-black uppercase italic leading-tight tracking-tighter text-brutal-cyan">Do not pick an answer because it sounds related.</p>
                  <p className="text-2xl font-bold leading-snug bg-brutal-cyan/20 border-4 border-brutal-cyan p-6">
                    Extract the keywords. Translate them. Then make every meaningful part prove itself in the stimulus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'deabstractifying_method':
        return (
          <div className="space-y-8 text-brutal-ink font-bold text-[18px] leading-tight">
            <p className="max-w-[760px] mx-auto text-xl font-bold italic leading-snug">Since the answer choices use vague language, you have to master a skill called <span className="uppercase text-brutal-red italic tracking-tighter">de-abstractifying</span>.</p>
            
            <div className="max-w-[760px] mx-auto">
              <RuleCard>
                De-abstractifying means translating vague or abstract answer-choice language into the concrete thing it refers to in the stimulus.
              </RuleCard>
            </div>

            <p className="max-w-[760px] mx-auto">This is a precise 3-step process:</p>

            <div className="bg-white border-4 border-brutal-ink p-10 brutal-shadow max-w-[760px] mx-auto space-y-6 relative group">
              <div className="absolute top-[-20px] right-8 bg-brutal-pink border-2 border-brutal-ink px-4 py-1 font-black uppercase text-xs rotate-2 brutal-shadow-sm group-hover:rotate-0 transition-transform">REQUIRED SKILL</div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 border-4 border-brutal-ink bg-brutal-cyan text-brutal-ink flex items-center justify-center font-black text-xl rotate-[-2deg] shrink-0 brutal-shadow-sm">1</div>
                <p className="text-brutal-ink font-black uppercase tracking-tighter">Extract the keywords.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 border-4 border-brutal-ink bg-brutal-yellow text-brutal-ink flex items-center justify-center font-black text-xl rotate-[3deg] shrink-0 brutal-shadow-sm">2</div>
                <p className="text-brutal-ink font-black uppercase tracking-tighter">Translate each keyword into LSAT language.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 border-4 border-brutal-ink bg-brutal-green text-brutal-ink flex items-center justify-center font-black text-xl rotate-[-1deg] shrink-0 brutal-shadow-sm">3</div>
                <p className="text-brutal-ink font-black uppercase tracking-tighter">Match each translated part back to the stimulus.</p>
              </div>
            </div>
            
            <div className="max-w-[760px] mx-auto pt-8">
              <Callout title="THE LSAT U WAY" variant="plain">
                <p className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-brutal-pink leading-none">Do not ask, "Does this sound related?"</p>
                <p className="text-xl font-bold">Ask, "Can I point to every meaningful part of this answer choice in the stimulus?"</p>
              </Callout>
            </div>
            
            <p className="max-w-[760px] mx-auto text-brutal-ink font-black tracking-tight"><span className="bg-brutal-yellow/70 px-1">If one meaningful part does not match, the answer is dead on arrival.</span></p>
          </div>
        );

      case 'words_to_know':
        return (
          <div className="space-y-8 text-brutal-ink font-bold text-[18px]">
            <p className="max-w-[760px]">To de-abstractify quickly, you need to know what certain words mean when the LSAT uses them.</p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {[
                { term: 'Presuppose', meaning: 'Require.', note: 'On the LSAT, "presuppose" means the argument requires something. It points to something necessary for the reasoning to work.' },
                { term: 'Illustrate', meaning: 'Example.', note: 'If an answer choice says something "illustrates" something else, the quoted statement is functioning as an example.' },
                { term: 'General Principle', meaning: 'Broad Rule.', note: 'A principle is not just one person’s situation. It is a broader rule about what should or should not happen.' },
                { term: 'Explanation', meaning: 'Cause.', note: 'On the LSAT, "explanation" usually means a cause. Look for cause-effect reasoning.' },
                { term: 'Hypothesis', meaning: 'Potential Explanation.', note: 'Do not flatten "hypothesis" into "claim." A hypothesis is usually a proposed explanation for WHY.' },
                { term: 'Premise', meaning: 'Support.', note: 'A statement offered as evidence for a conclusion.' },
                { term: 'Intermediate Conclusion', meaning: 'Stepping Stone.', note: 'A statement supported by others and supporting the final point.' },
                { term: 'Main Conclusion', meaning: 'Final Point.', note: 'The ultimate claim the author wants you to accept.' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 border-4 border-brutal-ink brutal-shadow transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000]">
                  <span className={cn("inline-block px-2 py-0.5 border-2 border-brutal-ink text-[10px] font-black uppercase mb-3", i % 4 === 0 ? "bg-brutal-yellow" : i % 4 === 1 ? "bg-brutal-cyan" : i % 4 === 2 ? "bg-brutal-pink" : "bg-brutal-green")}>
                    LSAT DICTIONARY
                  </span>
                  <h5 className="text-2xl font-black text-brutal-ink uppercase mb-1">{item.term}</h5>
                  <p className="text-lg font-black text-brutal-ink opacity-80 mb-4 italic leading-none">{item.meaning}</p>
                  <p className="text-[14px] leading-tight opacity-70 font-bold">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'abstract_15':
        return (
          <div className="space-y-12 text-brutal-ink font-bold text-[18px] leading-tight">
            <div className="max-w-[760px] mx-auto flex flex-col items-center text-center gap-4">
              <p className="opacity-50 text-xs font-black uppercase tracking-[0.2em]">BOOTCAMP DECODE CHALLENGE</p>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">The Decoding Gauntlet</h2>
              <p className="max-w-xl">You must decode all 18 abstract choices to continue. Break them apart. Translate them. Force them to prove themselves.</p>
            </div>
            
            <div className="max-w-[760px] mx-auto bg-white border-4 border-brutal-ink p-10 brutal-shadow relative group">
              <div className="absolute top-[-20px] left-8 bg-brutal-ink text-white border-2 border-brutal-ink px-4 py-1 font-black uppercase text-xs rotate-[-1deg] brutal-shadow-sm group-hover:rotate-0 transition-transform">GAUNTLET RULES</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-brutal-ink bg-brutal-cyan flex items-center justify-center font-black text-xs">1</div>
                  <p className="font-bold uppercase tracking-tight leading-tight">Pick the keywords doing the work.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-brutal-ink bg-brutal-yellow flex items-center justify-center font-black text-xs">2</div>
                  <p className="font-bold uppercase tracking-tight leading-tight">Translate them into LSAT meanings.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-brutal-ink bg-brutal-pink flex items-center justify-center font-black text-xs">3</div>
                  <p className="font-bold uppercase tracking-tight leading-tight">Identify stimulus requirements.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-brutal-ink bg-brutal-green flex items-center justify-center font-black text-xs">4</div>
                  <p className="font-bold uppercase tracking-tight leading-tight">Check your work against coach notes.</p>
                </div>
              </div>
            </div>

            <DecodeGauntlet onComplete={() => setGauntletFinished(true)} />
          </div>
        );

      case 'decode_practice':
        return (
          <div className="space-y-12 text-brutal-ink font-bold text-[18px] leading-tight max-w-[760px] mx-auto">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">PRACTICE DRILL</span>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">De-abstractifying Drill</h2>
              <p className="opacity-70">Apply the method to a real abstract choice. No guessing. Just matching.</p>
            </div>

            <div className="bg-white border-4 border-brutal-ink p-12 brutal-shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-12 h-12 bg-brutal-ink flex items-center justify-center text-white font-black italic">!</div>
              <h3 className="text-[12px] text-brutal-ink font-black uppercase tracking-widest mb-6 bg-brutal-yellow inline-block px-2 border-2 border-brutal-ink">Stimulus Segment</h3>

              <div className="bg-brutal-ink/5 border-4 border-brutal-ink p-8 mb-8 group-hover:bg-brutal-cyan/10 transition-colors">
                <p className="text-[26px] text-brutal-ink font-black uppercase tracking-tighter leading-none italic">
                  "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence."
                </p>
              </div>

              <DecodePracticeCard />
            </div>
          </div>
        );

      case 'master_keys':
        return (
          <div className="space-y-10 text-brutal-ink font-bold text-[18px] leading-tight max-w-[760px] mx-auto">
            <Callout title="Three Master Keys">
              Three words appear over and over inside abstract LR answer choices. Strip them out and the choice usually decodes itself.
            </Callout>
            <RuleCard>
              EXPLANATION = CAUSE. HYPOTHESIS = POTENTIAL CAUSE. PRESUPPOSE = REQUIRE.
            </RuleCard>
            <MethodStep step={1} title="Explanation = cause" explanation="On the LSAT, the word explanation has one meaning: the cause that produced the effect. It does not mean clarifying or elaborating." action="Whenever you see explanation, scan the stimulus for cause-effect language. If there is no cause-effect, the choice is wrong." />
            <MethodStep step={2} title="Hypothesis = potential cause" explanation="A hypothesis is a posited causal explanation: WHY something is the way it is. Darwin's hypothesis was that species change over time. It is a causal guess, not a prediction." action="When you see hypothesis, look for a proposed causal story. Strengthen / Weaken questions live here." />
            <MethodStep step={3} title="Presuppose = require" explanation="In everyday English, presupposes can mean assumes. On the LSAT, presuppose simply means: the argument requires this to be true. Necessary condition territory." action="When you see presupposes, ask: if this were false, would the argument fall apart? If yes, you've matched the keyword." />
            <Callout title="The other four key terms" variant="plain">
              Facts, Decision, Principle, and Generalization round out the seven keyword set. They are tested less directly but appear inside argument structures (premise vs background, prescription vs description).
            </Callout>
            <Checklist items={[
              "Spot the master key word in the answer choice.",
              "Translate it into its LSAT meaning before re-reading the stimulus.",
              "Check whether the stimulus actually has that structure.",
            ]} />
          </div>
        );

      case 'five_bucket_indicators':
        return (
          <div className="space-y-10 text-brutal-ink font-bold text-[18px] leading-tight max-w-[760px] mx-auto">
            <Callout title="Five Buckets, Five Indicator Sets">
              Every LR stimulus uses words that signal what kind of reasoning is happening. Sort each phrase you see into one of five buckets and the structural shape of the argument falls out.
            </Callout>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MethodStep step={1} title="Assumption" explanation="Unstated premise. The argument needs it but does not say it." action="Indicators: presupposes, takes for granted, requires, on the assumption that, implicit premise." />
              <MethodStep step={2} title="Causal" explanation="A cause is doing work in the argument." action="Indicators: explanation, hypothesis, causes, results in, due to, account for, leads to, responsible for." />
              <MethodStep step={3} title="Comparison" explanation="Two things are being lined up against each other." action="Indicators: analogous to, similar to, parallel to, compared with, contrasted with, just as, like." />
              <MethodStep step={4} title="Evidence" explanation="What is being offered as support, and how strong is it." action="Indicators: evidence, grounds, supports, justifies, demonstrates, establishes, substantiates, on the basis of." />
              <MethodStep step={5} title="Evaluation" explanation="The author is judging or assessing something." action="Indicators: undermines, calls into question, casts doubt on, vindicates, refutes, criticizes, defends." />
            </div>
            <RuleCard>
              EVERY ABSTRACT ANSWER CHOICE WORD BELONGS IN ONE OF FIVE BUCKETS. SORT FIRST, MATCH SECOND.
            </RuleCard>
          </div>
        );

      case 'art_of_matching':
        return (
          <div className="space-y-10 text-brutal-ink font-bold text-[18px] leading-tight max-w-[760px] mx-auto">
            <Callout title="The Art of Matching Keywords">
              For Role, Method, and Flaw questions, eliminate any answer choice that describes something that did not happen in the argument. The keywords are your lie detector.
            </Callout>
            <RuleCard>
              IDENTIFY (S)TRUCTURE → (K)EYWORDS. NEVER PICK AN ANSWER YOU CAN'T MATCH UP WITH THE STIMULUS.
            </RuleCard>
            <MethodStep step={1} title="Read the answer over and extract keywords" explanation="Strip down each abstract answer choice to its load-bearing words. Highlight or jot them." action="Skip filler verbs (used, is, makes). Keep nouns, action verbs, and qualifiers." />
            <MethodStep step={2} title="Analyze keywords in LSAT context" explanation="A word on the LSAT often means something different from its daily usage. Translate each keyword into its LSAT meaning." action="Cross-check with the seven key terms (presuppose, illustrate, general principle, explanation, hypothesis, facts, generalization)." />
            <MethodStep step={3} title="Check keyword relevance" explanation="For each keyword, decide what role it should play if the choice is correct." action="Noun: does the concept appear in the stimulus? Verb: does the author do this? Adjective/adverb: does it correctly describe tone or strength?" />
            <MethodStep step={4} title="Match each keyword back to the structure" explanation="Re-read the choice and try to align each keyword with a piece of the stimulus. Anything that doesn't match disqualifies the choice." action="Don't choose an answer if you can't match it up with the stimulus." />
            <Callout title="Beware of the one-word trap" variant="plain">
              A common LSAT trick: an almost perfect answer with a glaring error, usually due to one single word. Often placed right next to the correct answer, which is worded vaguely. You will encounter this repeatedly.
            </Callout>
            <Checklist items={[
              "Extract keywords first.",
              "Translate into LSAT meanings second.",
              "Match each keyword to the stimulus third.",
              "If one keyword fails to match, eliminate the whole choice.",
            ]} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-[720px] mx-auto z-10 relative">
      {!hideNav && (
      <div className="flex items-center justify-between mb-12">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white bg-brutal-ink px-2 py-0.5 rotate-[-2deg] brutal-shadow-sm uppercase tracking-widest w-fit">In Progress</span>
          <p className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em] mt-2">
            Lesson {currentIndex + 1} of {LESSONS.length}
          </p>
        </div>
        <div className="flex gap-4">
          {currentIndex > 0 && (
            <button 
              onClick={() => {
                setCurrentLessonId(LESSONS[currentIndex - 1].id);
                setOpenCardId(null);
              }}
              className="p-4 bg-white border-4 border-brutal-ink hover:bg-brutal-yellow text-brutal-ink transition-all brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentIndex < LESSONS.length - 1 && (
            <button 
              onClick={() => {
                setCurrentLessonId(LESSONS[currentIndex + 1].id);
                setOpenCardId(null);
              }}
              className="p-4 bg-white border-4 border-brutal-ink hover:bg-brutal-yellow text-brutal-ink transition-all brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
      )}

      <article
        className={cn(
          "z-10 relative",
          casedBody && "lesson-cased",
          hideCard
            ? "mb-0 p-0"
            : "mb-12 bg-white p-8 md:p-14 rounded-xl border-4 border-brutal-ink brutal-shadow-lg",
        )}
      >
        {lesson.hasInteractiveContent && (
          <div className="inline-block bg-brutal-pink px-3 py-1 border-2 border-brutal-ink mb-6 rotate-[-1deg] brutal-shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Interactive Lesson</span>
          </div>
        )}
        {!hideTitle && (
          <h1 className="text-5xl font-black tracking-tighter text-brutal-ink mb-12 uppercase italic leading-none">{lesson.title}</h1>
        )}
        {renderContent()}
      </article>

      {!hideComplete && (
      <div className="bg-brutal-yellow border-4 border-brutal-ink rounded-xl p-10 flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden brutal-shadow-lg mb-12">
        <div className="relative z-10">
          <h4 className="font-black text-2xl text-brutal-ink uppercase tracking-tighter leading-none mb-2">Ready to move on?</h4>
          <p className="text-sm text-brutal-ink font-bold opacity-70">Make sure you fully understand this concept before continuing.</p>
        </div>
        <button
          onClick={handleComplete}
          disabled={lesson.id === 'abstract_15' && !gauntletFinished && !isCompleted}
          className={cn(
            "relative z-10 flex items-center gap-3 px-10 py-5 rounded-sm text-sm font-black transition-all w-full sm:w-auto justify-center uppercase tracking-widest border-4 border-brutal-ink brutal-shadow",
            isCompleted 
              ? "bg-brutal-green text-brutal-ink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none" 
              : lesson.id === 'abstract_15' && !gauntletFinished 
                ? "bg-white/20 text-brutal-ink/30 cursor-not-allowed opacity-50"
                : "bg-brutal-ink text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle className="w-5 h-5 fill-brutal-ink text-white" />
              COMPLETED
            </>
          ) : (
            lesson.id === 'abstract_15' && !gauntletFinished 
              ? 'FINISH GAUNTLET'
              : currentIndex < LESSONS.length - 1 ? 'COMPLETE & CONTINUE' : 'FINISH BOOTCAMP'
          )}
        </button>
      </div>
      )}
    </div>
  );
}

