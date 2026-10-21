import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Archive,
  ExternalLink,
  Flame,
  Target,
  Eye,
  FileText,
  Lightbulb,
  Tag,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import {
  BOOTCAMP_REFERENCES,
  REFERENCE_TYPE_LABELS,
  PREVIEW_STATUS_LABELS,
  type BootcampReference,
  type ReferenceType,
} from '@/data/bootcampReferences';
import { cn } from '@/lib/utils';

type FilterChip = 'all' | ReferenceType | 'needs-preview';

const FILTER_CHIPS: { id: FilterChip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bootcamp', label: 'Bootcamps' },
  { id: 'drill', label: 'Drills' },
  { id: 'visual-reference', label: 'Visual References' },
  { id: 'content-reference', label: 'Content References' },
  { id: 'needs-preview', label: 'Needs Preview Setup' },
];

const REFERENCE_TYPE_ICONS: Record<ReferenceType, React.ComponentType<{ className?: string }>> = {
  bootcamp: Flame,
  drill: Target,
  'visual-reference': Eye,
  'content-reference': FileText,
};

function ReferenceCard({
  entry,
  onOpen,
}: {
  entry: BootcampReference;
  onOpen: (id: string) => void;
}) {
  const Icon = REFERENCE_TYPE_ICONS[entry.referenceType];
  const preview = PREVIEW_STATUS_LABELS[entry.previewStatus];

  return (
    <div
      className="group relative bg-zinc-900/60 border border-zinc-800/70 rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-700/80 hover:bg-zinc-900/90 transition-all cursor-pointer"
      onClick={() => onOpen(entry.id)}
    >
      {/* Reference-only badge — always visible */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-full px-2.5 py-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
        <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
          Reference only
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 pr-28">
        <div className="mt-0.5 w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-amber-400/80" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 leading-tight">{entry.title}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate max-w-[260px]">{entry.sourceFilename}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{entry.description}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <span className="flex items-center gap-1 text-zinc-500">
          <Tag className="w-3 h-3" />
          <span className="text-zinc-300">{entry.topic}</span>
        </span>
        <span className="flex items-center gap-1 text-zinc-500">
          <Archive className="w-3 h-3" />
          <span className="text-zinc-400">{REFERENCE_TYPE_LABELS[entry.referenceType]}</span>
        </span>
        <span className={cn('flex items-center gap-1', preview.color)}>
          <Eye className="w-3 h-3" />
          {preview.label}
        </span>
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="text-[10px] bg-zinc-800/80 border border-zinc-700/40 text-zinc-500 px-2 py-0.5 rounded-full"
            >
              {t}
            </span>
          ))}
          {entry.tags.length > 5 && (
            <span className="text-[10px] text-zinc-600">+{entry.tags.length - 5} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
        <span className="flex items-center gap-1 text-[11px] text-zinc-600">
          <CalendarDays className="w-3 h-3" />
          {new Date(entry.importedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(entry.id);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/80 hover:text-amber-300 transition-colors"
        >
          Open
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function BootcampReferences() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');

  const filtered = useMemo(() => {
    let entries = BOOTCAMP_REFERENCES;

    if (activeFilter === 'needs-preview') {
      entries = entries.filter((e) => e.previewStatus !== 'static-ready');
    } else if (activeFilter !== 'all') {
      entries = entries.filter((e) => e.referenceType === activeFilter);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.topic.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q)) ||
          e.sourceFilename.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }

    return entries;
  }, [query, activeFilter]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      {/* Page header */}
      <div className="shrink-0 border-b border-zinc-800/60 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Archive className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
              Bootcamp Reference Library
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Admin-only archive of prior bootcamp builds, prototypes, and inspiration references.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, topic, tag, or filename…"
            className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 focus:bg-zinc-900 transition-colors"
          />
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTER_CHIPS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveFilter(id)}
              className={cn(
                'text-[11px] font-medium px-3 py-1 rounded-full border transition-colors',
                activeFilter === id
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No references match your search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveFilter('all');
              }}
              className="mt-3 text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-zinc-600 mb-4">
              {filtered.length} reference{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((entry) => (
                <ReferenceCard
                  key={entry.id}
                  entry={entry}
                  onOpen={(id) => navigate(`/teacher/reference-library/${id}`)}
                />
              ))}
            </div>

            {/* Use as inspiration callout */}
            <div className="mt-8 border border-zinc-800/50 rounded-xl p-4 flex items-start gap-3 bg-zinc-900/30">
              <Lightbulb className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-zinc-300">Using as inspiration</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  Open any reference to view its full metadata and preview. These are internal
                  reference materials — they are never visible to students or published bootcamps.
                  Use them when designing new bootcamp surfaces, drill patterns, or content flows.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
