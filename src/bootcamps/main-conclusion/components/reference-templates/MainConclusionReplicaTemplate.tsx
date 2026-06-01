import { useMemo, useState } from 'react';

import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractQuotedPhrases(hint: string) {
  const phrases = new Set<string>();
  for (const match of hint.matchAll(/'([^']+)'/g)) {
    const phrase = match[1]?.trim();
    if (phrase) phrases.add(phrase);
  }
  for (const match of hint.matchAll(/"([^"]+)"/g)) {
    const phrase = match[1]?.trim();
    if (phrase) phrases.add(phrase);
  }
  return [...phrases];
}

function highlightHintPhrases(text: string, hint: string) {
  const phrases = extractQuotedPhrases(hint);
  if (!phrases.length) return escapeHtml(text);

  let marked = escapeHtml(text);
  for (const phrase of phrases.sort((a, b) => b.length - a.length)) {
    const escapedPhrase = escapeHtml(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    marked = marked.replace(
      new RegExp(escapedPhrase, 'gi'),
      '<span class="rounded-[6px] bg-[#facc15]/12 px-0.5 text-[#facc15] underline decoration-[#facc15]/70 underline-offset-[5px]">$&</span>',
    );
  }

  return marked;
}

function formatCounter(index: number, total: number) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(index + 1)}/${pad(total)}`;
}

export function MainConclusionReplicaTemplate({
  questions,
  onComplete,
}: {
  title: string;
  questions: CanonicalStructureQuestion[];
  onComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct'>('idle');

  const current = questions[index]!;
  const isLast = index === questions.length - 1;

  const highlightedWrongChunkIndex =
    status === 'wrong'
      ? current.chunks.findIndex((chunk) =>
          extractQuotedPhrases(current.hint).some((phrase) => chunk.toLowerCase().includes(phrase.toLowerCase())),
        )
      : -1;

  const progressWidth = `${((index + (status === 'correct' ? 1 : 0)) / questions.length) * 100}%`;

  const terminalTone =
    status === 'correct'
      ? 'border-l-[#14f1c9] text-[#14f1c9]'
      : status === 'wrong'
        ? 'border-l-[#ff5b5b] text-[#ff5b5b]'
        : 'border-l-[#1ec8ff] text-[#94a3b8]';

  const terminalContent = useMemo(() => {
    if (status === 'correct') {
      return [
        '> ANALYSIS VALID.',
        '> GOOD EYE.',
        `> ${current.revealExplanation.replace(/^Correct\.?\s*/i, '')}`,
      ];
    }

    if (status === 'wrong') {
      return ['> MISMATCH. RE-ANALYZING PIVOT CLUES...', `> ${current.hint}`];
    }

    return ['> TAP THE SENTENCE YOU THINK IS THE MAIN CONCLUSION.'];
  }, [current.hint, current.revealExplanation, status]);

  function analyzeSelection() {
    if (selectedIndex == null) return;
    setStatus(selectedIndex === current.correctMainConclusionIndex ? 'correct' : 'wrong');
  }

  function selectChunk(chunkIndex: number) {
    if (status === 'correct') return;
    setSelectedIndex(chunkIndex);
    if (status === 'wrong') setStatus('idle');
  }

  function nextQuestion() {
    if (isLast) {
      onComplete?.();
      return;
    }

    setIndex((value) => value + 1);
    setSelectedIndex(null);
    setStatus('idle');
  }

  return (
    <section
      className="relative overflow-hidden rounded-[30px] border border-[#16334d] bg-[#0c1626] px-5 py-6 text-white shadow-[0_22px_60px_rgba(5,10,25,0.35)] md:px-8 md:py-8"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(circle at top, rgba(33,198,255,0.08), transparent 32%)',
        backgroundSize: '24px 24px, 24px 24px, 100% 100%',
      }}
    >
      <div className="mx-auto w-full max-w-[760px]">
        <div className="flex items-center justify-between gap-4 font-mc-mono text-[13px] uppercase tracking-[0.22em]">
          <span className="text-[#1ec8ff]">Drill_Active</span>
          <span className="text-[#94a3b8]">{formatCounter(index, questions.length)}</span>
        </div>

        <div className="mt-4 h-[6px] overflow-hidden rounded-full bg-[#2a3a4e]">
          <div
            className="h-full rounded-full bg-[#1ec8ff] shadow-[0_0_16px_rgba(30,200,255,0.45)] transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        <p className="mt-5 font-mc-mono text-[13px] uppercase tracking-[0.18em] text-[#94a3b8]">
          {`> TAP THE CONCLUSION SENTENCE`}
        </p>

        <div className="relative mt-3 overflow-hidden rounded-[22px] border border-[#24364d] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-7 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] md:px-8">
          <div className="pointer-events-none absolute left-0 top-0 h-[3px] w-full bg-[#1ec8ff] opacity-70 shadow-[0_0_16px_rgba(30,200,255,0.65)]" />
          <div className="text-[20px] leading-[1.65] text-[#e5edf8] md:text-[21px]">
            {current.chunks.map((chunk, chunkIndex) => {
              const isSelected = selectedIndex === chunkIndex;
              const isCorrectSelection = status === 'correct' && chunkIndex === current.correctMainConclusionIndex;
              const shouldShowHintClues = status === 'wrong' && chunkIndex === highlightedWrongChunkIndex;
              const html = shouldShowHintClues ? highlightHintPhrases(chunk, current.hint) : escapeHtml(chunk);

              return (
                <button
                  key={`${current.id}-${chunkIndex}`}
                  type="button"
                  onClick={() => selectChunk(chunkIndex)}
                  className={cn(
                    'mb-1 mr-1 inline rounded-[8px] border px-1 py-0.5 text-left align-baseline transition-all duration-200',
                    'border-transparent',
                    isSelected && status !== 'correct' ? 'border-[#1ec8ff] bg-[#1ec8ff]/12 shadow-[0_0_24px_rgba(30,200,255,0.12)]' : '',
                    isCorrectSelection ? 'border-[#14f1c9] bg-[#14f1c9]/14 shadow-[0_0_24px_rgba(20,241,201,0.14)]' : '',
                    !isSelected && !isCorrectSelection ? 'hover:border-[#1ec8ff]/25 hover:bg-white/[0.02]' : '',
                    status === 'correct' ? 'cursor-default' : 'cursor-pointer',
                  )}
                  disabled={status === 'correct'}
                >
                  <span dangerouslySetInnerHTML={{ __html: html }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          {status === 'correct' ? (
            <button
              type="button"
              onClick={nextQuestion}
              className="w-full rounded-[16px] border border-transparent bg-[#20b8d3] px-6 py-4 font-mc-mono text-[18px] uppercase tracking-[0.28em] text-[#03121b] transition-transform hover:translate-y-[-1px]"
            >
              {isLast ? 'Finish Lab >>' : 'Next Question >>'}
            </button>
          ) : (
            <button
              type="button"
              onClick={analyzeSelection}
              disabled={selectedIndex == null}
              className={cn(
                'w-full rounded-[16px] border px-6 py-4 font-mc-mono text-[18px] uppercase tracking-[0.28em] transition-colors',
                selectedIndex == null
                  ? 'border-[#2b3b4f] bg-transparent text-[#314257]'
                  : 'border-[#1ec8ff] bg-transparent text-[#1ec8ff] hover:bg-[#1ec8ff] hover:text-[#04111b]',
              )}
            >
              Analyze Selection
            </button>
          )}
        </div>

        <div className={cn('mt-5 rounded-r-[14px] border-l-4 bg-black px-5 py-4 font-mc-mono text-[15px] leading-[1.65]', terminalTone)}>
          {terminalContent.map((line, lineIndex) => (
            <p key={`${status}-${lineIndex}`}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
