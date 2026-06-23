import { useEffect, useState } from "react";
import { useApp } from "../../store/AppContext";
import { cn } from "../../lib/utils";
import { Flag, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const FINAL_SET_QUESTIONS = [
  {
    stimulus:
      "Many historians claim that the printing press was the sole cause of the scientific revolution. But this ignores the essential role of the earlier rediscovery of ancient Greek texts in Europe. Without those texts, the printing press would have had little new scientific material to disseminate.",
    question: "The opponent's argument proceeds by:",
    options: [
      "Providing an alternative explanation for an observed phenomenon.",
      "Pointing out that a claim fails to take relevant information into account.",
      "Showing that a premise leads to an impossible result.",
      "Deriving a general principle from specific historical examples.",
    ],
    correctOptionIndex: 1,
  },
  {
    stimulus:
      "Some researchers argue that regular stretching prevents sports injuries. However, a recent 10-year study of 5,000 athletes found no difference in injury rates between those who stretched before exercising and those who did not. Therefore, stretching does not prevent injuries.",
    question: "Which of the following describes the role played by the claim about the 10-year study?",
    options: [
      "It makes an observation that, according to the argument, is insufficient to justify the opposing claim.",
      "It describes a phenomenon for which the argument's conclusion is offered as an explanation.",
      "It is a premise offered to counter a consideration that might undermine the argument's conclusion.",
      "It is evidence provided to undermine a hypothesis.",
    ],
    correctOptionIndex: 3,
  },
  {
    stimulus:
      "Editor: The magazine should not publish the article on the mayor's personal life. While the information is factually correct, publishing it would violate the mayor's privacy. Our primary goal as a local magazine is to foster a sense of community, and printing such gossip would undermine that goal.",
    question:
      "The claim that the magazine's primary goal is to foster a sense of community plays which one of the following roles in the editor's argument?",
    options: [
      "It is the argument's main conclusion.",
      "It is a premise offered to support the claim that publishing the article would violate the mayor's privacy.",
      "It is a generalization that is used to support the argument's final recommendation.",
      "It is an intermediate conclusion that is itself supported by the claim that the gossip would undermine the magazine's goal.",
    ],
    correctOptionIndex: 2,
  },
  {
    stimulus:
      "Politician: My opponent claims that we should increase taxes on corporations to fund new environmental initiatives. But my opponent once worked for a large oil company that was fined for environmental violations. Clearly, we should not follow their recommendation.",
    question: "The politician's argument is most vulnerable to criticism on the grounds that it:",
    options: [
      "Attacks the character of the person making an argument rather than the argument itself.",
      "Presumes that because a corporation was fined, it cannot want to protect the environment.",
      "Confuses a necessary condition for environmental protection with a sufficient condition.",
      "Treats a correlation between employment and policy preference as a causal link.",
    ],
    correctOptionIndex: 0,
  },
  {
    stimulus:
      "Just as a complex machine requires every part to be in perfect working order to function, so too does a large government require every citizen to strictly follow every law. If even one part breaks down, the whole machine fails; similarly, if even one citizen is lawless, the government collapses.",
    question: "Which of the following best describes the method of reasoning used in the argument?",
    options: [
      "Comparing a situation to an expert's opinion to establish its validity.",
      "Drawing an analogy between a mechanical system and a social institution.",
      "Using a counterexample to show that a general rule is false.",
      "Deriving a conclusion about a specific case from a general principle.",
    ],
    correctOptionIndex: 1,
  },
];

export default function TimedFinalSet() {
  const { setFinalScore, bootcampState, setCurrentView } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(7 * 60 + 30);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (started && !isSubmitted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
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
    void setFinalScore(correct, FINAL_SET_QUESTIONS.length);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (bootcampState.finalSetScore && !isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-32 z-10 relative space-y-6 text-center">
        <div
          className="w-20 h-20 bg-brutal-green border-4 border-brutal-ink brutal-shadow flex items-center justify-center rotate-[-4deg]"
          aria-hidden="true"
        >
          <Flag className="w-10 h-10 text-brutal-ink" />
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink uppercase italic">
          Bootcamp complete
        </h2>
        <p className="text-2xl sm:text-3xl font-black text-brutal-ink tracking-tight uppercase">
          Score:{" "}
          <span className="bg-brutal-yellow px-3 py-0.5 border-4 border-brutal-ink">
            {bootcampState.finalSetScore.score} / {bootcampState.finalSetScore.total}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setCurrentView("completion_report")}
          className="inline-flex items-center gap-3 px-8 py-4 min-h-[56px] bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
        >
          View full report
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto py-16 sm:py-24 text-center z-10 relative space-y-6">
        <div
          className="w-20 h-20 bg-brutal-pink border-4 border-brutal-ink brutal-shadow flex items-center justify-center mx-auto rotate-[4deg]"
          aria-hidden="true"
        >
          <Flag className="w-10 h-10 text-brutal-ink" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink uppercase italic leading-tight">
          Simulated timed final set
        </h1>
        <p className="text-base sm:text-lg font-bold text-brutal-ink-soft max-w-xl mx-auto leading-snug">
          This is a synthetic mixed-practice checkpoint for launch. You have{" "}
          <span className="bg-brutal-yellow px-2 border-2 border-brutal-ink font-black text-brutal-ink">
            7 minutes 30 seconds
          </span>{" "}
          to clear {FINAL_SET_QUESTIONS.length} Role, Method, and Flaw-style questions.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="inline-flex items-center gap-3 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink px-8 py-4 min-h-[56px] font-black text-base sm:text-lg tracking-widest uppercase brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
        >
          <Play className="w-5 h-5 fill-current" aria-hidden="true" />
          Start timer
        </button>
      </div>
    );
  }

  const question = FINAL_SET_QUESTIONS[currentIndex];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="max-w-3xl mx-auto py-6 sm:py-10 z-10 relative"
    >
      <header className="flex items-center justify-between mb-8 sm:mb-12 pb-6 border-b-4 border-brutal-ink">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Progress
          </span>
          <p className="text-base sm:text-lg font-black text-brutal-ink uppercase tracking-tight">
            Question{" "}
            <span className="bg-brutal-cyan px-2 border-2 border-brutal-ink mx-1">
              {currentIndex + 1}
            </span>{" "}
            of {FINAL_SET_QUESTIONS.length}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Time remaining
          </span>
          <span
            role="timer"
            aria-live={timeLeft < 60 ? "assertive" : "off"}
            aria-atomic="true"
            aria-label={`Time remaining: ${formatTime(timeLeft)}`}
            className={cn(
              "font-black text-2xl sm:text-3xl px-4 sm:px-6 py-2 border-4 brutal-shadow uppercase tracking-tight transition-colors",
              timeLeft < 60
                ? "bg-brutal-red text-brutal-paper border-brutal-ink"
                : "bg-brutal-paper text-brutal-ink border-brutal-ink",
            )}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      <article className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg mb-10 overflow-hidden">
        <section
          aria-label="Stimulus"
          className="p-6 sm:p-8 border-b-4 border-brutal-ink"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft block mb-3">
            Stimulus
          </span>
          <p className="text-base sm:text-lg font-bold text-brutal-ink leading-snug">
            {question.stimulus}
          </p>
        </section>

        <section className="p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-black text-brutal-ink mb-6 leading-snug tracking-tight italic">
            {question.question}
          </h2>

          <ul className="grid grid-cols-1 gap-4 list-none m-0 p-0" role="radiogroup" aria-label="Answer choices">
            {question.options.map((option, idx) => {
              const isSelected = answers[currentIndex] === idx;
              let btnClass =
                "border-brutal-ink bg-brutal-paper text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]";

              if (isSelected && !isSubmitted) {
                btnClass =
                  "bg-brutal-ink text-brutal-paper border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none";
              } else if (isSubmitted) {
                if (idx === question.correctOptionIndex) {
                  btnClass = "bg-brutal-green border-brutal-ink brutal-shadow-sm text-brutal-ink";
                } else if (isSelected) {
                  btnClass = "bg-brutal-red text-brutal-paper border-brutal-ink brutal-shadow-sm";
                } else {
                  btnClass = "border-brutal-ink opacity-60 bg-brutal-paper text-brutal-ink-soft";
                }
              }

              return (
                <li key={idx}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isSubmitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentIndex]: idx }))}
                    className={cn(
                      "w-full text-left p-5 sm:p-6 border-4 transition-transform duration-150 flex items-start gap-4 min-h-[44px]",
                      btnClass,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "w-10 h-10 flex items-center justify-center border-2 font-black text-base shrink-0",
                        isSelected && !isSubmitted
                          ? "bg-brutal-paper text-brutal-ink border-brutal-paper"
                          : "bg-brutal-ink text-brutal-paper border-brutal-ink",
                      )}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="block font-bold text-base sm:text-lg leading-snug py-1">
                      <span className="sr-only">Choice {String.fromCharCode(65 + idx)}: </span>
                      {option}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </article>

      <nav aria-label="Question navigation" className="flex justify-between items-center gap-3 flex-wrap">
        <button
          type="button"
          disabled={currentIndex === 0 || isSubmitted}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="px-6 py-3 min-h-[48px] bg-brutal-paper border-4 border-brutal-ink text-brutal-ink font-black uppercase tracking-[0.15em] text-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none transition-transform"
        >
          Previous
        </button>

        <div className="flex gap-3">
          {currentIndex < FINAL_SET_QUESTIONS.length - 1 ? (
            <button
              type="button"
              disabled={isSubmitted}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="px-6 py-3 min-h-[48px] bg-brutal-cyan border-4 border-brutal-ink text-brutal-ink font-black uppercase tracking-[0.15em] text-sm brutal-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] disabled:opacity-40 transition-transform"
            >
              Next question
            </button>
          ) : !isSubmitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-3 min-h-[48px] bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-[0.15em] text-sm brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
            >
              Submit final set
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentView("completion_report")}
              className="px-6 py-3 min-h-[48px] bg-brutal-pink text-brutal-ink border-4 border-brutal-ink font-black uppercase tracking-[0.15em] text-sm brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
            >
              View full results
            </button>
          )}
        </div>
      </nav>
    </motion.div>
  );
}
