import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { effectiveWpm } from "../lib/timing";

function formatClock(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function CompletionCard({
  wordsRead,
  activeMs,
  onReadAgain,
  onBack,
}: {
  wordsRead: number;
  activeMs: number;
  onReadAgain: () => void;
  onBack: () => void;
}): React.ReactElement {
  const stats: [string, string][] = [
    ["Words read", String(wordsRead)],
    ["Time", formatClock(activeMs)],
    ["Effective WPM", String(effectiveWpm(wordsRead, activeMs))],
  ];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 text-foreground shadow-lg">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Passage complete
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onBack}>Back to library</Button>
          <Button onClick={onReadAgain}>Read again</Button>
        </div>
      </div>
    </div>
  );
}
