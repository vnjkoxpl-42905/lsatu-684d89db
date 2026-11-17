// Adapted from the Origin UI Progress Stepper pattern (MIT).
export interface SectionProgressStep {
  label: string;
  answered?: number;
  total: number;
  submitted?: boolean;
}

export function SectionProgressStepper({
  steps,
  currentIndex,
}: {
  steps: readonly SectionProgressStep[];
  currentIndex: number;
}) {
  return (
    <ol aria-label="Section progress" className="m-0 flex w-full max-w-[300px] list-none gap-2 p-0">
      {steps.map((step, index) => {
        const current = index === currentIndex;
        const answered = Math.min(step.total, Math.max(0, step.answered ?? 0));
        const percent = step.submitted ? 100 : step.total > 0 ? (answered / step.total) * 100 : 0;
        const detail = step.submitted ? "Submitted" : step.answered == null && current
          ? "Saved answer count unavailable"
          : `${answered} of ${step.total} answered`;

        return (
          <li key={index} aria-current={current ? "step" : undefined} className="min-w-0 flex-1">
            <span className={`mb-1 block truncate text-[11px] tabular-nums ${current ? "font-bold" : "opacity-70"}`}>
              {step.label}
            </span>
            <div role="progressbar" aria-label={step.label} aria-valuenow={Math.round(percent)}
              aria-valuetext={detail} title={detail}
              className={`h-[7px] overflow-hidden rounded-full bg-[#e4dbcf] dark:bg-[#494139] ${current ? "ring-1 ring-[#8b7565] ring-offset-1 ring-offset-transparent" : ""}`}>
              <div className="h-full rounded-full bg-[#5b4a40] dark:bg-[#d6c3af]" style={{ width: `${percent}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
