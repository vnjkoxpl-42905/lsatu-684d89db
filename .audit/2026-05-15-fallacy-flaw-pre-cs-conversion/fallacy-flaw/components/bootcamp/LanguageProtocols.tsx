/**
 * Three-language protocol contract block. Mirrors the visual language
 * of ThreeCommandments (Day 02) — full-rule borders, mono header,
 * three-clause body — but the content is the trigger-phrase rule and
 * the three tests.
 */
const LANGUAGES = [
  {
    code: '01',
    name: 'Assumption',
    accent: 'verdigris',
    says: '...the author assumes X.',
    keywords: ['takes for granted', 'presumes', 'assumes', 'fails to establish'],
    test: 'Two-Step Check',
    rule: 'Make X FALSE. Does the argument crash?',
  },
  {
    code: '02',
    name: 'Objection',
    accent: 'objection',
    says: "...isn't it possible that Y is true?",
    keywords: ['fails to consider', 'overlooks the possibility', 'ignores', 'neglects'],
    test: 'Weakener Test',
    rule: 'Take Y to be TRUE. Does the conclusion die?',
  },
  {
    code: '03',
    name: 'Match',
    accent: 'match',
    says: '...the author made this illegal logical move.',
    keywords: ['concludes C on the basis of P', 'infers... that C', 'confuses P with C'],
    test: 'Translation Test',
    rule: 'Translate the abstract terms back to the text. Does the wording fit?',
  },
] as const;

const accentBg = {
  verdigris: 'bg-verdigris-tint text-verdigris-deep',
  objection: 'bg-[#E2E8F0] text-[#1B3A5C]',
  match: 'bg-g3-tint text-g3',
} as const;

export function LanguageProtocols() {
  return (
    <figure
      aria-label="The Three Languages of Flaw answers · trigger-phrase rule"
      className="my-10 border border-ink bg-paper-bright"
    >
      <header className="flex items-baseline justify-between border-b border-ink px-6 py-3">
        <span className="protocol text-ink">
          The Three Languages · Trigger-Phrase Rule
        </span>
        <span className="protocol text-ink-mute">Day 03 · Reg. I §4</span>
      </header>
      <ol className="divide-y divide-rule">
        {LANGUAGES.map((l) => (
          <li key={l.code} className="px-6 py-5">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="display-title text-3xl italic text-ink-mute">
                  {l.code}
                </span>
                <h4 className="display-title text-2xl text-ink">{l.name}</h4>
              </div>
              <span className={`protocol px-2 py-0.5 ${accentBg[l.accent]}`}>
                {l.test}
              </span>
            </div>

            <p className="mt-2 italic leading-relaxed text-ink-soft">
              Says · &ldquo;{l.says}&rdquo;
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr] md:gap-x-6">
              <div className="protocol text-ink-mute">Keywords</div>
              <ul className="flex flex-wrap gap-1.5">
                {l.keywords.map((k) => (
                  <li
                    key={k}
                    className={`protocol px-2 py-0.5 text-[0.7rem] ${accentBg[l.accent]}`}
                  >
                    {k}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[auto_1fr] md:gap-x-6">
              <div className="protocol text-ink-mute">Rule</div>
              <p className="font-mono text-sm leading-relaxed text-ink">
                {l.rule}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <footer className="border-t border-ink px-6 py-3">
        <p className="protocol text-ink-mute">
          Same correct answer, different test. Apply the wrong test, eliminate
          the right answer.
        </p>
      </footer>
    </figure>
  );
}
