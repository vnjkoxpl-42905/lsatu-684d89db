import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { DrillVerdict } from '@/bootcamps/main-conclusion/components/DrillVerdict';
import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export function MainConclusionReplicaTemplate({
  title,
  questions,
  onComplete,
  userName = 'Student',
}: {
  title: string;
  questions: CanonicalStructureQuestion[];
  onComplete?: () => void;
  userName?: string;
}) {
  const [screen, setScreen] = useState<'drill' | 'finish'>('drill');
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct'>('idle');
  // Questions where the student missed at least once before landing the answer.
  // Used to score the verdict on first-try accuracy (you must answer correctly
  // to advance, so completion alone is not a meaningful score).
  const [missedIds, setMissedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scanDuration, setScanDuration] = useState(1000);
  const scanTimeoutRef = useRef<number | null>(null);
  const analysisTimeoutRef = useRef<number | null>(null);

  const current = questions[index]!;
  const isLast = index === questions.length - 1;

  const progressWidth = `${(index / questions.length) * 100}%`;

  const feedbackTone =
    status === 'correct'
      ? 'border-[#10b981] bg-black text-[#10b981]'
      : status === 'wrong'
        ? 'border-[#ef4444] bg-black text-[#ef4444]'
        : 'border-[#06b6d4] bg-black text-[#94a3b8]';

  const terminalContent = useMemo(() => {
    if (status === 'correct') {
      return [
        '> ANALYSIS VALID.',
        `> GOOD EYE, ${userName.toUpperCase()}.`,
        `> ${current.hint}`,
      ];
    }

    if (status === 'wrong') {
      return ['> MISMATCH. RE-ANALYZING PIVOT CLUES...', `> ${current.hint}`];
    }

    return [];
  }, [current.hint, current.revealExplanation, status, userName]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) window.clearTimeout(scanTimeoutRef.current);
      if (analysisTimeoutRef.current) window.clearTimeout(analysisTimeoutRef.current);
    };
  }, []);

  function triggerScan(duration: number) {
    if (scanTimeoutRef.current) window.clearTimeout(scanTimeoutRef.current);
    setScanDuration(duration);
    setIsScanning(true);
    scanTimeoutRef.current = window.setTimeout(() => {
      setIsScanning(false);
      scanTimeoutRef.current = null;
    }, duration);
  }

  function analyzeSelection() {
    if (selectedIndex == null || isScanning) return;
    triggerScan(1000);

    if (analysisTimeoutRef.current) window.clearTimeout(analysisTimeoutRef.current);
    analysisTimeoutRef.current = window.setTimeout(() => {
      const isCorrect = selectedIndex === current.correctMainConclusionIndex;
      if (!isCorrect) {
        setMissedIds((prev) => {
          if (prev.has(current.id)) return prev;
          const next = new Set(prev);
          next.add(current.id);
          return next;
        });
      }
      setStatus(isCorrect ? 'correct' : 'wrong');
      analysisTimeoutRef.current = null;
    }, 1000);
  }

  function selectChunk(chunkIndex: number) {
    if (status === 'correct') return;
    setSelectedIndex(chunkIndex);
    if (status === 'wrong') setStatus('idle');
    triggerScan(350);
  }

  function handleChunkKeyDown(event: React.KeyboardEvent<HTMLSpanElement>, chunkIndex: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectChunk(chunkIndex);
  }

  function nextQuestion() {
    if (isLast) {
      setScreen('finish');
      onComplete?.();
      return;
    }

    setIndex((value) => value + 1);
    setSelectedIndex(null);
    setStatus('idle');
  }

  function restart() {
    setScreen('drill');
    setIndex(0);
    setSelectedIndex(null);
    setStatus('idle');
    setMissedIds(new Set());
  }

  if (screen === 'finish') {
    const firstTryCorrect = questions.length - missedIds.size;
    const items = questions.map((q) => ({
      id: q.id,
      ok: !missedIds.has(q.id),
      prompt: q.chunks[q.correctMainConclusionIndex] ?? q.chunks.join(' '),
    }));
    return (
      <DrillVerdict
        label={title}
        correct={firstTryCorrect}
        total={questions.length}
        calibrationThreshold={0.8}
        calibratedLead="You are finding the main conclusion on the first read. That is the move every Logical Reasoning question is built on, and you can now do it under pressure."
        repeatLead="You landed every answer, but several took more than one pass. Re-run the set and trust your first read more. The items you missed below are where the pivot language fooled you."
        nextStep="Next: return to the path and carry this into timed practice."
        items={items}
        onRerun={restart}
      />
    );
  }

  return (
    <section className="mx-auto mt-5 flex w-full max-w-[600px] flex-col gap-5 text-white">
      <style>{`
        @keyframes mc-scan-line {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(var(--scan-distance, 280px)); opacity: 1; }
        }
      `}</style>
      <div className="w-full">
        <div className="mb-[10px] flex items-center justify-between gap-4 border-b border-[#06b6d426] pb-[10px] font-mc-mono text-[13px] uppercase tracking-[0.22em]">
          <p className="text-[#1ec8ff]">Drill_Active</p>
          <span className="shrink-0 text-[#94a3b8]">{formatCounter(index, questions.length)}</span>
        </div>

        <div className="mb-5 h-[6px] overflow-hidden rounded-[3px] bg-[rgba(255,255,255,0.1)]">
          <div
            className="h-full bg-[#06b6d4] shadow-[0_0_10px_#06b6d4] transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        <p className="mb-[10px] font-mc-mono text-[0.85rem] text-[#94a3b8]">
          {`> ${userName.toUpperCase()}, TAP THE CONCLUSION SENTENCE`}
        </p>

        <div
          className="relative overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(30,41,59,0.7)] px-7 py-7 text-[1.15rem] leading-[1.8] shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div
            className={cn(
              'pointer-events-none absolute left-0 top-0 h-1 w-full bg-[#06b6d4] opacity-0 shadow-[0_0_20px_#06b6d4]',
              isScanning && 'opacity-100',
            )}
            style={{
              ['--scan-distance' as any]: 'calc(100% - 4px)',
              animation: isScanning ? `mc-scan-line ${scanDuration}ms linear` : 'none',
              transition: 'opacity 120ms linear',
            } as React.CSSProperties}
          />
          <p className="text-[1.15rem] leading-[1.8] text-[#f8fafc]">
            {current.chunks.map((chunk, chunkIndex) => {
              const isSelected = selectedIndex === chunkIndex;
              const isCorrectSelection = status === 'correct' && chunkIndex === current.correctMainConclusionIndex;
              const html = status === 'wrong' ? highlightHintPhrases(chunk, current.hint) : escapeHtml(chunk);

              return (
                <span
                  key={`${current.id}-${chunkIndex}`}
                  role={status === 'correct' ? undefined : 'button'}
                  tabIndex={status === 'correct' ? -1 : 0}
                  onClick={() => selectChunk(chunkIndex)}
                  onKeyDown={(event) => handleChunkKeyDown(event, chunkIndex)}
                  className={cn(
                    'inline cursor-pointer rounded-[6px] border border-transparent px-[2px] py-0 align-baseline whitespace-normal transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ec8ff]/45',
                    isSelected && status !== 'correct'
                      ? 'border-[#06b6d4] bg-[rgba(6,182,212,0.15)] text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : '',
                    isCorrectSelection
                      ? 'border-[#10b981] bg-[rgba(16,185,129,0.2)] text-[#f8fafc] shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : '',
                    !isSelected && !isCorrectSelection ? 'hover:bg-white/[0.04]' : '',
                    status === 'correct' ? 'cursor-default' : 'cursor-pointer',
                  )}
                  aria-pressed={isSelected}
                >
                  <span dangerouslySetInnerHTML={{ __html: html }} />
                  {chunkIndex < current.chunks.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </p>
        </div>

        <div className="mt-4">
          {status === 'correct' ? (
            <button
              type="button"
              onClick={nextQuestion}
              className="mt-[15px] w-full rounded-[14px] border-none bg-[#06b6d4] px-6 py-5 font-mc-mono text-[1.2rem] uppercase tracking-[2px] text-black transition-colors"
            >
              NEXT QUESTION &gt;&gt;
            </button>
          ) : (
            <button
              type="button"
              onClick={analyzeSelection}
              disabled={selectedIndex == null || isScanning}
              className={cn(
                'mt-[15px] w-full rounded-[14px] border border-[#06b6d4] bg-transparent px-6 py-5 font-mc-mono text-[1.2rem] uppercase tracking-[2px] text-[#06b6d4] transition-colors',
                selectedIndex == null || isScanning
                  ? 'border-[#334155] text-[#334155] opacity-20'
                  : 'active:bg-[#06b6d4] active:text-black',
              )}
            >
              ANALYZE SELECTION
            </button>
          )}
        </div>

        <div
          className={cn(
            'mt-5 hidden rounded-r-[10px] rounded-bl-[0] rounded-tl-[0] border-l-4 bg-black px-[18px] py-[18px] font-mc-mono text-[0.95rem] leading-[1.5]',
            terminalContent.length > 0 && 'block',
            feedbackTone,
          )}
        >
          {terminalContent.map((line, lineIndex) => (
            <p key={`${status}-${lineIndex}`}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
