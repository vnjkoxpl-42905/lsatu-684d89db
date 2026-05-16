import { BriefLayout } from '../components/lesson/BriefLayout';
import { PullQuote, Remember } from '../components/lesson/PullQuote';
import { Checkpoint } from '../components/lesson/Checkpoint';
import { CakeOnBlocks } from '../components/visuals/CakeOnBlocks';
import { CoachOpener } from '../components/bootcamp/CoachOpener';
import { DayHeader } from '../components/bootcamp/DayHeader';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { CalibrationDrill } from '../components/bootcamp/CalibrationDrill';
import { ThreeCommandments } from '../components/bootcamp/ThreeCommandments';
import { WhatIfGenerator } from '../components/bootcamp/WhatIfGenerator';
import { FlashcardDeck } from '../components/bootcamp/FlashcardDeck';
import { getDay } from '../content/bootcamp/days';

export function Day1View() {
  const day = getDay(1);

  return (
    <>
      <DayHeader day={day} />

      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress currentDay={1} />
      </div>

      <CoachOpener day={day} />

      {/* §1 — Logical Hostility */}
      <BriefLayout
        id="hostility"
        number="01"
        eyebrow="Lesson"
        title="Logical Hostility"
        margin={
          <>
            <div className="protocol text-ink-mute">In one line</div>
            <p className="mt-2 italic text-ink-soft">
              Read every argument as if the author has done something wrong.
              Not might have. Has.
            </p>
          </>
        }
      >
        <p>
          Flaw is the most winnable question type on the LSAT. Most students
          throw the win away in the first three seconds.
        </p>
        <p>
          Once you&apos;ve named the flaw, the right answer is just the choice
          that describes the flaw without lying about the argument. That&apos;s
          the whole game. Find the broken thing, find the answer that points
          at the broken thing, lock it. Flaw should be your bread. It should be
          the question type you go to bed dreaming about. Instead, half the
          people reading this are missing them at a 60% clip.
        </p>
        <p>Why? Because they&apos;re being polite.</p>
        <p>
          Most LSAT prep tells you to be a careful, cooperative reader. They
          are wrong. Cooperative reading is exactly what makes you miss flaws.
          A cooperative reader fills in the author&apos;s missing pieces
          unconsciously, the same way your brain auto-corrects &quot;I went to
          store&quot; into &quot;I went to the store&quot; without you noticing
          the omission. The LSAT knows this. The LSAT is built on this.
        </p>
        <p>So we fix the reader. Today.</p>
        <p>
          The fix is what we call{' '}
          <strong className="text-ink">Logical Hostility</strong>. Hostility
          is the default attitude that the arguer has done something wrong. Not{' '}
          <em>might have</em>. <em>Has</em>. Before you read the stimulus,
          before your eyes touch a single word, you say to yourself, &quot;Let&apos;s
          see what&apos;s wrong with this one.&quot; That single sentence flips
          your brain from cooperative to hostile, and it saves you from filling
          in gaps the author was hoping you&apos;d fill in for free.
        </p>

        <PullQuote>
          Hostility is the default attitude that the arguer has done something
          wrong. Not might have. Has.
        </PullQuote>

        <PullQuote attribution="The Reading Goal · whisper before every stimulus">
          &ldquo;Objection, Your Honor, Dr. Stupid just did this…&rdquo;
        </PullQuote>

        <p>
          That courtroom roleplay isn&apos;t a gimmick. It&apos;s the entire
          procedural lens for Flaw. Every question is the LSAT presenting you
          with a bad lawyer&apos;s argument and asking you to file the
          objection. You&apos;re not the judge. You&apos;re not the jury.
          You&apos;re opposing counsel.
        </p>

        <Remember>
          Hostile reading isn&apos;t optional. It&apos;s the only kind of
          reading that catches what the LSAT hid.
        </Remember>
      </BriefLayout>

      {/* §2 — Cake on Blocks */}
      <BriefLayout
        id="cake-on-blocks"
        number="02"
        eyebrow="Lesson"
        title="The Cake-on-Blocks Model"
        margin={
          <>
            <div className="protocol text-ink-mute">Mental model</div>
            <p className="mt-2 italic text-ink-soft">
              Premises are the blocks. The conclusion is the cake. Validity
              lives in the space between them.
            </p>
          </>
        }
      >
        <p>
          Before we touch a single answer choice, you need a mental model for
          what an argument actually is. Imagine you&apos;re building a small
          table out of children&apos;s blocks to keep a delicious piece of cake
          off the floor. Your blocks are solid. They aren&apos;t going anywhere.
        </p>

        <PullQuote>Those blocks are your premises.</PullQuote>

        <p>
          Your cake, on the other hand, is squishy and fragile. It needs to be
          held up off the floor because it can&apos;t fend for itself.
        </p>

        <PullQuote>The cake is your conclusion.</PullQuote>

        <p>
          A valid conclusion has to be true if its premises are true. Since we
          always assume the premises are true, that means a valid conclusion
          has to be true, period. Not probably true. Not pretty likely. True.
          Provable. 100%. No wiggle room.
        </p>

        <CakeOnBlocks />

        <p>Now look at your little block table. Two things should be obvious.</p>

        <p>
          <strong className="text-ink">One: you don&apos;t argue with the blocks.</strong>{' '}
          The premises are true. They&apos;re solid wood. Burning them down is
          the rookie move. The biggest mistake new flaw-finders make is reading
          the stimulus and saying, &quot;but what if that premise is wrong?&quot;
          You can&apos;t. You&apos;re not allowed to. The premises are given.
        </p>

        <p>
          <strong className="text-ink">Two: you argue with whether the blocks actually hold up the cake.</strong>{' '}
          Validity lives in the connection between the premises and the
          conclusion. Not in any single premise. The space <em>between</em>{' '}
          them. That&apos;s where every flaw lives. That&apos;s where you go
          hunting.
        </p>

        <PullQuote attribution="Where validity lives">
          The Land of Validity Lives Upon the Intersection of the Premises.
        </PullQuote>

        <Remember>
          Don&apos;t burn down your blocks. Argue with whether the blocks hold
          up the cake.
        </Remember>
      </BriefLayout>

      {/* §3 — The What-if method */}
      <BriefLayout
        id="what-if-method"
        number="03"
        eyebrow="The Method"
        title='The "What if..." Method'
        margin={
          <>
            <div className="protocol text-ink-mute">In one line</div>
            <p className="mt-2 italic text-ink-soft">
              Find the conclusion. Imagine its worst-case scenario. Make
              the LSAT pay for what the author was hoping you&apos;d skip.
            </p>
          </>
        }
      >
        <p>
          Whenever you meet an argument, your brain should go straight to its
          worst case. What&apos;s the author trying to hide? What do they hope
          you won&apos;t think about? There is always something. The author lays
          out breadcrumbs and counts on you to connect the dots for free.
        </p>
        <p>Don&apos;t connect. Object.</p>
        <p>
          Your <strong className="text-ink">objection</strong> is how you call
          the author out on their nonsense. Three steps, all easy.
        </p>
        <ol className="ml-6 list-decimal space-y-1 marker:font-display marker:italic marker:text-ink-mute">
          <li>Find the conclusion.</li>
          <li>
            Say to yourself: &quot;This conclusion isn&apos;t necessarily
            true. <strong className="text-ink">What if...</strong>&quot;
          </li>
          <li>Finish that sentence with a possibility that destroys the conclusion.</li>
        </ol>

        <PullQuote>
          A loophole doesn&apos;t have to be true. It just has to be possible.
        </PullQuote>

        <p>
          A valid conclusion has to be airtight against every possibility. So if
          your &quot;what if&quot; is even a real option the author didn&apos;t
          address, you&apos;ve found the flaw. Likelihood doesn&apos;t matter.
          Mere possibility does.
        </p>

        <p className="protocol text-ink-mute">Demonstration · the coffee argument</p>
        <blockquote className="border border-rule bg-paper-bright px-5 py-4 italic leading-relaxed text-ink">
          Coffee is a delicious beverage, and I love anything delicious.
          Besides coffee, I only find candy canes and Reese&apos;s Pieces
          delicious. Therefore, I will drink coffee tomorrow.
        </blockquote>
        <p>
          Innocent, right? Now go hostile. Three what-ifs, none of them have to
          actually happen — their possibility alone breaks the argument:
        </p>
        <ol className="ml-6 list-decimal space-y-2 marker:font-display marker:italic marker:text-ink-mute">
          <li>
            <strong className="text-ink">What if I won&apos;t be able to drink delicious things tomorrow?</strong>{' '}
            (Maybe I&apos;m fasting for a procedure.)
          </li>
          <li>
            <strong className="text-ink">What if someone stops me from drinking everything I find delicious tomorrow?</strong>{' '}
            (Maybe my doctor calls.)
          </li>
          <li>
            <strong className="text-ink">What if all the coffee is too hot to drink tomorrow?</strong>{' '}
            (Maybe a heat wave hits the kitchen.)
          </li>
        </ol>
      </BriefLayout>

      {/* §4 — Three Commandments contract */}
      <section className="mx-auto max-w-3xl px-6">
        <ThreeCommandments />
        <Remember>
          &quot;What if...&quot; is a key, not a guess. Use it on every
          argument and the loopholes start showing up like potholes you&apos;ve
          already mapped.
        </Remember>
      </section>

      {/* §5 — Triple-Shot Generator */}
      <BriefLayout
        id="triple-shot"
        number="04"
        eyebrow="Practice"
        title="The Triple-Shot"
        margin={
          <>
            <div className="protocol text-ink-mute">The Move</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              Three shots, one stimulus. Generate first. Self-grade
              against the contract. Reveal canonical at the end.
            </p>
          </>
        }
      >
        <p>
          Time to do the work. Write{' '}
          <strong className="text-ink">three</strong> separate what-ifs that
          destroy the conclusion. Three. Not one. Commandment III says the
          loophole is always there; today we prove it&apos;s often there
          three times over.
        </p>
        <p>
          When you lock your shots, you&apos;ll self-grade each one against
          Commandments I and II. Be honest. Then you reveal the canonical
          loopholes and compare, side-by-side. Yours and the canonical
          aren&apos;t in competition. They&apos;re both teaching you.
        </p>

        <WhatIfGenerator
          stimulus="Every member of our debate team has won a regional championship. Therefore, our team will win this year's regional championship."
          canonicalAnswers={[
            "What if winning as individuals doesn't mean winning together as a team?",
            'What if a stronger team also entered this year and the field is more competitive than past years?',
            "What if last year's championships happened in different formats or fields, and this year's regional uses a format the team hasn't competed in?",
          ]}
          closingBeat="If your shot found something the canonical didn't, that's also valid. Multiple loopholes per stimulus is the point. The skill is generation, not match-the-canonical."
        />

        <Checkpoint
          section="§4 · Did you break a Commandment?"
          questions={[
            {
              prompt: (
                <>
                  Suppose your Shot 02 was: <em>What if the team won&apos;t
                  win this year?</em> Which Commandment did you violate, and
                  why?
                </>
              ),
              answer: (
                <>
                  Commandment II. You just negated the conclusion. Of course
                  the team might not win, that&apos;s the point. Your job was
                  to show <em>why</em> they might not. Try again with a
                  reason.
                </>
              ),
            },
            {
              prompt: (
                <>
                  Suppose your Shot 03 was: <em>What if not every member
                  actually won a championship?</em> Which Commandment, and why?
                </>
              ),
              answer: (
                <>
                  Commandment I. You attacked a premise. The premises are
                  blocks. Don&apos;t burn them down. Attack the walkway from
                  individual wins to team win, not the individual-wins claim
                  itself.
                </>
              ),
            },
          ]}
        />

        <Remember>
          The loophole is always there. The LSAT writers built it in on
          purpose. Have the patience to find it.
        </Remember>
      </BriefLayout>

      <section className="mx-auto max-w-3xl px-6">
        <FlashcardDeck day={1} />
      </section>

      <CalibrationDrill day={day} />
    </>
  );
}
