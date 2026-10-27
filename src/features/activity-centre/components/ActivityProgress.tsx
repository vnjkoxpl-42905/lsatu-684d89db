interface ActivityProgressProps {
  completed: number;
  total: number;
  variant?: "practice" | "relationship";
}

/** Progress counts resolved questions, including revealed or ungraded answers. */
export function ActivityProgress({ completed, total, variant = "practice" }: ActivityProgressProps) {
  const count = Math.min(Math.max(0, completed), Math.max(0, total));
  const percent = total > 0 ? Math.round(Math.min(1, Math.max(0, completed / total)) * 100) : 0;
  return <div className={variant === "relationship" ? "relationship-progress" : "px-5 pt-6 md:px-12"}>
    <p className="mb-2 text-sm font-medium tabular-nums text-[hsl(var(--aw-ink,var(--foreground)))]">{variant === "relationship" ? `${count} of ${total} completed` : `${percent}% complete`}</p>
    <div role="progressbar" aria-label="Practice progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={`${count} of ${total} questions completed`}
      className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--aw-ink,var(--foreground))/0.14)]">
      <div className="h-full rounded-full bg-[hsl(var(--aw-accent,var(--ac-emerald)))] transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${percent}%` }} />
    </div>
  </div>;
}
