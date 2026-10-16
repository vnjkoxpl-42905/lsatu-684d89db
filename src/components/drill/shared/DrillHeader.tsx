import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
  progress: string; // e.g., "01/20"
  className?: string;
}

export default function DrillHeader({ onBack, progress, className }: Props) {
  return (
    <div className={cn("flex items-center justify-between pb-4", className)}>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-semibold text-aspiring-gold hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        BACK TO DRILL PAGE
      </button>
      <div className="text-sm font-bold text-ink-faint tracking-widest">
        DRILL_ACTIVE <span className="text-white ml-2 tabular-nums">{progress}</span>
      </div>
    </div>
  );
}
