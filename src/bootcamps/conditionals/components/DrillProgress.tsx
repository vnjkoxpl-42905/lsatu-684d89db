import './drill-progress.css';

type DrillProgressProps = {
  completed: number;
  total: number;
  current?: number;
  completedIndices?: number[];
  positionLabel?: string;
  label?: string;
  finished?: boolean;
};

/** Completion and current position are separate: visiting a question never fills its segment. */
export function DrillProgress({ completed, total, current, completedIndices, positionLabel, label = 'Drill progress', finished = false }: DrillProgressProps) {
  const count = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const done = Math.min(count, Math.max(0, Number.isFinite(completed) ? completed : 0));
  const percent = count ? Math.min(done < count ? 99 : 100, Math.round(done / count * 100)) : 0;
  const position = positionLabel ?? (finished ? 'Practice complete' : current !== undefined && count ? `Question ${Math.min(count, Math.max(1, current + 1))} of ${count}` : 'Your progress');
  return <header className="cd-progress">
    <div className="cd-progress-labels"><span>{position}</span><strong>{percent}% <small>complete</small></strong></div>
    <div className={`cd-progress-track${count > 36 ? ' cd-progress-continuous' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={count} aria-valuenow={done} aria-valuetext={`${percent}% complete. ${done} of ${count} questions completed.`}>
      {count <= 36 ? Array.from({ length: count }, (_, index) => <span key={index} data-complete={completedIndices ? completedIndices.includes(index) : index < done} data-current={!finished && index === current} aria-hidden="true"/>) : <span style={{ width: `${percent}%` }} aria-hidden="true"/>}
    </div>
  </header>;
}
