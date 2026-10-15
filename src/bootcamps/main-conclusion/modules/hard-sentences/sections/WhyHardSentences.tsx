import { HardSentencesShell } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';
import {
  LessonSection,
  SectionHeading,
  CalloutCard,
  GridCard,
  TakeawayCard,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/letterpress';
import { useHardSectionPage } from './useHardSectionPage';

export default function WhyHardSentences() {
  const { prev, next, markComplete } = useHardSectionPage('5.1');
  return (
    <HardSentencesShell
      eyebrow="Hard Sentences · 5.1"
      title="Why hard sentences."
      subtitle="Some LSAT sentences feel impossible on the first read. They are not. Let's look at what is actually happening."
      heroCardTitle="Start here"
      heroCardBody="Five minutes of notes on what makes a sentence hard, and why the core is always still in there."
      prev={prev}
      next={next}
      onMarkComplete={markComplete}
    >
      <LessonSection tocTitle="The real problem" className="space-y-8">
        <SectionHeading title="The real problem" subtitle="You read every word at equal volume" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          When a sentence loses you, it is almost never because you missed a word. You read all of
          them. You just read them all at the same volume.
        </p>
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            The brain tries to give equal weight to every clause. So the main claim arrives in a
            crowd of qualifiers and gets lost in it. Totally normal. This happens to every reader,
            on every first pass, until they learn to listen for the core.
          </p>
        </CalloutCard>
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          This module teaches one skill: finding the core thought inside a heavily decorated
          sentence, quickly and on purpose. Once you can do that, sentence length stops mattering.
        </p>
      </LessonSection>

      <LessonSection tocTitle="What hard means" className="space-y-8">
        <SectionHeading title="What hard means" subtitle="Depth, not length" />
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            A hard sentence is one whose core claim is buried under more than two specifiers:
            qualifying clauses, possessives, prepositional chains, parenthetical asides. The
            hardness scales with how deep the core is buried, not with how long the sentence is.
          </p>
        </CalloutCard>
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          A forty word sentence with one qualifier is easy. A twenty word sentence with four
          stacked qualifiers can stop you cold. So we will train on depth, and length will take
          care of itself.
        </p>
      </LessonSection>

      <LessonSection tocTitle="The good news" className="space-y-8">
        <SectionHeading title="The good news" subtitle="The test writers play fair" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="What the test does">
            <p>It stacks qualifiers around the core thought, layer by layer.</p>
            <p>It puts the most important claim in the most crowded sentence.</p>
          </GridCard>
          <GridCard title="What it never does">
            <p>It never hides the core inside a different idea.</p>
            <p>It never removes the core. Lift the layers off and the claim is always there, intact, waiting to be named.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Your starting point" />
        <TakeawayCard>
          Hard sentences are built, not born. They are ordinary claims wearing layers of
          qualification. Your job in this module is to learn the layers, so you can lift them off.
        </TakeawayCard>
      </LessonSection>
    </HardSentencesShell>
  );
}
