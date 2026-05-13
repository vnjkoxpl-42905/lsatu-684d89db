import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, ExternalLink, FileText, Folder, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
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

const PREVIEWABLE = (mime: string) =>
  mime === 'application/pdf' ||
  mime.startsWith('image/') ||
  mime.startsWith('video/') ||
  mime.startsWith('audio/') ||
  mime.startsWith('text/') ||
  mime.startsWith('application/vnd.google-apps.');

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

async function fetchPage(q: string, pageToken: string | null) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
  url.searchParams.set('action', 'list');
  if (q) url.searchParams.set('q', q);
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const session = (await supabase.auth.getSession()).data.session;
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? 'Failed to load Drive');
  return { files: (json.files ?? []) as DriveFile[], nextPageToken: (json.nextPageToken ?? null) as string | null };
}

async function downloadFile(file: DriveFile) {
  const t = toast.loading(`Downloading ${file.name}…`);
  try {
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
    url.searchParams.set('action', 'download');
    url.searchParams.set('id', file.id);
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      let msg = `Download failed (${res.status})`;
      try { const j = JSON.parse(errText); if (j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }
    // Filename from Content-Disposition if present
    const cd = res.headers.get('Content-Disposition') ?? '';
    const m = cd.match(/filename="?([^"]+)"?/i);
    const filename = m?.[1] ?? file.name;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    toast.success(`Downloaded ${filename}`, { id: t });
  } catch (e: any) {
    toast.error(e?.message ?? 'Download failed', { id: t });
  }
}

export function DrivePanel() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [preview, setPreview] = useState<DriveFile | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { files, nextPageToken } = await fetchPage(q, null);
      setFiles(files);
      setNextPageToken(nextPageToken);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load Drive');
      setFiles([]);
      setNextPageToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const { files: more, nextPageToken: next } = await fetchPage(submitted, nextPageToken);
      setFiles((prev) => [...prev, ...more]);
      setNextPageToken(next);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore, submitted]);

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
          <>
            <ul className="divide-y divide-border">
              {files.map((f) => {
                const canPreview = PREVIEWABLE(f.mimeType);
                return (
                  <li
                    key={f.id}
                    className={cn(
                      'px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40',
                      canPreview && 'cursor-pointer',
                    )}
                    onClick={() => { if (canPreview) setPreview(f); }}
                  >
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
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-4 flex justify-center">
              {nextPageToken ? (
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">End of results</span>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-medium pr-8">
              {preview && fileIcon(preview.mimeType)}
              <span className="truncate">{preview?.name}</span>
              {preview?.webViewLink && (
                <a
                  href={preview.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline"
                >
                  Open in Drive <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/20">
            {preview && (
              <iframe
                key={preview.id}
                src={`https://drive.google.com/file/d/${preview.id}/preview`}
                className="w-full h-full border-0"
                allow="autoplay"
                title={preview.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
