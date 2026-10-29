import { BriefLayout } from '../components/lesson/BriefLayout';
import { PullQuote, Remember } from '../components/lesson/PullQuote';
import { Checkpoint } from '../components/lesson/Checkpoint';
import { CoachOpener } from '../components/bootcamp/CoachOpener';
import { DayHeader } from '../components/bootcamp/DayHeader';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { CalibrationDrill } from '../components/bootcamp/CalibrationDrill';
import { FlawStack } from '../components/bootcamp/FlawStack';
import { SleightOfHandBossFight } from '../components/bootcamp/SleightOfHandBossFight';
import { getDay } from '../content/bootcamp/days';
import { FlashcardDeck } from '../components/bootcamp/FlashcardDeck';

const GROUP_3_SLUGS = [
  'sleight-of-hand',
  'sleazy-sales-pitch',
  'universal-desires',
  'value-assumptions',
  'secret-downsides',
];

export function Day4View() {
  const day = getDay(4);

  return (
    <>
      <DayHeader day={day} />

      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress currentDay={4} />
      </div>

      <CoachOpener day={day} />

      <BriefLayout
        id="house-five-intro"
        number="01"
        eyebrow="The Untextbooked"
        title="Five Flaws Without Names"
        margin={
          <>
            <div className="protocol text-ink-mute">Why &ldquo;House&rdquo;</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              These don&apos;t have universally accepted textbook names.
              They might be the most common LSAT errors anyway. Sleight of
              Hand alone may be the #1 LR flaw, period.
            </p>
          </>
        }
      >
        <p>
          Group 1 are the heavy hitters textbooks named decades ago. Group
          3 is the set the test loves but textbook authors mostly didn&apos;t
          bother to label. We give them house names because they need names.
          Treat them with the same priority as Group 1. Sleight of Hand is
          the boss.
        </p>
        <PullQuote>Nothing is basically the same on the LSAT.</PullQuote>
        <p>
          That sentence is the whole pedagogical move for Day 5. Every time
          you see a new word in the conclusion that wasn&apos;t in the
          premises, the author is hoping you&apos;ll treat the new word as
          basically the same as some old word. The word is never the same.
          Put a ≠ between them.
        </p>
      </BriefLayout>

      <section className="mx-auto max-w-4xl px-6">
        <FlawStack slugs={GROUP_3_SLUGS} />
      </section>

      <BriefLayout
        id="boss-fight-intro"
        number="02"
        eyebrow="The Boss Fight"
        title="Sleight of Hand · Term-Pair Drill"
        margin={
          <>
            <div className="protocol text-ink-mute">The reps</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              Five real LSAT phrase-pairs. The author treated each pair as
              basically the same. Each pair is a trap. Hold the line.
            </p>
          </>
        }
      >
        <p>
          Below are five term-pairs lifted from real LSAT stimuli. In each
          one, the author made a Sleight of Hand move — silently equating
          the premise term with the conclusion term. Your job is to look at
          each pair and say NO, these are not the same. Five reps. The
          tally is yours; the verdict is canonical.
        </p>
        <p>
          If you ever click YES, the author won. Read why. Run it again.
        </p>
      </BriefLayout>

      <section className="mx-auto max-w-3xl px-6">
        <SleightOfHandBossFight />
        <Checkpoint
          section="§2 · Disambiguate Sleight of Hand"
          questions={[
            {
              prompt: (
                <>
                  An argument uses the word &ldquo;bank&rdquo; in the
                  premise (financial institution) and again in the
                  conclusion (riverbank). Sleight of Hand or Equivocation?
                </>
              ),
              answer: (
                <>
                  Equivocation. Same word, two meanings. Sleight of Hand uses
                  TWO DIFFERENT words. Equivocation uses the SAME word with
                  shifting meaning.
                </>
              ),
            },
            {
              prompt: (
                <>
                  An argument&apos;s conclusion calls a behavior
                  &ldquo;morally appropriate.&rdquo; The premises only
                  described the behavior&apos;s effects. Sleight of Hand or
                  Value Assumption?
                </>
              ),
              answer: (
                <>
                  Value Assumption. It&apos;s the specific case of Sleight
                  of Hand where the dangling variable is an evaluative term
                  (moral, appropriate, should, good, right). When the new
                  conclusion-term is a value word, name it Value Assumption.
                </>
              ),
            },
          ]}
        />
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <FlashcardDeck day={4} />
      </section>

      <CalibrationDrill day={day} />
    </>
  );
}
