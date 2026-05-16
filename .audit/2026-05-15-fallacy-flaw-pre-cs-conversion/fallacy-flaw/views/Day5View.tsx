import { BriefLayout } from '../components/lesson/BriefLayout';
import { Remember } from '../components/lesson/PullQuote';
import { Checkpoint } from '../components/lesson/Checkpoint';
import { CoachOpener } from '../components/bootcamp/CoachOpener';
import { DayHeader } from '../components/bootcamp/DayHeader';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { CalibrationDrill } from '../components/bootcamp/CalibrationDrill';
import { FiveFastEliminators } from '../components/bootcamp/FiveFastEliminators';
import { FlawStack } from '../components/bootcamp/FlawStack';
import { DisambiguationMatrix } from '../components/visuals/DisambiguationMatrix';
import { getDay } from '../content/bootcamp/days';
import { FlashcardDeck } from '../components/bootcamp/FlashcardDeck';

const GROUP_2_SLUGS = [
  'circular-reasoning',
  'internal-contradiction',
  'equivocation',
  'inappropriate-appeal',
];

export function Day5View() {
  const day = getDay(5);

  return (
    <>
      <DayHeader day={day} />

      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress currentDay={5} />
      </div>

      <CoachOpener day={day} />

      <BriefLayout
        id="trap-anatomy"
        number="01"
        eyebrow="Wrong-Answer Anatomy"
        title="The Five Fast Eliminators"
        margin={
          <>
            <div className="protocol text-ink-mute">In one line</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              Five trap patterns. Scan first, test second. Most wrong
              answers die at I or II inside ten seconds.
            </p>
          </>
        }
      >
        <p>
          Before you run any protocol, scan every answer choice for these
          five trap patterns. If a choice commits one, kill it without
          testing. They&apos;re the LSAT&apos;s go-to traps and they&apos;re
          wildly predictable once you know what you&apos;re looking for.
        </p>
        <p>
          When you&apos;re stuck between two answer choices, run them through
          these five eliminators in order. One usually dies at Pattern I or
          II within ten seconds. Speed comes from this.
        </p>
        <Remember>
          The Five Fast Eliminators kill more wrong answers than any
          protocol. Use them first. Test second.
        </Remember>
      </BriefLayout>

      <section className="mx-auto max-w-4xl px-6">
        <FiveFastEliminators />
      </section>

      <BriefLayout
        id="group-2-distractors"
        number="02"
        eyebrow="Famous Bait"
        title="Group 2 · Frequently the Distractor"
        margin={
          <>
            <div className="protocol text-ink-mute">Default-skeptical</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              When a Group 2 label appears, it&apos;s probably Pattern IV
              (Wrong Flaw). Verify the flaw is actually present before
              selecting.
            </p>
          </>
        }
      >
        <p>
          These four flaws appear in <em>wrong</em> answer choices much more
          often than in correct ones. Circular Reasoning, Internal
          Contradiction, Equivocation, Inappropriate Appeal. Famous names.
          Familiar enough that your brain accepts the label without
          checking.
        </p>
        <p>
          Default to skeptical. The catalog entry will tell you what the
          stimulus has to actually look like for the label to fit.
        </p>
      </BriefLayout>

      <section className="mx-auto max-w-4xl px-6">
        <FlawStack slugs={GROUP_2_SLUGS} />
      </section>

      <BriefLayout
        id="disambiguation"
        number="03"
        eyebrow="The Closer"
        title="The Disambiguation Matrix"
        margin={
          <>
            <div className="protocol text-ink-mute">High-leverage</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              The single highest-leverage drill for moving from 80% accuracy
              on Flaw to 95%+. The LSAT exploits the small set of flaws
              students confuse with each other.
            </p>
          </>
        }
      >
        <p>
          Wrong Flaw (Pattern IV from the Five Fast Eliminators) is the trap
          pattern that costs the most points on hard Flaw questions. The
          LSAT exploits the small set of flaws students confuse with each
          other. The matrix names the most common pairs and gives the
          disambiguation question for each.
        </p>
        <p>
          Read the matrix. Memorize the &ldquo;Ask&rdquo; column. The
          calibration below is forced-choice flaw-vs-flaw, drawn from these
          rows.
        </p>
      </BriefLayout>

      <section className="mx-auto max-w-5xl px-6">
        <DisambiguationMatrix />
        <Checkpoint
          section="§3 · Disambiguation reflex"
          questions={[
            {
              prompt: (
                <>
                  An argument moves from a small sample to a population
                  claim. Sampling or Hasty Generalization?
                </>
              ),
              answer: (
                <>
                  Both are defensible — Hasty Generalization is a subtype of
                  Sampling (size problem). If the issue is selection-method
                  rather than size, it&apos;s biased Sampling. Ask: is the
                  problem the size, the selection method, or both?
                </>
              ),
            },
            {
              prompt: (
                <>
                  Stimulus contains a conditional argument that uses the
                  same conditional term inconsistently. Necessary vs.
                  Sufficient or Equivocation?
                </>
              ),
              answer: (
                <>
                  Equivocation hiding inside a conditional. Same word,
                  shifted meaning. Necessary vs. Sufficient is a structural
                  reversal of the conditional. Ask: are the conditional
                  terms defined consistently?
                </>
              ),
            },
          ]}
        />
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <FlashcardDeck day={5} />
      </section>

      <CalibrationDrill day={day} />
    </>
  );
}
