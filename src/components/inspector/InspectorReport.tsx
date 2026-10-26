import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InspectAxis,
  InspectFinding,
  InspectLevel,
  InspectReport,
} from "@/hooks/useInspector";

const AXIS_LABEL: Record<InspectAxis, string> = {
  functional: "Functional",
  content: "Content",
  pedagogy: "Pedagogy",
  completeness: "Completeness",
};

const AXIS_ORDER: InspectAxis[] = ["functional", "content", "pedagogy", "completeness"];

const SEVERITY_CLASS: Record<InspectLevel, string> = {
  high: "bg-red-500/15 text-red-300 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

function FindingCard({ f }: { f: InspectFinding }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tag className={SEVERITY_CLASS[f.severity]}>{f.severity}</Tag>
        <Tag className="border-zinc-700 text-zinc-400">conf: {f.confidence}</Tag>
        <code className="text-[11px] text-zinc-400 break-all">{f.location}</code>
      </div>
      <div className="text-sm text-zinc-100">{f.issue}</div>
      <div className="text-sm text-zinc-400">
        <span className="text-zinc-500 text-xs uppercase tracking-wide mr-1">Fix:</span>
        {f.suggestedFix}
      </div>
    </div>
  );
}

export default function InspectorReport({ report }: { report: InspectReport }) {
  const { summary, unitsExamined, findings } = report;
  const byAxis = AXIS_ORDER.map((axis) => ({
    axis,
    items: findings.filter((f) => f.axis === axis),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2 mb-1">
          {findings.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          )}
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            {findings.length === 0
              ? "No issues found"
              : `${findings.length} finding${findings.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <p className="text-sm text-zinc-200 whitespace-pre-wrap">{summary}</p>
        {unitsExamined.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unitsExamined.map((u) => (
              <code
                key={u}
                className="text-[10px] text-zinc-500 bg-zinc-800/60 rounded px-1.5 py-0.5 break-all"
              >
                {u}
              </code>
            ))}
          </div>
        )}
      </div>

      {byAxis.map((group) => (
        <div key={group.axis} className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            {AXIS_LABEL[group.axis]} ({group.items.length})
          </div>
          <div className="space-y-2">
            {group.items.map((f, i) => (
              <FindingCard key={`${group.axis}-${i}`} f={f} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
