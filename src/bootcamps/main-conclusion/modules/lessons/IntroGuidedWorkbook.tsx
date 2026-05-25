import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { INTRO_GUIDED_SEQUENCE } from "./introGuidedSequence";
import { DRILL_3_1_STAGE_1, DRILL_3_2_STAGE_1, DRILL_3_3_STAGE_1, DRILL_3_4_STAGE_2, DRILL_3_5_QUESTIONS, DRILL_3_9_QUESTIONS, DRILL_3_8_PASSAGES, DRILL_3_7_QUESTIONS } from "@/bootcamps/main-conclusion/content/drills.source";
import { MAIN_CONCLUSION_PRACTICE_POOLS } from "@/bootcamps/main-conclusion/data/practiceDrillPools";
import { XRayEmbeddedSlice, IndicatorEmbeddedSlice, FirstSentenceEmbeddedSlice, RebuttalEmbeddedSlice, ChainMappingEmbeddedSlice, NestedClaimsEmbeddedSlice, ReadRestateEmbeddedSlice, PronounEmbeddedSlice } from "./EmbeddedDrillRunner";
import { useModuleProgress } from "@/bootcamps/main-conclusion/hooks/useModuleProgress";
import { Button } from "@/bootcamps/main-conclusion/components/primitives/Button";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const WorkbookNoteBlock = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="py-12 border-t border-[rgba(26,26,26,0.1)] scroll-mt-24">
    <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(26,26,26,0.4)] mb-4">Note</div>
    <h2 className="text-4xl font-serif italic mb-8">{title}</h2>
    <div className="prose prose-stone max-w-none">{children}</div>
  </div>
);

const WorkbookCheckpoint = ({ title, options, correctIndex, explanation }: { 
  title: string, 
  options: string[], 
  correctIndex: number, 
  explanation: string 
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const isCorrect = selected === correctIndex;

  return (
    <div className="py-8 px-6 bg-[#F9F7F4] border border-[rgba(26,26,26,0.05)] rounded-[4px] my-8">
      <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(26,26,26,0.4)] mb-4 uppercase">Checkpoint</div>
      <h3 className="text-xl font-serif italic mb-4">{title}</h3>
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <Button
            key={idx}
            variant={selected === null ? "subtle" : (idx === correctIndex ? "primary" : "subtle")}
            disabled={selected !== null}
            onClick={() => setSelected(idx)}
            className={cn(
              "w-full justify-start",
              selected !== null && idx !== correctIndex && selected === idx && "opacity-50"
            )}
          >
            {opt}
          </Button>
        ))}
      </div>
      {selected !== null && (
        <div className={cn("mt-4 p-4 text-sm", isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")}>
          <p className="font-semibold">{isCorrect ? "Correct!" : "Not quite."}</p>
          <p>{explanation}</p>
        </div>
      )}
    </div>
  );
};

const WorkbookPracticePoolCard = ({ slug }: { slug: string }) => {
  const navigate = useNavigate();
  const pool = (MAIN_CONCLUSION_PRACTICE_POOLS as any)[slug];
  if (!pool) return null;

  return (
    <div className="py-8 px-6 bg-white border border-[rgba(26,26,26,0.1)] rounded-[4px] my-8 shadow-sm">
      <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(26,26,26,0.4)] mb-4 uppercase">Focused Practice</div>
      <h3 className="text-xl font-serif italic mb-2">{pool.title}</h3>
      <p className="text-sm text-[rgba(26,26,26,0.6)] mb-6">
        Test your skills with a curated set of {pool.count} questions focused on {pool.qfeatures.join(', ')}.
      </p>
      <Button 
        variant="primary" 
        className="w-full"
        onClick={() => navigate(`/bootcamp/intro-to-lr/practice-drills/${slug}`)}
      >
        Start focused set
      </Button>
    </div>
  );
};

const PlaceholderBlock = ({ step }: { step: typeof INTRO_GUIDED_SEQUENCE[0] }) => (
  <div className="py-12 border-t border-[rgba(26,26,26,0.1)] scroll-mt-24">
    <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(26,26,26,0.4)] mb-2 uppercase">{step.type}</div>
    <h2 className="text-3xl font-serif italic mb-4">{step.title}</h2>
    <p className="text-[rgba(26,26,26,0.6)]">Placeholder for {step.id} (to be implemented).</p>
  </div>
);

