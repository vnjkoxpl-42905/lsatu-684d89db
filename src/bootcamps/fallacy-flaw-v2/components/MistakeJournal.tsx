import { useMemo } from 'react';

type DrillStat = {
  id?: string;
  title?: string;
  attempts?: number;
  correct?: number;
  misses?: number;
};

export function MistakeJournal() {
  const entries = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('lsat_flaw_performance') || '{}');
      return Object.values(raw as Record<string, DrillStat>)
        .filter((stat) => (stat.misses ?? 0) > 0 || ((stat.attempts ?? 0) > (stat.correct ?? 0)))
        .map((stat) => ({
          title: stat.title ?? stat.id ?? 'Flaw drill',
          attempts: stat.attempts ?? 0,
          misses: stat.misses ?? Math.max(0, (stat.attempts ?? 0) - (stat.correct ?? 0)),
        }));
    } catch (error) {
      console.error('Failed to load flaw mistake journal', error);
      return [];
    }
  }, []);

  return (
    <section className="mx-auto flex h-full max-w-4xl flex-col justify-center space-y-8 overflow-y-auto py-8">
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#1a1a1a]/40">Mistake Journal</p>
        <h1 className="font-serif text-5xl italic tracking-tight">Review the misses</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#1a1a1a]/60">
          Missed flaw drills surface here from saved bootcamp performance. Use this as the shortlist for re-reading the flaw card and relaunching targeted practice.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-[#1a1a1a]/20 bg-white/60 p-8">
          <p className="font-serif text-xl italic text-[#1a1a1a]/55">No missed flaw drills logged yet.</p>
          <p className="mt-2 text-sm text-[#1a1a1a]/50">
            Once a drill records misses in local performance, this page becomes the review queue.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <article key={entry.title} className="border border-[#1a1a1a]/10 bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl italic tracking-tight">{entry.title}</h2>
                  <p className="mt-1 text-sm text-[#1a1a1a]/55">
                    {entry.misses} misses across {entry.attempts} attempts.
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B73D5A]">
                  Re-read card, then drill again
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
