import { ChevronDown, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const selectorLabels = ["Practice Test", "Section", "Question"] as const;

export default function SmartLRTrainingCard() {
  return (
    <section
      aria-label="Smart LR Training"
      className="group relative w-full max-w-[320px] overflow-hidden rounded-lg border border-white/[0.08] bg-card/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.07] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />

      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/45">
            Smart LR
          </p>
          <h2 className="text-[15px] font-medium leading-5 text-foreground">
            Training Card
          </h2>
          <p className="text-xs leading-5 text-foreground/45">
            Compact drilling hub
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.035] text-foreground">
          <Zap className="h-3.5 w-3.5 text-foreground/75" aria-hidden />
        </div>
      </div>

      <div className="relative mb-2.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground/85">
            <Flame className="h-3.5 w-3.5 text-foreground/55" aria-hidden />
            <span>Streak</span>
          </div>
          <span className="text-[13px] font-medium tabular-nums text-foreground/55">-- days</span>
        </div>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-3">
        <div
          aria-hidden
          className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/45">
              Smart LR Score
            </span>
            <p className="text-xs text-foreground/42">Adaptive readiness</p>
          </div>
          <span className="text-[30px] font-medium leading-none tabular-nums tracking-tight text-white">
            --
            <span className="ml-1 text-sm font-medium text-foreground/45">/ 100</span>
          </span>
        </div>
      </div>

      <Button
        type="button"
        className="mb-4 h-10 min-h-10 w-full rounded-md border border-white/80 bg-white text-[13px] font-medium text-black shadow-[0_10px_28px_rgba(255,255,255,0.08)] transition-transform duration-200 group-hover:translate-y-[-1px] hover:bg-white/95"
        disabled
      >
        Start Smart LR Drill
      </Button>

      <div className="grid grid-cols-3 gap-2" aria-label="Training selectors">
        {selectorLabels.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex h-9 min-w-0 items-center justify-between gap-1 rounded-md border border-white/[0.07] bg-white/[0.025] px-2.5 text-left text-[11px] font-medium text-foreground/55 transition-colors disabled:opacity-85"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-foreground/35" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}
