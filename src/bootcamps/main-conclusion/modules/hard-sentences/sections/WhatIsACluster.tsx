import { HardSentencesShell } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';
import {
  LessonSection,
  SectionHeading,
  CalloutCard,
  RowCard,
  TakeawayCard,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/letterpress';
import { ClusterDecomposerV2 } from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposerV2';
import { HS_TRY_IT_5_2 } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { useHardSectionPage } from './useHardSectionPage';

export default function WhatIsACluster() {
  const { prev, next, markComplete } = useHardSectionPage('5.2');
  return (
    <HardSentencesShell
      eyebrow="Hard Sentences · 5.2"
      title="What is a cluster."
      subtitle="One core thought, wrapped in specifiers. Learn to tell the wrapping from the gift."
      heroCardTitle="One core"
      heroCardBody="Every cluster sentence asserts exactly one thing. The rest is wrapping, and wrapping comes off."
      prev={prev}
      next={next}
      onMarkComplete={markComplete}
    >
      <LessonSection tocTitle="The cluster" className="space-y-8">
        <SectionHeading title="The cluster" subtitle="One claim, many riders" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          A cluster is a sentence with one core thought and several specifiers riding along with
          it. Each specifier is a small thought of its own. Only one of them is the claim.
        </p>
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          Specifiers are not your enemies. They locate the claim in space and time, and you will
          want them later. You just do not need them while you are looking for the conclusion. Set
          them down at the door; you can pick them back up on the way out.
        </p>
      </LessonSection>

      <LessonSection tocTitle="See one split open" className="space-y-8">
        <SectionHeading title="See one split open" subtitle="Full sentence vs core" />
        <CalloutCard className="bg-[#FCFAF5]">
          <p className="font-serif text-[22px] italic leading-[1.7] text-[#1a1a1a]">
            &quot;The committee&apos;s report, released this morning after a two month delay, recommends
            closing the downtown shelter.&quot;
          </p>
        </CalloutCard>
        <div className="space-y-4">
          <RowCard left="Core" right="The committee's report recommends closing the downtown shelter." />
          <RowCard left="Specifier" right={'"released this morning after a two month delay" tells you when the report arrived. Lift it and the claim does not change.'} />
        </div>
      </LessonSection>

      <LessonSection tocTitle="The core test" className="space-y-8">
        <SectionHeading title="The core test" subtitle="Grammatical and assertable" />
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            After you remove the specifiers, the remaining sentence should still be grammatical and
            still be something the author would assert. If it is not, you removed too much. Put one
            specifier back and check again.
          </p>
        </CalloutCard>
      </LessonSection>

      <LessonSection tocTitle="Try a lift" className="space-y-8">
        <SectionHeading title="Try a lift" subtitle="Your first decomposition" />
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          Tap the highlighted specifier to lift it off, then check your work. There is a hint if
          you want one; no penalty either way.
        </p>
        <ClusterDecomposerV2 item={HS_TRY_IT_5_2} mode="guided" />
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Your cluster checkpoint" />
        <TakeawayCard>
          Every cluster sentence asserts exactly one thing. Find the core, set the specifiers
          aside, and check that what remains is still grammatical and still the author&apos;s claim.
        </TakeawayCard>
      </LessonSection>
    </HardSentencesShell>
  );
}
