import { useRef, useState } from 'react';
import { Paperclip, Send, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MAX_SIZE = 20 * 1024 * 1024;

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent?: () => void }) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const send = async () => {
    if (!user) return;
    const text = body.trim();
    if (!text && !file) return;
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
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: 'application/pdf',
        });
        if (attErr) throw attErr;
      }

      setBody('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onSent?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

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
        <Button onClick={send} disabled={sending || (!body.trim() && !file)} size="icon" aria-label="Send">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
