import { BriefLayout } from '../components/lesson/BriefLayout';
import { PullQuote, Remember } from '../components/lesson/PullQuote';
import { Checkpoint } from '../components/lesson/Checkpoint';
import { CoachOpener } from '../components/bootcamp/CoachOpener';
import { DayHeader } from '../components/bootcamp/DayHeader';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { CalibrationDrill } from '../components/bootcamp/CalibrationDrill';
import { LanguageProtocols } from '../components/bootcamp/LanguageProtocols';
import { ThreeLanguagesClassifier } from '../components/visuals/ThreeLanguagesClassifier';
import { getDay } from '../content/bootcamp/days';
import { FlashcardDeck } from '../components/bootcamp/FlashcardDeck';

export function Day2View() {
  const day = getDay(2);

  return (
    <>
      <DayHeader day={day} />

      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress currentDay={2} />
      </div>

      <CoachOpener day={day} />

      <BriefLayout
        id="three-languages"
        number="01"
        eyebrow="The Move"
        title="Three Languages, One Sentence"
        margin={
          <>
            <div className="protocol text-ink-mute">In one line</div>
            <p className="mt-2 italic text-ink-soft">
              Every Flaw answer finishes the sentence &ldquo;The argument is
              flawed because...&rdquo; in one of three ways. Different
              endings, different tests.
            </p>
          </>
        }
      >
        <p>
          Most students never learn the single most useful fact about Flaw
          answer choices.
        </p>
        <p>
          Flaw answers speak three different languages. Just three. Every
          right answer in the question type, regardless of difficulty,
          finishes one of these three sentences:{' '}
          <em>&ldquo;The argument is flawed because...&rdquo;</em> and then
          either accuses the author of an assumption, raises an objection, or
          describes the illegal logical move.
        </p>
        <p>
          If you don&apos;t know which language the answer is speaking,
          you&apos;ll apply the wrong test, eliminate the right answer, and
          pick a trap. If you know the language, the test is mechanical and
          you stop missing.
        </p>
      </BriefLayout>

      <section className="mx-auto max-w-3xl px-6">
        <LanguageProtocols />
      </section>

      <BriefLayout
        id="trigger-rule"
        number="02"
        eyebrow="The Rule"
        title="The Trigger-Phrase Rule"
        margin={
          <>
            <div className="protocol text-ink-mute">Memorize</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              Same correct answer, different test. The verb decides which
              test runs.
            </p>
          </>
        }
      >
        <PullQuote>
          Assumption phrasing → make X FALSE. Objection phrasing → take Y to
          be TRUE.
        </PullQuote>
        <p>
          Half the wrong-answer patterns on hard Flaw questions exploit
          students who can&apos;t tell Assumption from Objection in under
          five seconds. The verbs are the entire game. Memorize them.
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong className="text-ink">Assumption verbs</strong> ·{' '}
            <em>takes for granted, presumes, assumes, fails to establish</em>.
            Run the Two-Step Check.
          </li>
          <li>
            <strong className="text-ink">Objection verbs</strong> ·{' '}
            <em>fails to consider, overlooks the possibility, ignores, neglects</em>.
            Run the Weakener Test.
          </li>
          <li>
            <strong className="text-ink">Match verbs</strong> ·{' '}
            <em>concludes C on the basis of P, infers... that C, confuses P with C</em>.
            Run the Translation Test.
          </li>
        </ul>
        <Remember>
          Wrong test, wrong elimination. Right test, right answer.
        </Remember>
      </BriefLayout>

      <section className="mx-auto max-w-3xl px-6">
        <ThreeLanguagesClassifier />
        <Checkpoint
          section="§2 · Trigger-phrase reflex"
          questions={[
            {
              prompt: (
                <>
                  Answer choice begins with &ldquo;the argument
                  presupposes...&rdquo; What test do you run?
                </>
              ),
              answer: (
                <>
                  Two-Step Check. &ldquo;Presupposes&rdquo; is an Assumption
                  verb. Make the claim FALSE. If the argument crashes, the
                  answer is right.
                </>
              ),
            },
            {
              prompt: (
                <>
                  Answer choice begins with &ldquo;the argument neglects to
                  consider...&rdquo; What test?
                </>
              ),
              answer: (
                <>
                  Weakener Test. &ldquo;Neglects&rdquo; is an Objection verb.
                  Take the possibility to be TRUE. If the conclusion dies,
                  the answer is right.
                </>
              ),
            },
          ]}
        />
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <FlashcardDeck day={2} />
      </section>

      <CalibrationDrill day={day} />
    </>
  );
}
