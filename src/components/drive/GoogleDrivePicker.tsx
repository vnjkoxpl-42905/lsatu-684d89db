import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, SlidersHorizontal, X, FileText, Users, LayoutGrid, List as ListIcon } from "lucide-react";
import { GoogleDriveIcon } from "@/components/icons/GoogleDriveIcon";
import { driveAuthHeaders, type DriveFile } from "@/lib/googleDriveClient";
import { cn } from "@/lib/utils";

export type { DriveFile } from "@/lib/googleDriveClient";

interface GoogleDrivePickerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Called with the selected Drive files when the user confirms. May return a
   * Promise; the picker shows a busy state until it resolves, then closes. Throw
   * to surface an error inside the picker and keep it open.
   */
  onConfirm: (files: DriveFile[]) => void | Promise<void>;
  /** Header label next to the Drive logo. Defaults to "Select files". */
  title?: string;
  /** Confirm-button label. Defaults to "Select". */
  confirmLabel?: string;
}

type Scope = "recent" | "mydrive" | "sharedwithme" | "starred";

const TABS: Array<{ scope: Scope; label: string }> = [
  { scope: "recent", label: "Recent" },
  { scope: "mydrive", label: "My Drive" },
  { scope: "sharedwithme", label: "Shared with me" },
  { scope: "starred", label: "Starred" },
];

async function fetchDrivePage(scope: Scope, q: string, pageToken: string | null) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
  url.searchParams.set("action", "list");
  url.searchParams.set("scope", scope);
  if (q) url.searchParams.set("q", q);
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const res = await fetch(url.toString(), { headers: await driveAuthHeaders() });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? "Failed to load Drive");
  return {
    files: (json.files ?? []) as DriveFile[],
    nextPageToken: (json.nextPageToken ?? null) as string | null,
  };
}

// --- Date bucketing, mirrors Google's "Yesterday / Earlier this week / Last week" headers ---
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateBucket(modifiedTime?: string): { key: string; label: string; order: number } {
  if (!modifiedTime) return { key: "older", label: "Earlier", order: 99 };
  const now = new Date();
  const today = startOfDay(now);
  const dayMs = 86_400_000;
  const mod = startOfDay(new Date(modifiedTime));
  const diffDays = Math.round((today.getTime() - mod.getTime()) / dayMs);
  // Day index where Sunday = 0; week starts on Sunday like Google's locale default.
  const startOfThisWeek = new Date(today.getTime() - today.getDay() * dayMs);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * dayMs);

  if (diffDays <= 0) return { key: "today", label: "Today", order: 0 };
  if (diffDays === 1) return { key: "yesterday", label: "Yesterday", order: 1 };
  if (mod.getTime() >= startOfThisWeek.getTime()) return { key: "thisweek", label: "Earlier this week", order: 2 };
  if (mod.getTime() >= startOfLastWeek.getTime()) return { key: "lastweek", label: "Last week", order: 3 };
  return { key: "older", label: "Earlier", order: 4 };
}

function groupByDate(files: DriveFile[]) {
  const groups = new Map<string, { label: string; order: number; files: DriveFile[] }>();
  for (const f of files) {
    const b = dateBucket(f.modifiedTime);
    if (!groups.has(b.key)) groups.set(b.key, { label: b.label, order: b.order, files: [] });
    groups.get(b.key)!.files.push(f);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/** Authenticated thumbnail fetch → object URL, with icon fallback. Used by grid view. */
function Thumb({ file }: { file: DriveFile }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
        url.searchParams.set("action", "thumbnail");
        url.searchParams.set("id", file.id);
        url.searchParams.set("sz", "400");
        if (file.thumbnailLink) url.searchParams.set("link", file.thumbnailLink);
        if (file.mimeType) url.searchParams.set("mime", file.mimeType);
        const res = await fetch(url.toString(), { headers: await driveAuthHeaders() });
        const ct = res.headers.get("Content-Type") ?? "";
        if (!res.ok || !ct.startsWith("image/")) {
          // Drain the body so it doesn't leak, then fall back to the icon.
          try { await res.arrayBuffer(); } catch { /* ignore */ }
          throw new Error("no thumb");
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.thumbnailLink, file.mimeType]);

  if (src && !failed) {
    return <img src={src} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f8f9fa]">
      {file.iconLink ? (
        <img src={file.iconLink} alt="" className="h-8 w-8" />
      ) : (
        <FileText className="h-8 w-8 text-[#5f6368]" />
      )}
    </div>
  );
}

