import { HardSentencesShell } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';
import {
  LessonSection,
  SectionHeading,
  CalloutCard,
  RowCard,
  TakeawayCard,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/letterpress';
import { ClusterDecomposerV2 } from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposerV2';
import { HS_TRY_IT_5_5 } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { useHardSectionPage } from './useHardSectionPage';

export default function OptionalVsCore() {
  const { prev, next, markComplete } = useHardSectionPage('5.5');
  return (
    <HardSentencesShell
      eyebrow="Hard Sentences · 5.5"
      title="Optional vs core."
      subtitle="Some specifiers are part of the claim itself. Knowing which is the difference between right and wrong on the test."
      heroCardTitle="Load-bearing"
      heroCardBody="One specifier per sentence, sometimes two, is holding the claim up. Strip it and the claim changes."
      prev={prev}
      next={next}
      onMarkComplete={markComplete}
    >
      <LessonSection tocTitle="Not all decoration" className="space-y-8">
        <SectionHeading title="Not all decoration" subtitle="A few specifiers carry weight" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          Most specifiers are decoration. A few are load-bearing: they carry a qualification the
          claim depends on. Strip one of those and the sentence still reads fine, but it now says
          something different.
        </p>
      </LessonSection>

      <LessonSection tocTitle="The load-bearing test" className="space-y-8">
        <SectionHeading title="The load-bearing test" subtitle="One question to ask" />
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            After you find the core, ask: would the author still endorse this sentence with the
            specifier removed? If yes, it is decoration. If no, it is load-bearing. Keep it in your
            statement of the conclusion.
          </p>
        </CalloutCard>
        <div className="space-y-4">
          <RowCard
            left="Decoration"
            right={'"The requirement, adopted two budget cycles ago, has been suspended." Drop the specifier: "The requirement has been suspended." Same claim, less history.'}
          />
          <RowCard
            left="Load-bearing"
            right={'"The requirement that all visitors sign in has been suspended." Drop the specifier: "The requirement has been suspended." Which requirement? The claim just changed underneath you.'}
          />
        </div>
      </LessonSection>

      <LessonSection tocTitle="Why the test cares" className="space-y-8">
        <SectionHeading title="Why the test cares" subtitle="The half-claim trap" />
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          On the LSAT, the most tempting wrong answer often restates the conclusion with the
          load-bearing specifier quietly dropped. You strip the sentence, see a match, and pick an
          answer about a different claim without noticing. The trap catalog calls this T4, Half the
          Claim. The fix is exactly one habit: run the load-bearing test before you call a
          specifier decoration.
        </p>
      </LessonSection>

      <LessonSection tocTitle="Try it" className="space-y-8">
        <SectionHeading title="Try it" subtitle="One of these is load-bearing" />
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          Careful with this one. Lift the decoration, but keep anything the claim depends on.
        </p>
        <ClusterDecomposerV2 item={HS_TRY_IT_5_5} mode="guided" />
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Your load-bearing checkpoint" />
        <TakeawayCard>
          Stripping is not the goal; preserving the claim is. Lift what the claim survives
          without, and keep what it cannot live without.
        </TakeawayCard>
      </LessonSection>
    </HardSentencesShell>
  );
}
