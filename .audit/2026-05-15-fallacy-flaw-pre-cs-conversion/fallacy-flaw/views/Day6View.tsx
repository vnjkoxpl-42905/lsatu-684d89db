import { BriefLayout } from '../components/lesson/BriefLayout';
import { PullQuote, Remember } from '../components/lesson/PullQuote';
import { Walkthrough } from '../components/lesson/Walkthrough';
import { CoachOpener } from '../components/bootcamp/CoachOpener';
import { DayHeader } from '../components/bootcamp/DayHeader';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { CalibrationDrill } from '../components/bootcamp/CalibrationDrill';
import { getDay } from '../content/bootcamp/days';

export function Day6View() {
  const day = getDay(6);

  return (
    <>
      <DayHeader day={day} />

      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track · final</div>
        <BootcampProgress currentDay={6} />
      </div>

      <CoachOpener day={day} />

      <BriefLayout
        id="contract"
        number="01"
        eyebrow="The Contract"
        title="≥80% on This Drill"
        margin={
          <>
            <div className="protocol text-ink-mute">Today only</div>
            <p className="mt-2 italic leading-snug text-ink-soft">
              No new lessons. Five worked walkthroughs to remind you what
              maximum performance looks like, then eight stimuli with no
              scaffolding.
            </p>
          </>
        }
      >
        <p>
          Day seven is the contract day. The bootcamp closes when you hit
          80% on the calibration drill below. The misses you log here go
          into your spaced-repetition queue, which is how the catalog
          re-injects weak flaws into your study schedule over the next
          several weeks.
        </p>
        <PullQuote>
          80% or rerun. The contract is not optional, but it is not a
          deadline either.
        </PullQuote>
        <p>
          Below are the five worked walkthroughs from the master guide.
          Watch the protocol run on real LSAT stimuli. Hostile read,
          formulate the objection, predict the answer language. Then go
          straight at the drill.
        </p>
      </BriefLayout>

      {/* Five worked walkthroughs */}
      <section className="mx-auto max-w-4xl px-6">
        <Walkthrough
          number={1}
          title="Cafeteria Apples"
          cite="PT 17 · S2 · Q10"
          stimulus={
            <>
              Cafeteria patron: The apples sold in this cafeteria are
              greasy. The cashier told me that the apples are in that
              condition when they are delivered to the cafeteria and that
              the cafeteria does not wash the apples it sells. Most fruit
              is sprayed with dangerous pesticides before it is harvested,
              and is dangerous until it is washed. Clearly, the cafeteria
              is selling pesticide-covered fruit, thereby endangering its
              patrons.
            </>
          }
          hostileRead={
            <>
              P1: apples are greasy. P2: they arrive that way and the
              cafeteria doesn&apos;t wash them. P3: most fruit gets
              pesticides and is dangerous until washed. C: the cafeteria is
              selling pesticide-covered fruit.
            </>
          }
          objection={
            <>
              What if the apples were already washed by someone before they
              hit the cafeteria? What if these apples aren&apos;t part of
              the &ldquo;most fruit&rdquo; category that gets sprayed?
              (Grease ≠ pesticides.)
            </>
          }
          language={
            <>
              Either Objection (&ldquo;fails to consider that the apples may
              have been washed before delivery&rdquo;) or Match
              (&ldquo;treats grease as if it were evidence of
              pesticides&rdquo;).
            </>
          }
        />

        <Walkthrough
          number={2}
          title="The Ethicist on Meat"
          cite="June 2007 · S3 · Q21"
          stimulus={
            <>
              On average, animals raised on grain must be fed sixteen
              pounds of grain to produce one pound of meat. Sixteen pounds
              of grain could feed many more people than could a pound of
              meat. With grain yields leveling off and population
              expanding, we must accept the fact that consumption of meat
              will soon be morally unacceptable.
            </>
          }
          hostileRead={
            <>
              <em>Morally unacceptable</em> appears in the conclusion.
              Where in the premises did anyone establish what &ldquo;morally
              unacceptable&rdquo; means? Nowhere. Morality showed up like
              an uninvited guest at a dinner party.
            </>
          }
          objection={
            <>
              What if &ldquo;morally unacceptable&rdquo; ≠ &ldquo;not
              feeding the most people&rdquo;? Just put a ≠ between the two
              things the author is pretending are the same. That&apos;s
              the entire flaw in one symbol.
            </>
          }
          language={
            <>
              Match (&ldquo;treats X as if it were the same as Y&rdquo;) or
              Assumption (&ldquo;takes for granted that whatever feeds more
              people is morally required&rdquo;).
            </>
          }
        />

        <Walkthrough
          number={3}
          title="The Robot Engineer"
          cite="PT 16 · S2 · Q10"
          stimulus={
            <>
              A fundamental illusion in robotics is the belief that
              improvements in robots will liberate humanity from
              &ldquo;hazardous and demeaning work.&rdquo; Engineers are
              designing only those types of robots that can be properly
              maintained with the least expensive, least skilled human
              labor possible. Therefore, robots will not eliminate
              demeaning work, only substitute one type of demeaning work
              for another.
            </>
          }
          hostileRead={
            <>
              The conclusion calls the substitute labor &ldquo;demeaning.&rdquo;
              The premises only said &ldquo;least expensive, least
              skilled.&rdquo; That&apos;s a description, not a judgment. The
              author is sneaking the word &ldquo;demeaning&rdquo; in as
              if it&apos;s the same as &ldquo;low-skill,&rdquo; and it
              isn&apos;t.
            </>
          }
          objection={
            <>
              What if the least expensive, least skilled labor isn&apos;t
              demeaning? Cleaning floors is unskilled and many people find
              it perfectly fine. The label &ldquo;demeaning&rdquo; is the
              author&apos;s value judgment, not a fact in evidence.
            </>
          }
          language={
            <>
              Assumption (&ldquo;takes for granted that the least skilled
              labor is necessarily demeaning&rdquo;).
            </>
          }
        />

        <Walkthrough
          number={4}
          title="Dolores vs. Victor"
          cite="PT 16 · S2 · Q19"
          stimulus={
            <>
              The Volunteers for Literacy Program would benefit if Dolores
              takes Victor&apos;s place as director, since Dolores is far
              more skillful than Victor at securing the kind of financial
              support the program needs and Dolores does not have
              Victor&apos;s propensity for alienating the program&apos;s
              most dedicated volunteers.
            </>
          }
          hostileRead={
            <>
              Dolores&apos;s strengths and Victor&apos;s weaknesses listed.
              Dolores&apos;s weaknesses and Victor&apos;s strengths
              nowhere. Classic one-sided pitch.
            </>
          }
          objection={
            <>
              What if Dolores has a major downside compared to Victor that
              we&apos;re not being told about? Maybe Dolores is a chaos
              agent in budget meetings. Maybe Victor recruits volunteers
              brilliantly. The argument hides half the picture.
            </>
          }
          language={
            <>
              Objection (&ldquo;fails to consider that Dolores might have
              weaknesses Victor lacks&rdquo;).
            </>
          }
        />

        <Walkthrough
          number={5}
          title="The Connolly Report"
          cite="Flaw WS · Q1"
          stimulus={
            <>
              The latest Connolly Report suggests that Ocksenfrey
              prepackaged meals are virtually devoid of nutritional value.
              But the Connolly Report is commissioned by Danto Foods,
              Ocksenfrey&apos;s largest corporate rival, and early drafts
              are submitted for approval to Danto Foods&apos; PR
              department. Because of the obvious bias of this report, it
              is clear that Ocksenfrey&apos;s prepackaged meals really are
              nutritious.
            </>
          }
          hostileRead={
            <>
              The author rejects the Connolly Report by attacking the
              source&apos;s bias, then concludes the OPPOSITE of what the
              report said. Even if the report is biased, that doesn&apos;t
              mean the meals are nutritious. It just means we don&apos;t
              know either way.
            </>
          }
          objection={
            <>
              What if the report is biased AND the meals really aren&apos;t
              nutritious? Bias makes the report less reliable. It
              doesn&apos;t reverse what&apos;s true.
            </>
          }
          language={
            <>
              Match or Assumption — &ldquo;treats the failure to establish
              a claim as proof of its opposite.&rdquo;
            </>
          }
        />

        <Remember>
          The protocol works on every Flaw question. The walkthroughs are
          proof of concept. Now run it on the eight stimuli below, with no
          scaffolding.
        </Remember>
      </section>

      <CalibrationDrill day={day} />
    </>
  );
}
