import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDurationMs } from '@/lib/drillHistory';
import { CATEGORY_LABEL, type SectionAnalysis } from '@/lib/sectionAnalysis';
import { selectSectionDiagnosis } from './sectionReportModel';

interface SectionDiagnosisBlockProps {
  analysis: SectionAnalysis | null;
  analysisSource?: 'first-pass' | 'blind-review' | null;
  brUsed?: boolean;
  /** Compact mode for inline expansion inside SectionHistoryList. */
  compact?: boolean;
}

const DIMENSIONS: Array<{ key: string; title: string }> = [
  { key: 'qtype', title: 'By question type' },
  { key: 'family', title: 'By process' },
  { key: 'reasoning', title: 'By reasoning' },
  { key: 'feature', title: 'By question feature' },
  { key: 'difficulty', title: 'By difficulty' },
];

/**
 * Renders the stored section diagnosis with an explicit label saying which
 * version it is (first-pass vs blind review). Used on the section report, the
 * history list, and the teacher panel.
 */
export function SectionDiagnosisBlock({
  analysis,
  analysisSource,
  brUsed,
  compact = false,
}: SectionDiagnosisBlockProps) {
  const selected = selectSectionDiagnosis({ analysis, analysisSource, brUsed });
  const a = selected.analysis;

  if (!a) {
    if (compact) {
      return (
        <p className="px-4 pb-4 text-xs text-muted-foreground">
          No report was written for this sitting. It was sat before the analysis existed.
        </p>
      );
    }
    return null;
  }

  return (
    <div
      className={cn(
        'space-y-5',
        compact
          ? 'border-t border-border bg-muted/20 px-4 py-4'
          : 'rounded-xl border border-border bg-card p-5',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>
          {a.headline}
        </p>
        {selected.label && (
          <Badge variant="secondary" className="text-xs font-medium">
            {selected.label}
          </Badge>
        )}
      </div>

      {a.categories.length > 0 && (
        <div className="space-y-2">
          {a.categories.map((c) => {
            const insight = a.biggestInsights?.find((i) => i.category === c.category)?.insight;
            return (
              <div key={c.category} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {CATEGORY_LABEL[c.category] ?? c.category} · {c.qnums.length} ({c.percentOfMisses}%)
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Q{c.qnums.join(', Q')}</p>
                {insight && <p className="mt-1 text-xs text-foreground">{insight}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{c.prescription}</p>
              </div>
            );
          })}
        </div>
      )}

      {a.findings.map((f) => (
        <div key={`${f.rule}-${f.headline}`} className="space-y-1">
          <p className="text-xs font-semibold text-foreground">{f.headline}</p>
          <p className="text-xs text-muted-foreground">{f.detail}</p>
          <p className="text-xs text-muted-foreground">{f.prescription}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {f.rule} · Q{f.qnums.join(', Q')}
          </p>
        </div>
      ))}

      {(a.breakdowns?.length ?? 0) > 0 &&
        DIMENSIONS.map(({ key, title }) => {
          const slice = (a.breakdowns ?? []).filter((b) => b.dimension === key);
          if (slice.length === 0) return null;
          return (
            <div key={key} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3 text-left font-medium">Slice</th>
                      <th className="py-1 pr-3 text-left font-medium">Score</th>
                      <th className="py-1 pr-3 text-left font-medium">Rate</th>
                      <th className="py-1 pr-3 text-left font-medium">Median</th>
                      <th className="py-1 pr-3 text-left font-medium">vs pace</th>
                      <th className="py-1 text-left font-medium">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((b) => (
                      <tr key={b.key} className="border-t border-border/60">
                        <td className="py-1 pr-3 text-foreground">{b.key}</td>
                        <td className="py-1 pr-3 tabular-nums text-muted-foreground">
                          {b.correct}/{b.attempted}
                        </td>
                        <td
                          className={cn(
                            'py-1 pr-3 tabular-nums',
                            b.accuracyPercent < 60 ? 'text-destructive' : 'text-foreground',
                          )}
                        >
                          {b.accuracyPercent}%
                        </td>
                        <td className="py-1 pr-3 tabular-nums text-muted-foreground">
                          {formatDurationMs(b.medianTimeMs)}
                        </td>
                        <td className="py-1 pr-3 tabular-nums text-muted-foreground">
                          {b.paceRatio === null ? '' : `${b.paceRatio}x`}
                        </td>
                        <td className="py-1 tabular-nums text-muted-foreground">
                          {b.recoveredInBlindReview || b.stuckAfterBlindReview
                            ? `${b.recoveredInBlindReview} back · ${b.stuckAfterBlindReview} stuck`
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      {a.notRun.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Not covered
          </p>
          {a.notRun.map((n) => (
            <p key={n} className="text-[11px] text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