export function GoogleDrivePicker({ open, onClose, onConfirm, title = "Select files", confirmLabel = "Select" }: GoogleDrivePickerProps) {
  const [scope, setScope] = useState<Scope>("recent");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, DriveFile>>({});
  const [attaching, setAttaching] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDrivePage(scope, debounced, null)
      .then((p) => { if (!cancelled) setFiles(p.files); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, scope, debounced]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected({});
      setError(null);
      setScope("recent");
      setView("list");
    }
  }, [open]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const grouped = useMemo(() => groupByDate(files), [files]);

  if (!open) return null;

  function toggle(file: DriveFile) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[file.id]) delete next[file.id];
      else next[file.id] = file;
      return next;
    });
  }

  async function handleConfirm() {
    if (!selectedList.length) return;
    setAttaching(true);
    setError(null);
    try {
      await onConfirm(selectedList);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAttaching(false);
    }
  }

  const scopeLabel = TABS.find((t) => t.scope === scope)?.label ?? "Recent";

  return (
    <div
      role="dialog"
      aria-label="Select files from Google Drive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !attaching) onClose(); }}
    >
      {/* Pure-white Google Picker chrome, independent of the app theme. */}
      <div className="flex h-[min(86vh,760px)] w-[920px] max-w-full flex-col overflow-hidden rounded-2xl bg-white text-[#202124] shadow-2xl">
        {/* Header: logo + title + search + close */}
        <div className="flex items-center gap-4 px-5 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <GoogleDriveIcon className="h-6 w-6" />
            <span className="text-[15px] font-medium text-[#3c4043]">{title}</span>
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6368]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in Drive or paste URL"
              className="h-11 w-full rounded-full border-none bg-[#f1f3f4] pl-12 pr-12 text-[15px] text-[#202124] outline-none placeholder:text-[#5f6368] focus:bg-[#eceff1]"
              autoFocus
            />
            <SlidersHorizontal className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6368]" aria-hidden />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={attaching}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-[#5f6368] hover:bg-black/5 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#dadce0] px-5">
          {TABS.map((t) => {
            const active = t.scope === scope;
            return (
              <button
                key={t.scope}
                type="button"
                onClick={() => setScope(t.scope)}
                className={cn(
                  "relative -mb-px px-3 py-3 text-[14px] font-medium transition-colors",
                  active ? "text-[#1a73e8]" : "text-[#5f6368] hover:text-[#202124]",
                )}
              >
                {t.label}
                {active ? <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-[#1a73e8]" /> : null}
              </button>
            );
          })}
        </div>

        {/* Sub-bar: scope label + view toggle */}
        <div className="flex items-center justify-between px-5 pt-3">
          <span className="text-[13px] text-[#5f6368]">{scopeLabel}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              className={cn("rounded-full p-1.5 hover:bg-black/5", view === "list" ? "text-[#1a73e8]" : "text-[#5f6368]")}
            >
              <ListIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={cn("rounded-full p-1.5 hover:bg-black/5", view === "grid" ? "text-[#1a73e8]" : "text-[#5f6368]")}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-[#5f6368]">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading Drive…
            </div>
          ) : error ? (
            <div className="py-10 text-[14px] text-[#d93025]">{error}</div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center text-[14px] text-[#5f6368]">No files found</div>
          ) : view === "list" ? (
            <>
              {/* Name column header */}
              <div className="sticky top-0 z-[1] border-b border-[#dadce0] bg-white py-2 text-[13px] font-medium text-[#202124]">
                Name
              </div>
              {grouped.map((g) => (
                <div key={g.label}>
                  <div className="px-1 pb-1 pt-3 text-[12px] text-[#5f6368]">{g.label}</div>
                  <ul>
                    {g.files.map((f) => {
                      const checked = !!selected[f.id];
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => toggle(f)}
                            className={cn(
                              "flex w-full items-center gap-3 border-b border-[#f1f3f4] px-1 py-3 text-left text-[14px] hover:bg-[#f8f9fa]",
                              checked && "bg-[#e8f0fe] hover:bg-[#e8f0fe]",
                            )}
                          >
                            {f.iconLink ? (
                              <img src={f.iconLink} alt="" className="h-5 w-5 shrink-0" />
                            ) : (
                              <FileText className="h-5 w-5 shrink-0 text-[#5f6368]" />
                            )}
                            <span className="truncate text-[#202124]">{f.name}</span>
                            {f.shared ? <Users className="h-4 w-4 shrink-0 text-[#5f6368]" /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            // Grid view
            <div className="py-3">
              {grouped.map((g) => (
                <div key={g.label} className="mb-4">
                  <div className="px-1 pb-2 pt-1 text-[12px] text-[#5f6368]">{g.label}</div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {g.files.map((f) => {
                      const checked = !!selected[f.id];
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggle(f)}
                          className={cn(
                            "group overflow-hidden rounded-lg border text-left transition-colors",
                            checked ? "border-[#1a73e8] bg-[#e8f0fe]" : "border-[#dadce0] hover:bg-[#f8f9fa]",
                          )}
                        >
                          <div className="h-28 w-full overflow-hidden border-b border-[#dadce0]">
                            <Thumb file={f} />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2">
                            {f.iconLink ? (
                              <img src={f.iconLink} alt="" className="h-4 w-4 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-[#5f6368]" />
                            )}
                            <span className="truncate text-[13px] text-[#202124]">{f.name}</span>
                            {f.shared ? <Users className="h-3.5 w-3.5 shrink-0 text-[#5f6368]" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#dadce0] px-5 py-3">
          <span className="mr-auto text-[13px] text-[#5f6368]">
            {selectedList.length ? `${selectedList.length} selected` : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={attaching}
            className="rounded-full px-5 py-2 text-[14px] font-medium text-[#1a73e8] hover:bg-[#e8f0fe] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedList.length || attaching}
            className="flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-2 text-[14px] font-medium text-white hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#5f6368]"
          >
            {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
