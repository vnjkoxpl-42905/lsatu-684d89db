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
      '<span class="rounded-[4px] bg-[#facc15]/14 px-[0.08em] text-[#ffe07a] underline decoration-[#facc15]/65 underline-offset-[0.18em]">$&</span>',
    );
  }

  return marked;
}

function formatCounter(index: number, total: number) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(index + 1)}/${pad(total)}`;
}

function formatRoleLabel(label?: string) {
  if (!label) return 'Main conclusion';
  return label
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  const correctRoleLabel = formatRoleLabel(current.roleLabels[current.correctMainConclusionIndex]);

  const highlightedWrongChunkIndex =
    status === 'wrong'
      ? current.chunks.findIndex((chunk) =>
          extractQuotedPhrases(current.hint).some((phrase) => chunk.toLowerCase().includes(phrase.toLowerCase())),
        )
      : -1;

  const progressWidth = `${((index + (status === 'correct' ? 1 : 0)) / questions.length) * 100}%`;

  const feedbackTone =
    status === 'correct'
      ? 'border-[#124261] bg-[#09111d] text-[#8ef0cd]'
      : status === 'wrong'
        ? 'border-[#214763] bg-[#09111d] text-[#ffb4b4]'
        : 'border-[#214763] bg-[#09111d] text-[#94a3b8]';

  const feedbackContent = useMemo(() => {
    if (status === 'correct') {
      return [
        'Correct.',
        `Role: ${correctRoleLabel}`,
        current.revealExplanation.replace(/^Correct\.?\s*/i, ''),
      ];
    }

    if (status === 'wrong') {
      return ['Not quite.', current.hint];
    }

    return ['Select the sentence you think states the main conclusion, then analyze your choice.'];
  }, [correctRoleLabel, current.hint, current.revealExplanation, status]);

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
          <div>
            <p className="text-[#1ec8ff]">Drill_Active</p>
            <p className="mt-2 text-[11px] tracking-[0.18em] text-[#6f8399]">Main conclusion identification</p>
          </div>
          <span className="shrink-0 text-[#94a3b8]">{formatCounter(index, questions.length)}</span>
        </div>

        <div className="mt-5 h-[6px] overflow-hidden rounded-full bg-[#2a3a4e]">
          <div
            className="h-full rounded-full bg-[#1ec8ff] shadow-[0_0_16px_rgba(30,200,255,0.45)] transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        <p className="mt-5 font-mc-mono text-[13px] uppercase tracking-[0.18em] text-[#94a3b8]">
          Tap the conclusion sentence
        </p>

        <div className="relative mt-3 overflow-hidden rounded-[22px] border border-[#24364d] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-7 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] md:px-8">
          <div className="pointer-events-none absolute left-0 top-0 h-[3px] w-full bg-[#1ec8ff] opacity-70 shadow-[0_0_16px_rgba(30,200,255,0.65)]" />
          <p className="mb-5 font-mc-mono text-[12px] uppercase tracking-[0.16em] text-[#7892ad]">
            Stimulus
          </p>
          <div className="text-[20px] leading-[1.75] text-[#e5edf8] md:text-[21px]">
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
                    'inline rounded-[6px] border border-transparent px-[0.08em] py-0 text-left align-baseline whitespace-normal break-normal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ec8ff]/45',
                    isSelected && status !== 'correct' ? 'bg-[#1ec8ff]/14 text-[#f2f8ff]' : '',
                    isCorrectSelection ? 'bg-[#14f1c9]/14 text-[#dffdf6]' : '',
                    !isSelected && !isCorrectSelection ? 'hover:bg-white/[0.04]' : '',
                    status === 'correct' ? 'cursor-default' : 'cursor-pointer',
                  )}
                  disabled={status === 'correct'}
                >
                  <span dangerouslySetInnerHTML={{ __html: html }} />
                  {chunkIndex < current.chunks.length - 1 ? ' ' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-[#24364d] bg-[rgba(9,18,31,0.88)] p-5">
          <p className="font-mc-mono text-[12px] uppercase tracking-[0.16em] text-[#7892ad]">Task</p>
          <p className="mt-2 text-[16px] leading-[1.7] text-[#c8d5e6]">
            Tap the sentence you think expresses the author&apos;s main conclusion. Then analyze your
            selection to check your reasoning.
          </p>
        </div>

        <div className="mt-4">
          {status === 'correct' ? (
            <button
              type="button"
              onClick={nextQuestion}
              className="w-full rounded-[16px] border border-transparent bg-[#20b8d3] px-6 py-4 font-mc-mono text-[18px] uppercase tracking-[0.22em] text-[#03121b] transition-transform hover:translate-y-[-1px]"
            >
              {isLast ? 'Finish Lab >>' : 'Next Question >>'}
            </button>
          ) : (
            <button
              type="button"
              onClick={analyzeSelection}
              disabled={selectedIndex == null}
              className={cn(
                'w-full rounded-[16px] border px-6 py-4 font-mc-mono text-[18px] uppercase tracking-[0.22em] transition-colors',
                selectedIndex == null
                  ? 'border-[#2b3b4f] bg-transparent text-[#314257]'
                  : 'border-[#1ec8ff] bg-transparent text-[#1ec8ff] hover:bg-[#1ec8ff] hover:text-[#04111b]',
              )}
            >
              Analyze Selection
            </button>
          )}
        </div>

        <div className={cn('mt-5 rounded-[18px] border px-5 py-4 text-[15px] leading-[1.7]', feedbackTone)}>
          {feedbackContent.map((line, lineIndex) => (
            <p key={`${status}-${lineIndex}`}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
