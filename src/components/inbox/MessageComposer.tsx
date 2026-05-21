import { useMemo, useRef, useState } from 'react';
import { Paperclip, Send, X, FileText, Sparkles, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { toast } from 'sonner';
import { DriveAttachmentPicker, type DriveFileRow } from './DriveAttachmentPicker';
import { TemplateSuggestionPalette } from '@/components/teacher/templates/TemplateSuggestionPalette';
import {
  filterMessageTemplates,
  replaceSlashCommand,
  slashTemplateQuery,
  type MessageTemplate,
} from '@/lib/messageTemplates';

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
  const [templates] = useState<MessageTemplate[]>([]);
  const [templatePaletteOpen, setTemplatePaletteOpen] = useState(false);
  const [templatePaletteIndex, setTemplatePaletteIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '44px';
    const next = Math.min(el.scrollHeight, 128);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 128 ? 'auto' : 'hidden';
  };

  const isAdmin = !permissions.loading && permissions.is_admin;
  const showPolish = isAdmin;
  const showDrive = isAdmin;

  const templateQuery = slashTemplateQuery(body);
  const filteredTemplates = useMemo(
    () => filterMessageTemplates(templates, templateQuery ?? ''),
    [templates, templateQuery],
  );

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

  const setBodyAndResize = (next: string) => {
    setBody(next);
    const query = slashTemplateQuery(next);
    setTemplatePaletteOpen(query !== null && templates.length > 0);
    setTemplatePaletteIndex(0);
    requestAnimationFrame(adjustHeight);
  };

  const insertTemplate = (template: MessageTemplate) => {
    const next = replaceSlashCommand(body, template.body);
    setBody(next);
    setPolished(null);
    setTemplatePaletteOpen(false);
    requestAnimationFrame(() => {
      adjustHeight();
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
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
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
        textareaRef.current.style.overflowY = 'hidden';
      }
      onSent?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const canSend = !!body.trim() || !!file || driveAttachments.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (templatePaletteOpen && filteredTemplates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTemplatePaletteIndex((index) => (index + 1) % filteredTemplates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTemplatePaletteIndex((index) => (index - 1 + filteredTemplates.length) % filteredTemplates.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        insertTemplate(filteredTemplates[templatePaletteIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setTemplatePaletteOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="px-6 py-6 shrink-0 bg-transparent">
      <div className="mx-auto max-w-4xl space-y-4">
      {file && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 truncate text-xs font-semibold text-slate-700">{file.name}</span>
          <button
            onClick={() => setFile(null)}
            className="text-slate-400 hover:text-slate-900 transition-colors"
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {driveAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {driveAttachments.map((d) => (
            <div
              key={d.id}
              className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs max-w-full shadow-sm"
            >
              <Cloud className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[200px] font-semibold text-slate-700">{d.file_name}</span>
              <button
                onClick={() => removeDriveFile(d.id)}
                className="text-slate-400 hover:text-slate-900 shrink-0 transition-colors"
                aria-label={`Remove ${d.file_name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {polished !== null && (
        <div className="px-5 py-4 rounded-2xl border border-slate-200 bg-white shadow-lg space-y-4 ring-1 ring-black/5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
            AI Polished Version
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">{polished}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                setBody(polished);
                setPolished(null);
              }}
              disabled={sending || polishing}
              className="h-8 px-4 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Apply this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPolished(null)}
              disabled={sending || polishing}
              className="h-8 px-4 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-50"
            >
              Discard
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={polish}
              disabled={sending || polishing || body.trim().length < 3}
              className="h-8 px-4 text-xs font-bold text-slate-400 rounded-lg hover:bg-slate-50"
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-slate-900/5 focus-within:border-slate-300 transition-all">
        <TemplateSuggestionPalette
          open={templatePaletteOpen}
          templates={filteredTemplates}
          activeIndex={templatePaletteIndex}
          onActiveIndexChange={setTemplatePaletteIndex}
          onSelect={insertTemplate}
          onClose={() => setTemplatePaletteOpen(false)}
        />
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBodyAndResize(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Joshua a question or send study context"
          className="w-full resize-none min-h-0 border-0 bg-transparent px-5 py-4 text-[15px] shadow-none focus-visible:ring-0 placeholder:text-slate-400 text-slate-800 font-medium"
          style={{ height: '54px', overflowY: 'hidden', transition: 'none' }}
        />
        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Attach PDF"
            className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
          >
            <Paperclip className="w-4.5 h-4.5" />
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
              className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
            >
              <Sparkles className={`w-4.5 h-4.5 ${polishing ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          <div className="flex-1" />
          <span className="hidden sm:inline text-[10px] font-bold text-slate-300 tracking-widest mr-3 select-none">CMD+ENTER</span>
          <Button
            onClick={send}
            disabled={sending || !canSend}
            size="icon"
            variant={canSend ? 'default' : 'ghost'}
            aria-label="Send"
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              canSend 
                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm" 
                : "text-slate-300 hover:bg-transparent"
            )}
          >
            <Send className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
