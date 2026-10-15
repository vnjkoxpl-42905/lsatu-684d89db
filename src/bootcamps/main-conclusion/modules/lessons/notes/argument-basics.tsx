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

export default function ArgumentBasicsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 1"
      title="Stimulus First."
      subtitle="Read the passage before you worry about what the question or answers want from you."
    >
      <LessonSection tocTitle="Primary Directive" className="space-y-8">
        <SectionHeading title="Primary Directive" subtitle="Start with the passage itself" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          The stimulus is the passage. It is the source of the work. Read it first, read it closely, and figure out what it is saying before you move anywhere else.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            Your first question is not, &quot;Which answer looks good?&quot; Your first question is, &quot;What does this stimulus actually say?&quot;
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Question Parts" className="space-y-8">
        <SectionHeading title="Question Parts" subtitle="The three parts of every LR question" />
        <p className="text-[20px] leading-[1.7] text-[rgba(26,26,26,0.84)]">
          Every Logical Reasoning question has the same three visible pieces. They do different jobs, and the stimulus comes first because it gives you the material the rest of the question is testing.
        </p>
        <div className="space-y-4">
          <RowCard
            left="1. Stimulus"
            right="The short passage. It may be an argument, a set of facts, a debate, or a description. Your first job is simply to understand what it says."
          />
          <RowCard
            left="2. Question Stem"
            right="The stem tells you what task to perform with the stimulus after you understand it."
          />
          <RowCard
            left="3. Answer Choices"
            right="The choices test whether you understood the stimulus and can do the task the stem asks for. They do not replace close reading."
          />
        </div>
      </LessonSection>

      <LessonSection tocTitle="Reading Style" className="space-y-8">
        <SectionHeading title="Reading Style" subtitle="Passive reading vs. active reading" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Passive Reading">
            <p>Eyes move across the words, but the structure stays blurry.</p>
            <p>You finish the passage and only have a vague impression of what happened.</p>
            <p>That is when answer choices start to feel like guesses.</p>
          </GridCard>
          <GridCard title="Active Reading">
            <p>You track what each sentence is contributing.</p>
            <p>You notice whether the passage is just information or whether it is trying to persuade you of something.</p>
            <p>You reach the stem already knowing what the stimulus said.</p>
          </GridCard>
        </div>
        <CalloutCard className="bg-white">
          <Kicker>Student job</Kicker>
          <p className="text-[20px] leading-[1.75] text-[rgba(26,26,26,0.84)]">
            Stay with the passage long enough to classify it: is this merely information, or is this an argument?
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Stimulus Example" className="space-y-8">
        <SectionHeading title="Stimulus Example" subtitle="Ask what the passage is saying" />
        <CalloutCard className="bg-[#FCFAF5]">
          <p className="font-serif text-[22px] italic leading-[1.7] text-[#1a1a1a]">
            &quot;Last year, the city planted hundreds of new trees along its busiest streets. This spring, residents in those neighborhoods reported lower afternoon temperatures than they had the previous year.&quot;
          </p>
        </CalloutCard>
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="What to notice first">
            <p>The passage is giving you information about two events: tree planting and cooler neighborhood temperatures.</p>
            <p>Your immediate task is to understand that relationship before doing anything else.</p>
          </GridCard>
          <GridCard title="What not to do yet">
            <p>Do not jump ahead to flaws, assumptions, or answer-choice comparisons.</p>
            <p>First say, in plain language, what the stimulus is telling you.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Student Takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student Takeaway" subtitle="The first-page rule" />
        <CalloutCard className="border-[rgba(26,26,26,0.92)] bg-[#1a1a1a] text-[#F5F2ED]">
          <p className="text-[22px] leading-[1.8]">
            The stimulus is the passage; read it first; identify whether it is merely information or an argument.
          </p>
          <p className="mt-6 text-[20px] leading-[1.75] text-[rgba(245,242,237,0.84)]">
            That is enough for page one. Once you can do that reliably, the later lessons can teach you how arguments are built.
          </p>
        </CalloutCard>
      </LessonSection>
    </IntroNotesShell>
  );
}
