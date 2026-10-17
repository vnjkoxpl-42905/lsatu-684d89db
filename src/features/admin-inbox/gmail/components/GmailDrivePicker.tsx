import { useEffect, useState } from "react";
import { Loader2, FileText, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

interface GmailDrivePickerProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms one or more files. The picker downloads them and returns their bytes. */
  onAttach: (files: Array<{ filename: string; mimeType: string; dataBase64: string; size: number }>) => void;
}

async function fetchDrivePage(q: string, pageToken: string | null) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
  url.searchParams.set("action", "list");
  if (q) url.searchParams.set("q", q);
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const { waitForAccessToken } = await import("@/lib/waitForSession");
  const accessToken = await waitForAccessToken();
  const session = { access_token: accessToken ?? "" };
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? "Failed to load Drive");
  return {
    files: (json.files ?? []) as DriveFile[],
    nextPageToken: (json.nextPageToken ?? null) as string | null,
  };
}

async function downloadDriveFile(file: DriveFile): Promise<{ filename: string; mimeType: string; dataBase64: string; size: number }> {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdrive`);
  url.searchParams.set("action", "download");
  url.searchParams.set("id", file.id);
  // Default export: gdrive picks PDF for Google-native formats.
  if (file.mimeType.startsWith("application/vnd.google-apps.")) {
    url.searchParams.set("format", "pdf");
  }
  const { waitForAccessToken } = await import("@/lib/waitForSession");
  const accessToken = await waitForAccessToken();
  const session = { access_token: accessToken ?? "" };
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* binary */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  // Suggested filename from Content-Disposition; fallback to name (with .pdf for native).
  const disp = res.headers.get("Content-Disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disp);
  const suggestedName = m?.[1]
    ? decodeURIComponent(m[1])
    : file.mimeType.startsWith("application/vnd.google-apps.")
      ? `${file.name}.pdf`
      : file.name;
  const mimeType = res.headers.get("Content-Type")?.split(";")[0]?.trim()
    || (file.mimeType.startsWith("application/vnd.google-apps.") ? "application/pdf" : file.mimeType);

  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Encode in 32KB chunks to avoid blowing the call stack on large files.
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const dataBase64 = btoa(bin);
  return { filename: suggestedName, mimeType, dataBase64, size: bytes.length };
}

export function GmailDrivePicker({ open, onClose, onAttach }: GmailDrivePickerProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, DriveFile>>({});
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDrivePage(debounced, null)
      .then((p) => { if (!cancelled) setFiles(p.files); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, debounced]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected({});
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const selectedList = Object.values(selected);

  function toggle(file: DriveFile) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[file.id]) delete next[file.id];
      else next[file.id] = file;
      return next;
    });
  }

  async function handleAttach() {
    if (!selectedList.length) return;
    setAttaching(true);
    setError(null);
    try {
      const downloaded = [];
      for (const f of selectedList) {
        downloaded.push(await downloadDriveFile(f));
      }
      onAttach(downloaded);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Attach from Drive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !attaching) onClose(); }}
    >
      <div className="bg-background border border-border rounded-lg shadow-2xl w-[640px] max-w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Attach from Drive</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            disabled={attaching}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Drive…"
              className="pl-8 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading Drive…
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-sm text-destructive">{error}</div>
          ) : files.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No files found</div>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => {
                const checked = !!selected[f.id];
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => toggle(f)}
                      className={cn(
                        "w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent/50",
                        checked && "bg-accent/40",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="h-4 w-4 accent-foreground"
                      />
                      {f.iconLink ? (
                        <img src={f.iconLink} alt="" className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {f.mimeType.split(/[./]/).pop()}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {selectedList.length ? `${selectedList.length} selected` : "Select files to attach"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={attaching}>Cancel</Button>
            <Button size="sm" onClick={handleAttach} disabled={!selectedList.length || attaching} className="gap-1.5">
              {attaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Attach
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
