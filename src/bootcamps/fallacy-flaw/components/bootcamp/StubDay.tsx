import { DayHeader } from './DayHeader';
import { BootcampProgress } from './BootcampProgress';
import { getDay } from '../../content/bootcamp/days';
import type { DayId } from '../../lib/store';

/**
 * Placeholder shell for any bootcamp day past Day 01.
 */
export function StubDay({
  id,
  onSelectDay,
}: {
  id: DayId;
  onSelectDay?: (day: DayId) => void;
}) {
  const day = getDay(id);
  return (
    <>
      <DayHeader day={day} />
      <div className="mx-auto max-w-6xl border-b border-rule px-6 py-4">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress currentDay={id} onSelectDay={onSelectDay} />
      </div>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="protocol text-ink-mute">Build status</div>
        <h2 className="mt-2 display-title text-4xl text-ink">
          Coming after Day 01 sign-off.
        </h2>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-soft">
          This day&apos;s lesson, mid-day reps, and end-of-day calibration
          land once Day 01 is approved. The structure is locked: same chrome,
          same coach voice, same calibration-not-gatekeeping verdict screen.
          Outcome and runtime are visible above so you can audit the path.
        </p>
        <p className="mt-4 max-w-prose protocol text-ink-mute">
          Want a peek at how a finished day reads?
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onSelectDay?.(1)}
            className="protocol inline-flex items-center border border-ink bg-ink px-4 py-2 text-xs text-paper transition-colors hover:bg-ink-soft"
          >
            Open Day 01 →
          </button>
          <button
            type="button"
            onClick={() => onSelectDay?.(undefined as unknown as DayId)}
            className="protocol inline-flex items-center border border-rule bg-paper px-4 py-2 text-xs text-ink transition-colors hover:border-ink hover:bg-paper-bright"
          >
            Back to bootcamp home
          </button>
        </div>
      </section>
    </>
  );
}
