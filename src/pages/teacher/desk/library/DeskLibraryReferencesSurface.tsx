import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn, openRoute } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { LibraryFilterSelect } from '@/components/teacher/desk/library/LibraryFilterSelect';
import {
  BOOTCAMP_REFERENCES,
  REFERENCE_TYPE_LABELS,
  type ReferenceType,
} from '@/data/bootcampReferences';

/**
 * References (spec D4.4): the two read-only reference bodies — the bootcamp
 * reference archive and the tutor corpus — as tabs inside Library rather than
 * two more rooms in the sidebar. Read-only on purpose: grading the corpus lives
 * in `/teacher/dev`, and these lists exist to be looked things up in.
 */

type Source = 'bootcamps' | 'corpus';

const SOURCES: { id: Source; label: string }[] = [
  { id: 'bootcamps', label: 'Bootcamp references' },
  { id: 'corpus', label: 'Tutor corpus' },
];

export function DeskLibraryReferencesSurface() {
  const [source, setSource] = useState<Source>('bootcamps');

  return (
    <section className="flex h-full w-full flex-col">
      <header className="shrink-0 border-b border-black/10 px-6 py-4">
        <h2 className="text-base font-semibold text-black">References</h2>
        <p className="mt-0.5 text-xs text-black/55">
          Read-only. The bootcamp archive and the tutor corpus, searchable in place.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={source === s.id}
              onClick={() => setSource(s.id)}
              className={cn(
                'border px-2.5 py-1 text-[13px] font-medium transition',
                source === s.id
                  ? 'border-black bg-black text-white'
                  : 'border-black/15 bg-white text-black/55 hover:text-black',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {source === 'bootcamps' ? <BootcampReferenceList /> : <TutorCorpusList />}
      </div>
    </section>
  );
}

function BootcampReferenceList() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ReferenceType | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOTCAMP_REFERENCES.filter((e) => {
      if (type !== 'all' && e.referenceType !== type) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, type]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search references…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 max-w-xs border-black/15 bg-white/40 text-sm text-black placeholder:text-black/35 focus-visible:border-black/35 focus-visible:ring-black/10"
        />
        <LibraryFilterSelect
          value={type}
          onChange={(v) => setType(v as ReferenceType | 'all')}
          ariaLabel="Reference type"
          options={[
            { value: 'all', label: 'All types' },
            ...Object.entries(REFERENCE_TYPE_LABELS).map(([value, label]) => ({
              value,
              label: String(label),
            })),
          ]}
        />
        <span className="text-xs text-black/45">
          {filtered.length} of {BOOTCAMP_REFERENCES.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Empty>No references match your search.</Empty>
      ) : (
        <ul className="divide-y divide-black/[0.08] border border-black/10 bg-white/40">
          {filtered.map((e) => {
            const target = e.appRoute ?? e.previewPath;
            return (
              <li key={e.id} className="flex items-start gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-black">{e.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-black/55">{e.description}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-black/40">
                    <span>{REFERENCE_TYPE_LABELS[e.referenceType]}</span>
                    <span>·</span>
                    <span>{e.topic}</span>
                    {e.tags.slice(0, 3).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </p>
                </div>
                {target ? (
                  <button
                    type="button"
                    onClick={() => openRoute(target)}
                    className="shrink-0 inline-flex items-center gap-1.5 border border-black/15 bg-white px-2 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface CorpusRow {
  id: string;
  qid: string;
  kind: 'preview' | 'explanation';
  qtype: string | null;
  rating: number | null;
  content_markdown: string | null;
  updated_at: string;
}

function TutorCorpusList() {
  const [rows, setRows] = useState<CorpusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<'' | 'preview' | 'explanation'>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('admin-tutor-corpus', {
        body: { action: 'list', kind: kind || undefined },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setRows((data?.rows ?? []) as CorpusRow[]);
    } catch (e) {
      // An empty list and a failed load are different things, and only one of
      // them means "there is nothing here."
      setError(e instanceof Error ? e.message : 'Failed to load the corpus');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <LibraryFilterSelect
          value={kind}
          onChange={(v) => setKind(v as '' | 'preview' | 'explanation')}
          ariaLabel="Corpus entry kind"
          options={[
            { value: '', label: 'All kinds' },
            { value: 'preview', label: 'Previews' },
            { value: 'explanation', label: 'Explanations' },
          ]}
        />
        {!loading && !error ? (
          <span className="text-xs text-black/45">{rows.length} entries</span>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-black/45">Loading corpus…</p>
      ) : error ? (
        <Empty tone="error">Couldn't load the corpus. {error}</Empty>
      ) : rows.length === 0 ? (
        <Empty>Nothing in the corpus for this filter.</Empty>
      ) : (
        <ul className="divide-y divide-black/[0.08] border border-black/10 bg-white/40">
          {rows.map((r) => (
            <li key={r.id} className="px-3 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-black/45">{r.qid}</span>
                <span className="text-xs text-black/40">{r.kind}</span>
                {r.qtype ? <span className="text-xs text-black/40">· {r.qtype}</span> : null}
                <span className="ml-auto text-xs tabular-nums text-black/40">
                  {r.rating != null ? `rated ${r.rating}` : 'ungraded'}
                </span>
              </div>
              {r.content_markdown ? (
                <p className="mt-1 line-clamp-2 text-xs text-black/60">{r.content_markdown}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div
      className={cn(
        'border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm',
        tone === 'error' ? 'text-[#8a3b2f]' : 'text-black/45',
      )}
    >
      {children}
    </div>
  );
}

export default DeskLibraryReferencesSurface;
