import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Folder, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
};

function formatBytes(b?: string) {
  if (!b) return '';
  const n = Number(b);
  if (!Number.isFinite(n)) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-muted-foreground" />;
  if (mime.includes('folder')) return <Folder className="w-4 h-4 text-muted-foreground" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

export function DrivePanel() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const load = useMemo(() => async (q: string) => {
    setLoading(true);
    try {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
      url.searchParams.set('action', 'list');
      if (q) url.searchParams.set('q', q);
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? 'Failed to load Drive');
      setFiles(json.files ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load Drive');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(submitted); }, [load, submitted]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-3 flex items-center gap-2 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()); }}
          className="flex-1 relative"
        >
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files in Drive"
            className="pl-8 h-9 text-sm"
          />
        </form>
        <Button variant="ghost" size="icon" onClick={() => load(submitted)} aria-label="Refresh">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No files found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {files.map((f) => (
              <li key={f.id} className="px-4 py-2.5 hover:bg-muted/40 flex items-center gap-3">
                <div className="shrink-0">{fileIcon(f.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium truncate">{f.name}</span>
                    {f.size && <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{formatBytes(f.size)}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {f.owners?.[0]?.displayName ?? ''}
                    {f.modifiedTime ? ` · ${new Date(f.modifiedTime).toLocaleDateString()}` : ''}
                  </div>
                </div>
                {f.webViewLink && (
                  <a
                    href={f.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
