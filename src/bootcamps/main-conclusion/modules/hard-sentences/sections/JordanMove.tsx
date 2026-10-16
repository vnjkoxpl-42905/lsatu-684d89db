import { HardSentencesShell } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';
import {
  LessonSection,
  SectionHeading,
  CalloutCard,
  GridCard,
  TakeawayCard,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/letterpress';
import { ClusterDecomposerV2 } from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposerV2';
import { HS_TRY_IT_5_4 } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { useHardSectionPage } from './useHardSectionPage';

export default function JordanMove() {
  const { prev, next, markComplete } = useHardSectionPage('5.4');
  return (
    <HardSentencesShell
      eyebrow="Hard Sentences · 5.4"
      title="The Jordan move."
      subtitle="Two students, one sentence. Watch what changes when you stop trying to hold every clause in mind at once."
      heroCardTitle="Verb first"
      heroCardBody="Find the verb of the main clause and the whole sentence reorganizes itself around it."
      prev={prev}
      next={next}
      onMarkComplete={markComplete}
    >
      <LessonSection tocTitle="Two readers" className="space-y-8">
        <SectionHeading title="Two readers" subtitle="Same sentence, different plan" />
        <div className="grid gap-5 md:grid-cols-2">
          <GridCard title="Alex reads forward">
            <p>Alex starts at the first word and pushes through. By the period, the early clauses have faded.</p>
            <p>So Alex re-reads. Same result. By the third pass the words are familiar and the meaning still is not.</p>
            <p>If this is you, you are in good company. It is the default strategy for almost everyone.</p>
          </GridCard>
          <GridCard title="Jordan reads narrower">
            <p>Jordan asks one question first: what is the verb of the main clause?</p>
            <p>Once the verb is named, the subject is sitting just to its left. Subject plus verb is the spine of the claim.</p>
            <p>Jordan reads the sentence once more, looking only for that pair. Everything else can wait.</p>
          </GridCard>
        </div>
      </LessonSection>

      <LessonSection tocTitle="The move" className="space-y-8">
        <SectionHeading title="The move" subtitle="Three steps, any sentence" />
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            Find the verb of the main clause. The subject sits just to its left. Everything else is
            a specifier until proven otherwise. This works at any sentence length, because the
            spine of a claim is always just two pieces.
          </p>
        </CalloutCard>
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          The instinct on a hard sentence is to read harder. The move is to read narrower. You are
          not trying to absorb twenty six words at once; you are looking for two of them, and
          letting the rest stand by until you need them.
        </p>
      </LessonSection>

      <LessonSection tocTitle="Try the move" className="space-y-8">
        <SectionHeading title="Try the move" subtitle="Verb first, then lift" />
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          Find the main verb before you tap anything. Then lift the specifiers and see how close
          your read was.
        </p>
        <ClusterDecomposerV2 item={HS_TRY_IT_5_4} mode="guided" />
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Your reading checkpoint" />
        <TakeawayCard>
          When a sentence overwhelms you, do not read harder. Read narrower: verb first, subject
          to its left, and let every other clause wait its turn.
        </TakeawayCard>
      </LessonSection>
    </HardSentencesShell>
  );
}