export function IntroGuidedWorkbook() {
  const { markMilestoneComplete, progress } = useModuleProgress();
  const isReady = progress?.completed_milestones?.includes('MC-MIL-READY-FOR-SIMULATOR') ?? false;

  const renderWorkbookContent = (step: typeof INTRO_GUIDED_SEQUENCE[0]) => {
    switch (step.id) {
      case 'argument-basics':
        return (
          <WorkbookNoteBlock title="Argument Basics">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              An argument is the author taking a position and giving you reasons to believe it. It's a two-part structure: a <strong>claim</strong> (the conclusion) plus <strong>support</strong> (the premises).
            </p>
          </WorkbookNoteBlock>
        );
      case 'argument-basics-checkpoint':
        return (
          <WorkbookCheckpoint 
            title="Quick Check: Argument or Non-Argument?"
            options={["Argument", "Non-Argument"]}
            correctIndex={0}
            explanation="The author is making a judgment—this is an argument."
          />
        );
      case 'premise-vs-conclusion':
        return (
          <WorkbookNoteBlock title="Premise vs Conclusion">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              Accept the premises as given. Question the conclusion. What is the author trying to prove?
            </p>
          </WorkbookNoteBlock>
        );
      case 'x-ray-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">X-Ray: Identify the Conclusion</h3>
            <XRayEmbeddedSlice questions={DRILL_3_2_STAGE_1.slice(0, 2)} />
          </div>
        );
      case 'indicator-words':
        return (
          <WorkbookNoteBlock title="Indicator Words">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              Indicators are clues, not proof. Use them to point you in the right direction, but always verify with support.
            </p>
          </WorkbookNoteBlock>
        );
      case 'indicator-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Identify the Signal</h3>
            <IndicatorEmbeddedSlice questions={DRILL_3_1_STAGE_1.slice(0, 3)} />
          </div>
        );
      case 'where-conclusions-hide':
        return (
          <WorkbookNoteBlock title="Where Conclusions Hide">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              The conclusion isn't always at the end. Look for it in the first sentence, after a pivot (but, however), or between context and evidence.
            </p>
          </WorkbookNoteBlock>
        );
      case 'first-sentence-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Test the Pattern</h3>
            <FirstSentenceEmbeddedSlice questions={DRILL_3_3_STAGE_1.slice(0, 3)} />
          </div>
        );
      case 'rebuttal-trojan-horse':
        return (
          <WorkbookNoteBlock title="Rebuttal / Trojan Horse">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              Authors often introduce an opposing view only to defeat it. Look for the pivot after the initial opposing claim.
            </p>
          </WorkbookNoteBlock>
        );
      case 'rebuttal-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Test the Pattern</h3>
            <RebuttalEmbeddedSlice questions={DRILL_3_4_STAGE_2.slice(0, 3)} />
          </div>
        );
      case 'layered-arguments':
        return (
          <WorkbookNoteBlock title="Layered Arguments">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              Sometimes a conclusion serves double duty: it's supported by one layer of premises and then used to support a further claim (Main Conclusion).
            </p>
          </WorkbookNoteBlock>
        );
      case 'chain-mapping-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Map the Chain</h3>
            <ChainMappingEmbeddedSlice questions={DRILL_3_5_QUESTIONS.slice(0, 2)} />
          </div>
        );
      case 'nested-claims-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Test the Pattern</h3>
            <NestedClaimsEmbeddedSlice questions={DRILL_3_9_QUESTIONS.slice(0, 2)} />
          </div>
        );
      case 'matching-the-answer':
        return (
          <WorkbookNoteBlock title="Matching the Answer">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              The right answer preserves the author's claim perfectly while changing the words. Stay anchored to Force, Scope, and Direction.
            </p>
          </WorkbookNoteBlock>
        );
      case 'read-restate-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Read & Restate</h3>
            <ReadRestateEmbeddedSlice passages={DRILL_3_8_PASSAGES.slice(0, 2)} />
          </div>
        );
      case 'pronoun-replacement-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">Pronoun Replacement</h3>
            <PronounEmbeddedSlice questions={DRILL_3_7_QUESTIONS.slice(0, 2)} />
          </div>
        );
      case 'mc-practice-first-sentence':
      case 'mc-practice-rebuttal':
        return <WorkbookPracticePoolCard slug={step.practiceSlug!} />;
      case 'simulator-assessment':
        return (
          <div className="py-12 border-t border-[rgba(26,26,26,0.1)] scroll-mt-24">
            <h2 className="text-3xl font-serif italic mb-6">Ready for Simulator?</h2>
            {!isReady ? (
              <Button 
                variant="primary" 
                onClick={() => markMilestoneComplete('MC-MIL-READY-FOR-SIMULATOR')}
              >
                Mark Workbook Complete & Unlock Simulator
              </Button>
            ) : (
              <div className="p-4 bg-green-50 text-green-800 rounded">
                Workbook complete! Simulator is unlocked.
              </div>
            )}
          </div>
        );
      default:
        return <PlaceholderBlock step={step} />;
    }
  };

  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] font-sans">
      <div className="max-w-[1180px] mx-auto px-6 md:px-12 py-24">
        <header className="mb-24">
          <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">Introduction</p>
          <h1 className="text-[clamp(72px,10vw,136px)] font-serif italic font-medium leading-[0.80] tracking-[-0.08em] mb-8">Guided Workbook.</h1>
          <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">
            Your integrated learning path.
          </p>
        </header>

        <section className="max-w-[800px]">
          {INTRO_GUIDED_SEQUENCE.map((step) => (
            <div key={step.id}>
              {renderWorkbookContent(step)}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
