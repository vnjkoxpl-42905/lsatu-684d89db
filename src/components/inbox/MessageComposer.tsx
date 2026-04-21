import { useRef, useState } from 'react';
import { Paperclip, Send, X, FileText, Sparkles, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { toast } from 'sonner';
import { DriveAttachmentPicker, type DriveFileRow } from './DriveAttachmentPicker';

const MAX_SIZE = 20 * 1024 * 1024;

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent?: () => void }) {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [driveAttachments, setDriveAttachments] = useState<DriveFileRow[]>([]);
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polished, setPolished] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = !permissions.loading && permissions.is_admin;
  const showPolish = isAdmin;
  const showDrive = isAdmin;

  const addDriveFiles = (picks: DriveFileRow[]) => {
    setDriveAttachments((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of picks) map.set(p.id, p);
      return Array.from(map.values());
    });
  };

  const removeDriveFile = (id: string) => {
    setDriveAttachments((prev) => prev.filter((d) => d.id !== id));
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error('File must be under 20MB');
      return;
    }
    setFile(f);
  };

  const polish = async () => {
    const text = body.trim();
    if (text.length < 3) return;
    setPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('polish-message', {
        body: { text, conversationId },
      });
      if (error) throw error;
      const next = (data as { polished?: string } | null)?.polished;
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('No polished text returned');
      }
      setPolished(next);
    } catch (e: any) {
      setPolished(null);
      toast.error(e?.message ?? 'Polish failed');
    } finally {
      setPolishing(false);
    }
  };

  const send = async () => {
    if (!user) return;
    const text = body.trim();
    if (!text && !file && driveAttachments.length === 0) return;
    setSending(true);

    try {
      const { data: msg, error: msgErr } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
        .select()
        .single();
      if (msgErr || !msg) throw msgErr ?? new Error('Failed to send');

      if (file) {
        const path = `${conversationId}/${msg.id}/${file.name}`;
        const { error: upErr } = await supabase.storage
          .from('message-attachments')
          .upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (upErr) throw upErr;
        const { error: attErr } = await supabase.from('message_attachments').insert({
          message_id: msg.id,
          kind: 'storage',
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: 'application/pdf',
        });
        if (attErr) throw attErr;
      }

      if (driveAttachments.length > 0) {
        const rows = driveAttachments.map((d) => ({
          message_id: msg.id,
          kind: 'drive',
          storage_path: null,
          drive_file_id: d.id,
          web_view_link: d.web_view_link,
          file_name: d.file_name,
          file_size: 0,
          mime_type: d.mime_type ?? 'application/vnd.google-apps.unknown',
        }));
        const { error: dErr } = await supabase.from('message_attachments').insert(rows);
        if (dErr) throw dErr;
      }

      setBody('');
      setFile(null);
      setDriveAttachments([]);
      setPolished(null);
      if (fileRef.current) fileRef.current.value = '';
      onSent?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const canSend = !!body.trim() || !!file || driveAttachments.length > 0;

  return (
    <div className="border-t border-border bg-background p-3 space-y-2">
      {file && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="flex-1 truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {driveAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {driveAttachments.map((d) => (
            <div
              key={d.id}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted/40 text-xs max-w-full"
            >
              <Cloud className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[180px]">{d.file_name}</span>
              <button
                onClick={() => removeDriveFile(d.id)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label={`Remove ${d.file_name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {polished !== null && (
        <div className="px-3 py-2 rounded-md border border-border bg-muted/40 text-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Polished version</div>
          <div className="whitespace-pre-wrap">{polished}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                setBody(polished);
                setPolished(null);
              }}
              disabled={sending || polishing}
            >
              Use this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPolished(null)}
              disabled={sending || polishing}
            >
              Keep mine
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={polish}
              disabled={sending || polishing || body.trim().length < 3}
            >
              Try again
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          aria-label="Attach PDF"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        {showDrive && (
          <DriveAttachmentPicker onAttach={addDriveFiles} disabled={sending} />
        )}
        {showPolish && (
          <Button
            variant="ghost"
            size="icon"
            onClick={polish}
            disabled={sending || polishing || body.trim().length < 3}
            aria-label="Polish with AI"
            title="Polish with AI"
          >
            <Sparkles className={`w-4 h-4 ${polishing ? 'animate-pulse' : ''}`} />
          </Button>
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          className="min-h-[44px] max-h-32 resize-none flex-1"
        />
        <Button onClick={send} disabled={sending || !canSend} size="icon" aria-label="Send">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
