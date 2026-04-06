import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
type ModuleId = 'intro' | 'anatomy' | 'core' | 'components' | 'process' | 'context';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

/* ─── Constants ─── */
const MODULES: { id: ModuleId; title: string }[] = [
  { id: 'intro', title: '01. Foundations' },
  { id: 'anatomy', title: '02. Anatomy' },
  { id: 'core', title: '03. The Core' },
  { id: 'components', title: '04. Components' },
  { id: 'process', title: '05. The Process' },
  { id: 'context', title: '06. Context' },
];

const OPINION_INDICATORS: Record<string, string> = {
  'Obviously': 'Obviously, the company is failing.',
  'Should': 'We should invest in solar energy.',
  'Probably': 'It will probably rain tomorrow.',
  'Evidently': 'Evidently, the plan was flawed.',
  'Ought': 'The government ought to act.',
};

const READING_SEQUENCE = [
  { num: 1, text: "Ask whether it is an argument: Not every stimulus is an argument. If there is no claim being supported, it may just be a set of facts. If there is a claim supported by evidence, it is an argument." },
  { num: 2, text: "Find the conclusion: Ask: what is the author trying to prove? That is the conclusion." },
  { num: 3, text: "Find the premises: Ask: what evidence is being used to support that conclusion? Those are the premises." },
  { num: 4, text: "Analyze the gap: Ask: do these premises really justify that conclusion? That is where most LR questions live.", highlight: true },
];

