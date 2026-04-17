import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Paperclip, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Profile {
  class_id: string;
  display_name: string | null;
}

const MAX_SIZE = 20 * 1024 * 1024;

export function NewConversationDialog({ onCreated }: { onCreated: (conversationId: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from('profiles')
      .select('class_id, display_name')
      .neq('class_id', user.id)
      .limit(200)
      .then(({ data }) => setProfiles(data ?? []));
  }, [open, user]);

  const filtered = profiles.filter((p) =>
    (p.display_name ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    p.class_id.toLowerCase().includes(filter.toLowerCase())
  );

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
      const { data: conv, error: cErr } = await supabase
        .from('conversations')
        .insert({ subject: subject.trim() || null, created_by: user.id })
        .select()
        .single();
      if (cErr || !conv) throw cErr ?? new Error('Failed');

      const { error: pErr } = await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: selectedUserId },
      ]);
      if (pErr) throw pErr;

      const { data: msg, error: mErr } = await supabase
        .from('messages')
        .insert({ conversation_id: conv.id, sender_id: user.id, body: firstMessage.trim() })
        .select()
        .single();
      if (mErr || !msg) throw mErr ?? new Error('Failed to send first message');

      if (file) {
        const path = `${conv.id}/${msg.id}/${file.name}`;
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

      toast.success('Conversation started');
      setOpen(false);
      reset();
      onCreated(conv.id);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create conversation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </DialogTrigger>
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
                placeholder="Search students…"
                className="pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {filtered.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">No matches</div>
              )}
              {filtered.map((p) => (
                <button
                  key={p.class_id}
                  onClick={() => setSelectedUserId(p.class_id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${selectedUserId === p.class_id ? 'bg-accent' : ''}`}
                >
                  {p.display_name || 'Student'} <span className="text-xs text-muted-foreground">({p.class_id.slice(0, 8)})</span>
                </button>
              ))}
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
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={submitting}>Send</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
