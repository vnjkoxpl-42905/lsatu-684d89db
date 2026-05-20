import * as React from "react";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface QuestionMetadata {
  pt?: number | string;
  section?: number | string;
  qnum?: number | string;
  reasoningType?: string | string[];
  questionType?: string;
  questionFeatures?: string[];
}

interface QuestionMetadataPopoverProps {
  metadata?: QuestionMetadata | null;
  resetKey?: string | number;
  className?: string;
}

function formatValue(value?: number | string | string[]): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

function formatFeatures(features?: string[]): string {
  return Array.isArray(features) ? features.filter(Boolean).join(", ") : "";
}

export default function QuestionMetadataPopover({
  metadata,
  resetKey,
  className,
}: QuestionMetadataPopoverProps) {
  const [hovered, setHovered] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const hoverCloseTimer = React.useRef<number | null>(null);
  const open = hovered || pinned;

  const cancelHoverClose = React.useCallback(() => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  const scheduleHoverClose = React.useCallback(() => {
    cancelHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => {
      setHovered(false);
      hoverCloseTimer.current = null;
    }, 120);
  }, [cancelHoverClose]);

  React.useEffect(() => {
    cancelHoverClose();
    setHovered(false);
    setPinned(false);
  }, [cancelHoverClose, resetKey]);

  React.useEffect(() => () => cancelHoverClose(), [cancelHoverClose]);

  const close = () => {
    cancelHoverClose();
    setHovered(false);
    setPinned(false);
  };

  const rows = [
    ["Practice Test", formatValue(metadata?.pt)],
    ["Section", formatValue(metadata?.section)],
    ["Question", formatValue(metadata?.qnum)],
    ["Reasoning type", formatValue(metadata?.reasoningType)],
    ["Question type", formatValue(metadata?.questionType)],
    ["Question features", formatFeatures(metadata?.questionFeatures)],
  ] as const;

  return (
    <Popover open={open} onOpenChange={(next) => !next && close()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Question metadata"
          aria-expanded={open}
          onMouseEnter={() => {
            cancelHoverClose();
            setHovered(true);
          }}
          onMouseLeave={scheduleHoverClose}
          onFocus={() => setHovered(true)}
          onBlur={scheduleHoverClose}
          onClick={(event) => {
            event.preventDefault();
            cancelHoverClose();
            setPinned((current) => !current);
            setHovered(false);
          }}
          className={cn(
            "text-[#b91c1c] hover:text-[#7f1d1d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/30 focus-visible:ring-offset-2 rounded-sm transition-colors",
            pinned && "text-[#7f1d1d]",
            className,
          )}
        >
          <HelpCircle className="w-[20px] h-[20px]" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={10}
        onMouseEnter={() => {
          cancelHoverClose();
          setHovered(true);
        }}
        onMouseLeave={scheduleHoverClose}
        onEscapeKeyDown={close}
        onPointerDownOutside={close}
        className="w-[280px] rounded-md border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.18)]"
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Question Info
          </div>
        </div>
        <dl className="divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 px-4 py-2.5">
              <dt className="text-[12px] font-medium text-slate-500">{label}</dt>
              <dd className="min-h-[18px] text-[12px] font-semibold leading-snug text-slate-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
