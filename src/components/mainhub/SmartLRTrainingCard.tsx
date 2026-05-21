import { ChevronDown, Flame, Gauge, Play, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const selectorLabels = ["Practice Test", "Section", "Question"] as const;
const metricRows = [
  { label: "Readiness", value: "--", width: "0%" },
  { label: "Accuracy", value: "--", width: "0%" },
  { label: "Review", value: "-- queued", width: "0%" },
] as const;

export default function SmartLRTrainingCard() {
  const navigate = useNavigate();

  const startSmartDrill = () => {
    navigate("/drill", { state: { mode: "adaptive" } });
  };

  return (
    <section
      aria-label="Smart LR Training"
      className="group relative w-full overflow-hidden rounded-[28px] border border-slate-200/90 bg-[#fbfcff] p-5 text-slate-900 shadow-[0_22px_70px_rgba(41,51,79,0.12)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_20%_0%,rgba(219,234,254,0.62),transparent_52%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/80"
      />

      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
              <Zap className="h-3 w-3" aria-hidden />
            </span>
            LR Adaptive
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[24px] font-semibold leading-tight tracking-normal text-slate-950">
              Smart LR Training
            </h2>
            <p className="max-w-[28rem] text-sm leading-6 text-slate-500">
              Adaptive drilling tuned to your weakest Logical Reasoning patterns.
            </p>
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm">
          <Gauge className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="relative mb-5 grid grid-cols-[1fr_auto] items-end gap-4 rounded-3xl border border-slate-200/90 bg-white px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Smart LR Score
          </span>
          <p className="text-sm text-slate-500">Adaptive readiness</p>
        </div>
        <div className="text-right">
          <span className="text-[44px] font-semibold leading-none tracking-normal text-slate-950">
            --
          </span>
          <span className="ml-1 text-base font-semibold text-slate-400">/ 100</span>
        </div>
      </div>

      <div className="relative mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
            Streak
          </div>
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            -- <span className="text-sm font-medium text-slate-400">days</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Focus
          </div>
          <div className="text-lg font-semibold leading-7 text-slate-900">
            LR patterns
          </div>
          <p className="text-xs text-slate-400">Auto-selected</p>
        </div>
      </div>

      <div className="relative mb-5 space-y-3 rounded-3xl border border-slate-200/90 bg-white px-5 py-4">
        {metricRows.map((row) => (
          <div key={row.label} className="grid grid-cols-[76px_1fr_auto] items-center gap-3">
            <span className="text-sm font-medium text-slate-500">{row.label}</span>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`${row.label} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-sky-100"
                style={{ width: row.width }}
              />
            </div>
            <span className="min-w-[58px] text-right text-sm font-semibold tabular-nums text-slate-400">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <Button
        type="button"
        onClick={startSmartDrill}
        className="mb-4 h-12 min-h-12 w-full rounded-2xl border border-slate-950 bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:bg-slate-800 group-hover:-translate-y-0.5"
      >
        <Play className="h-4 w-4" aria-hidden />
        Start Smart LR Drill
      </Button>

      <div className="grid grid-cols-3 gap-2.5" aria-label="Training selectors">
        {selectorLabels.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex h-12 min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-100"
          >
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {label}
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-1 text-sm font-semibold text-slate-600">
              Auto
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            </span>
          </button>
        ))}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-7 right-7 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent"
      />
    </section>
  );
}
