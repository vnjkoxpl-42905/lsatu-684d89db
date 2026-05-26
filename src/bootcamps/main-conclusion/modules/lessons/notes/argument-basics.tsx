import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { IntroNotesShell } from "./IntroNotesShell";
import { Button } from "@/bootcamps/main-conclusion/components/primitives/Button";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4">{children}</div>
);

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="space-y-3">
    <Kicker>{title}</Kicker>
    {subtitle ? <h2 className="font-serif italic text-[40px] leading-tight text-[#1a1a1a]">{subtitle}</h2> : null}
  </div>
);

const LessonSection = ({
  tocTitle,
  children,
  className,
}: {
  tocTitle: string;
  children: ReactNode;
  className?: string;
}) => (
  <section
    data-toc
    data-toc-title={tocTitle}
    className={cn("note-section p-10 md:p-12 border-b border-[rgba(26,26,26,0.1)]", className)}
  >
    {children}
  </section>
);

const CalloutCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] p-6 md:p-8", className)}>
    {children}
  </div>
);

const GridCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-white p-6 md:p-8">
    <h3 className="font-serif italic text-[28px] leading-tight text-[#1a1a1a] mb-4">{title}</h3>
    <div className="space-y-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">{children}</div>
  </div>
);

const RowCard = ({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) => (
  <div className="overflow-hidden rounded-[10px] border border-[rgba(26,26,26,0.12)] bg-white">
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.10)]">
      <div className="p-6 md:p-8 font-serif text-[24px] font-semibold leading-tight text-[#1a1a1a]">{left}</div>
      <div className="p-6 md:p-8 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">{right}</div>
    </div>
  </div>
);

