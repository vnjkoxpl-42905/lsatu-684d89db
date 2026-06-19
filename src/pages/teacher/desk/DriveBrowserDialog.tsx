import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, FileText, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DriveFileRef } from './AssistantComposer';

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

/**
 * In-app Drive browser. Calls the `gdrive` edge function (workspace Google Drive
 * connector) so we don't trigger Google's client-side OAuth picker — which can
 * be blocked by managed-account policies (ERR_BLOCKED_BY_RESPONSE).
 */
export function DriveBrowserDialog({
  open,
  onOpenChange,
  onAttach,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (files: DriveFileRef[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const base = import.meta.env.VITE_SUPABASE_URL as string;
      const params = new URLSearchParams({ action: 'list' });
      if (q) params.set('q', q);
      const res = await fetch(`${base}/functions/v1/gdrive?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error ?? `Drive request failed (${res.status})`);
      }
      setFiles((json?.files ?? []) as DriveFile[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load Drive';
      setError(msg);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load(debounced);
  }, [open, debounced, load]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
      setSelected({});
      setError(null);
    }
  }, [open]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const attach = () => {
    const picks: DriveFileRef[] = files
      .filter((f) => selected[f.id])
      .map((f) => ({
        fileId: f.id,
        name: f.name,
        mimeType: f.mimeType ?? '',
        url: f.webViewLink ?? '',
      }));
    if (picks.length === 0) return;
    onAttach(picks);
    onOpenChange(false);
    toast.success(`Attached ${picks.length} file${picks.length === 1 ? '' : 's'}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">Attach from Google Drive</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Drive…"
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[360px] border-t border-border">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading Drive…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : files.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {debounced ? 'No files match that search.' : 'No files found in Drive.'}
            </div>
          ) : (
            <ul className="py-1">
              {files.map((f) => {
                const isSelected = !!selected[f.id];
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [f.id]: !s[f.id] }))}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-accent"
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{f.name}</div>
                        {f.modifiedTime ? (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {new Date(f.modifiedTime).toLocaleDateString()}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <DialogFooter className="border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={attach} disabled={selectedCount === 0}>
            Attach {selectedCount || ''} file{selectedCount === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
