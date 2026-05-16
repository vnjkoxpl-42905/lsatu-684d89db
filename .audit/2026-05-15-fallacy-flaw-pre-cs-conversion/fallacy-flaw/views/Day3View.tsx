import { BriefLayout } from '../components/lesson/BriefLayout';
import { Remember } from '../components/lesson/PullQuote';
import { Checkpoint } from '../components/lesson/Checkpoint';
import { CoachOpener } from '../components/bootcamp/CoachOpener';
import { DayHeader } from '../components/bootcamp/DayHeader';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { CalibrationDrill } from '../components/bootcamp/CalibrationDrill';
import { FlawStack } from '../components/bootcamp/FlawStack';
import { getDay } from '../content/bootcamp/days';
import { FlashcardDeck } from '../components/bootcamp/FlashcardDeck';

const GROUP_1_SLUGS = [
  'necessary-vs-sufficient',
  'causal',
  'part-vs-whole',
  'unproven-vs-proven-false',
  'ad-hominem',
  'sampling',
];

export function Day3View() {
  const day = getDay(3);

  return (
    <>
      <DayHeader day={day} />

      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress currentDay={3} />
      </div>

      <CoachOpener day={day} />

      <BriefLayout
        id="heavy-hitters"
        number="01"
        eyebrow="The Catalog Opens"
        title="Group 1 · The Heavy Hitters"
        margin={
          <>
            <div className="protocol text-ink-mute">Six flaws</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              These are the heavy hitters because they show up over and over
              and the LSAT writers don&apos;t bother hiding them.
            </p>
          </>
        }
      >
        <p>
          The catalog has fifteen entries. Today we cover six. These six
          account for most of the right answers in Group 1, the &ldquo;real
          flaw&rdquo; group. The pattern is always: stimulus tells, name on
          sight, what-if counter, then the answer is the choice that names
          what you already named.
        </p>
        <p>
          Treat the stack below as a fingerprint database. Read the
          stimulus tells the way a detective reads a fingerprint card. After
          a week with these six, you&apos;ll start naming Group 1 flaws
          before you finish reading the stimulus.
        </p>
        <Remember>
          Read the stimulus tells out loud the first time. The phrasing is
          load-bearing.
        </Remember>
      </BriefLayout>

      <section className="mx-auto max-w-4xl px-6">
        <FlawStack slugs={GROUP_1_SLUGS} />
      </section>

      <BriefLayout
        id="recognition-drill"
        number="02"
        eyebrow="Practice"
        title="Name the Flaw on Sight"
        margin={
          <>
            <div className="protocol text-ink-mute">The move</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              Read the stimulus. Name the flaw before you read a single
              answer choice. Then read the choices and pick the one that
              names what you named.
            </p>
          </>
        }
      >
        <p>
          The end-of-day drill below is five stimuli, five flaws, all from
          Group 1. No tricks. The job is recognition. If you find yourself
          reading the answer choices to figure out the flaw, you&apos;re
          working backwards. Stop. Re-read the stimulus, name it, then
          confirm.
        </p>
        <Checkpoint
          section="§2 · Stimulus tells reflex"
          questions={[
            {
              prompt: (
                <>
                  You see &ldquo;If X then Y&rdquo; in the premises and the
                  conclusion says &ldquo;Y, therefore X.&rdquo; Name the
                  flaw before turning to the answer choices.
                </>
              ),
              answer: <>Necessary vs. Sufficient. The conditional is reversed.</>,
            },
            {
              prompt: (
                <>
                  Stimulus reports a correlation, the conclusion picks one
                  causal direction. Name the flaw.
                </>
              ),
              answer: (
                <>
                  Causal. Reverse causation, third-variable, and pure
                  coincidence are all unaddressed. 99.9% of the time the
                  LSAT names a single cause for a correlation, it&apos;s
                  wrong.
                </>
              ),
            },
            {
              prompt: (
                <>
                  Author rejects a claim by pointing out the source&apos;s
                  bias or self-interest. Name the flaw.
                </>
              ),
              answer: (
                <>
                  Ad Hominem. Bias affects credibility, not truth. Address
                  the claim, not the speaker.
                </>
              ),
            },
          ]}
        />
      </BriefLayout>

      <section className="mx-auto max-w-3xl px-6">
        <FlashcardDeck day={3} />
      </section>

      <CalibrationDrill day={day} />
    </>
  );
}
