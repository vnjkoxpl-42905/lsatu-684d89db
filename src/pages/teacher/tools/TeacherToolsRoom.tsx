import { Link } from 'react-router-dom';
import { BookOpenText, ChevronRight, type LucideIcon } from 'lucide-react';
import { RC_LIBRARY_PATH } from '@/features/reading-center/lib/routes';

type Tool = { to: string; title: string; blurb: string; Icon: LucideIcon };

/**
 * The Tools room: standalone utilities that are not part of the teaching
 * workflow rooms. Add a tool by adding a row here and its routes under
 * /teacher/tools/ in App.tsx.
 */
const TOOLS: Tool[] = [
  {
    to: RC_LIBRARY_PATH,
    title: 'Reading Center',
    blurb: 'Speed reading for articles: five reading modes, bookmarks and speed stats.',
    Icon: BookOpenText,
  },
];

export default function TeacherToolsRoom() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-6">
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Tools</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ to, title, blurb, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col border border-black/12 bg-white/25 p-4 transition hover:border-black/35 hover:bg-white/40"
          >
            <div className="flex items-center gap-2.5">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-sm font-semibold">{title}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-black/35 transition group-hover:text-black" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-xs leading-5 text-black/55">{blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
