import { useMemo, useState } from 'react';

import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';

export function ClaimBucketInspector() {
  const buckets = [
    { id: 'mc', name: 'Main Conclusion', desc: "The author's ultimate claim." },
    { id: 'sup', name: 'Support', desc: 'Premises or intermediate claims doing proof work.' },
    { id: 'opp', name: 'Opposing View', desc: 'A claim the author is replying to or rejecting.' },
    { id: 'neu', name: 'Neutral', desc: 'Context that frames the issue without proving the point.' },
  ] as const;
  const [active, setActive] = useState<string | null>(null);

  return (
    <Card variant="elev" className="space-y-4 p-6">
      <div>
        <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">Argument Role Sorter</p>
        <h3 className="mt-1 font-mc-serif text-[28px] italic text-ink">What job is this claim doing in the argument?</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {buckets.map((bucket) => (
          <button
            key={bucket.id}
            type="button"
            onClick={() => setActive(active === bucket.id ? null : bucket.id)}
            className={
              active === bucket.id
                ? 'rounded-[18px] border border-mc-accent bg-mc-accent/10 px-4 py-4 text-left'
                : 'rounded-[18px] border border-[rgba(26,26,26,0.08)] bg-white px-4 py-4 text-left hover:border-[rgba(26,26,26,0.16)]'
            }
          >
            <p className="font-semibold text-ink">{bucket.name}</p>
            {active === bucket.id ? <p className="mt-2 text-[15px] leading-[1.6] text-ink-soft">{bucket.desc}</p> : null}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function TrojanHorseHoweverReveal() {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card variant="surface" className="space-y-4 p-6">
      <div>
        <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">Trojan Horse Reveal</p>
        <h3 className="mt-1 font-mc-serif text-[28px] italic text-ink">Concede. Pivot. Expose the real claim.</h3>
      </div>
      <div className="space-y-3 rounded-[20px] border border-[rgba(26,26,26,0.08)] bg-white px-5 py-4 text-[18px] leading-[1.75] text-ink">
        <p>Granted, the new transit policy did reduce traffic downtown.</p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={revealed ? 'rounded-full bg-mc-error px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-white' : 'rounded-full border border-[rgba(26,26,26,0.16)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ink'}
        >
          HOWEVER
        </button>
        {revealed ? <p className="rounded-[16px] bg-mc-error/10 px-4 py-3 text-mc-error">...the policy is still misguided.</p> : null}
      </div>
    </Card>
  );
}

export function ReferentialLanguageUnpack() {
  const [unpacked, setUnpacked] = useState(false);
  const quote = useMemo(
    () =>
      unpacked
        ? 'However, [laws requiring mandatory background checks] will not affect the homicide rate.'
        : 'However, such laws will not affect the homicide rate.',
    [unpacked],
  );
  return (
    <Card variant="elev" className="space-y-4 p-6">
      <div>
        <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">Referential Language</p>
        <h3 className="mt-1 font-mc-serif text-[28px] italic text-ink">Do not leave pronouns packed up.</h3>
      </div>
      <div className="rounded-[20px] border border-[rgba(26,26,26,0.08)] bg-white px-5 py-4 text-[18px] leading-[1.75] text-ink">
        <p className="text-ink-soft">Some people propose laws that would require mandatory background checks on people owning a gun.</p>
        <button
          type="button"
          onClick={() => setUnpacked(true)}
          className="mt-4 rounded-[16px] border border-mc-accent/30 bg-mc-accent/10 px-4 py-3 text-left text-ink"
        >
          {quote}
        </button>
      </div>
    </Card>
  );
}

export function FabsHoverMiniTool() {
  const items = [
    {
      letter: 'F',
      word: 'For',
      rule: '"For" introduces support.',
      example:
        'The town should keep the library open on Sundays, for many working parents can only bring their children on weekends.',
      conclusion: 'The town should keep the library open on Sundays.',
      support: 'Many working parents can only bring their children on weekends.',
    },
    {
      letter: 'A',
      word: 'After all',
      rule: '"After all" introduces support.',
      example: 'The museum should stay open later on Fridays. After all, most visitors arrive after work.',
      conclusion: 'The museum should stay open later on Fridays.',
      support: 'Most visitors arrive after work.',
    },
    {
      letter: 'B',
      word: 'Because',
      rule: '"Because" introduces support.',
      example:
        'The rule should be revised because it punishes small paperwork mistakes as harshly as serious violations.',
      conclusion: 'The rule should be revised.',
      support: 'It punishes small paperwork mistakes as harshly as serious violations.',
    },
    {
      letter: 'S',
      word: 'Since',
      rule: '"Since" introduces support.',
      example:
        'Since the bridge failed two safety inspections, the city should close it until repairs are complete.',
      conclusion: 'The city should close the bridge until repairs are complete.',
      support: 'The bridge failed two safety inspections.',
    },
  ] as const;
  const [active, setActive] = useState<(typeof items)[number]['letter'] | null>(null);
  const current = items.find((item) => item.letter === active) ?? null;

  return (
    <Card variant="surface" className="space-y-4 p-6">
      <div>
        <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">FABS Mini Tool</p>
        <h3 className="mt-1 font-mc-serif text-[28px] italic text-ink">Support indicator, not the whole system.</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <button
            key={item.letter}
            type="button"
            onClick={() => setActive((currentLetter) => (currentLetter === item.letter ? null : item.letter))}
            className={
              active === item.letter
                ? 'rounded-[18px] border border-emerald-200 bg-emerald-100 px-4 py-3 font-bold text-emerald-900'
                : 'rounded-[18px] border border-[rgba(26,26,26,0.08)] bg-white px-4 py-3 font-bold text-ink hover:border-[rgba(26,26,26,0.16)]'
            }
          >
            {item.letter}
          </button>
        ))}
      </div>
      {current ? (
        <div className="space-y-4 rounded-[20px] border border-[rgba(26,26,26,0.08)] bg-white px-5 py-4">
          <div className="space-y-1">
            <p className="font-semibold text-ink">
              {current.letter} — {current.word}
            </p>
            <p className="text-[15px] leading-[1.6] text-ink-soft">{current.rule}</p>
          </div>
          <div className="space-y-3 text-[15px] leading-[1.7] text-ink">
            <p>
              <span className="font-semibold">Example:</span> {current.example}
            </p>
            <p>
              <span className="font-semibold">Conclusion:</span> {current.conclusion}
            </p>
            <p>
              <span className="font-semibold">Support:</span> {current.support}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[15px] leading-[1.6] text-ink-soft">
          Tap a letter. FABS words introduce support. They point to the reason, not the main conclusion.
        </p>
      )}
      <p className="text-[15px] leading-[1.6] text-ink-soft">
        Use the indicator to find the reason. Then verify what that reason supports.
      </p>
    </Card>
  );
}
