import { format } from "date-fns";
import {
  useStudentExternalMetrics,
  type ExternalMetric,
} from "@/hooks/useStudentExternalMetrics";
import { cn } from "@/lib/utils";

interface ImportedMetricsPanelProps {
  studentId?: string;
  variant?: "default" | "light";
  className?: string;
  /** A dedicated utility view must explain empty, loading and failed imports. */
  showStates?: boolean;
}
const percent = (value: number | null) =>
  value == null ? "Not reported" : `${Math.round(value)}%`;
function metadata(row: ExternalMetric): string {
  return [
    row.source_platform || "Imported report",
    row.period_label ||
      (row.captured_at && Number.isFinite(Date.parse(row.captured_at))
        ? format(new Date(row.captured_at), "MMM d, yyyy")
        : "Date range not reported"),
    row.sample_size == null
      ? "Sample not reported"
      : `${row.sample_size} questions`,
  ].join(" · ");
}
/** Imported reports have their own query and never enter native first-answer statistics. */
export default function ImportedMetricsPanel({
  studentId,
  className,
  showStates = false,
}: ImportedMetricsPanelProps) {
  const { grouped, isLoading, isError, refetch } =
    useStudentExternalMetrics(studentId);
  if (isLoading)
    return showStates ? (
      <p role="status" className="text-sm text-muted-foreground">
        Loading imported reports…
      </p>
    ) : null;
  if (isError)
    return (
      <div role="alert" className="rounded-xl border border-border p-4 text-sm">
        <p>Imported reports could not be loaded.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 min-h-11 underline"
        >
          Try again
        </button>
      </div>
    );
  if (!grouped.hasAny)
    return showStates ? (
      <div className="rounded-xl border border-border p-5">
        <h2 className="font-serif text-xl">No imported reports yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reports already added to your account will appear here. Your LSAT U
          answers remain in Progress and History.
        </p>
      </div>
    ) : null;
  const sections: {
    title: string;
    rows: ExternalMetric[];
    value: (row: ExternalMetric) => string;
    label: (row: ExternalMetric) => string;
  }[] = [
    {
      title: "Overall accuracy",
      rows: grouped.overallAccuracy ? [grouped.overallAccuracy] : [],
      value: (r) => percent(r.first_accuracy),
      label: () => "Reported accuracy",
    },
    {
      title: "PrepTest scores",
      rows: grouped.ptScores,
      value: (r) =>
        r.scaled_score == null ? "Not reported" : String(r.scaled_score),
      label: (r) => r.pt_number || "PrepTest",
    },
    {
      title: "Accuracy by question type",
      rows: grouped.accuracyByType,
      value: (r) => percent(r.first_accuracy),
      label: (r) => r.question_type || "Type not reported",
    },
    {
      title: "Average time by question type",
      rows: grouped.timingByType,
      value: (r) =>
        r.avg_time_ms == null
          ? "Not reported"
          : `${Math.round(r.avg_time_ms / 1000)} seconds`,
      label: (r) => r.question_type || "Type not reported",
    },
    {
      title: "Section results",
      rows: grouped.sectionScores,
      value: (r) =>
        r.scaled_score == null
          ? percent(r.first_accuracy)
          : String(r.scaled_score),
      label: (r) => r.period_label || "Section",
    },
  ];
  return (
    <section
      className={cn("space-y-5", className)}
      aria-label="Imported reports"
    >
      <p className="text-sm text-muted-foreground">
        Reported by {grouped.sources.join(", ") || "outside sources"}. These
        figures stay separate from your LSAT U first answers.
      </p>
      {sections
        .filter((section) => section.rows.length)
        .map((section) => (
          <section
            key={section.title}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <h2 className="font-serif text-xl text-foreground">
              {section.title}
            </h2>
            <ul className="mt-3 divide-y divide-border">
              {section.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <strong className="min-w-0 text-sm font-medium text-foreground">
                    {section.label(row)}
                  </strong>
                  <span className="text-right text-lg tabular-nums text-foreground">
                    {section.value(row)}
                  </span>
                  <small className="w-full text-xs leading-5 text-muted-foreground">
                    {metadata(row)}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </section>
  );
}
