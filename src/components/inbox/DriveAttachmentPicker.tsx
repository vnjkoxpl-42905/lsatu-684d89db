import { useEffect, useMemo, useState } from 'react';
import { Cloud, Search, FileText, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DriveFileRow = {
  id: string;
  google_file_id: string;
  file_name: string;
  mime_type: string | null;
  web_view_link: string;
  thumbnail_url: string | null;
};

export function DriveAttachmentPicker({
  onAttach,
  disabled,
}: {
  onAttach: (files: DriveFileRow[]) => void;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DriveFileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('drive_files')
      .select('id, google_file_id, file_name, mime_type, web_view_link, thumbnail_url')
      .eq('admin_user_id', user.id)
      .order('picked_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load Drive library');
        } else {
          setFiles(data ?? []);
        }
        setLoading(false);
      });
  }, [open, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.file_name.toLowerCase().includes(q));
  }, [files, query]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const attach = () => {
    const picks = files.filter((f) => selected[f.id]);
    if (picks.length === 0) return;
    onAttach(picks);
    setSelected({});
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Attach from Google Drive"
          title="Attach from Google Drive"
        >
          <Cloud className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border space-y-2">
          <div className="text-sm font-medium">Attach from Drive</div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library…"
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-72">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground space-y-2">
              {files.length === 0 ? (
                <>
                  <div>Your Drive library is empty.</div>
                  <Link
                    to="/admin/drive-files"
                    className="text-primary underline underline-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    Pick files from Drive →
                  </Link>
                </>
              ) : (
                <div>No matches.</div>
              )}
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((f) => {
                const isSelected = !!selected[f.id];
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [f.id]: !s[f.id] }))}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{f.file_name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Make sure these files are shared in Drive (Anyone with link, or with each student).
          </p>
          <Button size="sm" className="w-full" onClick={attach} disabled={selectedCount === 0}>
            Attach {selectedCount || ''} file{selectedCount === 1 ? '' : 's'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
