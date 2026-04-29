/* =========================================================================
   Structure Bootcamp · Simulator
   Final module — 6 PT-format Main Conclusion questions with rich Coach's
   Note feedback, trait-tagged wrong answers, re-attempt with hindsight,
   and a session summary that surfaces the trap-trait breakdown.
   ========================================================================= */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIM_QUESTIONS, TRAITS, TRAIT_NAMES } from './data';
import type { Question } from './data';

interface Attempt { q_id: string; picked: string; correct: boolean; trait_tag: number | null; }

export function Simulator({ onComplete, isCompleted }: { onComplete: () => void; isCompleted: boolean }) {
  const [pool] = useState<Question[]>(() => [...SIM_QUESTIONS].sort(() => Math.random() - 0.5));
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [done, setDone] = useState(false);
  const [redoMode, setRedoMode] = useState(false);
  const [redoPicked, setRedoPicked] = useState<string | null>(null);

  const q = pool[cursor];

  function handleSubmit() {
    if (!picked || revealed) return;
    const isCorrect = picked === q.correct_letter;
    const traitTag = !isCorrect ? (q.trait_tags[picked] ?? null) : null;
    setAttempts(prev => [...prev, { q_id: q.id, picked, correct: isCorrect, trait_tag: traitTag }]);
    setRevealed(true);
  }

  function handleNext() {
    if (cursor + 1 >= pool.length) { setDone(true); onComplete(); return; }
    setCursor(c => c + 1);
    setPicked(null);
    setRevealed(false);
    setRedoMode(false);
    setRedoPicked(null);
  }

  function handleRedo() { setRedoMode(true); setRedoPicked(null); }
  function handleRedoPick(letter: string) {
    setRedoPicked(letter);
    if (letter === q.correct_letter) setTimeout(handleNext, 600);
  }

  function restart() {
    setCursor(0); setPicked(null); setRevealed(false);
    setAttempts([]); setDone(false); setRedoMode(false); setRedoPicked(null);
  }

  if (done) return <SessionSummary attempts={attempts} onRestart={restart} isCompleted={isCompleted} />;

  const isCorrect = revealed && picked === q.correct_letter;
  const traitTag = revealed && picked !== q.correct_letter ? q.trait_tags[picked!] : null;

  return (
    <div className="space-y-4">
      {/* Top progress strip */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
        <span>Question {cursor + 1} / {pool.length} · {q.ref}</span>
        <span>{q.structure_family.replace('-', ' ')}</span>
      </div>
      <div className="h-1 bg-accent rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-amber-500 rounded-full"
          initial={false}
          animate={{ width: `${((cursor + (revealed ? 1 : 0)) / pool.length) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Stimulus */}
      <div className="rounded-xl border border-border bg-card p-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium block mb-3">Stimulus</span>
        <p className="text-sm text-foreground leading-relaxed italic">{q.stimulus}</p>
      </div>

      {/* Stem */}
      <p className="text-sm font-semibold text-foreground px-1">{q.stem}</p>

      {/* Choices */}
      <div className="space-y-2">
        {q.choices.map(c => {
          const isSelected = !revealed && picked === c.letter;
          const isCorrectChoice = revealed && c.letter === q.correct_letter;
          const isWrongPick = revealed && c.letter === picked && picked !== q.correct_letter;
          const redoCorrect = redoMode && redoPicked === c.letter && c.letter === q.correct_letter;
          const redoWrong = redoMode && redoPicked === c.letter && c.letter !== q.correct_letter;
          const interactive = !revealed || redoMode;

          return (
            <motion.button
              key={c.letter}
              onClick={() => {
                if (revealed && !redoMode) return;
                if (redoMode) { handleRedoPick(c.letter); return; }
                setPicked(c.letter);
              }}
              whileHover={interactive ? { x: 2 } : undefined}
              className={cn(
                'w-full text-left rounded-lg border p-4 flex gap-3 items-start transition-colors',
                isSelected && 'border-amber-500/40 bg-amber-500/5',
                isCorrectChoice && 'border-emerald-500/40 bg-emerald-500/5',
                isWrongPick && 'border-red-500/30 bg-red-500/5',
                redoCorrect && 'border-emerald-500/40 bg-emerald-500/5',
                redoWrong && 'border-red-500/30 bg-red-500/5',
                !isSelected && !isCorrectChoice && !isWrongPick && !redoCorrect && !redoWrong && 'border-border bg-card hover:bg-accent/30',
              )}
            >
              <span className={cn(
                'font-mono text-xs font-bold mt-0.5 min-w-[18px]',
                isCorrectChoice || redoCorrect ? 'text-emerald-400' : isWrongPick || redoWrong ? 'text-red-400' : 'text-muted-foreground',
              )}>{c.letter}</span>
              <span className="text-sm text-foreground leading-relaxed flex-1">{c.text}</span>
              {isCorrectChoice && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
              {isWrongPick && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {traitTag && <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">Trait {traitTag}</span>}
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={!picked}
          className="w-full rounded-lg bg-foreground text-background text-sm font-semibold py-3 hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Submit answer
        </button>
      ) : (
        <div className="flex gap-2">
          {!isCorrect && !redoMode && (
            <button onClick={handleRedo} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Re-attempt with explanation visible
            </button>
          )}
          {(!redoMode || isCorrect) && (
            <button onClick={handleNext} className="flex-1 rounded-lg bg-foreground text-background text-sm font-semibold py-2.5 hover:bg-foreground/90 transition-colors">
              {cursor + 1 < pool.length ? 'Next question →' : 'Finish bootcamp →'}
            </button>
          )}
        </div>
      )}

      {/* Coach's Note */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4 shadow-[0_0_28px_rgba(245,158,11,0.06)]"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold">Coach's Note</span>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Structure map</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.coach.structure_map}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Core move</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.coach.core_move}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Per-answer audit</p>
                <div className="space-y-2">
                  {q.coach.audit.map(a => (
                    <div key={a.letter} className={cn('flex gap-3 rounded-lg p-3 text-sm', a.correct ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-card border border-border')}>
                      <span className={cn('font-mono text-xs font-bold min-w-[14px]', a.correct ? 'text-emerald-400' : 'text-muted-foreground')}>{a.letter}</span>
                      <div className="flex-1 space-y-0.5">
                        {a.verdict && <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold block">{a.verdict}</span>}
                        <p className={cn('leading-relaxed', a.correct ? 'text-emerald-300' : 'text-muted-foreground')}>{a.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── SessionSummary — the Coach's Note finale ─────────────────────────── */
function SessionSummary({ attempts, onRestart, isCompleted }: { attempts: Attempt[]; onRestart: () => void; isCompleted: boolean }) {
  const correct = attempts.filter(a => a.correct).length;
  const traitMisses: Record<number, number> = {};
  attempts.forEach(a => { if (!a.correct && a.trait_tag) traitMisses[a.trait_tag] = (traitMisses[a.trait_tag] || 0) + 1; });
  const sorted = Object.entries(traitMisses).sort((a, b) => b[1] - a[1]);

  const score = correct / attempts.length;
  const headline =
    score === 1 ? 'Flawless run.' :
    score >= 0.8 ? "You've got the method." :
    score >= 0.5 ? 'Solid foundation. The traps below are your next focus.' :
    'Worth replaying. The trap breakdown below shows exactly what to drill.';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-8 text-center space-y-3 shadow-[0_0_40px_rgba(245,158,11,0.08)]"
      >
        <Award className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-bold">Bootcamp Complete</p>
        <p className="text-4xl font-bold text-foreground tracking-tight">{correct}/{attempts.length}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{headline}</p>
      </motion.div>

      {/* Trap breakdown */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Your trap profile</span>
          {sorted.map(([tn, count]) => {
            const trait = TRAITS.find(t => t.n === Number(tn));
            return (
              <div key={tn} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Trait {tn} — {TRAIT_NAMES[Number(tn)]}</span>
                  <span className="text-xs text-amber-400 font-mono">{count}× missed</span>
                </div>
                {trait && <p className="text-xs text-muted-foreground leading-relaxed">{trait.defense}</p>}
              </div>
            );
          })}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-sm text-emerald-400 font-semibold">Clean session — no traps caught you.</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onRestart} className="flex-1 rounded-lg border border-border bg-card text-sm font-semibold py-3 text-foreground hover:bg-accent/30 transition-colors">
          Replay session
        </button>
        {!isCompleted && (
          <span className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-semibold py-3 text-emerald-400 text-center">
            ✓ Bootcamp completed
          </span>
        )}
      </div>
    </div>
  );
}
