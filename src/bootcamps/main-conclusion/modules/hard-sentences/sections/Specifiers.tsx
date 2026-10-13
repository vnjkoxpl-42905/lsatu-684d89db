import { HardSentencesShell } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';
import {
  LessonSection,
  SectionHeading,
  CalloutCard,
  RowCard,
  TakeawayCard,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/letterpress';
import { useHardSectionPage } from './useHardSectionPage';

export default function Specifiers() {
  const { prev, next, markComplete } = useHardSectionPage('5.3');
  return (
    <HardSentencesShell
      eyebrow="Hard Sentences · 5.3"
      title="The six specifiers."
      subtitle="Each kind clings to the core in its own way. Once you can name them, you can lift them."
      heroCardTitle="Name them"
      heroCardBody="Six kinds of specifier cover nearly every hard sentence the test will show you."
      prev={prev}
      next={next}
      onMarkComplete={markComplete}
    >
      <LessonSection tocTitle="Why naming helps" className="space-y-8">
        <SectionHeading title="Why naming helps" subtitle="You can only lift what you can see" />
        <p className="font-serif text-[30px] italic leading-[1.35] text-[#1a1a1a]">
          Most cluster sentences carry three or four specifiers stacked in a chain. Once you can
          name each kind on sight, the chain stops looking like fog and starts looking like parts.
        </p>
      </LessonSection>

      <LessonSection tocTitle="The six kinds" className="space-y-8">
        <SectionHeading title="The six kinds" subtitle="A field guide" />
        <div className="space-y-4">
          <RowCard
            left="Possessive"
            right={
              <>
                <p>The city&apos;s plan. The program&apos;s outcomes.</p>
                <p className="mt-2">Spot it: an apostrophe-s. Possessives usually ride inside larger specifiers, so you will rarely lift one on its own.</p>
              </>
            }
          />
          <RowCard
            left="Prepositional"
            right={
              <>
                <p>In 2018. By the committee. Of the funding. For three years.</p>
                <p className="mt-2">Spot it: starts with in, on, by, of, for, with, or at. These chain together, so peel one link at a time.</p>
              </>
            }
          />
          <RowCard
            left="Relative clause"
            right={
              <>
                <p>Which has reviewed the outcomes. Who recommended the change. That was filed in May.</p>
                <p className="mt-2">Spot it: starts with which, that, who, whom, or whose. Careful: some relative clauses are load-bearing. More on that in 5.5.</p>
              </>
            }
          />
          <RowCard
            left="Parenthetical"
            right={
              <>
                <p>An aside wrapped in commas, parentheses, or dashes.</p>
                <p className="mt-2">Spot it: the wrapping itself. The sentence is telling you outright that this part is optional.</p>
              </>
            }
          />
          <RowCard
            left="Reduced relative"
            right={
              <>
                <p>Made yesterday by the senior committee. Viewed by the public. Conducted over three weeks.</p>
                <p className="mt-2">Spot it: a participle (made, viewed, conducted) where a longer &quot;which was&quot; phrase got shortened.</p>
              </>
            }
          />
          <RowCard
            left="Appositive"
            right={
              <>
                <p>The settlement, an agreement reached at the last minute, requires monitoring.</p>
                <p className="mt-2">Spot it: a noun phrase sitting right beside another noun, renaming it. Almost always liftable.</p>
              </>
            }
          />
        </div>
      </LessonSection>

      <LessonSection tocTitle="Peeling order" className="space-y-8">
        <SectionHeading title="Peeling order" subtitle="Innermost first" />
        <CalloutCard>
          <p className="text-[20px] leading-[1.75] text-[#1a1a1a]">
            Specifiers nest. When they do, peel from the inside out: find the innermost specifier,
            lift it, then the next, until the core is exposed. Working outside-in tends to tear the
            sentence; inside-out unspools it cleanly.
          </p>
        </CalloutCard>
        <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
          Take &quot;the amendment proposed by the council that met in March.&quot; The innermost piece is
          &quot;that met in March,&quot; clinging to the council. Lift it first, then &quot;proposed by the
          council,&quot; and you are left holding &quot;the amendment.&quot; Two lifts, done in order, no tearing.
        </p>
      </LessonSection>

      <LessonSection tocTitle="Student takeaway" className="space-y-8 border-b-0">
        <SectionHeading title="Student takeaway" subtitle="Your specifier checkpoint" />
        <TakeawayCard>
          Six kinds: possessive, prepositional, relative, parenthetical, reduced relative,
          appositive. Name what you see, then lift from the inside out.
        </TakeawayCard>
      </LessonSection>
    </HardSentencesShell>
  );
}
