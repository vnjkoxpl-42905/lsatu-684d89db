import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { INTRO_GUIDED_SEQUENCE } from "./introGuidedSequence";
import { DRILL_3_1_STAGE_1, DRILL_3_2_STAGE_1, DRILL_3_3_STAGE_1, DRILL_3_4_STAGE_2, DRILL_3_7_QUESTIONS } from "@/bootcamps/main-conclusion/content/drills.source";
import { MAIN_CONCLUSION_PRACTICE_POOLS } from "@/bootcamps/main-conclusion/data/practiceDrillPools";
import { XRayEmbeddedSlice, IndicatorEmbeddedSlice, FirstSentenceEmbeddedSlice, RebuttalEmbeddedSlice, PronounEmbeddedSlice } from "./EmbeddedDrillRunner";
import { useModuleProgress } from "@/bootcamps/main-conclusion/hooks/useModuleProgress";
import { Button } from "@/bootcamps/main-conclusion/components/primitives/Button";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

const WorkbookNoteBlock = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="py-12 border-t border-[rgba(26,26,26,0.1)] scroll-mt-24">
    <div className="text-[10px] uppercase tracking-[0.20em] text-[rgba(26,26,26,0.4)] mb-4">Note</div>
    <h2 data-toc className="text-4xl font-serif italic mb-8">{title}</h2>
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
      case 'stimulus-first':
        return (
          <WorkbookNoteBlock title="Stimulus First">
            <div className="space-y-4 text-[rgba(26,26,26,0.8)]">
              <p className="text-xl leading-relaxed">
                Every LR question has three parts: the stimulus, the question stem, and the answer choices. Of those three, <strong>the stimulus matters most.</strong>
              </p>
              <p className="text-xl leading-relaxed">
                Read the passage before you look for tasks or answers. Your first job is to decide what the stimulus is saying and whether it is merely giving information or actually making a case.
              </p>
            </div>
          </WorkbookNoteBlock>
        );
      case 'argument-anatomy':
        return (
          <WorkbookNoteBlock title="Argument Anatomy">
            <div className="space-y-5 text-[rgba(26,26,26,0.8)]">
              <p className="text-xl leading-relaxed">
                Once you know the stimulus comes first, the next question is structural: is this passage only informing you, or is it using reasons to support a claim?
              </p>
              <div className="border border-[rgba(26,26,26,0.1)] bg-white p-6 space-y-3">
                <div><strong>Conclusion:</strong> The city should expand library funding.</div>
                <div><strong>Premise:</strong> The library stays full every afternoon.</div>
                <div><strong>Premise:</strong> Students use it for tutoring, internet access, and after-school study.</div>
              </div>
            </div>
          </WorkbookNoteBlock>
        );
      case 'structure-checkpoint':
        return (
          <WorkbookCheckpoint
            title="Which sentence is doing the proving?"
            options={[
              "The recommendation is the premise, because it sounds strongest.",
              "The evidence sentence is the premise, and the recommendation is the conclusion.",
              "Both are conclusions because both express ideas.",
            ]}
            correctIndex={1}
            explanation="The premise is the sentence giving the reason. The conclusion is the sentence that reason is trying to prove."
          />
        );
      case 'x-ray-slice':
        return (
          <div className="py-8 scroll-mt-24">
            <h3 className="text-2xl font-serif italic mb-6">X-Ray: Identify the Conclusion</h3>
            <XRayEmbeddedSlice questions={DRILL_3_2_STAGE_1.slice(0, 2)} />
          </div>
        );
      case 'core-indicators':
        return (
          <WorkbookNoteBlock title="Core Indicator Words">
            <div className="space-y-4 text-[rgba(26,26,26,0.8)]">
              <p className="text-xl leading-relaxed">
                Learn indicators after you understand the parts. These are the foundational signals that speed up your structural reading.
              </p>
              <ul className="space-y-3 text-lg leading-relaxed list-disc pl-5">
                <li>
                  <strong>Core Conclusion indicators:</strong> therefore, thus, so, hence, it follows that
                </li>
                <li>
                  <strong>Core Premise indicators (FABS):</strong> for, after all, because, since
                </li>
              </ul>
              <div className="bg-white border border-[rgba(26,26,26,0.1)] p-6 rounded-[4px] space-y-4 my-6">
                <p className="font-semibold text-lg">Indicator words are clues, not proof.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>First find the structure.</li>
                  <li>Then use indicators to speed up confirmation.</li>
                  <li>Conclusion indicators usually point to the author’s claim.</li>
                  <li>FABS usually points to support.</li>
                  <li>Always ask: what is being proved, and what is doing the proving?</li>
                </ul>
              </div>
              <div className="space-y-6 mt-8">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.4)]">
                    Example: Conclusion Indicator
                  </p>
                  <p className="text-lg italic bg-white p-4 border-l-4 border-mc-conclusion">
                    “The library is full every afternoon. <strong>Therefore</strong>, the city should expand library funding.”
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.4)]">
                    Example: Premise Indicator
                  </p>
                  <p className="text-lg italic bg-white p-4 border-l-4 border-mc-premise">
                    “The city should expand library funding <strong>because</strong> students rely on the library for tutoring and internet access.”
                  </p>
                </div>
              </div>
            </div>
          </WorkbookNoteBlock>
        );
      case 'two-part-check':
        return (
          <WorkbookNoteBlock title="2-Part Conclusion Check">
            <div className="space-y-5 text-[rgba(26,26,26,0.8)]">
              <p className="text-xl leading-relaxed">
                Once you know what premises and conclusions are, and once you know how indicators behave, you can verify a conclusion candidate with two checks.
              </p>
              <div className="border border-[rgba(26,26,26,0.1)] bg-[#F9F7F4] p-6 space-y-3">
                <div>
                  <strong>1.</strong> Is it the kind of sentence an author would want to prove? (An opinion
                  or judgment)
                </div>
                <div>
                  <strong>2.</strong> Is there support in the stimulus aimed at proving it?
                </div>
              </div>
              <div className="bg-white p-6 border border-[rgba(26,26,26,0.1)] space-y-3">
                <p className="font-semibold">Opinion Indicators:</p>
                <p className="text-lg">
                  Watch for words like <strong>should, ought, must, clearly, likely, misguided</strong>.
                  These mark a sentence as a judgment, making it a high-probability conclusion candidate.
                </p>
              </div>
            </div>
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
            <div className="space-y-4 text-[rgba(26,26,26,0.8)]">
              <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
                The conclusion isn't always at the end. Look for it in the first sentence, after a pivot
                (but, however), or between context and evidence.
              </p>
              <div className="bg-white p-6 border border-[rgba(26,26,26,0.1)] space-y-3">
                <p className="font-semibold">Pivot Indicators:</p>
                <p className="text-lg">
                  <strong>but, however, yet, nevertheless, nonetheless</strong>
                </p>
                <p className="text-base italic">
                  Pivots mark a turn. The author’s true claim is almost always on the far side of the pivot.
                </p>
              </div>
            </div>
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
            <div className="space-y-4 text-[rgba(26,26,26,0.8)]">
              <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
                Authors often introduce an opposing view only to defeat it. Look for the pivot after the
                initial opposing claim.
              </p>
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                <div className="bg-white p-6 border border-[rgba(26,26,26,0.1)] space-y-3">
                  <p className="font-semibold">Opposing View Indicators:</p>
                  <p className="text-lg">critics argue, some people say, many believe</p>
                </div>
                <div className="bg-white p-6 border border-[rgba(26,26,26,0.1)] space-y-3">
                  <p className="font-semibold">Concession Indicators:</p>
                  <p className="text-lg">although, while, despite, granted, admittedly</p>
                </div>
              </div>
            </div>
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
      case 'matching-the-answer':
        return (
          <WorkbookNoteBlock title="Matching the Answer">
            <p className="text-xl leading-relaxed text-[rgba(26,26,26,0.8)]">
              The right answer preserves the author's claim perfectly while changing the words. Stay anchored to Force, Scope, and Direction.
            </p>
          </WorkbookNoteBlock>
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
      <DynamicIslandTOC />
      <div className="max-w-[1180px] mx-auto px-6 md:px-12 py-24">
        <header className="mb-24">
          <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">Introduction</p>
          <h1 data-toc className="text-[clamp(56px,8vw,120px)] font-serif italic font-medium leading-[0.80] tracking-[-0.05em] mb-8">Intro to LR Practice Path</h1>
          <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">
            Work through the notes, checkpoints, and practice sets in sequence.
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