const RuleList = ({ items }: { items: string[] }) => (
  <ul className="space-y-3 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)] list-disc pl-5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const ScanReveal = ({
  title,
  prompt,
  children,
  defaultOpen = false,
}: {
  title: string;
  prompt: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-5 rounded-[10px] border border-[rgba(26,26,26,0.12)] bg-white p-6 md:p-8 shadow-[0_10px_28px_rgba(26,26,26,0.06)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Kicker>{title}</Kicker>
          <h3 className="font-serif italic text-[32px] leading-tight text-[#1a1a1a]">{prompt}</h3>
        </div>
        <Button
          type="button"
          variant="subtle"
          size="sm"
          leftIcon={<Eye className="h-4 w-4" />}
          rightIcon={open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          className="rounded-full border-[rgba(26,26,26,0.14)] bg-[rgba(250,247,239,0.95)] px-4"
          onClick={() => setOpen((value) => !value)}
        >
          X-Ray Scan
        </Button>
      </div>
      {open ? <div className="space-y-5">{children}</div> : null}
    </div>
  );
};

const GapSimulator = () => {
  const [gapOpen, setGapOpen] = useState(false);

  return (
    <div className="space-y-5 rounded-[10px] border border-[rgba(26,26,26,0.12)] bg-white p-6 md:p-8 shadow-[0_10px_28px_rgba(26,26,26,0.06)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Kicker>Simulate Logical Gap</Kicker>
          <h3 className="font-serif italic text-[32px] leading-tight text-[#1a1a1a]">What happens when support drops out?</h3>
        </div>
        <Button
          type="button"
          variant="subtle"
          size="sm"
          className="rounded-full border-[rgba(26,26,26,0.14)] bg-[rgba(250,247,239,0.95)] px-4"
          onClick={() => setGapOpen((value) => !value)}
        >
          {gapOpen ? "Restore support" : "Simulate gap"}
        </Button>
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <CalloutCard className={cn("bg-white transition-all", gapOpen && "opacity-55")}>
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">Premises</div>
          <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
            Facts, evidence, and support hold the argument up.
          </p>
        </CalloutCard>
        <div
          className={cn(
            "justify-self-center rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.18em] transition-all",
            gapOpen
              ? "border-[rgba(191,56,56,0.25)] bg-[rgba(191,56,56,0.08)] text-[#8c2f2f]"
              : "border-[rgba(28,164,110,0.28)] bg-[rgba(28,164,110,0.08)] text-[#155b43]",
          )}
        >
          {gapOpen ? "Gap exposed" : "Support intact"}
        </div>
        <CalloutCard
          className={cn(
            "transition-all",
            gapOpen
              ? "border-[rgba(191,56,56,0.24)] bg-[rgba(191,56,56,0.05)]"
              : "border-[rgba(28,164,110,0.22)] bg-[rgba(28,164,110,0.05)]",
          )}
        >
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">Conclusion</div>
          <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
            {gapOpen
              ? "When evidence is removed or insufficient, the support fails, and the conclusion collapses."
              : "Premises support conclusions. Conclusions rely on premises."}
          </p>
        </CalloutCard>
      </div>
    </div>
  );
};

export default function ArgumentBasicsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 1"
      title="Argument Anatomy."
      subtitle="Learn the structure underneath every LR argument before you start hunting conclusions."
    >
      <LessonSection tocTitle="Primary Directive" className="space-y-8">
        <SectionHeading title="Primary Directive" subtitle="How to Read an LR Stimulus" />
        <p className="font-serif italic text-[30px] leading-[1.35] text-[#1a1a1a]">
          The core job: When you read an LR stimulus, do not read passively. Find the conclusion, find the premises, and ask whether the premises really prove the conclusion.
        </p>
      </LessonSection>

      <LessonSection tocTitle="Assessment Metrics" className="space-y-8">
        <SectionHeading title="Assessment Metrics" subtitle="What Logical Reasoning Tests" />
        <div className="grid gap-5">
          <GridCard title="1. Read Intently">
            <p>
              You must pay attention to what each sentence is doing. If you do not really understand what you are reading, you will not answer the question correctly. Do not skim. Do not assume. Do not paraphrase too loosely. Track the role of each statement.
            </p>
          </GridCard>
          <GridCard title="2. Question the Author">
            <p>
              Many students read an LR stimulus and think, &quot;That sounds fine.&quot; That is the wrong mindset. The author&apos;s conclusion is often the weak point. Ask whether the evidence actually proves the claim, whether the author is going too far, and whether there is a gap between the premises and the conclusion.
            </p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Structural Triad" className="space-y-8">
        <SectionHeading title="Structural Triad" subtitle="The Three Parts of an LR Question" />
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          Every Logical Reasoning question has three parts: the stimulus, the question stem, and the answer choices. Of those three, the stimulus matters most. The answer is not sitting in the answer choices. The answer choices test whether you understood the stimulus correctly.
        </p>
        <div className="space-y-4">
          <RowCard
            left="1. Stimulus"
            right="The short passage you read first. This is where the reasoning lives. Your job is to figure out what facts or evidence the author is giving you and what claim the author is trying to prove. That means your real task is to separate premises from conclusions."
          />
          <RowCard
            left="2. Question Stem"
            right="The question stem tells you what job you need to do with the argument: find the flaw, strengthen the argument, weaken the argument, identify the main conclusion, or find an assumption. First understand the argument. Then use the question stem to know what to do with it."
          />
          <RowCard
            left="3. Answer Choices"
            right="The answer choices do not create the reasoning. They test whether you understood it correctly. Do not start by comparing answer choices before you understand the stimulus. The stimulus comes first."
          />
        </div>
      </LessonSection>

      <LessonSection tocTitle="Execution Example" className="space-y-8">
        <SectionHeading title="Execution Example" subtitle="The Stock Analysts" />
        <ScanReveal title="Execution Example" prompt="The Stock Analysts">
          <CalloutCard className="bg-[#FCFAF5]">
            <p className="font-serif italic text-[22px] leading-[1.7] text-[#1a1a1a]">
              &quot;Humans are no better than apes at investing. We gave five stock analysts and one chimpanzee $1,350 each to invest. After one month, the chimp won, increasing its net worth by $210. The next best analyst increased by only $140.&quot;
            </p>
          </CalloutCard>
          <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
            <strong className="text-[#1a1a1a]">Question Stem:</strong> Each of the following describes a flaw in the game show host&apos;s reasoning EXCEPT:
          </p>
          <div className="space-y-3">
            {[
              "(A) It draws a sweeping conclusion about two entire species based on an exceptionally small sample size.",
              "(B) It takes for granted that a single one-month trial is a reliable indicator of long-term investing skill.",
              "(C) It fails to consider the possibility that the chimpanzee's success was merely the result of random chance.",
              "(D) It inappropriately relies on the emotional appeal of an animal succeeding in a human profession.",
              "(E) It presumes, without providing justification, that the five chosen analysts are representative of human investors generally.",
            ].map((choice) => (
              <div
                key={choice}
                className={cn(
                  "rounded-[8px] border px-5 py-4 text-[18px] leading-[1.65]",
                  choice.startsWith("(D)")
                    ? "border-[rgba(28,164,110,0.48)] bg-[rgba(28,164,110,0.08)] text-[#155b43]"
                    : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.78)]",
                )}
              >
                {choice}
                {choice.startsWith("(D)") ? <span className="ml-3 inline-flex rounded-full border border-[rgba(28,164,110,0.48)] px-2 py-0.5 text-[12px] uppercase tracking-[0.16em]">Correct</span> : null}
              </div>
            ))}
          </div>
          <p className="font-serif italic text-[20px] leading-[1.8] text-[rgba(26,26,26,0.78)]">
            *Because this is an EXCEPT question, (A), (B), (C), and (E) all describe actual logical flaws in the stimulus. (D) is the correct answer because the argument does not rely on an emotional appeal, making it the only option that DOES NOT describe a flaw.
          </p>
        </ScanReveal>
      </LessonSection>

      <LessonSection tocTitle="Simulate Logical Gap" className="space-y-8">
        <SectionHeading title="Simulate Logical Gap" subtitle="Valid Argument vs. Gap" />
        <GapSimulator />
      </LessonSection>

      <LessonSection tocTitle="The Building Blocks" className="space-y-8">
        <SectionHeading title="The Building Blocks" subtitle="Premises: Statements of Fact" />
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          Premises are the facts or evidence in the argument. They tell you what the author is giving you to work with. On the LSAT, you accept the premises as true. Do not push back on the premises. Push back on the conclusion.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            <strong>Key rule:</strong> The question is not whether the premises are true. The question is whether the premises actually support the conclusion.
          </p>
        </CalloutCard>
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="ARE">
            <RuleList items={["Facts", "Evidence", "Support", "Building blocks"]} />
          </GridCard>
          <GridCard title="ARE NOT">
            <RuleList items={["Main judgments", "The part you attack", "Final claims"]} />
          </GridCard>
        </div>
        <CalloutCard className="bg-white">
          <Kicker>Premise Indicators: FABS</Kicker>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {["FOR", "AFTER ALL", "BECAUSE", "SINCE"].map((item) => (
              <div key={item} className="rounded-[6px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] px-4 py-3 text-center font-mono text-[13px] tracking-[0.16em] uppercase text-[#1a1a1a]">
                {item}
              </div>
            ))}
          </div>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="The Main Point" className="space-y-8">
        <SectionHeading title="The Main Point" subtitle="Conclusions: The Author's Claim" />
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          Conclusions are the judgments the author makes. They are the main point the author wants you to accept. This is the part of the argument you should examine most carefully.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            <strong>Key rule:</strong> The conclusion is the part of the argument you should be most suspicious of. Ask whether it is too strong, whether it goes beyond the evidence, whether the author assumed something missing, and whether the premises really get us there.
          </p>
        </CalloutCard>
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="ARE">
            <RuleList items={["Author's claim", "The point argued for", "Part you question"]} />
          </GridCard>
          <GridCard title="ARE NOT">
            <RuleList items={["Automatically proven", "Self-supporting", "Always clear"]} />
          </GridCard>
        </div>
        <CalloutCard className="bg-white">
          <Kicker>Conclusion Indicator Words</Kicker>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {["THEREFORE", "THUS", "HENCE", "SO", "CONSEQUENTLY", "AS A RESULT", "IT FOLLOWS THAT", "THIS SHOWS THAT"].map((item) => (
              <div key={item} className="rounded-[6px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] px-4 py-3 text-center font-mono text-[13px] tracking-[0.16em] uppercase text-[#1a1a1a]">
                {item}
              </div>
            ))}
          </div>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Indicator Drill" className="space-y-8">
        <SectionHeading title="Indicator Drill" subtitle="Indicators in Action" />
        <ScanReveal title="Indicator Drill" prompt="Indicators in Action">
          <CalloutCard className="bg-[#FCFAF5]">
            <p className="font-serif italic text-[22px] leading-[1.7] text-[#1a1a1a]">
              &quot;Monica claimed to have caused the extinction of the dinosaurs, and everything Monica claims is true. Therefore, Monica caused the extinction of the dinosaurs.&quot;
            </p>
          </CalloutCard>
          <div className="grid gap-5 md:grid-cols-2">
            <GridCard title="Premises">
              <p>Monica claimed it; everything Monica claims is true.</p>
            </GridCard>
            <GridCard title="Conclusion">
              <p>Monica caused the extinction.</p>
            </GridCard>
          </div>
        </ScanReveal>
      </LessonSection>

      <LessonSection tocTitle="Sequence" className="space-y-8">
        <SectionHeading title="Sequence" subtitle="How to Read a Stimulus Step by Step" />
        <div className="space-y-4">
          {[
            "Ask whether it is an argument: Not every stimulus is an argument. If there is no claim being supported, it may just be a set of facts. If there is a claim supported by evidence, it is an argument.",
            "Find the conclusion: Ask: what is the author trying to prove? That is the conclusion.",
            "Find the premises: Ask: what evidence is being used to support that conclusion? Those are the premises.",
            "Analyze the gap: Ask: do these premises really justify that conclusion? That is where most LR questions live.",
          ].map((text, index) => (
            <RowCard key={text} left={String(index + 1)} right={text} />
          ))}
        </div>
      </LessonSection>

      <LessonSection tocTitle="Verification" className="space-y-8">
        <SectionHeading title="Verification" subtitle="Main Conclusion: 2-Point Check" />
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          Important warning about indicator words: Indicator words are helpful, but they are not enough by themselves. Sometimes they appear. Sometimes they do not. So do not rely on indicator words alone. Instead, ask whether a sentence is giving you evidence or giving you the author&apos;s claim.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a] mb-4">
            <strong>The 2-Point Check:</strong> The main conclusion usually...
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[6px] border border-[rgba(26,26,26,0.10)] bg-white px-5 py-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
              <strong className="text-[#1a1a1a]">1.</strong> Sounds like the author&apos;s Opinion.
            </div>
            <div className="rounded-[6px] border border-[rgba(26,26,26,0.10)] bg-white px-5 py-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
              <strong className="text-[#1a1a1a]">2.</strong> Is Supported by at least one other explicit claim.
            </div>
          </div>
        </CalloutCard>
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          Not every claim in a stimulus is the main conclusion. Some claims are intermediate conclusions. So ask: which statement sounds most like the author&apos;s actual point, and which statement is being supported by other statements?
        </p>
      </LessonSection>

      <LessonSection tocTitle="Contextual Layer" className="space-y-8">
        <SectionHeading title="Contextual Layer" subtitle="Peripheral Information" />
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          When we dissect arguments, we want to focus on the relationship between the conclusion and the premises. But arguments can also include peripheral information. These elements do not form the core structure, but they add context and complexity.
        </p>
        <div className="space-y-4">
          <RowCard
            left="1. Background Info"
            right={
              <>
                <p>Sets the stage and provides context but does not directly support the conclusion. Like describing the room before making a recommendation.</p>
                <p className="mt-4 font-serif italic text-[#1a1a1a]">Ex: &quot;The average American consumes 222 pounds of meat each year.&quot;</p>
              </>
            }
          />
          <RowCard
            left="2. Opposing Views"
            right={
              <>
                <p>Ideas that challenge the main conclusion. Authors often bring them up to show they are considering other perspectives before reinforcing their own point.</p>
                <p className="mt-4 font-serif italic text-[#1a1a1a]">Ex: &quot;Many people argue that eating meat is necessary for a balanced diet.&quot;</p>
              </>
            }
          />
          <RowCard
            left="3. Concessions"
            right={
              <>
                <p>A concession happens when the author acknowledges a point from the opposing side but then immediately answers it in order to strengthen the original position. Be ready for the author&apos;s real point right after it.</p>
              </>
            }
          />
        </div>
        <ScanReveal title="Contextual Layer" prompt="Concessions in Action">
          <CalloutCard className="bg-[#FCFAF5]">
            <p className="font-serif italic text-[22px] leading-[1.7] text-[#1a1a1a]">
              &quot;Yes, it is true that a vegetarian diet can lack some nutrients, but supplements can easily make up for it.&quot;
            </p>
          </CalloutCard>
          <div className="grid gap-5 md:grid-cols-2">
            <GridCard title="Opposing View">
              <p>Yes, it is true that a vegetarian diet can lack some nutrients.</p>
            </GridCard>
            <GridCard title="Author&apos;s Point">
              <p>Supplements can easily make up for it.</p>
            </GridCard>
          </div>
        </ScanReveal>
      </LessonSection>

      <LessonSection tocTitle="Standard of Truth" className="space-y-8">
        <SectionHeading title="Standard of Truth" subtitle="Valid vs. Invalid" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Valid Conclusion = Proven">
            <p>
              A valid conclusion is one that must be true if the premises are true. That means there is no gap, no wiggle room, and no missing assumption. If the premises are true, the conclusion has to be true.
            </p>
          </GridCard>
          <GridCard title="Invalid Conclusion = Not Fully Proven">
            <p>
              An invalid conclusion is not guaranteed by the premises. The premises may make it sound plausible, tempting, or even likely. But if the conclusion does not have to follow, then it is not valid. That is where flaws, assumptions, weakeners, and strengtheners come in.
            </p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Executive Summary" className="space-y-8 border-b-0">
        <SectionHeading title="Executive Summary" subtitle="The Student Takeaway" />
        <CalloutCard className="bg-[#1a1a1a] text-[#F5F2ED] border-[rgba(26,26,26,0.92)]">
          <p className="text-[22px] leading-[1.8]">
            When you read an LR stimulus, always ask three questions:
          </p>
          <ol className="mt-6 space-y-4 list-decimal pl-6 text-[20px] leading-[1.75]">
            <li>What is the conclusion?</li>
            <li>What are the premises?</li>
            <li>Do the premises actually prove the conclusion?</li>
          </ol>
          <p className="mt-6 text-[20px] leading-[1.75] text-[rgba(245,242,237,0.84)]">
            If you get good at those three questions, LR becomes much more manageable.
          </p>
        </CalloutCard>
      </LessonSection>
    </IntroNotesShell>
  );
}
