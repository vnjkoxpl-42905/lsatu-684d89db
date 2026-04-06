import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  Underline, Eraser, Flag, Undo2, Search,
  MoreVertical, Play, Pause, MessageCircle,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HighlightMode = 'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase';

interface DrillTopBarProps {
  // Navigation
  onBack: () => void;
  // Question info
  questionLabel?: string;
  questionTooltip?: React.ReactNode;
  onCopyId?: () => void;
  // Highlight tools
  highlightMode: HighlightMode;
  onHighlightModeChange: (mode: HighlightMode) => void;
  // Flag
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  // Undo
  onUndo?: () => void;
  canUndo?: boolean;
  // Timer
  hasTimer?: boolean;
  timerLabel?: string;
  timerPaused?: boolean;
  onTimerToggle?: () => void;
  // Tutor
  tutorMode?: boolean;
  onTutorModeChange?: (v: boolean) => void;
  showTutorToggle?: boolean;
  onOpenTutor?: () => void;
  // Find text
  onFindText?: (query: string) => void;
}

export function DrillTopBar({
  onBack,
  questionLabel,
  questionTooltip,
  onCopyId,
  highlightMode,
  onHighlightModeChange,
  isFlagged = false,
  onToggleFlag,
  onUndo,
  canUndo = false,
  hasTimer = false,
  timerLabel,
  timerPaused,
  onTimerToggle,
  tutorMode,
  onTutorModeChange,
  showTutorToggle = false,
  onOpenTutor,
  onFindText,
}: DrillTopBarProps) {
  const isMobile = useIsMobile();
  const [findQuery, setFindQuery] = React.useState("");

  const handleFindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFindQuery(e.target.value);
    onFindText?.(e.target.value);
  };

  const Separator = () => <div className="w-px h-5 bg-border/30 mx-1 shrink-0" />;

  const colorDot = (color: 'yellow' | 'pink' | 'orange', bg: string, border: string, ring: string) => (
    <button
      key={color}
      onClick={() => onHighlightModeChange(highlightMode === color ? 'none' : color)}
      title={`${color.charAt(0).toUpperCase() + color.slice(1)} highlighter`}
      className={cn(
        "h-6 w-6 rounded-full transition-all shrink-0 border-2",
        highlightMode === color
          ? `${bg} ${border} ring-2 ${ring} scale-110 shadow-sm`
          : `${bg} border-transparent hover:scale-105`
      )}
      aria-label={`${color} highlight`}
    />
  );

  // Overflow menu items for mobile
  const mobileOverflowItems = (
    <>
      {onUndo && (
        <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="w-4 h-4 mr-2" /> Undo
        </DropdownMenuItem>
      )}
      {onToggleFlag && (
        <DropdownMenuItem onClick={onToggleFlag}>
          <Flag className={cn("w-4 h-4 mr-2", isFlagged && "text-orange-500 fill-current")} />
          {isFlagged ? "Unflag" : "Flag for review"}
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <div className="border-b border-white/[0.06] bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-1 sm:gap-2 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-sky-400 hover:text-sky-300 transition-colors shrink-0 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <ChevronLeft className="w-4 h-4 -ml-2.5" />
          <span className="hidden sm:inline ml-0.5">BACK</span>
        </button>

        {/* Find text input - hidden on very small screens */}
        {!isMobile && (
          <>
            <Separator />
            <div className="relative max-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={findQuery}
                onChange={handleFindChange}
                placeholder="Find Text, Type Here"
                className="h-7 min-h-0 pl-7 pr-2 text-xs bg-zinc-800 border-zinc-700 text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
          </>
        )}

        <Separator />

        {/* Question ID chip */}
        {questionLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onCopyId}
                className="px-2 py-1 rounded bg-accent/30 text-foreground border border-border/50 text-xs font-medium hover:bg-accent/40 transition-colors shrink-0"
              >
                {questionLabel}
              </button>
            </TooltipTrigger>
            {questionTooltip && (
              <TooltipContent>{questionTooltip}</TooltipContent>
            )}
          </Tooltip>
        )}

        {/* Undo - desktop only */}
        {!isMobile && onUndo && (
          <>
            <Separator />
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
              className="h-7 w-7 min-h-0 min-w-0 shrink-0 hover:bg-muted disabled:opacity-30"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Highlighter tools - right side */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onHighlightModeChange(highlightMode === 'underline' ? 'none' : 'underline')}
            className={cn(
              "h-7 w-7 min-h-0 min-w-0 shrink-0 transition-all",
              highlightMode === 'underline'
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "hover:bg-muted"
            )}
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </Button>

          {colorDot('yellow', 'bg-yellow-400', 'border-yellow-500', 'ring-yellow-400/30')}
          {colorDot('pink', 'bg-pink-400', 'border-pink-500', 'ring-pink-400/30')}
          {colorDot('orange', 'bg-orange-400', 'border-orange-500', 'ring-orange-400/30')}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onHighlightModeChange(highlightMode === 'erase' ? 'none' : 'erase')}
            className={cn(
              "h-7 w-7 min-h-0 min-w-0 shrink-0 transition-all",
              highlightMode === 'erase'
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "hover:bg-muted"
            )}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Flag - desktop only */}
        {!isMobile && onToggleFlag && (
          <>
            <Separator />
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFlag}
              aria-pressed={isFlagged}
              aria-label="Flag question"
              className={cn(
                "h-7 w-7 min-h-0 min-w-0 shrink-0 transition-all",
                isFlagged
                  ? "text-orange-600 hover:text-orange-700"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={isFlagged ? "Unflag" : "Flag for review"}
            >
              <Flag className={cn("w-3.5 h-3.5", isFlagged && "fill-current")} />
            </Button>
          </>
        )}

        {/* Tutor toggle */}
        {showTutorToggle && onTutorModeChange && (
          <div className="hidden sm:flex items-center gap-1.5">
            <Label htmlFor="tutor-bar" className="text-xs text-muted-foreground cursor-pointer select-none">
              Tutor
            </Label>
            <Switch
              id="tutor-bar"
              checked={tutorMode}
              onCheckedChange={onTutorModeChange}
              className="data-[state=checked]:bg-primary scale-90"
            />
          </div>
        )}


        {/* Timer */}
        {hasTimer && timerLabel && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onTimerToggle}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
            >
              {timerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-mono tabular-nums text-muted-foreground whitespace-nowrap">
              Elapsed: {timerLabel}
            </span>
          </div>
        )}

        {/* More menu (mobile overflow) */}
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 min-h-0 min-w-0 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {mobileOverflowItems}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Tutor AI button */}
        {onOpenTutor && (
          <button
            onClick={onOpenTutor}
            className="h-7 w-7 rounded-full bg-sky-500 hover:bg-sky-400 flex items-center justify-center transition-colors shrink-0"
            title="Open AI Tutor"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
