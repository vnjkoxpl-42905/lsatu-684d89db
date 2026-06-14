import { Button } from "@/components/ui/button";
import type { ActivityInstructions } from "../api/types";

interface ActivityIntroProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  itemCount: number;
  onStart: () => void;
}

/** Editorial hero: title, rules, worked example, emerald Start. */
export function ActivityIntro({ title, subtitle, instructions, itemCount, onStart }: ActivityIntroProps) {
  const ex = instructions.worked_example;
  return (
    <div className="mx-auto max-w-2xl rounded-[28px] border border-border bg-[hsl(var(--ac-surface))] p-8 shadow-[0_2px_24px_rgba(16,24,40,0.05)] md:p-12">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {itemCount} items
      </p>
      <h1 className="ac-display mt-3 text-4xl text-foreground md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}

      {instructions.tagline && (
        <p className="mt-6 text-[15px] leading-relaxed text-foreground/80">{instructions.tagline}</p>
      )}

      {instructions.rules?.length ? (
        <div className="mt-6 space-y-3">
          {instructions.rules.map((r, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-foreground/75">
              {r}
            </p>
          ))}
        </div>
      ) : null}

      {ex && (
        <div className="mt-7 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example</p>
          <p className="ac-display mt-2 text-lg text-foreground">{ex.statement}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Credited answers
          </p>
          <p className="mt-1 text-sm text-foreground/80">{ex.credited_answers.join(" · ")}</p>
          {ex.explanation && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">{ex.explanation}</p>
          )}
        </div>
      )}

      {instructions.task && (
        <p className="mt-6 text-[15px] font-medium text-foreground/85">{instructions.task}</p>
      )}

      <Button
        onClick={onStart}
        className="mt-8 h-11 px-7 text-base bg-[hsl(var(--ac-emerald-strong))] text-white hover:bg-[hsl(var(--ac-emerald))]"
      >
        Start
      </Button>
    </div>
  );
}
