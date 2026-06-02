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
  userName = 'Student',
}: {
  title: string;
  questions: CanonicalStructureQuestion[];
  onComplete?: () => void;
  userName?: string;
}) {
  const [screen, setScreen] = useState<'home' | 'briefing' | 'drill' | 'finish'>('home');
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const [isScanning, setIsScanning] = useState(false);

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
        '> ANALYSIS VALID.',
        `> GOOD EYE, ${userName.toUpperCase()}.`,
        `> ${current.revealExplanation.replace(/^Correct\.?\s*/i, '')}`,
      ];
    }

    if (status === 'wrong') {
      return ['> MISMATCH. RE-ANALYZING PIVOT CLUES...', `> ${current.hint}`];
    }

    return [`> ${userName.toUpperCase()}, TAP THE CONCLUSION SENTENCE`];
  }, [current.hint, current.revealExplanation, status, userName]);

  function analyzeSelection() {
    if (selectedIndex == null || isScanning) return;
    setIsScanning(true);

    window.setTimeout(() => {
      setStatus(selectedIndex === current.correctMainConclusionIndex ? 'correct' : 'wrong');
      setIsScanning(false);
    }, 1000);
  }

  function selectChunk(chunkIndex: number) {
    if (status === 'correct') return;
    setSelectedIndex(chunkIndex);
    if (status === 'wrong') setStatus('idle');
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

  function showBriefing() {
    setScreen('briefing');
  }

  function startDrill() {
    setScreen('drill');
  }

  if (screen === 'home') {
    return (
      <section
        className="relative overflow-hidden rounded-[30px] border border-[#16334d] bg-[#0c1626] px-5 py-6 text-white shadow-[0_22px_60px_rgba(5,10,25,0.35)] md:px-8 md:py-8"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(circle at top, rgba(33,198,255,0.08), transparent 32%)',
          backgroundSize: '24px 24px, 24px 24px, 100% 100%',
        }}
      >
        <div className="mx-auto flex w-full max-w-[600px] flex-col items-center text-center">
          <div className="text-[4rem] leading-none text-[#1ec8ff] [text-shadow:0_0_20px_rgba(30,200,255,0.8)]">🎯</div>
          <h1 className="mt-5 font-mc-mono text-[2.2rem] uppercase tracking-[0.12em] text-[#1ec8ff]">
            Main Conclusion Drill
          </h1>
          <p className="mt-3 text-[17px] text-[#94a3b8]">Master logical structure and identify main points.</p>
          <div className="mt-8 w-full max-w-[320px] rounded-[12px] border-2 border-[#1ec8ff] bg-black/60 px-5 py-[18px] font-mc-mono text-[1.05rem] uppercase tracking-[0.18em] text-white">
            {userName}
          </div>
          <button
            type="button"
            onClick={showBriefing}
            className="mt-8 w-full max-w-[600px] rounded-[14px] border border-[#1ec8ff] bg-transparent px-6 py-5 font-mc-mono text-[1.2rem] uppercase tracking-[0.18em] text-[#1ec8ff] transition-colors hover:bg-[#1ec8ff] hover:text-black"
          >
            Initialize Drill
          </button>
        </div>
      </section>
    );
  }

  if (screen === 'briefing') {
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
          <div className="rounded-[20px] border border-[#1ec8ff] bg-[rgba(30,41,59,0.7)] p-8 md:p-10">
            <h2 className="font-mc-mono text-[1.5rem] uppercase tracking-[0.12em] text-[#1ec8ff]">
              {`Welcome, ${userName.toUpperCase()}`}
            </h2>
            <p className="mb-5 mt-3 border-b border-[#1ec8ff]/15 pb-[10px] text-[#94a3b8]">DIRECTIONS &amp; PROTOCOL</p>
            <ul className="my-6 space-y-5 text-left">
              <li className="flex items-start gap-[15px] leading-[1.5]">
                <span className="rounded-[10px] border border-[#06b6d426] bg-[#06b6d41a] p-[10px] text-[1.4rem]">🔍</span>
                <span><strong>Find the Conclusion:</strong> Read the argument and find the author's primary claim.</span>
              </li>
              <li className="flex items-start gap-[15px] leading-[1.5]">
                <span className="rounded-[10px] border border-[#06b6d426] bg-[#06b6d41a] p-[10px] text-[1.4rem]">👆</span>
                <span><strong>Tap to Select:</strong> Tap the exact sentence you think is the conclusion. It will glow blue.</span>
              </li>
              <li className="flex items-start gap-[15px] leading-[1.5]">
                <span className="rounded-[10px] border border-[#06b6d426] bg-[#06b6d41a] p-[10px] text-[1.4rem]">⚙️</span>
                <span><strong>Analyze:</strong> Hit the button to verify. If wrong, the drill will highlight pivot clues to help you.</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={startDrill}
              className="mt-4 w-full rounded-[14px] border border-[#1ec8ff] bg-transparent px-6 py-5 font-mc-mono text-[1.2rem] uppercase tracking-[0.18em] text-[#1ec8ff] transition-colors hover:bg-[#1ec8ff] hover:text-black"
            >
              Start Drill
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (screen === 'finish') {
    return (
      <section
        className="relative overflow-hidden rounded-[30px] border border-[#16334d] bg-[#0c1626] px-5 py-6 text-white shadow-[0_22px_60px_rgba(5,10,25,0.35)] md:px-8 md:py-8"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(circle at top, rgba(33,198,255,0.08), transparent 32%)',
          backgroundSize: '24px 24px, 24px 24px, 100% 100%',
        }}
      >
        <div className="mx-auto mt-[10vh] flex w-full max-w-[760px] flex-col items-center text-center">
          <div className="text-[5rem] leading-none [text-shadow:0_0_30px_#10b981]">🏆</div>
          <h2 className="my-6 font-mc-mono text-[2rem] uppercase tracking-[0.12em] text-[#10b981]">
            {`System Clear: ${userName.toUpperCase()}`}
          </h2>
          <p className="text-[1.1rem] text-[#94a3b8]">All 20 questions complete. Final verification code:</p>
          <div className="mt-8 w-full rounded-[18px] border-2 border-dashed border-[#10b981] bg-[rgba(16,185,129,0.05)] px-6 py-8 font-mc-mono text-[2rem] uppercase tracking-[0.18em] text-[#10b981]">
            #LOGIC_MASTER_2026
          </div>
        </div>
      </section>
    );
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
          <p className="text-[#1ec8ff]">Drill_Active</p>
          <span className="shrink-0 text-[#94a3b8]">{formatCounter(index, questions.length)}</span>
        </div>

        <div className="mt-5 h-[6px] overflow-hidden rounded-full bg-[#2a3a4e]">
          <div
            className="h-full rounded-full bg-[#1ec8ff] shadow-[0_0_16px_rgba(30,200,255,0.45)] transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        <p className="mb-[10px] mt-5 font-mc-mono text-[0.85rem] text-[#94a3b8]">{feedbackContent[0]}</p>

        <div
          className="relative mt-3 overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(30,41,59,0.7)] px-7 py-7 text-[1.15rem] leading-[1.8] shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] md:px-8"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div
            className={cn(
              'pointer-events-none absolute left-0 top-0 h-1 w-full bg-[#06b6d4] opacity-0 shadow-[0_0_20px_#06b6d4]',
              isScanning && 'opacity-100',
            )}
            style={isScanning ? { animation: 'scan 1s linear' } : undefined}
          />
          <p className="mb-5 font-mc-mono text-[12px] uppercase tracking-[0.16em] text-[#7892ad]">
            Stimulus
          </p>
          <p className="text-[20px] leading-[1.75] text-[#e5edf8] md:text-[21px]">
            {current.chunks.map((chunk, chunkIndex) => {
              const isSelected = selectedIndex === chunkIndex;
              const isCorrectSelection = status === 'correct' && chunkIndex === current.correctMainConclusionIndex;
              const shouldShowHintClues = status === 'wrong' && chunkIndex === highlightedWrongChunkIndex;
              const html = shouldShowHintClues ? highlightHintPhrases(chunk, current.hint) : escapeHtml(chunk);

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
            (status === 'wrong' || status === 'correct') && 'block',
            feedbackTone,
          )}
        >
          {feedbackContent.map((line, lineIndex) => (
            <p key={`${status}-${lineIndex}`}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
