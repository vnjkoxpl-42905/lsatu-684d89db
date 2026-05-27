import type { ReactNode } from "react";

import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

export type IntroLessonPageId =
  | "how-to-read-lr-stimulus"
  | "three-parts-lr-question"
  | "so-an-argument"
  | "premises"
  | "conclusions"
  | "five-types-of-conclusions"
  | "beyond-premises-and-conclusions"
  | "two-part-conclusion-check";

type PageDefinition = {
  eyebrow: string;
  title: string;
  subtitle: string;
  content: ReactNode;
};

const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">
    {children}
  </div>
);

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="space-y-3">
    <Kicker>{title}</Kicker>
    {subtitle ? <h2 className="font-serif text-[40px] italic leading-tight text-[#1a1a1a]">{subtitle}</h2> : null}
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
    className={cn("note-section border-b border-[rgba(26,26,26,0.1)] p-10 md:p-12", className)}
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
    <h3 className="mb-4 font-serif text-[28px] italic leading-tight text-[#1a1a1a]">{title}</h3>
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
    <div className="grid grid-cols-1 divide-y divide-[rgba(26,26,26,0.10)] md:grid-cols-[220px_1fr] md:divide-x md:divide-y-0">
      <div className="p-6 font-serif text-[24px] font-semibold leading-tight text-[#1a1a1a] md:p-8">{left}</div>
      <div className="p-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)] md:p-8">{right}</div>
    </div>
  </div>
);

const QuoteCard = ({ children }: { children: ReactNode }) => (
  <div className="border-l-4 border-[rgba(26,26,26,0.45)] pl-6 py-2 text-[18px] leading-[1.75] text-[rgba(26,26,26,0.82)]">
    {children}
  </div>
);

const BulletList = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc space-y-3 pl-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const NumberList = ({ items }: { items: ReactNode[] }) => (
  <ol className="list-decimal space-y-3 pl-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ol>
);

