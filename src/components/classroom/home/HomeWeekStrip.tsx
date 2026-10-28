import type { HomeWeekDay } from "./homeModel";

/** The shared seven-day band. Empty dates never imply verified availability. */
export function HomeWeekStrip({
  days,
  range,
  onDayOpen,
  emptyLabel = "No items shown",
  description,
}: {
  days: HomeWeekDay[];
  range: string;
  onDayOpen?: () => void;
  emptyLabel?: string;
  description?: string;
}) {
  return (
    <section className="classroom-home-week" aria-label="Next seven days" data-home-reveal>
      <header className="classroom-home-week-heading">
        <h2>Next seven days</h2>
        <span className="classroom-home-week-rule" aria-hidden="true" />
        <span className="classroom-home-week-range">{range}</span>
      </header>
      {description ? <p className="classroom-home-week-description">{description}</p> : null}
      <div className="classroom-home-week-scroll" tabIndex={0} role="group" aria-label="Seven-day calendar, scroll for more dates" aria-description={description}>
        <ol className="classroom-home-days">
          {days.map((day) => {
            const label = day.label ?? emptyLabel;
            const className = `classroom-home-day${day.isToday ? " classroom-home-day-today" : ""}`;
            const content = <>
              <span className="classroom-home-day-head">
                <span className="classroom-home-day-abbr">{day.abbr}</span>
                <span className="classroom-home-day-num">{day.dayNum}</span>
              </span>
              <span className="classroom-home-day-label" title={label}>{label}</span>
            </>;
            return <li key={day.iso}>
              {onDayOpen ? <button type="button" className={className} onClick={onDayOpen} aria-current={day.isToday ? "date" : undefined}>{content}</button>
                : <div className={className} aria-current={day.isToday ? "date" : undefined}>{content}</div>}
            </li>;
          })}
        </ol>
      </div>
    </section>
  );
}
