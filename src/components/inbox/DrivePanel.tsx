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
import { ChevronDown, Download, ExternalLink, FileArchive, FileText, Folder, Image as ImageIcon, LayoutGrid, List as ListIcon, MoreVertical, RefreshCw, Search, X } from 'lucide-react';
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
  if (mime.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-[#34a853]" />;
  if (mime.includes('folder')) return <Folder className="w-5 h-5 text-[#5f6368]" />;
  return <FileText className="w-5 h-5 text-[#4285f4]" />;
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
  const { waitForAccessToken } = await import('@/lib/waitForSession');
  const accessToken = await waitForAccessToken();
  if (!accessToken) throw new Error('Not signed in');
  const session = { access_token: accessToken };
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

// Session cache of thumbnail object URLs. undefined = never fetched, '' = known
// missing (404/non-image), string = ready object URL. Persisting these across the
// list/grid toggle avoids re-fetching the same previews repeatedly.
const thumbCache = new Map<string, string>();

/**
 * Fetches a file's preview image through the gdrive `thumbnail` proxy (which attaches
 * Drive auth server-side) and returns an object URL. An <img> tag can't carry our auth
 * header, so we fetch the bytes here and hand back a blob URL. Returns null when no
 * preview is available so the caller can render a file-type icon instead.
 */
async function fetchThumbnailUrl(file: DriveFile, sz = 400): Promise<string | null> {
  const id = file.id;
  const cached = thumbCache.get(id);
  if (cached !== undefined) return cached || null;
  try {
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
    url.searchParams.set('action', 'thumbnail');
    url.searchParams.set('id', id);
    url.searchParams.set('sz', String(sz));
    // Forward what the list response already gave us so the proxy can skip its own
    // metadata round-trip (one Drive call per thumbnail instead of two).
    if (file.thumbnailLink) url.searchParams.set('link', file.thumbnailLink);
    if (file.mimeType) url.searchParams.set('mime', file.mimeType);
    const { waitForAccessToken } = await import('@/lib/waitForSession');
    const accessToken = await waitForAccessToken();
    if (!accessToken) { thumbCache.set(id, ''); return null; }
    const session = { access_token: accessToken };
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!res.ok) { thumbCache.set(id, ''); return null; }
    const blob = await res.blob();
    if (blob.size === 0) { thumbCache.set(id, ''); return null; }
    const ct = res.headers.get('content-type') ?? blob.type ?? 'image/png';
    if (!ct.startsWith('image/')) { thumbCache.set(id, ''); return null; }
    const typed = blob.type ? blob : new Blob([blob], { type: ct });
    const objUrl = URL.createObjectURL(typed);
    thumbCache.set(id, objUrl);
    return objUrl;
  } catch {
    thumbCache.set(id, '');
    return null;
  }
}

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], sameYear
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#0b8043', '#c5221f'];
function initialsOf(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}
function avatarColor(name?: string): string {
  const s = name ?? '';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
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
  const { waitForAccessToken } = await import('@/lib/waitForSession');
  const accessToken = await waitForAccessToken();
  if (!accessToken) throw new Error('Not signed in');
  const session = { access_token: accessToken };
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
const VIEW_MODE_STORAGE_KEY = 'drive-view-mode';

type ViewMode = 'grid' | 'list';

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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return v === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [manager, setManager] = useState<ManagerState>({ kind: 'idle' });
  const managerRef = useRef<ManagerState>(manager);
  managerRef.current = manager;

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { files, nextPageToken } = await fetchPage(q, null);
      setFiles(files);
      setNextPageToken(nextPageToken);
    } catch (e: any) {
      // Without this catch a fetch failure became an unhandled rejection and
      // left an empty Drive panel with no signal (matches loadMore's handling).
      console.error('[drive] load failed:', e);
      toast.error(e?.message ?? 'Failed to load Drive files');
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
  const folders = useMemo(() => files.filter((f) => f.mimeType.includes('folder')), [files]);
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
    <div className="h-full flex flex-col bg-[#f8fafd]">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()); }}
          className="flex-1 relative group"
        >
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#444746] pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files in Drive"
            className="pl-12 h-12 rounded-full border-transparent bg-[#e9eef6] text-base text-[#1f1f1f] placeholder:text-[#444746] shadow-none transition-colors focus-visible:ring-0 focus-visible:bg-white focus-visible:shadow-[0_1px_3px_1px_rgba(60,64,67,0.15)]"
          />
        </form>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => load(submitted)}
          aria-label="Refresh"
          className="h-11 w-11 rounded-full text-[#444746] hover:bg-[#e9eef6] hover:text-[#1f1f1f]"
        >
          <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Selection bar */}
      {files.length > 0 && (
        <div className="px-5 py-2 flex items-center gap-3 shrink-0">
          <Checkbox
            checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
            onCheckedChange={toggleSelectAllVisible}
            aria-label="Select all on this page"
            className="border-[#747775] data-[state=checked]:bg-[#0b57d0] data-[state=checked]:border-[#0b57d0]"
          />
          <span className="text-[13px] font-medium text-[#444746]">
            {selected.size > 0 ? `${selected.size} selected` : `${visibleSelectable.length} files`}
          </span>
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 rounded-full text-xs text-[#0b57d0] hover:bg-[#e9eef6] hover:text-[#0b57d0]"
              onClick={clearSelection}
            >
              <X className="w-3.5 h-3.5 mr-0.5" />
              Clear
            </Button>
          )}
          {submitted && nextPageToken && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 rounded-full text-xs text-[#0b57d0] hover:bg-[#e9eef6] hover:text-[#0b57d0]"
              onClick={selectAllMatching}
              disabled={selectingAll || manager.kind !== 'idle'}
            >
              {selectingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-0.5 animate-spin" />
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
              className="h-9 rounded-full gap-2 bg-[#0b57d0] px-4 text-[13px] font-medium text-white shadow-none hover:bg-[#0842a0] disabled:bg-[#e9eef6] disabled:text-[#9aa0a6]"
              disabled={selected.size === 0 || manager.kind !== 'idle'}
              onClick={startBulkZipDownload}
            >
              <FileArchive className="w-4 h-4" />
              Download as ZIP
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#444746]">Loading…</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#444746]">No files found.</div>
        ) : (
          <div className="mx-auto max-w-[1500px] pt-1">
            {!submitted && (
              <h1 className="px-1 pb-4 pt-2 text-[22px] font-normal leading-7 text-[#1f1f1f]">
                Welcome to Drive
              </h1>
            )}

            {folders.length > 0 && (
              <section className="mb-7">
                <SectionHeader title="Suggested folders" open={foldersOpen} onToggle={() => setFoldersOpen((o) => !o)} />
                {foldersOpen && (
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {folders.map((f) => <FolderCard key={f.id} file={f} />)}
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="flex items-center justify-between">
                <SectionHeader
                  title={submitted ? 'Files' : 'Suggested files'}
                  open={filesOpen}
                  onToggle={() => setFilesOpen((o) => !o)}
                />
                <ViewToggle mode={viewMode} onChange={setViewMode} />
              </div>

              {filesOpen && (viewMode === 'grid' ? (
                <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {visibleSelectable.map((f) => (
                    <FileCard
                      key={f.id}
                      file={f}
                      selected={selected.has(f.id)}
                      anySelected={selected.size > 0}
                      disabled={manager.kind !== 'idle'}
                      onToggleSelect={() => toggleSelected(f)}
                      onOpenPreview={() => { if (PREVIEWABLE(f.mimeType)) setPreview(f); }}
                      onDownload={(format) => startSingleDownload(f, format)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-2 overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white">
                  <ul>
                    {visibleSelectable.map((f, i) => {
                      const canPreview = PREVIEWABLE(f.mimeType);
                      const isSelected = selected.has(f.id);
                      return (
                        <li
                          key={f.id}
                          className={cn(
                            'group flex items-center gap-4 px-4 py-3 transition-colors',
                            i > 0 && 'border-t border-[#f0f0f0]',
                            canPreview && 'cursor-pointer',
                            isSelected ? 'bg-[#c2e7ff]/45 hover:bg-[#c2e7ff]/60' : 'hover:bg-[#f0f4f9]',
                          )}
                          onClick={() => { if (canPreview) setPreview(f); }}
                        >
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelected(f)}
                              aria-label={`Select ${f.name}`}
                              className={cn(
                                'border-[#747775] data-[state=checked]:bg-[#0b57d0] data-[state=checked]:border-[#0b57d0]',
                                !isSelected && 'opacity-0 group-hover:opacity-100 transition-opacity',
                              )}
                            />
                          </div>
                          <div className="shrink-0">{fileIcon(f.mimeType)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-sm text-[#1f1f1f]">{f.name}</span>
                              {f.size && <span className="shrink-0 text-xs tabular-nums text-[#5f6368]">{formatBytes(f.size)}</span>}
                            </div>
                            <div className="truncate text-xs text-[#5f6368]">
                              {f.owners?.[0]?.displayName ?? ''}
                              {f.modifiedTime ? ` · ${formatRelative(f.modifiedTime)}` : ''}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <DownloadButton file={f} disabled={manager.kind !== 'idle'} onDownload={(format) => startSingleDownload(f, format)} />
                            {f.webViewLink && (
                              <a
                                href={f.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#0b57d0] hover:bg-[#e9eef6]"
                              >
                                Open <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {filesOpen && (
                <div className="flex justify-center py-6">
                  {nextPageToken ? (
                    <Button
                      size="sm"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="h-9 rounded-full border border-[#747775] bg-transparent px-5 text-[13px] font-medium text-[#0b57d0] shadow-none hover:bg-[#e9eef6]"
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                  ) : (
                    <span className="text-xs text-[#5f6368]">End of results</span>
                  )}
                </div>
              )}
            </section>
          </div>
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

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 rounded-md py-1 pr-2 text-[15px] font-medium text-[#1f1f1f] hover:text-[#0b57d0]"
    >
      <ChevronDown className={cn('h-5 w-5 text-[#444746] transition-transform', !open && '-rotate-90')} />
      {title}
    </button>
  );
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center overflow-hidden rounded-full border border-[#c4c7c5]">
      <button
        type="button"
        aria-label="List view"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        className={cn('px-3 py-1.5 transition-colors', mode === 'list' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-[#444746] hover:bg-[#f0f4f9]')}
      >
        <ListIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
        className={cn('px-3 py-1.5 transition-colors', mode === 'grid' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-[#444746] hover:bg-[#f0f4f9]')}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

function InitialsAvatar({ name }: { name?: string }) {
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
      style={{ backgroundColor: avatarColor(name) }}
      title={name}
    >
      {initialsOf(name)}
    </div>
  );
}

/**
 * Lazily fetches a file's preview via the thumbnail proxy once the card scrolls near the
 * viewport (so a 50-file page doesn't fire 50 requests at once), then renders it. Falls
 * back to a file-type icon whenever no preview is available.
 */
function DriveThumbnail({ file, className }: { file: DriveFile; className?: string }) {
  const initial = thumbCache.get(file.id);
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(initial || null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>(
    initial ? 'ok' : initial === '' ? 'fail' : 'idle',
  );

  // Reveal: mark visible when the card enters (or nears) the viewport.
  const [visible, setVisible] = useState<boolean>(thumbCache.get(file.id) !== undefined);
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Fetch: only once visible and not already resolved/loading.
  useEffect(() => {
    if (!visible || status !== 'idle') return;
    setStatus('loading');
    let cancelled = false;
    fetchThumbnailUrl(file)
      .then((u) => { if (cancelled) return; if (u) { setSrc(u); setStatus('ok'); } else setStatus('fail'); })
      .catch(() => { if (!cancelled) setStatus('fail'); });
    return () => { cancelled = true; };
    // Only re-run when visibility or file identity changes — including `status` here
    // causes the setStatus('loading') call above to immediately re-trigger the effect,
    // which cancels the in-flight promise before it can resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, file.id]);

  if (status === 'ok' && src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('object-cover object-top', className)}
        onError={() => setStatus('fail')}
      />
    );
  }
  return (
    <div ref={ref} className={cn('flex items-center justify-center bg-[#f1f3f4]', className)}>
      {status === 'fail'
        ? <span className="scale-[2]">{fileIcon(file.mimeType)}</span>
        : <div className="h-7 w-7 animate-pulse rounded-full bg-[#dadce0]" />}
    </div>
  );
}

function CardKebab({ file, onDownload, disabled, showDownload = true }: { file: DriveFile; onDownload: (format?: string) => void; disabled?: boolean; showDownload?: boolean }) {
  const formats = NATIVE_EXPORT_FORMATS[file.mimeType];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="More actions"
          className="h-8 w-8 rounded-full text-[#444746] opacity-0 transition-opacity hover:bg-[#e9eef6] group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#e3e3e3] p-1.5 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15)]">
        {showDownload && (formats ? (
          formats.map((f) => (
            <DropdownMenuItem key={f.format} onClick={() => onDownload(f.format)} className="rounded-lg px-3 py-2 text-[13px] text-[#1f1f1f] focus:bg-[#f0f4f9]">
              <Download className="mr-2 h-4 w-4 text-[#444746]" /> Download {f.label}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem onClick={() => onDownload()} className="rounded-lg px-3 py-2 text-[13px] text-[#1f1f1f] focus:bg-[#f0f4f9]">
            <Download className="mr-2 h-4 w-4 text-[#444746]" /> Download
          </DropdownMenuItem>
        ))}
        {file.webViewLink && (
          <DropdownMenuItem
            onClick={() => window.open(file.webViewLink, '_blank', 'noopener')}
            className="rounded-lg px-3 py-2 text-[13px] text-[#1f1f1f] focus:bg-[#f0f4f9]"
          >
            <ExternalLink className="mr-2 h-4 w-4 text-[#444746]" /> Open in Drive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FolderCard({ file }: { file: DriveFile }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3.5 transition-colors hover:bg-[#f0f4f9]">
      <Folder className="h-5 w-5 shrink-0 text-[#5f6368]" />
      <button
        type="button"
        onClick={() => file.webViewLink && window.open(file.webViewLink, '_blank', 'noopener')}
        className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[#1f1f1f]"
        title={file.name}
      >
        {file.name}
      </button>
      {file.webViewLink && (
        <CardKebab file={file} onDownload={() => undefined} showDownload={false} />
      )}
    </div>
  );
}

function FileCard({ file, selected, anySelected, disabled, onToggleSelect, onOpenPreview, onDownload }: {
  file: DriveFile;
  selected: boolean;
  anySelected: boolean;
  disabled?: boolean;
  onToggleSelect: () => void;
  onOpenPreview: () => void;
  onDownload: (format?: string) => void;
}) {
  const ownerName = file.owners?.[0]?.displayName;
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-colors',
        selected ? 'border-[#0b57d0] bg-[#f0f6ff]' : 'border-[#dadce0] hover:border-[#c4c7c5] hover:bg-[#f8fafd]',
      )}
    >
      <div className="flex h-11 items-center gap-2 px-3">
        <span className="shrink-0">{fileIcon(file.mimeType)}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#1f1f1f]" title={file.name}>{file.name}</span>
        <div className="shrink-0">
          <CardKebab file={file} onDownload={onDownload} disabled={disabled} />
        </div>
      </div>

      <div
        onClick={onOpenPreview}
        className="relative h-[150px] w-full cursor-pointer border-y border-[#e8eaed] bg-[#f8fafd]"
      >
        <DriveThumbnail file={file} className="h-full w-full" />
        <span
          className={cn(
            'absolute left-2 top-2 transition-opacity',
            selected || anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${file.name}`}
            className="h-[18px] w-[18px] border-[#747775] bg-white data-[state=checked]:border-[#0b57d0] data-[state=checked]:bg-[#0b57d0]"
          />
        </span>
      </div>

      <div className="flex h-11 items-center gap-2 px-3">
        <InitialsAvatar name={ownerName} />
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#5f6368]">
          {ownerName ? `${ownerName} · ` : ''}{formatRelative(file.modifiedTime)}
        </span>
      </div>
    </div>
  );
}

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
        className="h-8 rounded-full px-3 text-[13px] font-medium text-[#0b57d0] hover:bg-[#e9eef6] hover:text-[#0b57d0]"
        onClick={() => onDownload()}
        disabled={disabled}
        aria-label="Download"
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
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
          className="h-8 rounded-full px-3 text-[13px] font-medium text-[#0b57d0] hover:bg-[#e9eef6] hover:text-[#0b57d0]"
          disabled={disabled}
          aria-label="Download as"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download
          <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#e3e3e3] p-1.5 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15)]">
        {formats.map((f) => (
          <DropdownMenuItem
            key={f.format}
            onClick={() => onDownload(f.format)}
            className="rounded-lg px-3 py-2 text-[13px] text-[#1f1f1f] focus:bg-[#f0f4f9]"
          >
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
