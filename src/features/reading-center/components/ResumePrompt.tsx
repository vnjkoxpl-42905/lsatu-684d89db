import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ResumePrompt({
  open,
  onResume,
  onStartOver,
}: {
  open: boolean;
  onResume: () => void;
  onStartOver: () => void;
}): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onResume()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pick up where you left off?</DialogTitle>
          <DialogDescription className="sr-only">Resume this passage or start it again.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onStartOver}>Start over</Button>
          <Button onClick={onResume}>Resume</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
