import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, ExternalLink, FileArchive, FileText, Folder, Image as ImageIcon, RefreshCw, Search, X } from 'lucide-react';
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

const NATIVE_EXPORT_FORMATS: Record<string, { format: string; label: string; ext: string }[]> = {
  'application/vnd.google-apps.document': [
    { format: 'pdf',  label: 'PDF',       ext: 'pdf' },
    { format: 'docx', label: 'Word (.docx)', ext: 'docx' },
    { format: 'odt',  label: 'OpenDocument (.odt)', ext: 'odt' },
    { format: 'rtf',  label: 'Rich Text (.rtf)', ext: 'rtf' },
    { format: 'txt',  label: 'Plain text (.txt)', ext: 'txt' },
    { format: 'html', label: 'HTML', ext: 'html' },
    { format: 'epub', label: 'EPUB', ext: 'epub' },
  ],
  'application/vnd.google-apps.spreadsheet': [
    { format: 'xlsx', label: 'Excel (.xlsx)', ext: 'xlsx' },
    { format: 'ods',  label: 'OpenDocument (.ods)', ext: 'ods' },
    { format: 'pdf',  label: 'PDF', ext: 'pdf' },
    { format: 'csv',  label: 'CSV (first sheet)', ext: 'csv' },
    { format: 'tsv',  label: 'TSV (first sheet)', ext: 'tsv' },
  ],
  'application/vnd.google-apps.presentation': [
    { format: 'pptx', label: 'PowerPoint (.pptx)', ext: 'pptx' },
    { format: 'odp',  label: 'OpenDocument (.odp)', ext: 'odp' },
    { format: 'pdf',  label: 'PDF', ext: 'pdf' },
    { format: 'txt',  label: 'Plain text (.txt)', ext: 'txt' },
  ],
  'application/vnd.google-apps.drawing': [
    { format: 'pdf',  label: 'PDF', ext: 'pdf' },
    { format: 'png',  label: 'PNG image', ext: 'png' },
    { format: 'jpeg', label: 'JPEG image', ext: 'jpg' },
    { format: 'svg',  label: 'SVG', ext: 'svg' },
  ],
  'application/vnd.google-apps.script': [
    { format: 'json', label: 'Apps Script JSON', ext: 'json' },
  ],
  'application/vnd.google-apps.jam': [
    { format: 'pdf', label: 'PDF', ext: 'pdf' },
  ],
};

function defaultExtFor(file: DriveFile, format?: string): string {
  if (format) {
    const ext = NATIVE_EXPORT_FORMATS[file.mimeType]?.find((f) => f.format === format)?.ext;
    if (ext) return ext;
  }
  // Try to keep existing extension on binary files
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(file.name);
  return m ? m[1] : '';
}