/* ─── Shared UI ─── */
function Card({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{label}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function XRayBlock({ children }: { children: (xray: boolean) => React.ReactNode }) {
  const [xray, setXray] = useState(false);
  return (
    <div className="relative rounded-xl border border-border bg-card/50 p-6 mt-4">
      <button
        onClick={() => setXray(!xray)}
        className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border ${
          xray ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-card text-muted-foreground border-border hover:bg-accent'
        }`}
      >
        {xray ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {xray ? 'Hide Analysis' : 'Analyze Structure'}
      </button>
      <div className="text-sm leading-relaxed italic text-muted-foreground">{children(xray)}</div>
    </div>
  );
}

function XText({ type, xray, children }: { type: 'premise' | 'conclusion' | 'opposing' | 'premise-indicator' | 'conclusion-indicator'; xray: boolean; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    premise: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-400 rounded px-1 not-italic',
    conclusion: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-400 rounded px-1 not-italic',
    opposing: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-b-2 border-purple-400 rounded px-1 not-italic',
    'premise-indicator': 'text-primary font-bold not-italic',
    'conclusion-indicator': 'text-primary font-extrabold not-italic',
  };
  return <span className={`transition-all duration-300 ${xray ? styles[type] : ''}`}>{children}</span>;
}

function CoachQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const question = questions[currentQuestionIndex];

  const handleOptionClick = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 mt-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">? Check-in</span>
      <h3 className="text-sm font-semibold text-foreground">{question.question}</h3>
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(index)}
            className={`w-full p-3 rounded-lg border text-left text-sm transition-all font-medium ${
              selectedOption === index
                ? index === question.correctAnswerIndex
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-card border-border hover:border-primary/30 text-foreground'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {showExplanation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-foreground">
              {selectedOption === question.correctAnswerIndex ? '✓ Spot on!' : '✗ Not quite, let\'s refine that.'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{question.explanation}</p>
            <button onClick={nextQuestion} className="text-xs font-semibold text-primary hover:underline">
              {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompletionButton({ isCompleted, onClick }: { isCompleted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={isCompleted}
      className={`w-full py-3 rounded-xl text-sm font-bold transition-colors mt-4 ${
        isCompleted
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
          : 'bg-foreground text-background hover:bg-foreground/90'
      }`}
    >
      {isCompleted ? 'MODULE COMPLETED ✓' : 'Finalize Module'}
    </button>
  );
}

/* ─── Gap Simulator ─── */
function GapSimulator() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 mt-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Interactive</span>
      {collapsed && (
        <p className="text-[10px] font-mono text-destructive uppercase tracking-wider">STATUS: ARGUMENT COLLAPSED // STRUCTURAL INTEGRITY FAILED</p>
      )}
      <div className="flex flex-col items-center gap-2">
        <motion.div animate={{ y: collapsed ? 40 : 0, rotate: collapsed ? 8 : 0 }} className="px-6 py-3 bg-primary/10 rounded-lg text-sm font-bold text-primary border border-primary/20">
          CONCLUSION
        </motion.div>
        <div className="flex gap-6">
          <motion.div animate={{ opacity: collapsed ? 0.3 : 1 }} className="px-4 py-8 bg-accent rounded-lg text-xs font-bold text-muted-foreground">P1</motion.div>
          <motion.div animate={{ opacity: collapsed ? 0.3 : 1 }} className="px-4 py-8 bg-accent rounded-lg text-xs font-bold text-muted-foreground">P2</motion.div>
        </div>
      </div>
      <div className="flex gap-2 justify-center">
        {!collapsed ? (
          <Button size="sm" variant="outline" onClick={() => setCollapsed(true)}>Invalidate Premise</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setCollapsed(false)}>Reconstruct Argument</Button>
        )}
      </div>
    </div>
  );
}

/* ─── Module Content ─── */
function IntroModule({ isCompleted, onComplete }: { isCompleted: boolean; onComplete: () => void }) {
  return (
    <>
      <Card label="Module 01" title="Foundations">
        <p><strong>The core job:</strong> When you read an LR stimulus, do not read passively. Find the conclusion, find the premises, and ask whether the premises really prove the conclusion.</p>
        <p><strong>1. Read Intently:</strong> Pay attention to what each sentence is doing. If you do not really understand what you are reading, you will not answer the question correctly. Do not skim. Do not assume. Track the role of each statement.</p>
        <p><strong>2. Question the Author:</strong> Many students read an LR stimulus and think, "That sounds fine." That is the wrong mindset. The author's conclusion is often the weak point. Ask whether the evidence actually proves the claim.</p>
      </Card>
      <CoachQuiz questions={[
        { question: 'What is the primary job when reading an LR stimulus?', options: ['Memorize the facts', 'Find the conclusion and test whether the premises prove it', 'Read quickly and trust your instinct', 'Focus on answer choices first'], correctAnswerIndex: 1, explanation: 'Your primary task is to identify the conclusion and evaluate whether the premises actually support it. This structural analysis is the foundation of LR.' },
        { question: 'Why should you "question the author"?', options: ['Because the author is always wrong', 'Because the conclusion is often the weakest part of the argument', 'Because the premises are usually false', 'Because the question stem tells you to'], correctAnswerIndex: 1, explanation: 'The conclusion is where authors often overreach. The premises are accepted as true — your job is to see if they actually prove the conclusion.' },
      ]} />
      <CompletionButton isCompleted={isCompleted} onClick={onComplete} />
    </>
  );
}

function AnatomyModule({ isCompleted, onComplete }: { isCompleted: boolean; onComplete: () => void }) {
  return (
    <>
      <Card label="Module 02" title="Anatomy of an LR Question">
        <p>Every Logical Reasoning question has three parts: the <strong>stimulus</strong>, the <strong>question stem</strong>, and the <strong>answer choices</strong>. Of those three, the stimulus matters most.</p>
        <p><strong>1. Stimulus:</strong> The short passage you read first. This is where the reasoning lives. Your job is to separate premises from conclusions.</p>
        <p><strong>2. Question Stem:</strong> Tells you what job you need to do with the argument: find the flaw, strengthen, weaken, identify the main conclusion, or find an assumption.</p>
        <p><strong>3. Answer Choices:</strong> They test whether you understood the stimulus correctly. Do not start by comparing answer choices before understanding the stimulus.</p>
      </Card>
      <XRayBlock>
        {(xray) => (
          <p>"Humans are no better than apes at investing. We gave five stock analysts and one chimpanzee $1,350 each to invest. After one month, <XText type="conclusion" xray={xray}>the chimp won</XText>, increasing its net worth by $210. <XText type="premise-indicator" xray={xray}>The</XText> next best analyst increased by only $140."</p>
        )}
      </XRayBlock>
      <CoachQuiz questions={[
        { question: 'Which part of an LR question should you focus on most?', options: ['The answer choices', 'The question stem', 'The stimulus', 'All three equally'], correctAnswerIndex: 2, explanation: 'The stimulus contains the reasoning. Understanding it is the foundation for answering any LR question correctly.' },
        { question: 'What is the purpose of the question stem?', options: ['To introduce new information', 'To tell you what task to perform on the argument', 'To reveal the correct answer', 'To restate the conclusion'], correctAnswerIndex: 1, explanation: 'The stem tells you what to do: find a flaw, strengthen, weaken, identify the conclusion, etc.' },
      ]} />
      <CompletionButton isCompleted={isCompleted} onClick={onComplete} />
    </>
  );
}

function CoreModule({ isCompleted, onComplete }: { isCompleted: boolean; onComplete: () => void }) {
  return (
    <>
      <Card label="Module 03" title="The Core: Arguments vs. Fact Sets">
        <p>Not everything you read on the LSAT is an argument. Some stimuli are just sets of facts. An argument requires a <strong>claim (conclusion)</strong> supported by <strong>evidence (premises)</strong>.</p>
        <p><strong>Fact Set:</strong> A collection of statements without a central claim being proven. You cannot "weaken" a fact set.</p>
        <p><strong>Argument:</strong> Contains at least one premise and one conclusion. The author is trying to convince you of something.</p>
        <p>Arguments are like physical structures. The premises are the pillars, and the conclusion is the roof. If the pillars are weak or don't reach the roof, the structure collapses. This missing piece is the <strong>Logical Gap</strong>.</p>
      </Card>
      <GapSimulator />
      <CoachQuiz questions={[
        { question: 'What makes something an argument rather than a fact set?', options: ['It contains more than two sentences', 'It includes a claim supported by evidence', 'It uses formal language', 'It mentions a study'], correctAnswerIndex: 1, explanation: 'An argument requires at least one claim (conclusion) that is supported by at least one piece of evidence (premise).' },
        { question: 'What is a "logical gap" in an argument?', options: ['A factual error in the premises', 'A disconnect between the premises and the conclusion', 'A missing answer choice', 'An opinion stated as fact'], correctAnswerIndex: 1, explanation: 'A logical gap is when the premises don\'t fully support the conclusion — there\'s a missing assumption or leap in reasoning.' },
      ]} />
      <CompletionButton isCompleted={isCompleted} onClick={onComplete} />
    </>
  );
}

function ComponentsModule({ isCompleted, onComplete }: { isCompleted: boolean; onComplete: () => void }) {
  const premiseIndicators = [
    { word: 'FOR', desc: 'Evidence', example: 'You should try the curry, for you like spicy food.' },
    { word: 'AFTER ALL', desc: 'Support', example: 'You should try the curry. After all, you like spicy food.' },
    { word: 'BECAUSE', desc: 'Reason', example: 'You should try the curry because you like spicy food.' },
    { word: 'SINCE', desc: 'Fact', example: 'Since you like spicy food, you should try the curry.' },
  ];
  const conclusionIndicators = ['SO', 'THUS', 'THEREFORE', 'HENCE', 'AS A RESULT'];

  return (
    <>
      <Card label="Module 04" title="Premises & Conclusions">
        <p>Premises are the facts or evidence in the argument. They tell you what the author is giving you to work with. On the LSAT, you accept the premises as true. Do not push back on the premises — push back on the conclusion.</p>
        <p><strong>Key rule:</strong> The question is not whether the premises are true. The question is whether the premises actually support the conclusion.</p>
        <p className="font-semibold text-foreground">Premise Indicators: FABS</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {premiseIndicators.map(item => (
            <div key={item.word} className="rounded-lg border border-border p-3 space-y-1">
              <span className="text-xs font-bold text-primary">{item.word}</span>
              <span className="text-[10px] text-muted-foreground ml-2">{item.desc}</span>
              <p className="text-xs text-muted-foreground italic">{item.example}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card label="Module 04b" title="Conclusion Indicators">
        <p>Conclusions are the judgments the author makes. They are the main point the author wants you to accept. This is the part you should examine most carefully.</p>
        <p><strong>Key rule:</strong> The conclusion is the part you should be most suspicious of. Ask whether it goes beyond the evidence.</p>
        <div className="flex flex-wrap gap-2">
          {conclusionIndicators.map(word => (
            <span key={word} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">{word}</span>
          ))}
        </div>
      </Card>
      <XRayBlock>
        {(xray) => (
          <p>"The local bakery will likely <XText type="conclusion" xray={xray}>sell out of sourdough by noon</XText>, <XText type="premise-indicator" xray={xray}>since</XText> <XText type="premise" xray={xray}>they have already received over fifty pre-orders for that specific loaf</XText>."</p>
        )}
      </XRayBlock>
      <CoachQuiz questions={[
        { question: 'On the LSAT, should you question whether the premises are true?', options: ['Yes, always verify premises', 'No, accept premises as true and question the conclusion', 'Only if the premises seem unrealistic', 'It depends on the question type'], correctAnswerIndex: 1, explanation: 'LSAT premises are taken as given. Your job is to evaluate whether they actually support the conclusion.' },
        { question: 'Which of the following is a premise indicator?', options: ['Therefore', 'Hence', 'Because', 'So'], correctAnswerIndex: 2, explanation: '"Because" introduces evidence/support. "Therefore," "Hence," and "So" are conclusion indicators.' },
      ]} />
      <CompletionButton isCompleted={isCompleted} onClick={onComplete} />
    </>
  );
}

function ProcessModule({ isCompleted, onComplete }: { isCompleted: boolean; onComplete: () => void }) {
  const [selected, setSelected] = useState('Obviously');
  const [showTwoPointCheck, setShowTwoPointCheck] = useState(false);

  return (
    <>
      <Card label="Module 05" title="The Reading Process">
        <p>Follow this sequence:</p>
        <div className="space-y-3">
          {READING_SEQUENCE.map(step => (
            <div key={step.num} className={`flex gap-3 items-start p-3 rounded-lg ${step.highlight ? 'bg-primary/5 border border-primary/10' : ''}`}>
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{step.num}</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card label="Module 05b" title="Identifying the Conclusion">
        <p>To identify the main conclusion, you must first spot the author's opinion and then verify its support.</p>
        <p className="text-foreground font-medium text-xs">When you see these words, you are looking at the author's opinion:</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(OPINION_INDICATORS).map(word => (
            <button
              key={word}
              onClick={() => setSelected(word)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selected === word ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-accent/80'
              }`}
            >
              {word}
            </button>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-accent/50 border border-border text-sm italic text-foreground">
          {OPINION_INDICATORS[selected]}
        </div>
        <p className="text-foreground font-medium text-xs">The 2-Point Check:</p>
        <div className="space-y-2">
          <div className="flex gap-3 items-start p-3 rounded-lg bg-primary/5 border border-primary/10">
            <span>💭</span>
            <p className="text-xs text-muted-foreground">It expresses the author's <strong className="text-foreground">Opinion</strong>.</p>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <span>🏗️</span>
            <p className="text-xs text-muted-foreground">It is <strong className="text-foreground">Supported</strong> by at least one other explicit claim.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowTwoPointCheck(!showTwoPointCheck)} className="w-full mt-2">
          {showTwoPointCheck ? 'Hide' : 'Run'} 2-Point Check on this claim
        </Button>
        <AnimatePresence>
          {showTwoPointCheck && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                <p className="text-xs font-bold text-primary">Analyzing: "{OPINION_INDICATORS[selected]}"</p>
                <div className="flex gap-2 items-center">
                  <span className="text-xs">1️⃣</span>
                  <p className="text-xs text-muted-foreground"><strong>Opinion:</strong> It expresses a subjective viewpoint ✓</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs">2️⃣</span>
                  <p className="text-xs text-muted-foreground"><strong>Support:</strong> Check if another claim backs it up ✓</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      <CoachQuiz questions={[
        { question: 'What is the first step in reading an LR stimulus?', options: ['Find the conclusion immediately', 'Ask whether it is even an argument', 'Read the answer choices', 'Identify the question type'], correctAnswerIndex: 1, explanation: 'Not every stimulus is an argument. First determine if there is a claim being supported by evidence.' },
        { question: 'What is the "2-Point Check" for identifying a conclusion?', options: ['It is an opinion AND it is supported by another claim', 'It is the first sentence AND contains indicator words', 'It is the longest sentence AND the most specific', 'It sounds right AND matches an answer choice'], correctAnswerIndex: 0, explanation: 'A main conclusion (1) expresses the author\'s opinion and (2) is supported by at least one other explicit premise.' },
      ]} />
      <CompletionButton isCompleted={isCompleted} onClick={onComplete} />
    </>
  );
}

function ContextModule({ isCompleted, onComplete }: { isCompleted: boolean; onComplete: () => void }) {
  return (
    <>
      <Card label="Module 06" title="Context & Peripheral Elements">
        <p>When we dissect arguments, we focus on the relationship between the conclusion and the premises. But arguments can also include peripheral information that adds context and complexity.</p>
        <p><strong>1. Background Info:</strong> Sets the stage and provides context but does not directly support the conclusion.</p>
        <p className="text-xs italic pl-4 border-l-2 border-border">"The average American consumes 222 pounds of meat each year."</p>
        <p><strong>2. Opposing Views:</strong> Ideas that challenge the main conclusion. Authors often bring them up to show they are considering other perspectives.</p>
        <p className="text-xs italic pl-4 border-l-2 border-border">"Many people argue that eating meat is necessary for a balanced diet."</p>
        <p><strong>3. Concessions:</strong> The author acknowledges a point from the opposing side but then <strong>immediately answers it</strong> to strengthen the original position.</p>
      </Card>
      <XRayBlock>
        {(xray) => (
          <p>"<XText type="opposing" xray={xray}>Yes, it is true that a vegetarian diet can lack some nutrients</XText>, <XText type="conclusion-indicator" xray={xray}>but</XText> <XText type="conclusion" xray={xray}>supplements can easily make up for it</XText>."</p>
        )}
      </XRayBlock>
      <Card label="Module 06b" title="Valid vs. Invalid Conclusions">
        <p><strong>Valid Conclusion = Proven:</strong> A valid conclusion is one that must be true if the premises are true. No gap, no wiggle room, no missing assumption.</p>
        <p><strong>Invalid Conclusion = Not Fully Proven:</strong> The premises may make it sound plausible, but if the conclusion does not have to follow, it is not valid. That is where flaws, assumptions, weakeners, and strengtheners come in.</p>
        <p className="text-foreground font-medium">When you read an LR stimulus, always ask three questions:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>What is the conclusion?</li>
          <li>What are the premises?</li>
          <li>Do the premises actually prove the conclusion?</li>
        </ol>
        <p>If you get good at those three questions, LR becomes much more manageable.</p>
      </Card>
      <CoachQuiz questions={[
        { question: 'What is the role of "background info" in an argument?', options: ['It directly supports the conclusion', 'It weakens the conclusion', 'It provides context but does not directly support the conclusion', 'It is always irrelevant'], correctAnswerIndex: 2, explanation: 'Background info sets the stage but is not part of the core argument structure (premise → conclusion).' },
        { question: 'What makes a conclusion "invalid" in logical reasoning?', options: ['The premises are false', 'The conclusion does not necessarily follow from the premises', 'The conclusion uses strong language', 'The argument contains opposing views'], correctAnswerIndex: 1, explanation: 'An invalid conclusion is one that doesn\'t necessarily follow from the premises — there\'s a gap between the evidence and the claim.' },
      ]} />
      <CompletionButton isCompleted={isCompleted} onClick={onComplete} />
    </>
  );
}

/* ─── Main Page ─── */
export default function MainConclusionRole() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>('intro');
  const [completedModules, setCompletedModules] = useState<Record<ModuleId, boolean>>({
    intro: false, anatomy: false, core: false, components: false, process: false, context: false,
  });

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const handleComplete = (id: ModuleId) => {
    setCompletedModules(prev => ({ ...prev, [id]: true }));
    const currentIndex = MODULES.findIndex(m => m.id === id);
    if (currentIndex !== -1 && currentIndex < MODULES.length - 1) {
      setActiveModule(MODULES[currentIndex + 1].id);
    }
  };

  const completedCount = Object.values(completedModules).filter(Boolean).length;
  const progress = Math.round((completedCount / MODULES.length) * 100);

  const moduleComponents: Record<ModuleId, React.ReactNode> = {
    intro: <IntroModule isCompleted={completedModules.intro} onComplete={() => handleComplete('intro')} />,
    anatomy: <AnatomyModule isCompleted={completedModules.anatomy} onComplete={() => handleComplete('anatomy')} />,
    core: <CoreModule isCompleted={completedModules.core} onComplete={() => handleComplete('core')} />,
    components: <ComponentsModule isCompleted={completedModules.components} onComplete={() => handleComplete('components')} />,
    process: <ProcessModule isCompleted={completedModules.process} onComplete={() => handleComplete('process')} />,
    context: <ContextModule isCompleted={completedModules.context} onComplete={() => handleComplete('context')} />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bootcamps')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Bootcamps
          </Button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">MC&R</span>
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Main Conclusion & Role</p>
            <p className="text-[10px] text-muted-foreground">Progress: {progress}%</p>
            <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <nav className="space-y-1">
            {MODULES.map(mod => {
              const isActive = activeModule === mod.id;
              const isCompleted = completedModules[mod.id];
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {mod.title}
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden sticky top-[65px] z-10 bg-background border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {MODULES.map(mod => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                  activeModule === mod.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                {mod.title}
                {completedModules[mod.id] && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-3xl space-y-4">
          <AnimatePresence mode="wait">
            <motion.div key={activeModule} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {moduleComponents[activeModule]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
