import type { BootcampDef } from '@/lib/bootcamps';

/**
 * Preview for a bootcamp card. We attempted a live scaled mount of the actual
 * bootcamp app, but full bootcamp pages render viewport-fixed / portaled layers
 * (e.g. a full-screen dark backdrop) that escape a scaled, clipped box and
 * pollute the page. So previews use a styled static cover — but each cover is
 * themed to mirror its bootcamp's real visual identity (dark zinc/emerald,
 * cream editorial, neo-brutalist yellow, …) so the catalog reads as five
 * distinct products rather than one template recolored. The real bootcamp is
 * one click away via Open (inline).
 *
 * `live` is accepted for API parity with the views engine but intentionally
 * unused — there is no safe live mode for these full-screen apps.
 */
export function BootcampCardPreview({
  bootcamp,
  className,
}: {
  bootcamp: BootcampDef;
  live?: boolean;
  className?: string;
}) {
  const { theme, title, description } = bootcamp;
  const base =
    'relative flex aspect-[4/3] w-full overflow-hidden border ' + (className ?? '');

  if (theme.style === 'brutalist') {
    // Neo-brutalist: electric color band, hard black border, heavy uppercase
    // sans, offset shadow. Mirrors the Abstract bootcamp shell.
    return (
      <div
        className={base + ' @container rounded-none border-2 flex-col'}
        style={{ background: theme.bg, borderColor: theme.ink, color: theme.ink }}
        aria-hidden
      >
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: theme.accent, color: theme.accentInk, borderBottom: `2px solid ${theme.ink}` }}
        >
          <span className="font-sans text-[9px] font-extrabold uppercase tracking-[0.18em]">Bootcamp</span>
          <span className="font-sans text-[9px] font-extrabold uppercase tracking-[0.18em]">7 modules</span>
        </div>
        <div className="flex flex-1 flex-col justify-between p-4">
          <h3 className="font-sans text-2xl font-black uppercase leading-[0.95] tracking-tight">
            {title}
          </h3>
          {bootcamp.outline && (
            <ol className="my-3 hidden min-h-0 flex-1 list-none flex-col justify-center gap-1 overflow-hidden p-0 @[340px]:flex">
              {bootcamp.outline.map((name, i) => (
                <li key={name} className="flex items-center gap-2 font-sans text-[11px] font-bold">
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[9px] font-black"
                    style={{ background: theme.ink, color: theme.bg }}
                  >
                    {i + 1}
                  </span>
                  {name}
                </li>
              ))}
            </ol>
          )}
          <p className="line-clamp-2 text-[11px] font-medium" style={{ color: theme.inkSoft }}>
            {description}
          </p>
          <span
            className="mt-2 inline-flex w-fit items-center gap-1.5 px-2.5 py-1 font-sans text-[10px] font-extrabold uppercase tracking-wider"
            style={{ background: theme.ink, color: theme.bg }}
          >
            Open module →
          </span>
        </div>
      </div>
    );
  }

  if (theme.style === 'dark') {
    const accentStyle = theme.accentAlt
      ? { background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentAlt})`, color: theme.accentInk }
      : { background: theme.accent, color: theme.accentInk };

    // Dark control-room: low-light background, accent hairline + glow chip.
    return (
      <div
        className={base + ' rounded border-white/10 flex-col justify-between p-4'}
        style={{ background: theme.bg, color: theme.ink }}
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: theme.inkSoft }}>
            Bootcamp
          </span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: theme.accentAlt ?? theme.accent, boxShadow: `0 0 10px ${theme.accentAlt ?? theme.accent}` }}
          />
        </div>
        <h3 className="font-serif text-2xl leading-tight">{title}</h3>
        <div>
          <div
            className="mb-2 h-px w-10"
            style={{ background: theme.accentAlt ? `linear-gradient(90deg, ${theme.accent}, ${theme.accentAlt})` : theme.accent }}
          />
          <p className="line-clamp-2 text-[11px]" style={{ color: theme.inkSoft }}>
            {description}
          </p>
          <span
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[10px] font-semibold"
            style={accentStyle}
          >
            Open bootcamp →
          </span>
        </div>
      </div>
    );
  }

  // Editorial: cream paper, serif title, accent rule, inked launch panel.
  return (
    <div
      className={base + ' rounded border-black/10'}
      style={{ background: theme.bg, color: theme.ink }}
      aria-hidden
    >
      <div className="flex flex-1 flex-col justify-between p-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
          Bootcamp
        </span>
        <h3 className="font-serif text-2xl leading-tight">{title}</h3>
        <p className="line-clamp-2 text-[11px]" style={{ color: theme.inkSoft }}>
          {description}
        </p>
      </div>
      <div
        className="m-3 flex w-2/5 shrink-0 flex-col justify-between p-3"
        style={{ background: theme.ink, color: theme.bg }}
      >
        <span className="font-serif text-base italic leading-tight">
          Open
          <br />
          Bootcamp →
        </span>
        <span
          className="font-mono text-[8px] uppercase tracking-widest"
          style={{ color: theme.accent }}
        >
          Click open to launch
        </span>
      </div>
    </div>
  );
}

export default BootcampCardPreview;
