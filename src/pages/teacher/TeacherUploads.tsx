import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Loader2, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminUploadsQueue } from '@/hooks/useExternalWorkUploads';
import { cn } from '@/lib/utils';

export default function TeacherUploads() {
  const [allFilter, setAllFilter] = useState(false);
  const { data: uploads = [], isLoading, refetch } = useAdminUploadsQueue({ all: allFilter });
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const updateStatus = async (id: string, status: 'parsed' | 'needs_review' | 'failed') => {
    setBusy(id);
    try {
      const patch: Record<string, unknown> = {
        processing_status: status,
        reviewed_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from('external_work_uploads')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['external-uploads-queue'] });
      await refetch();
      toast.success('Updated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const openSigned = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('external-work-uploads')
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Could not open');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="px-6 py-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-zinc-400">
            <UploadCloud className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Uploads
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight mt-1">Review queue</h2>
        </div>
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900/60 text-[11px]">
          <button
            onClick={() => setAllFilter(false)}
            className={cn(
              'px-3 py-1.5 rounded-md transition-colors',
              !allFilter ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
            )}
          >
            Needs review
          </button>
          <button
            onClick={() => setAllFilter(true)}
            className={cn(
              'px-3 py-1.5 rounded-md transition-colors',
              allFilter ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100',
            )}
          >
            All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-500 flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
        </div>
      ) : uploads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          Nothing to review.
        </div>
      ) : (
        <ul className="space-y-2">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-100 truncate">{u.file_name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {u.upload_type.replace('_', ' ')} · {format(new Date(u.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
                  {u.processing_status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openSigned(u.storage_path)}
                  className="h-7 px-2 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Open
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus(u.id, 'parsed')}
                  disabled={busy === u.id}
                  className="h-7 px-2 text-xs"
                >
                  <Check className="w-3 h-3 mr-1.5" />
                  Mark parsed
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateStatus(u.id, 'needs_review')}
                  disabled={busy === u.id}
                  className="h-7 px-2 text-xs"
                >
                  Flag for review
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
