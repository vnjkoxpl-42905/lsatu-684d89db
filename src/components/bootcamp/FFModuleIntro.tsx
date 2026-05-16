import React from 'react';
import { QuestionModuleId } from '@/types/fallacyFlaw';

interface InfoCardProps { icon: string; title: string; children: React.ReactNode; }
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, children }) => (
  <div className="rounded-xl bg-card border border-border shadow-sm p-5 text-left">
    <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
      <span className="text-xl">{icon}</span>{title}
    </h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

interface FFModuleIntroProps { moduleId: QuestionModuleId; onStart: () => void; }
const FFModuleIntro: React.FC<FFModuleIntroProps> = ({ moduleId, onStart }) => {
  switch (moduleId) {
    case 'causal-flaws':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Level 1: Causal Flaws</h1>
          <p className="text-sm text-muted-foreground mb-8">Cause-and-effect is the flaw family the LSAT abuses most. Name the move, then break it.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="🔁" title="Correlation Is Not Causation.">
              Two things moving together is a pattern, not a cause. The flaw is the author treating a link as a force without ruling out other explanations.
            </InfoCard>
            <InfoCard icon="🕵️" title="Hunt for Alternate Causes.">
              Reverse causation, a hidden third factor, or coincidence will all break a causal claim. Your job is to name the specific dodge the author skipped.
            </InfoCard>
          </div>
          <button
            onClick={onStart}
            className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-2.5 hover:bg-foreground/90 transition-colors duration-150"
          >
            Start Level 1 Drill
          </button>
        </div>
      );

    case 'conditional-flaws':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Level 2: Conditional Flaws</h1>
          <p className="text-sm text-muted-foreground mb-8">If-then logic looks innocent. Authors abuse it constantly. Spot the illegal move.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="↔️" title="Necessary vs. Sufficient.">
              A condition that is required is not the same as one that guarantees. Mixing the two is the canonical LSAT conditional error.
            </InfoCard>
            <InfoCard icon="🚫" title="Reversal Traps.">
              Mistaken reversal and mistaken negation flip a conditional rule the wrong direction. Diagram the rule, then watch where the author actually goes.
            </InfoCard>
          </div>
          <button
            onClick={onStart}
            className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-2.5 hover:bg-foreground/90 transition-colors duration-150"
          >
            Start Level 2 Drill
          </button>
        </div>
      );

    case 'sampling-comparison-scope':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Level 3: Sampling, Comparison & Scope</h1>
          <p className="text-sm text-muted-foreground mb-8">The big middle of the flaw catalog. Generalizations, analogies, equivocations, and scope shifts.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="📏" title="Sample Size & Bias.">
              Hasty generalizations lean on samples that are too small or unrepresentative. Ask who is missing from the data before accepting the conclusion.
            </InfoCard>
            <InfoCard icon="🔄" title="Scope and Equivocation.">
              A term that shifts meaning, or a conclusion that quietly outgrows its evidence, is a scope flaw. Match the conclusion noun back to the premise noun.
            </InfoCard>
          </div>
          <button
            onClick={onStart}
            className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-2.5 hover:bg-foreground/90 transition-colors duration-150"
          >
            Start Level 3 Drill
          </button>
        </div>
      );

    case 'famous-flaws-capstone':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Module 4: Famous Flaws Capstone</h1>
          <p className="text-sm text-muted-foreground mb-8">All 18 flaw types mixed, real LSAT timing, no hand-holding. The integration test.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="⏱️" title="Real LSAT Timing.">
              The stopwatch runs on every question. Train the same pace you will hold under section conditions.
            </InfoCard>
            <InfoCard icon="🎯" title="Name Every Flaw.">
              Modules 1 to 3 isolated the flaw family. Here the author could pull from any of them. Name the specific move before you ever look at the choices.
            </InfoCard>
          </div>
          <button
            onClick={onStart}
            className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-2.5 hover:bg-foreground/90 transition-colors duration-150"
          >
            Start Level 4 Drill
          </button>
        </div>
      );

    default:
      return null;
  }
};

export default FFModuleIntro;
