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
      ? 'border-[#b7e4d1] bg-[#f3fbf7] text-[#17603e]'
      : status === 'wrong'
        ? 'border-[#f1c5c5] bg-[#fff6f5] text-[#8a2f2f]'
        : 'border-[#dbe4f0] bg-[#f8fafc] text-[#526277]';

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
      className="rounded-[30px] border border-[#d9e2ec] bg-[#f7f3eb] px-5 py-6 text-[#1f2937] shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:px-8 md:py-8"
    >
      <div className="mx-auto w-full max-w-[760px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7c6953]">Main Conclusion Lab</p>
            <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-[#1f2937]">Find the sentence that states the argument&apos;s main conclusion.</h2>
          </div>
          <span className="shrink-0 text-[18px] font-medium text-[#6b7280]">
            {`${index + 1} of ${questions.length}`}
          </span>
        </div>

        <div className="mt-5 h-[8px] overflow-hidden rounded-full bg-[#e5e7eb]">
          <div
            className="h-full rounded-full bg-[#c49a6c] transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        <div className="mt-6 rounded-[26px] border border-[#e3e8ef] bg-white px-7 py-7 shadow-[0_10px_30px_rgba(15,23,42,0.07)] md:px-8">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8b7355]">
            Stimulus
          </p>
          <div className="text-[21px] leading-[1.85] text-[#26313f] md:text-[22px]">
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
                    'inline rounded-[10px] px-1 py-0 text-left align-baseline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a6c]/45',
                    isSelected && status !== 'correct' ? 'bg-[#fdecc8] text-[#5f3f1b]' : '',
                    isCorrectSelection ? 'bg-[#dff4e8] text-[#1d5a3b]' : '',
                    !isSelected && !isCorrectSelection ? 'hover:bg-[#f4efe6]' : '',
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

        <div className="mt-5 rounded-[22px] border border-[#e2e8f0] bg-[#fcfaf6] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8b7355]">Task</p>
          <p className="mt-2 text-[16px] leading-[1.7] text-[#526277]">
            Tap the sentence you think expresses the author&apos;s main conclusion. Then analyze your
            selection to check your reasoning.
          </p>
        </div>

        <div className="mt-4">
          {status === 'correct' ? (
            <button
              type="button"
              onClick={nextQuestion}
              className="w-full rounded-[16px] border border-transparent bg-[#c49a6c] px-6 py-4 text-[16px] font-semibold tracking-[0.01em] text-white transition-transform hover:translate-y-[-1px]"
            >
              {isLast ? 'Finish Lab' : 'Next Question'}
            </button>
          ) : (
            <button
              type="button"
              onClick={analyzeSelection}
              disabled={selectedIndex == null}
              className={cn(
                'w-full rounded-[16px] border px-6 py-4 text-[16px] font-semibold transition-colors',
                selectedIndex == null
                  ? 'border-[#d5dbe4] bg-white text-[#9aa5b1]'
                  : 'border-[#c49a6c] bg-white text-[#8b5e34] hover:bg-[#f7efe4]',
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
