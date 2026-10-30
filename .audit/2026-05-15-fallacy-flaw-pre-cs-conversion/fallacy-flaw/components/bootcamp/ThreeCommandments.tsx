/**
 * The Three Commandments of the Loophole, rendered as a three-clause contract.
 * Operator voice. Mono numerals, full-rule borders, scholar-flat tone.
 *
 * Source: voiced.md §3 — voice-locked.
 */
const CLAUSES = [
  {
    numeral: 'I',
    title: 'Thou shalt not negate the premises.',
    body: "Remember the blocks? The premises are true. Negating them is burning down your blocks. The most common rookie mistake in Flaw is to read a stimulus and think “what if that premise is wrong?” You're not allowed to. Save it. Attack the relationship between the premises instead. The space between them. The walkway, not the foundation.",
  },
  {
    numeral: 'II',
    title: 'Thou shalt not just negate the conclusion.',
    body: "Saying “what if the conclusion isn't true” is like driving to the end of a footrace and declaring yourself the gold medalist. You didn't run. You just showed up at the finish line pretending. Of course the conclusion doesn't have to be true. That's the whole point. Your objection has to show why. It has to do the work.",
  },
  {
    numeral: 'III',
    title: 'The loophole is there. Thou shalt figure it out.',
    body: "I've heard “I just can't find the loophole” approximately ten thousand times in my career. The loophole is always there. The LSAT writers built it in on purpose. Have the patience to find it. The students who tell me they can't are the same students who, three weeks later, are spotting loopholes in the Sunday paper. The skill builds. Don't let yourself give up on a single argument.",
  },
];

export function ThreeCommandments() {
  return (
    <figure
      aria-label="The Three Commandments of the Loophole · contract"
      className="my-10 border border-ink bg-paper-bright"
    >
      <header className="flex items-baseline justify-between border-b border-ink px-6 py-3">
        <span className="protocol text-ink">
          The Loophole · A Contract in Three Clauses
        </span>
        <span className="protocol text-ink-mute">Day 02 · Reg. I §3</span>
      </header>
      <ol className="divide-y divide-rule">
        {CLAUSES.map((c) => (
          <li key={c.numeral} className="grid grid-cols-[auto_1fr] gap-x-5 px-6 py-5 md:gap-x-8">
            <div className="display-title text-5xl leading-none text-ink md:text-6xl">
              {c.numeral}
            </div>
            <div>
              <h4 className="display-title text-xl text-ink md:text-2xl">
                {c.title}
              </h4>
              <p className="mt-2 leading-relaxed text-ink-soft">{c.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <footer className="border-t border-ink px-6 py-3">
        <p className="protocol text-ink-mute">
          Signed · the student. Witnessed · the coach.
        </p>
      </footer>
    </figure>
  );
}
