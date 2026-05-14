import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { cn } from '../../lib/utils';
import { Flag, Play } from 'lucide-react';

const FINAL_SET_QUESTIONS = [
  {
    stimulus: "Many historians claim that the printing press was the sole cause of the scientific revolution. But this ignores the essential role of the earlier rediscovery of ancient Greek texts in Europe. Without those texts, the printing press would have had little new scientific material to disseminate.",
    question: "The opponent's argument proceeds by:",
    options: [
      "Providing an alternative explanation for an observed phenomenon.",
      "Pointing out that a claim fails to take relevant information into account.",
      "Showing that a premise leads to an impossible result.",
      "Deriving a general principle from specific historical examples."
    ],
    correctOptionIndex: 1
  },
  {
    stimulus: "Some researchers argue that regular stretching prevents sports injuries. However, a recent 10-year study of 5,000 athletes found no difference in injury rates between those who stretched before exercising and those who did not. Therefore, stretching does not prevent injuries.",
    question: "Which of the following describes the role played by the claim about the 10-year study?",
    options: [
      "It makes an observation that, according to the argument, is insufficient to justify the opposing claim.",
      "It describes a phenomenon for which the argument's conclusion is offered as an explanation.",
      "It is a premise offered to counter a consideration that might undermine the argument's conclusion.",
      "It is evidence provided to undermine a hypothesis."
    ],
    correctOptionIndex: 3
  },
  {
    stimulus: "Editor: The magazine should not publish the article on the mayor's personal life. While the information is factually correct, publishing it would violate the mayor's privacy. Our primary goal as a local magazine is to foster a sense of community, and printing such gossip would undermine that goal.",
    question: "The claim that the magazine's primary goal is to foster a sense of community plays which one of the following roles in the editor's argument?",
    options: [
      "It is the argument's main conclusion.",
      "It is a premise offered to support the claim that publishing the article would violate the mayor's privacy.",
      "It is a generalization that is used to support the argument's final recommendation.",
      "It is an intermediate conclusion that is itself supported by the claim that the gossip would undermine the magazine's goal."
    ],
    correctOptionIndex: 2
  },
  {
    stimulus: "Politician: My opponent claims that we should increase taxes on corporations to fund new environmental initiatives. But my opponent once worked for a large oil company that was fined for environmental violations. Clearly, we should not follow their recommendation.",
    question: "The politician's argument is most vulnerable to criticism on the grounds that it:",
    options: [
      "Attacks the character of the person making an argument rather than the argument itself.",
      "Presumes that because a corporation was fined, it cannot want to protect the environment.",
      "Confuses a necessary condition for environmental protection with a sufficient condition.",
      "Treats a correlation between employment and policy preference as a causal link."
    ],
    correctOptionIndex: 0
  },
  {
    stimulus: "Just as a complex machine requires every part to be in perfect working order to function, so too does a large government require every citizen to strictly follow every law. If even one part breaks down, the whole machine fails; similarly, if even one citizen is lawless, the government collapses.",
    question: "Which of the following best describes the method of reasoning used in the argument?",
    options: [
      "Comparing a situation to an expert's opinion to establish its validity.",
      "Drawing an analogy between a mechanical system and a social institution.",
      "Using a counterexample to show that a general rule is false.",
      "Deriving a conclusion about a specific case from a general principle."
    ],
    correctOptionIndex: 1
  }
];

