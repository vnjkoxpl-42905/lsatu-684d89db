import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const round50 = (v: number): number => Math.round(v / 50) * 50;

/** Recommended goal: three times the current speed, at least 300; 600 with no data yet. */
export function recommendedGoal(currentSpeed: number): number {
  return currentSpeed > 0 ? Math.min(5000, Math.max(300, round50(3 * currentSpeed))) : 600;
}

export function GoalDialog({
  open,
  onOpenChange,
  value,
  currentSpeed,
  onSet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  currentSpeed: number;
  onSet: (goal: number) => void;
}): React.ReactElement {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set your goal</DialogTitle>
          <DialogDescription>
            The average reader manages about 200 words per minute. A good first goal is 600.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="text-center text-4xl font-semibold tabular-nums">{local} WPM</div>
          <Slider value={[local]} min={50} max={5000} step={50} onValueChange={([v]) => setLocal(v)} aria-label="Goal WPM" />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => setLocal(recommendedGoal(currentSpeed))}>Recommend</Button>
          <Button
            onClick={() => {
              onSet(local);
              onOpenChange(false);
            }}
          >
            Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
