import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WPM_MAX, WPM_MIN } from "../lib/constants";

const clampWpm = (v: number): number => Math.max(WPM_MIN, Math.min(WPM_MAX, v));

export function WpmDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onSave: (v: number) => void;
}): React.ReactElement {
  const [local, setLocal] = useState<number>(value);

  useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);

  const step = (delta: number) => setLocal((v) => clampWpm(v + delta));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reading Speed (WPM)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => step(-10)}>-10</Button>
            <Button variant="outline" onClick={() => step(-100)}>-100</Button>
          </div>
          <div className="text-center text-5xl font-semibold tabular-nums" aria-live="polite">{local}</div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => step(10)}>+10</Button>
            <Button variant="outline" onClick={() => step(100)}>+100</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onSave(local);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
