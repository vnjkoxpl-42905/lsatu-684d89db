import type { ReactNode } from "react";

import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">{children}</div>
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

export default function LayeredArgumentsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 4"
      title="Layered Arguments."
      subtitle="Some claims get support and then turn around and support something larger."
    >
      <LessonSection tocTitle="The chain" className="space-y-8">
        <SectionHeading title="The chain" subtitle="When one conclusion becomes a premise" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          A layered argument has a middle claim that does double duty: it is supported by earlier reasons, then used to support the main conclusion.
        </p>
      </LessonSection>

      <LessonSection tocTitle="Bridge test" className="space-y-8">
        <SectionHeading title="Bridge test" subtitle="How to spot the intermediate conclusion" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Check 1">
            <p>What supports this claim?</p>
          </GridCard>
          <GridCard title="Check 2">
            <p>What does this claim support?</p>
          </GridCard>
        </div>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            If the answer to both questions is &quot;something in the stimulus,&quot; you are probably looking at an intermediate conclusion.
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Supported vs not fully supported" className="space-y-8">
        <SectionHeading title="Supported vs not fully supported" subtitle="Why some chains still leave a gap" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Supported">
            <p>Each step in the chain gives enough reason to move to the next claim.</p>
          </GridCard>
          <GridCard title="Not fully supported">
            <p>The argument makes a jump. The premises or intermediate conclusion suggest the next step, but do not fully earn it.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Gap example" className="space-y-8">
        <SectionHeading title="Gap example" subtitle="Later-stage validity language" />
        <CalloutCard className="bg-[#FCFAF5]">
          <p className="font-serif text-[22px] italic leading-[1.7] text-[#1a1a1a]">
            &quot;The school&apos;s debate team has won every regional meet this year, so it is clearly the best team in the country. Therefore, the school should cut funding for all other extracurricular programs and focus almost entirely on debate.&quot;
          </p>
        </CalloutCard>
        <div className="space-y-4">
          <RowCard
            left="Intermediate conclusion"
            right="The team is the best in the country."
          />
          <RowCard
            left="Main conclusion"
            right="The school should focus almost entirely on debate."
          />
          <RowCard
            left="Why the chain fails"
            right="Even if the first step were strong, the argument still jumps from debate success to a sweeping funding decision."
          />
        </div>
        <CalloutCard className="bg-white">
          <Kicker>Later-language note</Kicker>
          <p className="text-[20px] leading-[1.75] text-[rgba(26,26,26,0.84)]">
            In stricter logic terms, a claim is valid only when the support guarantees it. On the LSAT, many arguments feel persuasive without reaching that standard, which is why beginner pages first talk about support versus not fully supported.
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Map each step before you judge it" />
        <CalloutCard className="border-[rgba(26,26,26,0.92)] bg-[#1a1a1a] text-[#F5F2ED]">
          <p className="text-[22px] leading-[1.8]">
            In layered arguments, identify the middle claim first, then ask whether each step is genuinely supported or only loosely suggested.
          </p>
        </CalloutCard>
      </LessonSection>
    </IntroNotesShell>
  );
}
