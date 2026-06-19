import { ExternalLink, ArrowUpRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface LinkResult {
  id: string;
  kind: string;
  source_id: string;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  snippet?: string | null;
  score?: number | null;
}

const KIND_LABELS: Record<string, string> = {
  guided_drill: 'Guided drill',
  drill_question: 'Drill question',
  activity: 'Activity',
  bootcamp_day: 'Bootcamp day',
  bootcamp_lesson: 'Bootcamp lesson',
  concept: 'Concept',
  question_type_strategy: 'Strategy',
  tactical_pattern: 'Pattern',
  student: 'Student',
  teaching_asset: 'Asset',
  route: 'Page',
};

function isInternal(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

function toInternalPath(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

export function LinkCard({ result }: { result: LinkResult }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const url = result.url;
  const kindLabel = KIND_LABELS[result.kind] ?? result.kind;

  const openInApp = () => {
    if (!url) return;
    if (isInternal(url)) {
      navigate(toInternalPath(url));
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openNewTab = () => {
    if (!url) return;
    const absolute = isInternal(url)
      ? `${window.location.origin}${toInternalPath(url)}`
      : url;
    window.open(absolute, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    if (!url) return;
    const absolute = isInternal(url)
      ? `${window.location.origin}${toInternalPath(url)}`
      : url;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="w-full max-w-[88%] rounded-md border border-black/10 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-[#c8841f]">{kindLabel}</div>
          <div className="truncate text-sm font-semibold text-black/85">{result.title}</div>
          {result.subtitle ? (
            <div className="truncate text-xs text-black/55">{result.subtitle}</div>
          ) : null}
          {result.snippet ? (
            <div className="mt-1 line-clamp-2 text-[11px] text-black/45">{result.snippet}</div>
          ) : null}
          {!url ? (
            <div className="mt-1 text-[11px] italic text-black/40">No direct link available.</div>
          ) : null}
        </div>
      </div>
      {url ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={openInApp}
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1',
              'text-[11px] font-medium text-white hover:bg-black/85',
            )}
          >
            <ArrowUpRight className="h-3 w-3" />
            Open
          </button>
          <button
            type="button"
            onClick={openNewTab}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:bg-black/[0.04]"
          >
            <ExternalLink className="h-3 w-3" />
            New tab
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:bg-black/[0.04]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            Copy
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function linksFromToolResults(
  toolResults?: Array<{ name: string; result: { ok: boolean; data?: unknown } }>,
): LinkResult[] {
  if (!toolResults?.length) return [];
  const out: LinkResult[] = [];
  for (const tr of toolResults) {
    if (tr.name !== 'find_link' || !tr.result?.ok) continue;
    const data = tr.result.data as { results?: LinkResult[] } | undefined;
    if (Array.isArray(data?.results)) out.push(...data.results);
  }
  return out;
}
