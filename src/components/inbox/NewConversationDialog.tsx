import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Paperclip, FileText, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { initialsFromName } from './inboxDisplay';

interface Student {
  class_id: string;
  display_name: string | null;
}

const MAX_SIZE = 20 * 1024 * 1024;

export function NewConversationDialog({
  onCreated,
  showTrigger = true,
  autoOpenWith,
  onAutoOpenHandled,
}: {
  onCreated: (conversationId: string) => void;
  showTrigger?: boolean;
  // When this changes to a truthy string, the dialog opens with the recipient
  // preselected. Used for cross-surface entry points like Mainhub "Ask Joshua".
  autoOpenWith?: string | null;
  onAutoOpenHandled?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoOpenWith) return;
    setSelectedUserId(autoOpenWith);
    setOpen(true);
    onAutoOpenHandled?.();
    // onAutoOpenHandled is a one-shot clearer; excluding it keeps the effect
    // from re-firing if the parent's callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenWith]);

  useEffect(() => {
    if (!open || !user) return;
    setLoadingRoster(true);
    // Only surface students who can actually receive and reply to messages
    // (has_chat_access). Messaging anyone else would land in a thread they
    // cannot open. Self is excluded.
    supabase
      .from('profiles')
      .select('class_id, display_name')
      .neq('class_id', user.id)
      .eq('has_chat_access', true)
      .order('display_name', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        setStudents((data ?? []) as Student[]);
        setLoadingRoster(false);
      });
  }, [open, user]);

  const query = filter.trim().toLowerCase();
  const filtered = query
    ? students.filter((p) => (p.display_name ?? '').toLowerCase().includes(query))
    : students;

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

  const reset = () => {
    setSubject('');
    setFirstMessage('');
    setSelectedUserId(null);
    setFilter('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const create = async () => {
    if (!user || !selectedUserId || (!firstMessage.trim() && !file)) {
      toast.error('Pick a recipient and write a message or attach a PDF');
      return;
    }
    setSubmitting(true);
    try {
      // Atomic reuse-or-create — no client-side check-then-insert race, so a
      // student never ends up with two parallel 1:1 threads.
      const { data: convId, error: rpcErr } = await supabase.rpc(
        'admin_get_or_create_conversation' as never,
        { _student: selectedUserId, _subject: subject.trim() || null } as never,
      );
      if (rpcErr) throw rpcErr;
      if (!convId || typeof convId !== 'string') throw new Error('Could not open conversation');

      const { data: msg, error: mErr } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, sender_id: user.id, body: firstMessage.trim() })
        .select()
        .single();
      if (mErr || !msg) throw mErr ?? new Error('Failed to send first message');

      if (file) {
        const path = `${convId}/${msg.id}/${file.name}`;
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

      // Best-effort offline email notification (mirrors MessageComposer).
      void supabase.functions
        .invoke('notify-new-message', { body: { conversationId: convId, messageId: msg.id } })
        .catch((err) => console.warn('[NewConversationDialog] notify-new-message failed', err));

      toast.success('Message sent');
      setOpen(false);
      reset();
      onCreated(convId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create conversation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Recipient</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search students by name…"
                className="pl-9"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {loadingRoster ? (
                <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  {students.length === 0
                    ? 'No chat-enabled students yet.'
                    : 'No students match your search.'}
                </div>
              ) : (
                filtered.map((p) => {
                  const name = p.display_name?.trim() || 'Student';
                  const selected = selectedUserId === p.class_id;
                  return (
                    <button
                      key={p.class_id}
                      onClick={() => setSelectedUserId(p.class_id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${selected ? 'bg-accent' : ''}`}
                    >
                      <span className="w-8 h-8 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-semibold">
                        {initialsFromName(name)}
                      </span>
                      <span className="truncate font-medium">{name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Weekly check-in" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} placeholder="Write your first message…" rows={4} />
          </div>
          {file && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={submitting}>
            <Paperclip className="w-4 h-4 mr-1" /> Attach PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={create} disabled={submitting || !selectedUserId}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
