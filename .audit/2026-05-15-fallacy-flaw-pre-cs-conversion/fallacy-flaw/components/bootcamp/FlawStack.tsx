import { useState } from 'react';
import { catalog } from '../../content/note-2-catalog';
import type { FlawEntry } from '../../types/flaw';

/**
 * Vertical stack of catalog entries with a fingerprint-first layout.
 */
export function FlawStack({ slugs }: { slugs: string[] }) {
  const entries = slugs
    .map((slug) => catalog.find((c) => c.slug === slug))
    .filter((e): e is FlawEntry => Boolean(e));

  return (
    <ol className="my-10 divide-y-2 divide-ink border-y-2 border-ink">
      {entries.map((flaw, i) => (
        <FlawRow key={flaw.slug} flaw={flaw} index={i + 1} />
      ))}
    </ol>
  );
}

function FlawRow({ flaw, index }: { flaw: FlawEntry; index: number }) {
  const [open, setOpen] = useState(index === 1);
  return (
    <li className="bg-paper">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline gap-4 px-6 py-4 text-left transition-colors hover:bg-paper-bright"
      >
        <span className="display-title text-3xl italic text-ink-mute">
          {String(index).padStart(2, '0')}
        </span>
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <h4 className="display-title text-2xl text-ink">{flaw.name}</h4>
            <span className="protocol text-[0.65rem] text-ink-mute">
              {flaw.frequency}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-ink-soft">
            {flaw.definition}
          </p>
        </div>
        <span className="protocol text-ink-mute">{open ? '–' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-rule px-6 py-5">
          <div className="grid gap-6 md:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <section>
                <div className="protocol text-ink-mute">Stimulus tells</div>
                <p className="mt-1 leading-relaxed text-ink">
                  {flaw.stimulusTells}
                </p>
              </section>

              <section>
                <div className="protocol text-ink-mute">Canonical example</div>
                <blockquote className="mt-1 border border-rule-soft bg-paper-bright px-4 py-3 italic leading-relaxed text-ink">
                  {flaw.workedExample}
                </blockquote>
                {flaw.workedAnalysis && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {flaw.workedAnalysis}
                  </p>
                )}
              </section>

              <section>
                <div className="protocol text-ink-mute">What if · counter</div>
                <p className="mt-1 italic leading-relaxed text-verdigris-deep">
                  {flaw.whatIfCounter}
                </p>
              </section>
            </div>

            <aside className="border-t border-rule-soft pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <div className="protocol text-ink-mute">
                Answer-choice disguises
              </div>
              <ul className="mt-2 space-y-2">
                {flaw.disguises.slice(0, 4).map((d, i) => (
                  <li
                    key={i}
                    className="border-b border-rule-soft pb-2 text-[0.85rem] italic leading-snug text-ink-soft last:border-0 last:pb-0"
                  >
                    &ldquo;{d}&rdquo;
                  </li>
                ))}
              </ul>

              {(flaw.disambiguateFrom ?? []).length > 0 && (
                <div className="mt-5">
                  <div className="protocol text-ink-mute">Disambiguate from</div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {(flaw.disambiguateFrom ?? []).map((d, i) => (
                      <li key={i}>
                        <span className="display-title text-ink">{d.other}</span>
                        <p className="text-xs leading-snug text-ink-mute">
                          Ask: {d.question}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <span className="mt-5 inline-flex protocol border border-rule bg-paper px-3 py-1.5 text-[0.65rem] text-ink">
                Catalog entry · {flaw.slug}
              </span>
            </aside>
          </div>
        </div>
      )}
    </li>
  );
}
