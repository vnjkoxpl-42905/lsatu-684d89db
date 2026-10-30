import { groupMeta } from '../../lib/tokens';
import { KeywordPill } from '../ui/KeywordPill';
import type { FlawEntry } from '../../types/flaw';

export function FlawCard({ flaw }: { flaw: FlawEntry }) {
  const meta = groupMeta[flaw.group];
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <div className="border-b border-rule pb-6">
        <span className="protocol text-ink-mute">
          ← All catalog entries
        </span>
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="display-title text-5xl italic text-ink-mute">
            {String(flaw.number).padStart(2, '0')}
          </span>
          <h1 className="display-title text-4xl text-ink">{flaw.name}</h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="protocol border px-2 py-1 text-[0.65rem]"
            style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.tint }}
          >
            {meta.label}
          </span>
          <KeywordPill>frequency · {flaw.frequency}</KeywordPill>
          {flaw.rightAnswerFreq && (
            <KeywordPill>right-answer freq · {flaw.rightAnswerFreq}</KeywordPill>
          )}
        </div>
      </div>

      <section className="mt-8 space-y-2">
        <h2 className="protocol text-ink-mute">Definition</h2>
        <p className="leading-relaxed text-ink-soft">{flaw.definition}</p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="protocol text-ink-mute">Stimulus tells</h2>
        <p className="leading-relaxed text-ink-soft">{flaw.stimulusTells}</p>
      </section>

      <section className="mt-8">
        <h2 className="protocol text-ink-mute">Answer-choice disguises</h2>
        <ul className="mt-3 space-y-2">
          {flaw.disguises.map((d, i) => (
            <li key={i} className="flex gap-3 border-l-2 border-rule pl-3 text-ink-soft">
              <span className="protocol text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
              <span className="italic">"{d}"</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 border border-rule bg-paper-bright/60 p-5">
        <h2 className="protocol text-ink-mute">Canonical worked example</h2>
        <blockquote className="mt-2 border-l-2 border-ink pl-3 italic text-ink-soft">
          {flaw.workedExample}
        </blockquote>
        {flaw.workedAnalysis && (
          <p className="mt-3 leading-relaxed text-ink-soft">{flaw.workedAnalysis}</p>
        )}
      </section>

      <section className="mt-8 border border-cake bg-cake-tint/60 p-5">
        <h2 className="protocol text-cake-deep">The "What if..." counter</h2>
        <p className="mt-2 font-display italic text-ink">{flaw.whatIfCounter}</p>
      </section>

      {flaw.realPhrasePairs && (
        <section className="mt-8">
          <h2 className="protocol text-ink-mute">Real LSAT phrase pairs the test exploits</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {flaw.realPhrasePairs.map((p, i) => (
              <li
                key={i}
                className="border border-rule bg-paper-bright/40 px-3 py-2 font-mono text-sm text-ink-soft"
              >
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {flaw.disambiguateFrom && flaw.disambiguateFrom.length > 0 && (
        <section className="mt-8">
          <h2 className="protocol text-ink-mute">Disambiguate from</h2>
          <ul className="mt-3 space-y-3">
            {flaw.disambiguateFrom.map((d, i) => (
              <li key={i} className="border-l-2 border-g3 pl-3">
                <div className="display-title text-lg text-ink">{d.other}</div>
                <div className="protocol text-cake-deep">Ask</div>
                <p className="font-display italic text-ink-soft">{d.question}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {flaw.notes && (
        <section className="mt-8 border-t border-rule-soft pt-4">
          <h2 className="protocol text-ink-mute">Notes</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{flaw.notes}</p>
        </section>
      )}

      {flaw.crossLink && (
        <section className="mt-6">
          <h2 className="protocol text-ink-mute">Cross-link</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{flaw.crossLink}</p>
        </section>
      )}
    </article>
  );
}
