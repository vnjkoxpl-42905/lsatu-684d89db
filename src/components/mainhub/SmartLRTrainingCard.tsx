import { ChevronDown, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const selectorLabels = ["Practice Test", "Section", "Question"] as const;

export default function SmartLRTrainingCard() {
  return (
    <section
      aria-label="Smart LR Training"
      className="w-full max-w-[320px] rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm shadow-black/5 backdrop-blur-md"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-[0.2em]">
            Smart LR
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            Training Card
          </h2>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-primary">
          <Zap className="h-4 w-4" aria-hidden />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-md border border-border/70 bg-background/70 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Flame className="h-4 w-4 text-primary" aria-hidden />
          <span>Streak</span>
        </div>
        <span className="text-sm text-muted-foreground">-- days</span>
      </div>

      <div className="mb-4 rounded-md border border-border/70 bg-background/70 px-3 py-3">
        <div className="flex items-end justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Smart LR Score
          </span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            --<span className="text-sm font-medium text-muted-foreground"> / 100</span>
          </span>
        </div>
      </div>

      <Button type="button" className="mb-4 w-full" disabled>
        Start Smart LR Drill
      </Button>

      <div className="grid grid-cols-3 gap-2" aria-label="Training selectors">
        {selectorLabels.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex h-10 min-w-0 items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-left text-xs font-medium text-muted-foreground disabled:opacity-70"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}
