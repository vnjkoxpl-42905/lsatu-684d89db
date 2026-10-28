import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Passage, Progress } from "../lib/types";
import { estimateMinutes, percentRead } from "../lib/timing";
import { rcReaderPath } from "../lib/routes";

export function PassageCard({
  passage,
  progress,
  wpm,
  onViewText,
  onHide,
}: {
  passage: Passage;
  progress?: Progress;
  wpm: number;
  onViewText: () => void;
  onHide?: () => void;
}): React.ReactElement {
  const started = !!progress && progress.word_index > 0 && !progress.completed_at;
  const completed = !!progress?.completed_at;
  const pct = started ? percentRead(progress!.word_index, passage.word_count) : 0;

  return (
    <div className="group relative">
      <Link to={rcReaderPath(passage.slug)} className="block focus-visible:outline focus-visible:outline-2">
        <div className="relative aspect-[3/4] overflow-hidden border border-black/12 bg-white/35">
          {passage.cover_url ? (
            <img src={passage.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#dfe4e6]">
              <FileText className="h-8 w-8 text-black/35" strokeWidth={1.25} />
            </div>
          )}
          {completed && (
            <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 rounded-full bg-white text-emerald-700" aria-label="Completed" />
          )}
          {started && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
              <div className="h-full bg-black" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{passage.title}</div>
        {passage.author && <div className="truncate text-xs text-black/55">{passage.author}</div>}
        <div className="mt-0.5 text-xs text-black/45">
          {passage.word_count} words · {estimateMinutes(passage.word_count, wpm)} min
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More for ${passage.title}`}
          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center bg-white/80 text-black/70 opacity-0 transition hover:text-black focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link to={rcReaderPath(passage.slug)}>Open</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onViewText}>View text</DropdownMenuItem>
          {onHide && <DropdownMenuItem onSelect={onHide}>Hide from Continue reading</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
