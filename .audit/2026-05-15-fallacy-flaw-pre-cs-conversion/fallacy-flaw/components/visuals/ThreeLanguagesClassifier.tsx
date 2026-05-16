

import { useMemo, useState } from 'react';
import { classifyTriggerPhrase } from '../../lib/trigger-classifier';
import { KeywordPill } from '../ui/KeywordPill';
import { cn } from '../../lib/utils';

const PRESETS = [
  {
    label: 'Objection',
    text: 'The author fails to consider that there are probably species in existence that have not yet been identified.',
  },
  {
    label: 'Assumption',
    text: 'The argument takes for granted that a labeling error is proof of an intention to deceive.',
  },
  {
    label: 'Match',
    text: 'The argument confuses a condition that ensures the truth of another condition with one that is necessary for the truth of that condition.',
  },
];

export function ThreeLanguagesClassifier() {
  const [text, setText] = useState(PRESETS[0].text);
  const result = useMemo(() => classifyTriggerPhrase(text), [text]);

  const highlighted = useMemo(() => {
    if (!result.trigger) return text;
    const idx = text.toLowerCase().indexOf(result.trigger.toLowerCase());
    if (idx < 0) return text;
    const before = text.slice(0, idx);
    const hit = text.slice(idx, idx + result.trigger.length);
    const after = text.slice(idx + result.trigger.length);
    return (
      <>
        {before}
        <mark
          className={cn(
            'rounded-sm px-1',
            result.language === 'assumption' && 'bg-verdigris-tint text-verdigris-deep',
            result.language === 'objection' && 'bg-[#E2E8F0] text-[#1B3A5C]',
            result.language === 'match' && 'bg-g3-tint text-g3',
          )}
        >
          {hit}
        </mark>
        {after}
      </>
    );
  }, [text, result]);

  return (
    <section className="my-10 border border-rule bg-paper-bright/60 p-6">
      <header className="flex items-baseline justify-between border-b border-rule-soft pb-2">
        <h4 className="display-title text-xl text-ink">Three Languages · live classifier</h4>
        <span className="protocol text-ink-mute">paste · classify · run protocol</span>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setText(p.text)}
            className="border border-rule bg-paper px-3 py-1 protocol text-xs hover:border-ink"
          >
            Try: {p.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="mt-3 w-full resize-y border border-rule bg-paper p-3 font-serif text-base leading-relaxed focus:border-ink focus:outline-none"
        placeholder="Paste any flaw answer choice. The classifier highlights the trigger phrase, names the language, and runs the test."
      />

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="border-l-2 border-rule pl-4 italic text-ink-soft">
          {highlighted}
        </div>
        <div className="flex flex-col items-start gap-2">
          <KeywordPill variant={result.language ?? 'neutral'}>
            {result.language ? result.language : 'no match'}
          </KeywordPill>
          {result.trigger && (
            <div className="protocol text-ink-mute">trigger · {result.trigger}</div>
          )}
        </div>
      </div>

      <div className="mt-4 border border-rule bg-paper p-4">
        <div className="protocol text-ink-mute">Protocol</div>
        <div className="mt-1 font-mono text-sm text-ink-soft">{result.protocol}</div>
      </div>
    </section>
  );
}
