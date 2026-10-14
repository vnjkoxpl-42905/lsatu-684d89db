import { Link } from 'react-router-dom';

/**
 * Dev tools. Not a room in the sidebar: these are internal instruments, reached
 * deliberately at /teacher/dev. The pages themselves still live under /admin
 * until the Phase 4 purge moves them.
 */
const TOOLS = [
  {
    to: '/admin/inspector',
    label: 'Inspector',
    blurb: 'Look at what a student actually has, as the app sees it.',
  },
  {
    to: '/admin/bootcamp-reference-lab',
    label: 'Reference lab',
    blurb: 'Working bench for bootcamp reference material.',
  },
  {
    to: '/admin/lsat-knowledge-import',
    label: 'Knowledge import',
    blurb: 'Bring question and explanation data into the platform.',
  },
];

export default function TeacherDevIndex() {
  return (
    <div className="px-5 py-6 sm:px-6">
      <div className="grid max-w-3xl gap-3">
        {TOOLS.map(({ to, label, blurb }) => (
          <Link
            key={to}
            to={to}
            className="border border-black/12 bg-white/25 px-4 py-3.5 transition hover:border-black/35"
          >
            <div className="text-[14px] font-medium">{label}</div>
            <p className="mt-1 text-[13px] text-black/50">{blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