function defaultFilenameFor(file: DriveFile, format?: string): string {
  const ext = defaultExtFor(file, format);
  if (!ext) return file.name;
  const re = new RegExp(`\\.${ext}$`, 'i');
  return re.test(file.name) ? file.name : `${file.name}.${ext}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n]+/g, '_').trim() || 'file';
}

function formatBytes(b?: string | number) {
  if (b === undefined || b === null || b === '') return '';
  const n = typeof b === 'number' ? b : Number(b);
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

const PREVIEWABLE = (mime: string) =>
  mime === 'application/pdf' ||
  mime.startsWith('image/') ||
  mime.startsWith('video/') ||
  mime.startsWith('audio/') ||
  mime.startsWith('text/') ||
  mime.startsWith('application/vnd.google-apps.');

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

/** Streams a file from the gdrive edge function with progress + abort support. */
async function streamDownload(
  file: DriveFile,
  format: string | undefined,
  signal: AbortSignal,
  onProgress: (loaded: number, total: number | null) => void,
): Promise<{ blob: Blob; suggestedName: string }> {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
  url.searchParams.set('action', 'download');
  url.searchParams.set('id', file.id);
  if (format) url.searchParams.set('format', format);
  const session = (await supabase.auth.getSession()).data.session;
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    signal,
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* binary */ }
    throw new Error(msg);
  }
  const totalHeader = res.headers.get('Content-Length');
  const total = totalHeader ? Number(totalHeader) : null;

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const suggestedName = m?.[1] ? decodeURIComponent(m[1]) : defaultFilenameFor(file, format);

  const reader = res.body?.getReader();
  if (!reader) {
    const blob = await res.blob();
    onProgress(blob.size, blob.size);
    return { blob, suggestedName };
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress(loaded, total);
    }
  }
  const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('Content-Type') ?? 'application/octet-stream' });
  return { blob, suggestedName };
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

// ─────────────────────────────────────────────────────────────────────
// Download Manager (progress + cancel + filename prompt + ZIP)
// ─────────────────────────────────────────────────────────────────────

const SELECTION_STORAGE_KEY = 'drive-selection-v1';
const ZIP_NAME_STORAGE_KEY = 'drive-last-zip-name';

type FileEntry = { file: DriveFile; format?: string };

type ManagerState =
  | { kind: 'idle' }
  | {
      kind: 'naming';
      mode: 'single' | 'zip';
      entries: FileEntry[];
      defaultName: string;
      resolve: (name: string | null) => void;
    }
  | {
      kind: 'progress';
      mode: 'single' | 'zip';
      title: string;
      current: number; // 1-based
      total: number;
      currentName: string;
      currentLoaded: number;
      currentTotal: number | null;
      overallPct: number; // 0-100
      controller: AbortController;
    };

export function DrivePanel() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [preview, setPreview] = useState<DriveFile | null>(null);
  // Selection persists across pagination, search, and refresh (and across reloads
  // via localStorage). Stored as Map<id, DriveFile> so the file metadata travels
  // with the selection even if the underlying `files` page no longer contains it.
  const [selected, setSelected] = useState<Map<string, DriveFile>>(() => {
    try {
      const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
      if (!raw) return new Map();
      const arr = JSON.parse(raw) as [string, DriveFile][];
      return new Map(arr);
    } catch {
      return new Map();
    }
  });
  useEffect(() => {
    try {
      if (selected.size === 0) {
        localStorage.removeItem(SELECTION_STORAGE_KEY);
      } else {
        localStorage.setItem(
          SELECTION_STORAGE_KEY,
          JSON.stringify(Array.from(selected.entries())),
        );
      }
    } catch {
      // Quota exceeded or storage disabled. Silent fail; in-memory state still works.
    }
  }, [selected]);
  const [selectingAll, setSelectingAll] = useState(false);
  const [manager, setManager] = useState<ManagerState>({ kind: 'idle' });
  const managerRef = useRef<ManagerState>(manager);
  managerRef.current = manager;

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { files, nextPageToken } = await fetchPage(q, null);
      setFiles(files);
      setNextPageToken(nextPageToken);
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

  // ---------- selection helpers ----------
  const toggleSelected = useCallback((file: DriveFile) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(file.id)) next.delete(file.id); else next.set(file.id, file);
      return next;
    });
  }, []);
  const visibleSelectable = useMemo(
    () => files.filter((f) => !f.mimeType.includes('folder')),
    [files],
  );
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every((f) => selected.has(f.id));
  const someVisibleSelected = visibleSelectable.some((f) => selected.has(f.id)) && !allVisibleSelected;
  const toggleSelectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Map(prev);
      const allOn = visibleSelectable.every((f) => next.has(f.id));
      if (allOn) {
        // Deselect only the currently visible ones; preserve off-page selections.
        for (const f of visibleSelectable) next.delete(f.id);
      } else {
        for (const f of visibleSelectable) next.set(f.id, f);
      }
      return next;
    });
  }, [visibleSelectable]);
  const clearSelection = useCallback(() => setSelected(new Map()), []);

  const selectAllMatching = useCallback(async () => {
    if (selectingAll) return;
    setSelectingAll(true);
    const collected = new Map(selected);
    let token: string | null = null;
    let pagesScanned = 0;
    const MAX_PAGES = 50;
    try {
      do {
        const { files: page, nextPageToken } = await fetchPage(submitted, token);
        for (const f of page) {
          if (!f.mimeType.includes('folder')) collected.set(f.id, f);
        }
        token = nextPageToken;
        pagesScanned++;
        setSelected(new Map(collected));
        if (pagesScanned >= MAX_PAGES && token) {
          toast.warning(`Selection capped at ${MAX_PAGES} pages (${collected.size} files). Refine your search to select more.`);
          break;
        }
      } while (token);
      if (pagesScanned < MAX_PAGES || !token) {
        toast.success(`Selected ${collected.size} matching files`);
      }
    } catch (e: any) {
      // Keep whatever was collected up to this point; toast and bail.
      setSelected(new Map(collected));
      toast.error(e?.message ?? 'Failed to select all matching');
    } finally {
      setSelectingAll(false);
    }
  }, [selected, submitted, selectingAll]);

  // ---------- name prompt ----------
  const promptForName = useCallback((mode: 'single' | 'zip', entries: FileEntry[], defaultName: string) => {
    return new Promise<string | null>((resolve) => {
      setManager({ kind: 'naming', mode, entries, defaultName, resolve });
    });
  }, []);

  // ---------- single file flow ----------
  const startSingleDownload = useCallback(async (file: DriveFile, format?: string) => {
    const defaultName = defaultFilenameFor(file, format);
    const chosen = await promptForName('single', [{ file, format }], defaultName);
    if (chosen === null) { setManager({ kind: 'idle' }); return; }
    const filename = sanitizeFilename(chosen);

    const controller = new AbortController();
    setManager({
      kind: 'progress',
      mode: 'single',
      title: `Downloading ${filename}`,
      current: 1,
      total: 1,
      currentName: filename,
      currentLoaded: 0,
      currentTotal: file.size ? Number(file.size) : null,
      overallPct: 0,
      controller,
    });

    try {
      const { blob } = await streamDownload(file, format, controller.signal, (loaded, total) => {
        setManager((m) => m.kind === 'progress' ? {
          ...m,
          currentLoaded: loaded,
          currentTotal: total,
          overallPct: total ? Math.min(100, Math.round((loaded / total) * 100)) : Math.min(99, m.overallPct + 1),
        } : m);
      });
      triggerBlobDownload(blob, filename);
      toast.success(`Downloaded ${filename}`);
    } catch (e: any) {
      if (e?.name === 'AbortError') toast.message('Download cancelled');
      else toast.error(e?.message ?? 'Download failed');
    } finally {
      setManager({ kind: 'idle' });
    }
  }, [promptForName]);

  // ---------- ZIP flow for selection ----------
  const startBulkZipDownload = useCallback(async () => {
    if (selected.size === 0) return;
    const entries: FileEntry[] = Array.from(selected.values()).map((file) => ({ file }));
    if (entries.length === 0) return;

    const defaultZipName = (() => {
      try {
        const saved = localStorage.getItem(ZIP_NAME_STORAGE_KEY);
        if (saved) return saved;
      } catch { /* ignore */ }
      return `drive-files-${new Date().toISOString().slice(0, 10)}.zip`;
    })();
    const chosen = await promptForName('zip', entries, defaultZipName);
    if (chosen === null) { setManager({ kind: 'idle' }); return; }
    let zipName = sanitizeFilename(chosen);
    if (!/\.zip$/i.test(zipName)) zipName += '.zip';

    const controller = new AbortController();
    const zip = new JSZip();
    const total = entries.length;
    const usedNames = new Set<string>();

    setManager({
      kind: 'progress',
      mode: 'zip',
      title: `Building ${zipName}`,
      current: 0,
      total,
      currentName: '',
      currentLoaded: 0,
      currentTotal: null,
      overallPct: 0,
      controller,
    });

    try {
      for (let i = 0; i < entries.length; i++) {
        if (controller.signal.aborted) throw new DOMException('aborted', 'AbortError');
        const entry = entries[i];
        const baseName = sanitizeFilename(defaultFilenameFor(entry.file, entry.format));
        let name = baseName;
        let n = 1;
        while (usedNames.has(name.toLowerCase())) {
          const dot = baseName.lastIndexOf('.');
          name = dot > 0 ? `${baseName.slice(0, dot)} (${n})${baseName.slice(dot)}` : `${baseName} (${n})`;
          n++;
        }
        usedNames.add(name.toLowerCase());

        setManager((m) => m.kind === 'progress' ? { ...m, current: i + 1, currentName: name, currentLoaded: 0, currentTotal: entry.file.size ? Number(entry.file.size) : null } : m);

        const { blob } = await streamDownload(entry.file, entry.format, controller.signal, (loaded, fileTotal) => {
          setManager((m) => {
            if (m.kind !== 'progress') return m;
            const perFile = fileTotal ? loaded / fileTotal : 0;
            const overall = ((i + perFile) / total) * 100;
            return {
              ...m,
              currentLoaded: loaded,
              currentTotal: fileTotal,
              overallPct: Math.min(99, Math.round(overall)),
            };
          });
        });
        zip.file(name, blob);
      }

      setManager((m) => m.kind === 'progress' ? { ...m, title: `Compressing ${zipName}`, currentName: zipName, currentLoaded: 0, currentTotal: null, overallPct: 99 } : m);

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) => {
        setManager((m) => m.kind === 'progress' ? { ...m, overallPct: Math.min(100, Math.round(meta.percent)) } : m);
      });
      if (controller.signal.aborted) throw new DOMException('aborted', 'AbortError');
      triggerBlobDownload(zipBlob, zipName);
      try { localStorage.setItem(ZIP_NAME_STORAGE_KEY, zipName); } catch { /* ignore */ }
      toast.success(`Downloaded ${zipName} (${entries.length} files)`);
      setSelected(new Map());
    } catch (e: any) {
      if (e?.name === 'AbortError') toast.message('Download cancelled');
      else toast.error(e?.message ?? 'Bulk download failed');
    } finally {
      setManager({ kind: 'idle' });
    }
  }, [files, selected, promptForName]);

  const cancelActive = useCallback(() => {
    const m = managerRef.current;
    if (m.kind === 'progress') m.controller.abort();
    else if (m.kind === 'naming') { m.resolve(null); }
  }, []);

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

      {/* Selection bar */}
      {files.length > 0 && (
        <div className="border-b border-border px-4 py-2 flex items-center gap-3 shrink-0 bg-muted/20">
          <Checkbox
            checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
            onCheckedChange={toggleSelectAllVisible}
            aria-label="Select all on this page"
          />
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : `${visibleSelectable.length} files`}
          </span>
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
            >
              <X className="w-3 h-3 mr-0.5" />
              Clear
            </Button>
          )}
          {submitted && nextPageToken && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={selectAllMatching}
              disabled={selectingAll || manager.kind !== 'idle'}
            >
              {selectingAll ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-0.5 animate-spin" />
                  Selecting…
                </>
              ) : (
                <>+ Select all matching</>
              )}
            </Button>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              disabled={selected.size === 0 || manager.kind !== 'idle'}
              onClick={startBulkZipDownload}
            >
              <FileArchive className="w-3.5 h-3.5" />
              Download as ZIP
            </Button>
          </div>
        </div>
      )}

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
                const isFolder = f.mimeType.includes('folder');
                const isSelected = selected.has(f.id);
                return (
                  <li
                    key={f.id}
                    className={cn(
                      'px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40',
                      canPreview && 'cursor-pointer',
                      isSelected && 'bg-primary/5',
                    )}
                    onClick={() => { if (canPreview) setPreview(f); }}
                  >
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelected(f)}
                        disabled={isFolder}
                        aria-label={`Select ${f.name}`}
                      />
                    </div>
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
                    <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!isFolder && (
                        <DownloadButton file={f} disabled={manager.kind !== 'idle'} onDownload={(format) => startSingleDownload(f, format)} />
                      )}
                      {f.webViewLink && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline px-1.5"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
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

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-medium pr-8">
              {preview && fileIcon(preview.mimeType)}
              <span className="truncate">{preview?.name}</span>
              <div className="ml-auto flex items-center gap-1">
                {preview && (
                  <DownloadButton
                    file={preview}
                    disabled={manager.kind !== 'idle'}
                    onDownload={(format) => startSingleDownload(preview, format)}
                  />
                )}
                {preview?.webViewLink && (
                  <a
                    href={preview.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline px-1.5"
                  >
                    Open in Drive <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
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

      {/* Filename prompt */}
      <FilenamePrompt
        state={manager.kind === 'naming' ? manager : null}
        onConfirm={(name) => { if (manager.kind === 'naming') manager.resolve(name); }}
        onCancel={() => { if (manager.kind === 'naming') manager.resolve(null); }}
      />

      {/* Progress indicator */}
      <ProgressOverlay
        state={manager.kind === 'progress' ? manager : null}
        onCancel={cancelActive}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function DownloadButton({ file, onDownload, disabled }: {
  file: DriveFile;
  onDownload: (format?: string) => void;
  disabled?: boolean;
}) {
  const formats = NATIVE_EXPORT_FORMATS[file.mimeType];

  if (!formats) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[11px]"
        onClick={() => onDownload()}
        disabled={disabled}
        aria-label="Download"
      >
        <Download className="w-3 h-3 mr-1" />
        Download
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
          disabled={disabled}
          aria-label="Download as"
        >
          <Download className="w-3 h-3 mr-1" />
          Download
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formats.map((f) => (
          <DropdownMenuItem key={f.format} onClick={() => onDownload(f.format)} className="text-xs">
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilenamePrompt({
  state,
  onConfirm,
  onCancel,
}: {
  state: Extract<ManagerState, { kind: 'naming' }> | null;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  useEffect(() => { if (state) setName(state.defaultName); }, [state]);
  const open = !!state;
  const isZip = state?.mode === 'zip';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isZip ? 'Save ZIP archive as…' : 'Save file as…'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            onConfirm(trimmed);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="dl-filename" className="text-xs">Filename</Label>
            <Input
              id="dl-filename"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => {
                const dot = e.target.value.lastIndexOf('.');
                if (dot > 0) e.target.setSelectionRange(0, dot);
                else e.target.select();
              }}
            />
            {isZip && state && (
              <p className="text-[11px] text-muted-foreground">
                {state.entries.length} file{state.entries.length === 1 ? '' : 's'} will be compressed into this archive.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgressOverlay({
  state,
  onCancel,
}: {
  state: Extract<ManagerState, { kind: 'progress' }> | null;
  onCancel: () => void;
}) {
  if (!state) return null;
  const { title, current, total, currentName, currentLoaded, currentTotal, overallPct, mode } = state;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Download className="w-4 h-4 text-primary animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          {mode === 'zip' && (
            <div className="text-[11px] text-muted-foreground">File {Math.max(1, current)} of {total}</div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCancel}
          aria-label="Cancel download"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="px-4 py-3 space-y-2">
        {currentName && (
          <div className="text-[11px] text-muted-foreground truncate">{currentName}</div>
        )}
        <Progress value={overallPct} className="h-2" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>
            {formatBytes(currentLoaded)}{currentTotal ? ` / ${formatBytes(currentTotal)}` : ''}
          </span>
          <span>{overallPct}%</span>
        </div>
      </div>
    </div>
  );
}
