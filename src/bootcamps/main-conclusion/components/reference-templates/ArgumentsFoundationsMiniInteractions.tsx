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
        <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">Claim Bucket Inspector</p>
        <h3 className="mt-1 font-mc-serif text-[28px] italic text-ink">Four buckets. No ambiguity.</h3>
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
  const words = [
    ['F', 'For'],
    ['A', 'After all'],
    ['B', 'Because'],
    ['S', 'Since'],
  ] as const;
  const [active, setActive] = useState<string | null>(null);

  return (
    <Card variant="surface" className="space-y-4 p-6">
      <div>
        <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">FABS Mini Tool</p>
        <h3 className="mt-1 font-mc-serif text-[28px] italic text-ink">Support indicator, not the whole system.</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {words.map(([letter, word]) => (
          <button
            key={letter}
            type="button"
            onMouseEnter={() => setActive(word)}
            onFocus={() => setActive(word)}
            onMouseLeave={() => setActive(null)}
            className={active === word ? 'rounded-[18px] bg-emerald-100 px-4 py-3 font-bold text-emerald-900' : 'rounded-[18px] border border-[rgba(26,26,26,0.08)] bg-white px-4 py-3 font-bold text-ink'}
          >
            {letter}
          </button>
        ))}
      </div>
      <p className="text-[15px] leading-[1.6] text-ink-soft">
        {active ? `${active} usually introduces support. Use it as a clue, then still verify the real conclusion.` : 'Hover a letter. FABS helps you spot support, but it does not replace the structural read.'}
      </p>
    </Card>
  );
}
