import { Progress } from "@/components/ui/progress";

interface ProgressHeaderProps {
  title: string;
  current: number; // 1-based
  total: number;
}

/** Slim header: activity title, item counter, emerald progress bar. */
export function ProgressHeader({ title, current, total }: ProgressHeaderProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground/80">{title}</span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          Q{current} of {total}
        </span>
      </div>
      <Progress value={pct} className="ac-progress h-1.5 bg-[hsl(var(--muted))]" />
    </div>
  );
}
