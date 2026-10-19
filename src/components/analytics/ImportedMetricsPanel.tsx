import * as React from 'react';
import { Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStudentExternalMetrics } from '@/hooks/useStudentExternalMetrics';

interface ImportedMetricsPanelProps {
  /** Optional: view another student's imports (admin surfaces). Defaults to self. */
  studentId?: string;
  /** 'light' matches the slate MainHub palette; 'default' uses theme tokens. */
  variant?: 'default' | 'light';
  className?: string;
}

const fmtPct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);
const fmtSecs = (ms: number | null) => (ms === null ? '—' : `${Math.round(ms / 1000)}s`);

/**
 * Metrics parsed out of a student's uploaded outside work (7Sage, PT results).
 * Shown as a distinct "imported" layer, never blended into the in-app
 * accuracy numbers derived from the attempts table — the two are presented
 * side by side so nothing is misrepresented as native LSAT U practice.
 */
export default function ImportedMetricsPanel({
  studentId,
  variant = 'default',
  className,
}: ImportedMetricsPanelProps) {
  const { grouped, isLoading } = useStudentExternalMetrics(studentId);
  const light = variant === 'light';

  const t = {
    label: light ? 'text-slate-400' : 'text-muted-foreground',
    card: light
      ? 'rounded-2xl border border-slate-200 bg-white'
      : 'rounded-xl bg-card border border-border shadow-sm',
    heading: light ? 'text-slate-700' : 'text-foreground/80',
    sub: light ? 'text-slate-500' : 'text-muted-foreground',
    value: light ? 'text-slate-900' : 'text-foreground',
    divider: light ? 'border-slate-100' : 'border-border/50',
  };

  if (isLoading) return null;
  if (!grouped.hasAny) return null;

  const source = grouped.sources.length ? grouped.sources.join(', ') : 'outside work';
  const captured = grouped.latestCapturedAt
    ? format(new Date(grouped.latestCapturedAt), 'MMM d, yyyy')
    : null;

  return (
    <div className={className}>
      <p className={cn('text-[10px] uppercase tracking-[0.2em] font-medium mb-2 flex items-center gap-2', t.label)}>
        <Upload className="w-3.5 h-3.5" />
        Imported from {source}
      </p>
      <p className={cn('text-[11px] mb-5', t.sub)}>
        From work you uploaded{captured ? ` · latest ${captured}` : ''}. Shown separately from your
        LSAT U practice, not merged into it.
      </p>

      <div className={cn(t.card, 'p-6 space-y-6')}>
        {/* Overall + PT scores as headline stats */}
        <div className="flex flex-wrap gap-8">
          {grouped.overallAccuracy && (
            <div>
              <div className={cn('text-2xl font-semibold tabular-nums', t.value)}>
                {fmtPct(grouped.overallAccuracy.first_accuracy)}
              </div>
              <div className={cn('text-[11px]', t.sub)}>Overall accuracy</div>
            </div>
          )}
          {grouped.ptScores.map((pt) => (
            <div key={pt.id}>
              <div className={cn('text-2xl font-semibold tabular-nums', t.value)}>
                {pt.scaled_score ?? '—'}
              </div>
              <div className={cn('text-[11px]', t.sub)}>{pt.pt_number}</div>
            </div>
          ))}
        </div>

        {/* Accuracy by type */}
        {grouped.accuracyByType.length > 0 && (
          <div>
            <p className={cn('text-[11px] font-medium mb-2', t.heading)}>Accuracy by type</p>
            <div className="space-y-1.5">
              {grouped.accuracyByType.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-[13px]">
                  <span className={cn('w-48 truncate', t.heading)}>{m.question_type}</span>
                  <span className={cn('tabular-nums font-medium', t.value)}>
                    {fmtPct(m.first_accuracy)}
                  </span>
                  {m.sample_size != null && (
                    <span className={cn('text-[11px]', t.sub)}>· {m.sample_size} Qs</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timing by type */}
        {grouped.timingByType.length > 0 && (
          <div>
            <p className={cn('text-[11px] font-medium mb-2', t.heading)}>Avg time by type</p>
            <div className="space-y-1.5">
              {grouped.timingByType.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-[13px]">
                  <span className={cn('w-48 truncate', t.heading)}>{m.question_type}</span>
                  <span className={cn('tabular-nums font-medium', t.value)}>
                    {fmtSecs(m.avg_time_ms)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section scores */}
        {grouped.sectionScores.length > 0 && (
          <div>
            <p className={cn('text-[11px] font-medium mb-2', t.heading)}>Sections</p>
            <div className="space-y-1.5">
              {grouped.sectionScores.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-[13px]">
                  <span className={cn('w-48 truncate', t.heading)}>{m.period_label}</span>
                  <span className={cn('tabular-nums font-medium', t.value)}>
                    {m.scaled_score != null ? m.scaled_score : fmtPct(m.first_accuracy)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
