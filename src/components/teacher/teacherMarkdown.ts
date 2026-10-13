/**
 * The prose class for a caller outside `.classroom-root` — the teacher-side
 * composer preview and recap list.
 *
 * Deliberately not `prose prose-sm prose-invert`. `@tailwindcss/typography` is
 * in package.json but is NOT registered in `tailwind.config.ts`, so every
 * `prose*` class in this codebase generates nothing: measured 2026-09-09 in the
 * browser, zero `.prose` rules exist in the app's stylesheets, and a rendered
 * `<h2>` computed to the inherited body colour at 16px — the same as a
 * paragraph. Arbitrary variants are core Tailwind and actually emit.
 */
export const TEACHER_MARKDOWN_CLASS = [
  "text-sm leading-relaxed text-zinc-300",
  "[&_p]:mb-2 [&_p:last-child]:mb-0",
  "[&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-zinc-100",
  "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-zinc-200",
  "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mb-1 [&_li.classroom-prose-task]:list-none [&_li.classroom-prose-task]:-ml-5",
  "[&_li.classroom-prose-task]:flex [&_li.classroom-prose-task]:gap-2",
  "[&_.classroom-prose-task-box]:mt-0.5 [&_.classroom-prose-task-box]:h-4 [&_.classroom-prose-task-box]:w-4",
  "[&_.classroom-prose-task-box]:shrink-0 [&_.classroom-prose-task-box]:rounded-sm",
  "[&_.classroom-prose-task-box]:border [&_.classroom-prose-task-box]:border-zinc-600",
  "[&_.classroom-prose-task-box]:text-[10px] [&_.classroom-prose-task-box]:leading-4",
  "[&_.classroom-prose-task-box]:text-center [&_.classroom-prose-task-box]:text-zinc-200",
  "[&_strong]:font-semibold [&_strong]:text-zinc-100",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3",
  "[&_a]:text-amber-300 [&_a]:underline [&_a]:underline-offset-2",
].join(" ");