export default function TimedFinalSet() {
  const { setFinalScore, bootcampState, setCurrentView } = useApp();
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(7 * 60 + 30); // 7:30 for 5 questions
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (started && !isSubmitted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [started, isSubmitted, timeLeft]);

  const handleSubmit = () => {
    setIsSubmitted(true);
    let correct = 0;
    FINAL_SET_QUESTIONS.forEach((q, i) => {
      if (answers[i] === q.correctOptionIndex) correct++;
    });
    setFinalScore(correct, FINAL_SET_QUESTIONS.length);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (bootcampState.finalSetScore && !isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-in fade-in z-10 relative">
        <div className="w-24 h-24 bg-brutal-green border-4 border-brutal-ink brutal-shadow flex items-center justify-center mb-10 rotate-[-5deg]">
          <Flag className="w-12 h-12 text-brutal-ink" />
        </div>
        <h2 className="text-6xl font-black tracking-tighter text-brutal-ink mb-6 uppercase italic border-b-8 border-brutal-green pb-4">BOOTCAMP COMPLETE</h2>
        <p className="text-brutal-ink font-black mb-12 text-5xl uppercase tracking-tighter">
          SCORE: <span className="bg-brutal-yellow px-4 border-4 border-brutal-ink">{bootcampState.finalSetScore.score} / {bootcampState.finalSetScore.total}</span>
        </p>
        <button 
          onClick={() => setCurrentView('completion_report')}
          className="bg-brutal-ink text-white border-4 border-brutal-ink px-12 py-6 font-black text-xl tracking-widest hover:bg-brutal-ink/90 transition-all brutal-shadow uppercase"
        >
          VIEW FULL REPORT
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-3xl mx-auto py-32 text-center animate-in fade-in z-10 relative">
        <div className="w-24 h-24 bg-brutal-pink border-4 border-brutal-ink brutal-shadow flex items-center justify-center mb-10 mx-auto rotate-[5deg]">
          <Flag className="w-12 h-12 text-brutal-ink" />
        </div>
        <h1 className="text-7xl font-black tracking-tighter text-brutal-ink mb-8 uppercase italic leading-none">Timed Final Set</h1>
        <p className="text-brutal-ink font-bold mb-16 max-w-xl mx-auto text-2xl leading-tight uppercase tracking-tight italic opacity-80 border-l-[12px] border-brutal-pink pl-10">
          This is a simulated exam section. You have <span className="bg-brutal-yellow px-2">7 minutes and 30 seconds</span> to complete {FINAL_SET_QUESTIONS.length} mixed questions covering Role, Method, and Flaw.
        </p>
        <button 
          onClick={() => setStarted(true)}
          className="inline-flex items-center gap-4 bg-brutal-ink text-white border-4 border-brutal-ink px-12 py-6 font-black text-2xl tracking-widest hover:bg-brutal-ink/90 transition-all brutal-shadow uppercase"
        >
          <Play className="w-8 h-8 fill-white" />
          START TIMER & BEGIN
        </button>
      </div>
    );
  }

  const question = FINAL_SET_QUESTIONS[currentIndex];

  return (
    <div className="max-w-4xl mx-auto py-10 z-10 relative mt-4">
      <div className="flex items-center justify-between mb-12 pb-8 border-b-4 border-brutal-ink">
        <div className="flex flex-col">
          <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em] mb-1">CURRENT PROGRESS</span>
          <div className="text-xl font-black text-brutal-ink uppercase tracking-tight italic">
            Question <span className="bg-brutal-cyan px-2 border-2 border-brutal-ink mx-1">{currentIndex + 1}</span> of {FINAL_SET_QUESTIONS.length}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em] mb-1 text-right w-full">TIME REMAINING</span>
          <div className={cn(
            "font-black text-3xl px-8 py-3 border-4 brutal-shadow uppercase tracking-tighter italic transition-all",
            timeLeft < 60 ? "bg-brutal-red text-white border-brutal-ink" : "bg-white text-brutal-ink border-brutal-ink"
          )}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="bg-white border-4 border-brutal-ink brutal-shadow-lg mb-12 overflow-hidden">
        <div className="p-10 bg-brutal-cyan/10 border-b-4 border-brutal-ink relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brutal-ink opacity-[0.03] translate-x-10 -translate-y-10 rotate-45" />
          <p className="text-2xl font-black text-brutal-ink leading-tight uppercase tracking-tight italic">
            {question.stimulus}
          </p>
        </div>
        
        <div className="p-10">
          <p className="text-3xl font-black text-brutal-ink mb-12 uppercase leading-none tracking-tighter italic border-l-[8px] border-brutal-ink pl-8">{question.question}</p>
          
          <div className="grid grid-cols-1 gap-6">
            {question.options.map((option, idx) => {
              const isSelected = answers[currentIndex] === idx;
              let btnClass = "border-brutal-ink bg-white text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000]";
              
              if (isSelected && !isSubmitted) {
                btnClass = "bg-brutal-ink text-white border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none";
              } else if (isSubmitted) {
                if (idx === question.correctOptionIndex) {
                  btnClass = "bg-brutal-green border-brutal-ink brutal-shadow-sm text-brutal-ink scale-[1.02] z-10";
                } else if (isSelected) {
                  btnClass = "bg-brutal-red text-white border-brutal-ink brutal-shadow-sm";
                } else {
                  btnClass = "border-brutal-ink opacity-30 bg-white/50 grayscale";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentIndex]: idx }))}
                  className={cn(
                    "w-full text-left p-8 border-4 transition-all duration-100 relative group flex items-start gap-6",
                    btnClass
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center border-4 font-black text-xl shrink-0 transition-colors",
                    isSelected && !isSubmitted ? "bg-white text-brutal-ink border-white" : "bg-brutal-ink text-white border-brutal-ink"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="block font-black text-xl leading-none uppercase tracking-tight py-2 italic">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-12">
        <button
          disabled={currentIndex === 0 || isSubmitted}
          onClick={() => setCurrentIndex(i => i - 1)}
          className="px-10 py-5 bg-white border-4 border-brutal-ink text-brutal-ink font-black uppercase tracking-widest hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] disabled:opacity-30 disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Previous
        </button>
        
        <div className="flex gap-6">
          {currentIndex < FINAL_SET_QUESTIONS.length - 1 ? (
            <button
              disabled={isSubmitted}
              onClick={() => setCurrentIndex(i => i + 1)}
              className="px-12 py-5 bg-brutal-cyan border-4 border-brutal-ink text-brutal-ink font-black uppercase tracking-widest hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] disabled:opacity-30 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none brutal-shadow-sm"
            >
              Next Question
            </button>
          ) : (
            !isSubmitted ? (
              <button
                onClick={handleSubmit}
                className="px-12 py-5 bg-brutal-ink text-white border-4 border-brutal-ink font-black uppercase tracking-widest hover:bg-brutal-ink/90 transition-all brutal-shadow"
              >
                Submit Final Set
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('completion_report')}
                className="px-12 py-5 bg-brutal-pink text-brutal-ink border-4 border-brutal-ink font-black uppercase tracking-widest hover:bg-brutal-pink/90 transition-all brutal-shadow"
              >
                View Full Results
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
