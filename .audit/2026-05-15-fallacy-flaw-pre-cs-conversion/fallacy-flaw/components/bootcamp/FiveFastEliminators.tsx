/**
 * The Five Fast Eliminators rendered as a scan-once reference.
 * Day 06 visual primitive. Numbered I-V, full-rule borders, mono accents.
 */
const PATTERNS = [
  {
    n: 'I',
    name: 'Too Strong',
    why: 'Accuses the author of assuming something extreme, or claims the conclusion rests "merely" on one piece of evidence.',
    tells: ['only', 'solely', 'merely', 'always', 'never', 'impossible', 'all', 'no'],
  },
  {
    n: 'II',
    name: 'Bad Match',
    why: 'Descriptively inaccurate. The answer describes evidence or a conclusion that doesn\'t exist in the text.',
    tells: ['describes a premise the stimulus never gave', 'invents a conclusion'],
  },
  {
    n: 'III',
    name: 'Reversed Logic',
    why: 'Right concepts, wrong direction. Confuses the Condition for the Result, or cause for effect.',
    tells: ['necessary where it should be sufficient', 'cause where it should be effect'],
  },
  {
    n: 'IV',
    name: 'Wrong Flaw',
    why: 'Uses a Famous Flaw label that isn\'t actually present in the argument. The label sounds familiar so your brain accepts it.',
    tells: ['"correlation/causation" with no causal claim in stimulus', '"ad hominem" with no source attack'],
  },
  {
    n: 'V',
    name: 'Contradicted',
    why: 'Claims the author "failed to consider" something they actually did discuss.',
    tells: ['re-scan the stimulus for the supposedly-overlooked thing'],
  },
];

export function FiveFastEliminators() {
  return (
    <figure
      aria-label="The Five Fast Eliminators"
      className="my-10 border border-ink bg-paper-bright"
    >
      <header className="flex items-baseline justify-between border-b border-ink px-6 py-3">
        <span className="protocol text-ink">
          The Five Fast Eliminators · Trap Patterns
        </span>
        <span className="protocol text-ink-mute">Day 06 · Reg. I §5</span>
      </header>
      <ol className="grid divide-y divide-rule md:grid-cols-2 md:divide-y-0">
        {PATTERNS.map((p, i) => (
          <li
            key={p.n}
            className={`px-6 py-5 ${i % 2 === 0 ? 'md:border-r md:border-rule' : ''} ${i < PATTERNS.length - 2 ? 'md:border-b md:border-rule' : ''}`}
          >
            <div className="flex items-baseline gap-3">
              <span className="display-title text-3xl text-ink">{p.n}</span>
              <h4 className="display-title text-xl text-ink">{p.name}</h4>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.why}</p>
            <div className="mt-3">
              <div className="protocol text-[0.65rem] text-ink-mute">Look for</div>
              <ul className="mt-1 flex flex-wrap gap-1">
                {p.tells.map((t) => (
                  <li
                    key={t}
                    className="border border-rule-soft bg-paper px-2 py-0.5 text-[0.7rem] text-ink-soft"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <footer className="border-t border-ink px-6 py-3">
        <p className="protocol text-ink-mute">
          Scan first. Test second. Most wrong answers die at I or II inside ten
          seconds.
        </p>
      </footer>
    </figure>
  );
}
