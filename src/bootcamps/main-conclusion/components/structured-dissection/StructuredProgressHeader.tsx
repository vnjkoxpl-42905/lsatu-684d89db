import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';

interface Props {
  currentIndex: number;
  totalQuestions: number;
  title: string;
}

export function StructuredProgressHeader({ currentIndex, totalQuestions, title }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge tone="accent" dot>
            Question {currentIndex + 1} of {totalQuestions}
          </Badge>
          <span className="font-mc-mono text-mono text-ink-faint">
            Simulator Bank
          </span>
        </div>
        <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">
          {title}
        </h2>
      </div>
    </div>
  );
}
