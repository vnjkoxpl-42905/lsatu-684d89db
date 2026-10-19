import { useEffect, useState } from 'react';
import { useModuleStore, type DayId } from '../../lib/store';
import { BOOTCAMP_DAYS } from '../../content/bootcamp/days';
import { cn } from '../../lib/utils';

/**
 * 6-day horizontal track.
 * Calibration not gatekeeping. Every day is reachable.
 */
export function BootcampProgress({
  currentDay,
  onSelectDay,
}: {
  currentDay?: DayId;
  onSelectDay?: (day: DayId) => void;
}) {
  const completed = useModuleStore((s) => s.bootcampDayCompleted);
  const calibration = useModuleStore((s) => s.bootcampDayCalibration);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <ol className="grid grid-cols-6 gap-px border border-rule bg-rule">
      {BOOTCAMP_DAYS.map((d) => {
        const isCurrent = hydrated && d.id === currentDay;
        const cal = hydrated ? calibration[d.id] : undefined;
        const isCalibrated =
          hydrated && cal && cal.correct / cal.total >= d.verdict.calibrationThreshold;
        const isCompleted = hydrated && completed.includes(d.id);

        return (
          <li key={d.id} className="bg-paper">
            <button
              type="button"
              onClick={() => onSelectDay?.(d.id)}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex h-full w-full flex-col gap-1 px-3 py-3 text-left transition-colors',
                isCurrent
                  ? 'bg-paper-bright'
                  : 'hover:bg-paper-bright',
                d.status === 'stub' && 'opacity-70',
              )}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    'protocol',
                    isCurrent
                      ? 'text-ink'
                      : isCalibrated
                      ? 'text-verdigris-deep'
                      : isCompleted
                      ? 'text-ink-soft'
                      : 'text-ink-mute',
                  )}
                >
                  {d.numeral.replace('DAY ', '')}
                </span>
                {hydrated && cal && (
                  <span
                    className={cn(
                      'protocol text-[0.65rem]',
                      isCalibrated ? 'text-verdigris-deep' : 'text-ink-mute',
                    )}
                  >
                    {cal.correct}/{cal.total}
                  </span>
                )}
                {!hydrated || !cal ? (
                  <span aria-hidden className="text-rule">·</span>
                ) : null}
              </div>
              <div
                className={cn(
                  'display-title text-base leading-tight md:text-lg',
                  isCurrent
                    ? 'text-ink'
                    : isCalibrated
                    ? 'text-verdigris-deep'
                    : 'text-ink-soft',
                )}
              >
                {d.title}
              </div>
              <div className="protocol text-[0.65rem] text-ink-mute">
                {isCalibrated
                  ? 'CALIBRATED'
                  : isCompleted
                  ? 'RE-RUN OPEN'
                  : isCurrent
                  ? 'TODAY'
                  : d.status === 'stub'
                  ? 'COMING'
                  : 'OPEN'}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
