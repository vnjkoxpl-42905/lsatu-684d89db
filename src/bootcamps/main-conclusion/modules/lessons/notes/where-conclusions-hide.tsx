import type { ReactNode } from "react";

import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const Kicker = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]", className)}>
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

export default function WhereConclusionsHideNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 3"
      title="Where Conclusions Hide."
      subtitle="Once you know what a conclusion is, learn the places authors like to tuck it."
    >
      <LessonSection tocTitle="Placement rule" className="space-y-8">
        <SectionHeading title="Placement rule" subtitle="Location gives you a candidate" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          The conclusion is not always last. Its location can help you spot it, but placement only gives you a candidate.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            By this point you already know indicators and the 2-part check. Use those tools here instead of relearning them.
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Common hiding spots" className="space-y-8">
        <SectionHeading title="Common hiding spots" subtitle="The places to check first" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="First sentence">
            <p>The passage opens with a judgment, then spends the remaining lines defending it.</p>
          </GridCard>
          <GridCard title="After a pivot">
            <p>A sentence after a turn such as &quot;but&quot; or &quot;however&quot; often contains the author&apos;s real point.</p>
          </GridCard>
          <GridCard title="Between setup and evidence">
            <p>The author may give background, state the point, then support it. The middle sentence can be the target.</p>
          </GridCard>
          <GridCard title="After rebuttal context">
            <p>Once an opposing view or concession appears, the author&apos;s response often carries the conclusion.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Pattern example" className="space-y-8">
        <SectionHeading title="Pattern example" subtitle="Watch the placement, not just the wording" />
        <CalloutCard className="bg-[#FCFAF5]">
          <p className="font-serif text-[22px] italic leading-[1.7] text-[#1a1a1a]">
            &quot;Many critics say the museum expansion is too expensive. However, the project should proceed because private donors have already covered most of the cost and the additional galleries will double student access to the collection.&quot;
          </p>
        </CalloutCard>
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="What comes first">
            <p>The opening reports someone else&apos;s criticism.</p>
            <p>That sets up contrast, not the author&apos;s final point.</p>
          </GridCard>
          <GridCard title="Where the conclusion lands">
            <p>After the pivot, the author states the real claim: the project should proceed.</p>
            <p>The remaining material supports that claim.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Placement is a search strategy" />
        <CalloutCard className="border-[rgba(26,26,26,0.92)] bg-[#1a1a1a] text-[#F5F2ED]">
          <p className="text-[22px] leading-[1.8]">
            Check the usual hiding spots first, then confirm the candidate with support. Location helps you find the conclusion; structure proves you found the right one.
          </p>
        </CalloutCard>
      </LessonSection>
    </IntroNotesShell>
  );
}
