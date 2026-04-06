import React from 'react';
import { QuestionModuleId } from '@/types/causationStation';

interface InfoCardProps { icon: string; title: string; children: React.ReactNode; }
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, children }) => (
  <div className="rounded-xl bg-card border border-border shadow-sm p-5 text-left">
    <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
      <span className="text-xl">{icon}</span>{title}
    </h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

interface CSModuleIntroProps { moduleId: QuestionModuleId; onStart: () => void; }
const CSModuleIntro: React.FC<CSModuleIntroProps> = ({ moduleId, onStart }) => {
  switch (moduleId) {
    case 'correlation-causation':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Level 1: The Basics</h1>
          <p className="text-sm text-muted-foreground mb-8">Your first mission: tell the difference between a simple link and a forceful cause.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="⚡" title="Causation is Force.">
              Look for "driver" verbs that show one thing actively producing another. Think: <em>makes, results in, is responsible for.</em>
            </InfoCard>
            <InfoCard icon="🔗" title="Correlation is a Link.">
              Listen for passive words that only describe an association. Think: <em>is linked to, occurs with, is more likely.</em>
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

    case 'common-causes':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Level 2: Alternate Explanations</h1>
          <p className="text-sm text-muted-foreground mb-8">Every causal claim has a shadow. Your job is to find it.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="🕵️‍♀️" title="The Third Factor">
              What if a hidden third thing caused *both* the 'cause' and the 'effect'? Ex: Hot weather (Third Factor) causes both ice cream sales (A) and crime rates (B) to rise.
            </InfoCard>
            <InfoCard icon="🔄" title="Reverse Causality">
              What if you have it backwards? Maybe the 'effect' actually caused the 'cause'. Ex: Does being civically engaged (A) make you live in a walkable neighborhood (B), or do walkable neighborhoods make you more engaged?
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

    case 'reverse-causality':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Level 3: Test the Relationship</h1>
          <p className="text-sm text-muted-foreground mb-8">The claim is a machine. Your job is to throw a wrench in it.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <InfoCard icon="➡️❓" title="Cause without Effect">
              Show that the 'cause' happened, but the 'effect' didn't. If the policy was implemented but nothing changed, the policy probably wasn't the cause.
            </InfoCard>
            <InfoCard icon="❓➡️" title="Effect without Cause">
              Show that the 'effect' happened, even when the 'cause' was absent. If another company got the same results <em>without</em> the new policy, the policy might be irrelevant.
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

    case 'strengthen-weaken':
      return (
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Module 4: The Training Yard</h1>
          <p className="text-sm text-muted-foreground mb-8">This is the proving ground. Integrate all your skills to attack and defend causal claims on real LSAT questions.</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <InfoCard icon="🕵️‍♀️" title="1. Find an Alternate Cause">
              Is there a third factor? Is the causality reversed? This is your go-to first move for weakening an argument.
            </InfoCard>
            <InfoCard icon="➡️❓" title="2. Show Cause, No Effect">
              Point to an instance where the cause was present, but the effect didn't happen. This directly challenges the causal link.
            </InfoCard>
            <InfoCard icon="❓➡️" title="3. Show Effect, No Cause">
              Find an example where the effect occurred even without the supposed cause. This proves the cause isn't necessary.
            </InfoCard>
          </div>
          <div className="rounded-xl bg-card border border-border shadow-sm p-5 max-w-2xl mx-auto mb-10 text-left">
            <p className="text-sm text-muted-foreground">
              <strong className="text-emerald-600 dark:text-emerald-400">Remember the flip side:</strong> To <strong className="text-emerald-600 dark:text-emerald-400">STRENGTHEN</strong> an argument, you'll often do the opposite by eliminating these possibilities. Show that an alternate cause is not the real reason, or provide more evidence of the cause leading to the effect.
            </p>
          </div>
          <button
            onClick={onStart}
            className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-6 py-2.5 hover:bg-foreground/90 transition-colors duration-150"
          >
            Enter the Yard
          </button>
        </div>
      );

    default:
      return null;
  }
};

export default CSModuleIntro;
