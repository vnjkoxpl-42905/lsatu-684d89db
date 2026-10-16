import type { BootcampDay } from '../../content/bootcamp/days';

/**
 * Page-top chrome for a single bootcamp day.
 * Editorial-print: numeral runs as oversized italic, title sits to the right,
 * subtitle in mono protocol, est-time and outcome in the right-rail.
 */
export function DayHeader({ day }: { day: BootcampDay }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-end gap-6 px-6 py-10 md:grid-cols-[auto_1fr_auto]">
        <div className="display-title text-7xl italic text-ink-mute md:text-8xl">
          {day.numeral.replace('DAY ', '')}
        </div>
        <div>
          <div className="protocol text-ink-mute">{day.numeral}</div>
          <h1 className="mt-1 display-title text-4xl text-ink md:text-5xl">
            {day.title}
          </h1>
          <p className="mt-2 protocol text-ink-soft">{day.subtitle}</p>
        </div>
        <aside className="border-t border-rule-soft pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div className="protocol text-ink-mute">Today</div>
          <p className="mt-1 max-w-[24ch] text-sm leading-snug text-ink-soft">
            {day.outcome}
          </p>
          <p className="mt-3 protocol text-ink-mute">
            est. {day.estMinutes} min
          </p>
        </aside>
      </div>
    </header>
  );
}
