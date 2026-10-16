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

const RuleList = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-3 pl-5 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default function ArgumentAnatomyNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 2"
      title="Argument Anatomy."
      subtitle="Now that you can read the stimulus first, learn how to tell when it is making a case."
    >
      <LessonSection tocTitle="What an argument is" className="space-y-8">
        <SectionHeading title="What an argument is" subtitle="A claim supported by reasons" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          An argument is not just a topic. It is a claim the author wants you to accept, backed by reasons the author offers in support.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            When a stimulus gives reasons for a point, you are looking at argument structure. When it merely reports facts, you are not there yet.
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Not every stimulus" className="space-y-8">
        <SectionHeading title="Not every stimulus" subtitle="Some passages inform; some argue" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Mere information">
            <p>The stimulus reports facts, events, or descriptions.</p>
            <p>No sentence is being offered as a reason to accept a further claim.</p>
          </GridCard>
          <GridCard title="Argument">
            <p>At least one claim is doing support work for another claim.</p>
            <p>The author is moving from reasons toward a point.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Premises and conclusions" className="space-y-8">
        <SectionHeading title="Premises and conclusions" subtitle="Support and claim" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Premises ARE">
            <RuleList items={["Facts", "Evidence", "Reasons", "Support for another claim"]} />
          </GridCard>
          <GridCard title="Premises ARE NOT">
            <RuleList items={["The author's final point", "The claim being proven", "The statement everything else points toward"]} />
          </GridCard>
          <GridCard title="Conclusions ARE">
            <RuleList items={["The author's claim", "The point argued for", "The sentence supported by other claims"]} />
          </GridCard>
          <GridCard title="Conclusions ARE NOT">
            <RuleList items={["Random background detail", "Automatically true just because it appears", "A sentence with no support relationship"]} />
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Anatomy example" className="space-y-8">
        <SectionHeading title="Anatomy example" subtitle="Label the parts of a simple argument" />
        <CalloutCard className="bg-[#FCFAF5]">
          <p className="font-serif text-[22px] italic leading-[1.7] text-[#1a1a1a]">
            &quot;The city should extend library hours, because evening attendance has increased steadily for three years and nearby branches with longer hours serve more students after school.&quot;
          </p>
        </CalloutCard>
        <div className="space-y-4">
          <RowCard
            left="Conclusion"
            right="The city should extend library hours."
          />
          <RowCard
            left="Premise 1"
            right="Evening attendance has increased steadily for three years."
          />
          <RowCard
            left="Premise 2"
            right="Nearby branches with longer hours serve more students after school."
          />
        </div>
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Your anatomy checkpoint" />
        <CalloutCard className="border-[rgba(26,26,26,0.92)] bg-[#1a1a1a] text-[#F5F2ED]">
          <p className="text-[22px] leading-[1.8]">
            First decide whether the stimulus is an argument at all. If it is, separate the supporting reasons from the claim they are trying to prove.
          </p>
        </CalloutCard>
      </LessonSection>
    </IntroNotesShell>
  );
}