const pages: Record<IntroLessonPageId, PageDefinition> = {
  "how-to-read-lr-stimulus": {
    eyebrow: "Page 1",
    title: "How to Read an LR Stimulus",
    subtitle: "Logical Reasoning starts with active reading: find the conclusion, find the premises, and test whether the support really proves the claim.",
    content: (
      <>
        <LessonSection tocTitle="Primary Directive" className="space-y-8">
          <SectionHeading title="Primary Directive" subtitle="How to Read an LR Stimulus" />
          <CalloutCard className="bg-white">
            <p className="text-[22px] leading-[1.75] text-[#1a1a1a]">
              The core job: When you read an LR stimulus, do not read passively. Find the conclusion, find the premises, and ask whether the premises really prove the conclusion.
            </p>
          </CalloutCard>
        </LessonSection>

        <LessonSection tocTitle="Assessment Metrics" className="space-y-8 border-b-0">
          <SectionHeading title="Assessment Metrics" subtitle="What Logical Reasoning Tests" />
          <div className="grid gap-5">
            <GridCard title="1. Read Intently">
              <p>
                You must pay attention to what each sentence is doing. If you do not really understand what you are reading, you will not answer the question correctly.
              </p>
              <p>Do not skim. Do not assume. Do not paraphrase too loosely. Track the role of each statement.</p>
            </GridCard>
            <GridCard title="2. Question the Author">
              <p>
                Many students read an LR stimulus and think, "That sounds fine." That is the wrong mindset. The author's conclusion is often the weak point.
              </p>
              <p>
                Ask whether the evidence actually proves the claim, whether the author is going too far, and whether there is a gap between the premises and the conclusion.
              </p>
            </GridCard>
          </div>
        </LessonSection>
      </>
    ),
  },
  "three-parts-lr-question": {
    eyebrow: "Page 2",
    title: "The Three Parts of an LR Question",
    subtitle: "Every question has a stimulus, a question stem, and answer choices, but the reasoning lives in the stimulus.",
    content: (
      <>
        <LessonSection tocTitle="Structural Triad" className="space-y-8">
          <SectionHeading title="Structural Triad" subtitle="The Three Parts of an LR Question" />
          <CalloutCard className="bg-white">
            <p className="text-[22px] leading-[1.75] text-[#1a1a1a]">
              Every Logical Reasoning question has three parts: the stimulus, the question stem, and the answer choices. Of those three, the stimulus matters most. The answer is not sitting in the answer choices. The answer choices test whether you understood the stimulus correctly.
            </p>
          </CalloutCard>
        </LessonSection>

        <LessonSection tocTitle="Breakdown Table" className="space-y-4">
          <SectionHeading title="Breakdown Table" subtitle="What each part is doing" />
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
        </LessonSection>

        <LessonSection tocTitle="Stock Analysts" className="space-y-8 border-b-0">
          <SectionHeading title="Applied X-ray Example" subtitle="The Stock Analysts" />
          <p className="text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            This is a labeled anatomy example, not a graded question.
          </p>
          <div className="grid gap-5">
            <GridCard title="Stimulus">
              <p>
                "Humans are no better than apes at investing. We gave five stock analysts and one chimpanzee $1,350 each to invest. After one month, the chimp won, increasing its net worth by $210. The next best analyst increased by only $140."
              </p>
            </GridCard>
            <GridCard title="Question Stem">
              <p>Each of the following describes a flaw in the game show host's reasoning EXCEPT:</p>
            </GridCard>
            <GridCard title="Answer Choices">
              <BulletList
                items={[
                  "(A) It draws a sweeping conclusion about two entire species based on an exceptionally small sample size.",
                  "(B) It takes for granted that a single one-month trial is a reliable indicator of long-term investing skill.",
                  "(C) It fails to consider the possibility that the chimpanzee's success was merely the result of random chance.",
                  "(D) It inappropriately relies on the emotional appeal of an animal succeeding in a human profession. [Correct]",
                  "(E) It presumes, without providing justification, that the five chosen analysts are representative of human investors generally.",
                ]}
              />
            </GridCard>
          </div>
        </LessonSection>
      </>
    ),
  },
  "so-an-argument": {
    eyebrow: "Page 3",
    title: "So, An Argument",
    subtitle: "Arguments are the centerpiece of LR: premises support conclusions, and everything else builds from that picture.",
    content: (
      <>
        <LessonSection tocTitle="The Centerpiece" className="space-y-8">
          <SectionHeading title="The Centerpiece" subtitle="What an argument actually is" />
          <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
            In Logical Reasoning, arguments are the single most important concept you need to understand on a deep level. We are going to learn to manipulate them, dismantle them, and beat them. But first, you need a crystal clear picture of what an argument actually is.
          </p>
        </LessonSection>
        <LessonSection tocTitle="Core Picture" className="space-y-8 border-b-0">
          <SectionHeading title="Arguments Are Premises And Conclusions" subtitle="The whole structure in one frame" />
          <CalloutCard>
            <div className="space-y-5 text-[20px] leading-[1.7] text-[#1a1a1a]">
              <div>
                <strong>Premises support conclusions.</strong>
                <div>Premises are the evidence.</div>
              </div>
              <div>
                <strong>Conclusions rely on premises.</strong>
                <div>Conclusions are the author's claim.</div>
              </div>
            </div>
          </CalloutCard>
        </LessonSection>
      </>
    ),
  },
  premises: {
    eyebrow: "Page 4",
    title: "Premises",
    subtitle: "Premises are the facts and evidence you accept as true; the real question is how they connect to the conclusion.",
    content: (
      <LessonSection tocTitle="Premises" className="space-y-8 border-b-0">
        <SectionHeading title="Premises" subtitle="Statements of fact" />
        <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
          <p>Premises are just the facts. The evidence. They describe how the world is, and on the LSAT, you accept them as true, full stop.</p>
          <p>
            The correct answer almost never questions the truth of a premise. The real issue is whether the premise actually supports the conclusion the author is trying to prove.
          </p>
        </div>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            Remember: Accept premises as true. Do not debate them. Focus on whether they support the conclusion.
          </p>
        </CalloutCard>
      </LessonSection>
    ),
  },
  conclusions: {
    eyebrow: "Page 5",
    title: "Conclusions",
    subtitle: "Conclusions are the author's claims and judgments; they are the part of the argument you question.",
    content: (
      <LessonSection tocTitle="Conclusions" className="space-y-8 border-b-0">
        <SectionHeading title="Conclusions" subtitle="Claimy judgments that are usually wrong" />
        <div className="space-y-4 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
          <p>Conclusions are the judgments the author makes. They are the main event. Everything in an argument exists to support them.</p>
          <p>
            The author takes what the premises say and infers something new. That gap between what the premises say and what the conclusion claims is where the LSAT lives.
          </p>
          <p><strong>Conclusions are the part of the argument you question. Not the premises.</strong></p>
        </div>
      </LessonSection>
    ),
  },
  "five-types-of-conclusions": {
    eyebrow: "Page 6",
    title: "Five Types of Conclusions",
    subtitle: "Once you find the conclusion, name its type so you can predict the weakness that usually comes with it.",
    content: (
      <LessonSection tocTitle="Five Types" className="space-y-8 border-b-0">
        <SectionHeading title="The Five Major Types" subtitle="What kind of claim is the author making?" />
        <div className="grid gap-5">
          <GridCard title="1. Recommendations">
            <p>A recommendation tells us what should happen.</p>
          </GridCard>
          <GridCard title="2. Causal Hypotheses">
            <p>A causal hypothesis claims to know why something happened.</p>
          </GridCard>
          <GridCard title="3. Predictions">
            <p>A prediction claims that something will happen.</p>
          </GridCard>
          <GridCard title="4. Judgments and Labels">
            <p>A judgment assigns a verdict.</p>
          </GridCard>
          <GridCard title="5. Rebuttals">
            <p>A rebuttal is the author saying someone else is wrong.</p>
          </GridCard>
        </div>
      </LessonSection>
    ),
  },
  "beyond-premises-and-conclusions": {
    eyebrow: "Page 7",
    title: "Beyond Premises and Conclusions",
    subtitle: "Not every sentence belongs to the author's own argument, so separate context, opposition, concessions, and pivots from the real claim.",
    content: (
      <LessonSection tocTitle="Beyond Premises And Conclusions" className="space-y-8 border-b-0">
        <SectionHeading title="The Five Extra Pieces" subtitle="What to separate from the author's argument" />
        <div className="grid gap-5">
          <GridCard title="1. Background Information">
            <p>Background sets the stage. It does not automatically support the conclusion.</p>
          </GridCard>
          <GridCard title="2. Attributions and Opposing Viewpoints">
            <p>Ask whose view it is before treating it as the author's conclusion.</p>
          </GridCard>
          <GridCard title="3. Opposing Support">
            <p>Evidence only becomes the author's premise if it supports the author's conclusion.</p>
          </GridCard>
          <GridCard title="4. Concessions and Disclaimers">
            <p>A concession is something the author gives away before making the real argument.</p>
          </GridCard>
          <GridCard title="5. Pivots">
            <p>Pivot words often mark the turn into the author's actual position.</p>
          </GridCard>
        </div>
      </LessonSection>
    ),
  },
  "two-part-conclusion-check": {
    eyebrow: "Page 8",
    title: "The 2-Part Conclusion Check",
    subtitle: "Two questions. Both must be yes. It is the cleanest way to verify the main conclusion.",
    content: (
      <LessonSection tocTitle="The 2-Part Conclusion Check" className="space-y-8 border-b-0">
        <SectionHeading title="The Check" subtitle="Run these two questions on every candidate" />
        <CalloutCard className="bg-white">
          <NumberList
            items={[
              <span><strong>Is this the author's own opinion?</strong> Is this a claim someone could reasonably disagree with?</span>,
              <span><strong>Is this claim supported by at least one other explicit statement in the stimulus?</strong></span>,
            ]}
          />
        </CalloutCard>
        <p className="text-[20px] leading-[1.75] text-[rgba(26,26,26,0.84)]">Both answers must be yes.</p>
        <QuoteCard>
          <p>Some paleontologists suggest the Apatosaurus was able to gallop. However, this is unlikely. Experiments show the strain of galloping would have broken their legs.</p>
        </QuoteCard>
      </LessonSection>
    ),
  },
};

export function IntroLessonPage({ pageId }: { pageId: IntroLessonPageId }) {
  const page = pages[pageId];

  return (
    <IntroNotesShell eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle}>
      {page.content}
    </IntroNotesShell>
  );
}
