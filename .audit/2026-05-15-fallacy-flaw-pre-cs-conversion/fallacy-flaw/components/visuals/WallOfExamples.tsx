import { catalog } from '../../content/note-2-catalog';
import { groupMeta } from '../../lib/tokens';

export function WallOfExamples() {
  return (
    <section className="my-12">
      <header className="border-b border-rule pb-3">
        <div className="protocol text-ink-mute">Reference</div>
        <h3 className="display-title text-2xl text-ink">Wall of Examples · 15 worked stimuli</h3>
      </header>
      <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {catalog.map((c) => {
          const meta = groupMeta[c.group];
          return (
            <li
              key={c.slug}
              className="border border-rule bg-paper-bright/40 p-4"
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="protocol text-[0.65rem]"
                  style={{ color: meta.color }}
                >
                  {meta.short}
                </span>
                <span className="protocol text-[0.65rem] text-ink-mute">
                  {String(c.number).padStart(2, '0')}
                </span>
              </div>
              <h4 className="mt-1 display-title text-base text-ink">{c.name}</h4>
              <p className="mt-2 line-clamp-4 text-xs italic leading-relaxed text-ink-soft">
                {c.workedExample}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
