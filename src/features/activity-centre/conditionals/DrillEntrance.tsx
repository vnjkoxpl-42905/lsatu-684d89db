import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ConditionalScene } from "./ConditionalScene";
import "./drill-entrance.css";

type DrillMode = "general" | "linking" | "missing-link" | "must-be-true";
type DemoStep = 0 | 1 | 2;

interface EntranceStep {
  title: string;
  detail: string;
  caption: string;
}

const instructions: Record<DrillMode, readonly [EntranceStep, EntranceStep, EntranceStep]> = {
  general: [
    {
      title: "Diagram the statement",
      detail: "Diagram the statement on paper, then write its contrapositive.",
      caption: "If P, then Q. P is enough to guarantee Q.",
    },
    {
      title: "Choose the matching diagram",
      detail: "Choose the pair with both the correct diagram and the correct contrapositive.",
      caption: "If Q is absent, P must be absent too. Reverse the arrow and slash both conditions.",
    },
    {
      title: "Review your answer",
      detail: "Check your answer, then read the explanation before moving on.",
      caption: "The contrapositive reverses the order and negates both conditions: without Q, there is no P.",
    },
  ],
  linking: [
    {
      title: "Map the premises",
      detail: "Diagram the premises and the conclusion on paper.",
      caption: "P leads to Q, and R leads to S. The conclusion needs a path from P to S.",
    },
    {
      title: "Find the connection",
      detail: "Choose the conditional that connects the premises to the conclusion.",
      caption: "Add Q leading to R to connect the two premises.",
    },
    {
      title: "Follow the whole chain",
      detail: "Check your answer to see why the completed chain reaches the conclusion.",
      caption: "P leads to Q, Q leads to R, and R leads to S. So P leads to S.",
    },
  ],
  "missing-link": [
    {
      title: "Locate the gap",
      detail: "Read the premises and the conclusion. Mark where the chain stops.",
      caption: "P leads to Q, and R leads to S. To establish P leading to S, the middle needs a connection.",
    },
    {
      title: "Choose the missing link",
      detail: "Choose the conditional that makes the conclusion follow.",
      caption: "Q leading to R supplies the missing connection. R leading to Q would run it backwards.",
    },
    {
      title: "Test the completed chain",
      detail: "Check your answer and trace each step from the premise to the conclusion.",
      caption: "P leads to Q, Q leads to R, and R leads to S. The chain now guarantees P leading to S.",
    },
  ],
  "must-be-true": [
    {
      title: "Map what you know",
      detail: "Diagram the given statements on paper.",
      caption: "The premises say P leads to Q and Q leads to R.",
    },
    {
      title: "Follow what is guaranteed",
      detail: "Choose the answer that must be true whenever those statements are true.",
      caption: "Following both arrows gives P leading to R. No extra premise is needed.",
    },
    {
      title: "Check the inference",
      detail: "Read the explanation and check why the answer follows from the premises.",
      caption: "If R is absent, P must be absent too. This is the contrapositive of P leading to R.",
    },
  ],
};

export interface DrillEntranceProps {
  mode: DrillMode;
  title: string;
  onStart: () => void;
  startLabel?: string;
  children?: ReactNode;
  onBack?: () => void;
  questionCount?: number;
  headingLevel?: 1 | 2;
  timingPlan?: 'progressive' | 'untimed' | 'timed';
}

/** A selectable worked example. Starting never depends on completing the walkthrough. */
export function DrillEntrance({ mode, title, onStart, startLabel = "Start practice", children, onBack, questionCount, headingLevel = 1, timingPlan }: DrillEntranceProps) {
  const [step, setStep] = useState<DemoStep>(0);
  const steps = instructions[mode];
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const PlanHeading = headingLevel === 2 ? 'h3' : 'h2';

  return (
    <section className="drill-entrance" data-mode={mode} aria-label={`${title} instructions`}>
      {onBack && (
        <button type="button" className="drill-entrance-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={16} />
          Conditional drills
        </button>
      )}
      <header className="drill-entrance-heading">
        <p className="drill-entrance-eyebrow">Instructions</p>
        <Heading>{title}</Heading>
      </header>
      <div className="drill-entrance-grid">
        <div className="drill-entrance-visual">
          <ConditionalScene mode={mode} step={step} />
          <p className="drill-demo-caption" aria-live="polite" aria-atomic="true">{steps[step].caption}</p>
        </div>
        <div className="drill-entrance-guide">
          <ol aria-label="Explore the steps">
            {steps.map((entry, index) => (
              <li key={entry.title}>
                <button
                  type="button"
                  className="drill-step"
                  data-active={step === index ? "true" : "false"}
                  aria-pressed={step === index}
                  onClick={() => setStep(index as DemoStep)}
                >
                  <span className="drill-step-number" aria-hidden="true">{index + 1}</span>
                  <span className="drill-step-copy">
                    <span className="drill-step-title">{entry.title}</span>
                    <span className="drill-step-detail">{entry.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="drill-launch">
            {mode === "general" && (!timingPlan || timingPlan === 'progressive') && <div className="drill-phase-plan" aria-label="Practice phases">
              <PlanHeading>Three phases</PlanHeading>
              <ol>
                <li><span>1–12</span><strong>Untimed</strong></li>
                <li><span>13–37</span><strong>45 seconds</strong></li>
                <li><span>38–62</span><strong>30 seconds</strong></li>
              </ol>
              <p>Diagram while the statement is visible. In timed phases, it disappears when time runs out or you press “I’m ready.” Then check both parts of each choice against your work. Choosing an answer is untimed.</p>
            </div>}
            {mode === 'general' && timingPlan && timingPlan !== 'progressive' && <div className="drill-phase-plan" aria-label="Practice timing"><PlanHeading>{timingPlan === 'untimed' ? 'Work without a timer' : '45 seconds per diagram'}</PlanHeading><p>{timingPlan === 'untimed' ? 'Keep the statement visible while you diagram it. Open the choices when you are ready.' : 'Diagram while the statement is visible. After 45 seconds, it is hidden. Choosing and checking an answer is untimed.'}</p></div>}
            {children}
            {(mode !== "general" || timingPlan) && questionCount !== undefined && <p className="drill-launch-count">{questionCount} {questionCount === 1 ? "question" : "questions"}</p>}
            <button type="button" className="drill-start" onClick={onStart}>
              {startLabel}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <p className="drill-launch-note">Choose one answer. You can try again once.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
