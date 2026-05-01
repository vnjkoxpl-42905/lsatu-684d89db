import { Link } from 'react-router-dom';
import lessons from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

interface LessonRow {
  id: string;
  number: string;
  title: string;
}

export function LessonsIndex(): JSX.Element {
  const { progress } = useModuleProgress();
  const all = lessons as LessonRow[];

  return (
    <div className="px-6 py-10 desktop:px-12 desktop:py-14 max-w-[840px] mx-auto">
      <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">Module 1</div>
      <h1 className="font-mc-serif text-display font-semibold mt-2">Lessons</h1>
      <p className="font-mc-serif text-body-prose mt-3 text-ink-soft">
        12 voice-led lessons + capstone calibration. Voice register 2 (whimsical) for prose;
        register 1 (decisive) for callouts. Every lesson cites its source file.
      </p>

      <ul className="mt-10 divide-y divide-[rgb(var(--border)/0.08)]">
        {all.map((l) => {
          const completed = progress?.completed_lessons.includes(l.id) ?? false;
          const unlocked = progress?.unlocked_routes.includes(`/lessons/${l.number}`) ?? false;
          return (
            <li key={l.id} className="py-4">
              <Link
                to={`/lessons/${l.number}`}
                className={[
                  'flex items-baseline justify-between gap-4 group',
                  unlocked ? 'hover:text-mc-accent' : 'opacity-40 cursor-not-allowed pointer-events-none',
                ].join(' ')}
              >
                <span className="font-mc-mono text-mono text-ink-faint shrink-0 w-12">{l.number}</span>
                <span className="font-mc-serif text-h3 grow">{l.title}</span>
                <span className="font-mc-mono text-mono text-ink-faint shrink-0">
                  {completed ? '✓' : unlocked ? '→' : '🔒'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-12 font-mc-mono text-mono text-ink-faint">
        Per pedagogical-flow rule: lesson 1.13 capstone is the calibration drill —
        post-instruction, never cold-test.
      </p>
    </div>
  );
}
