import { ChevronDown, Flame, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const selectorLabels = ["Practice Test", "Section", "Question"] as const;

export default function SmartLRTrainingCard() {
  const navigate = useNavigate();
  const smartLRScore: number | null = null;
  const streakDays: number | null = null;
  const gaugeRadius = 84;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const scoreProgress = smartLRScore === null ? 0 : Math.max(0, Math.min(100, smartLRScore));
  const progressLength = (scoreProgress / 100) * gaugeCircumference;
  const scoreDisplay = smartLRScore === null ? "--" : smartLRScore.toString();
  const streakDisplay = streakDays === null ? "--" : streakDays.toString();

  const startSmartDrill = () => {
    navigate("/drill", { state: { mode: "adaptive" } });
  };

  return (
    <section
      aria-label="Smart LR Training"
      className="group relative w-full overflow-hidden rounded-[30px] border border-slate-200/90 bg-[#fbfcff] px-6 py-7 text-slate-900 shadow-[0_22px_70px_rgba(41,51,79,0.11)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-white/85"
      />

      <div className="relative mb-6 flex flex-col items-center">
        <div
          className="relative h-[236px] w-[236px]"
          role="img"
          aria-label={`Smart LR Score ${scoreDisplay} out of 100`}
        >
          <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220" aria-hidden>
            <circle
              cx="110"
              cy="110"
              r={gaugeRadius}
              fill="none"
              stroke="#eef2f8"
              strokeWidth="16"
            />
            <circle
              cx="110"
              cy="110"
              r={gaugeRadius}
              fill="none"
              stroke="#dbeafe"
              strokeLinecap="round"
              strokeWidth="16"
              strokeDasharray={`${gaugeCircumference * 0.14} ${gaugeCircumference}`}
              strokeDashoffset={gaugeCircumference * 0.06}
            />
            <circle
              cx="110"
              cy="110"
              r={gaugeRadius}
              fill="none"
              stroke="#111827"
              strokeLinecap="round"
              strokeWidth="16"
              strokeDasharray={
                smartLRScore === null
                  ? `${gaugeCircumference * 0.035} ${gaugeCircumference}`
                  : `${progressLength} ${gaugeCircumference}`
              }
              strokeDashoffset={smartLRScore === null ? gaugeCircumference * 0.7 : 0}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Smart LR Score
            </span>
            <div className="flex items-baseline justify-center">
              <span className="text-[54px] font-semibold leading-none tracking-normal text-slate-950">
                {scoreDisplay}
              </span>
              <span className="ml-2 text-lg font-semibold text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-500 shadow-sm">
          <Flame className="h-4 w-4 text-orange-500" aria-hidden />
          <span>Streak</span>
          <span className="tabular-nums text-slate-900">{streakDisplay}</span>
          <span className="font-medium text-slate-400">days</span>
        </div>
      </div>

      <div className="relative mb-4 grid grid-cols-3 gap-2.5" aria-label="Training selectors">
        {selectorLabels.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex h-12 min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-white/75 px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors disabled:cursor-not-allowed disabled:opacity-100"
          >
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {label}
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-1 text-sm font-semibold text-slate-600">
              Auto
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            </span>
          </button>
        ))}
      </div>

      <Button
        type="button"
        onClick={startSmartDrill}
        className="relative h-12 min-h-12 w-full rounded-2xl border border-slate-950 bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:bg-slate-800 group-hover:-translate-y-0.5"
      >
        <Play className="h-4 w-4" aria-hidden />
        Start Smart LR Drill
      </Button>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-7 right-7 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent"
      />
    </section>
  );
}
