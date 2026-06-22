import type { BootcampDef } from '@/lib/bootcamps';

/**
 * Preview for a bootcamp card. We attempted a live scaled mount of the actual
 * bootcamp app, but full bootcamp pages render viewport-fixed / portaled layers
 * (e.g. a full-screen dark backdrop) that escape a scaled, clipped box and
 * pollute the page. So previews use a styled static cover in the guided-drill
 * launch language; the real bootcamp is one click away via Open (inline).
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
  return (
    <div
      className={
        'relative flex aspect-[4/3] w-full overflow-hidden rounded border border-black/10 bg-[#f3efe7] ' +
        (className ?? '')
      }
      aria-hidden
    >
      <div className="flex flex-1 flex-col justify-between p-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-black/40">Bootcamp</span>
        <h3 className="font-serif text-2xl leading-tight text-black/90">{bootcamp.title}</h3>
        <span className="text-[11px] text-black/50">{bootcamp.description}</span>
      </div>
      <div className="m-3 flex w-2/5 shrink-0 flex-col justify-between bg-black p-3 text-white">
        <span className="font-serif text-base italic leading-tight">
          Open
          <br />
          Bootcamp →
        </span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-white/50">Click open to launch</span>
      </div>
    </div>
  );
}

export default BootcampCardPreview;
