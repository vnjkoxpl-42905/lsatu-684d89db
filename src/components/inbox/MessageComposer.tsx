import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CalendarPlus,
  Check,
  Cloud,
  FileText,
  Image as ImageIcon,
  Mail,
  MessageSquareText,
  Paperclip,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
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
import {
  buildExternalWorkUploadInsert,
  classifyInboxAttachmentMime,
  validateInboxAttachment,
} from '@/lib/inboxAttachments';

type DeliveryMode = 'message' | 'email' | 'both';

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
  const [composerFocused, setComposerFocused] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('both');
  const [messageType, setMessageType] = useState('Coaching reply');
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const clearAttachment = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

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
    const error = validateInboxAttachment({ type: f.type, size: f.size });
    if (error) {
      toast.error(error);
      return;
    }
    setFile(f);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const pastedFile = imageItem.getAsFile();
    if (!pastedFile) return;

    event.preventDefault();
    const extension = pastedFile.type.split('/')[1] || 'png';
    const screenshotFile = new File(
      [pastedFile],
      `pasted-screenshot-${Date.now()}.${extension}`,
      { type: pastedFile.type },
    );
    pickFile(screenshotFile);
    toast.success('Screenshot pasted and attached');
  };

  useEffect(() => {
    if (!file || classifyInboxAttachmentMime(file.type) !== 'image') {
      setFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

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
    } catch (e: unknown) {
      setPolished(null);
      toast.error(errorMessage(e, 'Polish failed'));
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
        const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
        const path = `${conversationId}/${msg.id}/${Date.now()}-${safeName}`;
        const mimeType = file.type || 'application/octet-stream';
        const { error: upErr } = await supabase.storage
          .from('message-attachments')
          .upload(path, file, { contentType: mimeType, upsert: false });
        if (upErr) throw upErr;
        const { error: attErr } = await supabase.from('message_attachments').insert({
          message_id: msg.id,
          kind: 'storage',
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: mimeType,
        });
        if (attErr) throw attErr;

        const externalUploadRow = buildExternalWorkUploadInsert({
          senderId: user.id,
          senderIsAdmin: isAdmin,
          fileName: file.name,
          fileType: mimeType,
          storagePath: path,
        });
        if (externalUploadRow) {
          const { error: mirrorErr } = await supabase.from('external_work_uploads').insert(externalUploadRow);
          if (mirrorErr) {
            console.warn('[MessageComposer] external upload mirror failed', mirrorErr);
            toast.error('Message sent, but the upload review row could not be created');
          }
        }
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
      clearAttachment();
      setDriveAttachments([]);
      setPolished(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
        textareaRef.current.style.overflowY = 'hidden';
      }
      onSent?.();
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const canSend = !!body.trim() || !!file || driveAttachments.length > 0;
  const smartDeliveryScaffold = {
    recommended: (file || driveAttachments.length > 0 ? 'both' : 'message') as DeliveryMode,
    reason: file || driveAttachments.length > 0
      ? 'Attachment present, so keep an in-app copy and prepare email backup.'
      : 'No file context yet, so an in-app coaching reply is the lightest path.',
    signals: [
      messageType,
      file || driveAttachments.length > 0 ? 'has attachments' : 'text only',
      'student activity pending',
    ],
  };
  const deliveryLabel: Record<DeliveryMode, string> = {
    message: 'Message',
    email: 'Email',
    both: 'Both',
  };

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
    <div className={cn('shrink-0 bg-transparent', isAdmin ? 'px-4 py-4 sm:px-6' : 'px-4 py-5 sm:px-6')}>
      <div className={cn('mx-auto space-y-4', isAdmin ? 'max-w-4xl' : 'max-w-3xl')}>
      {file && (
        <div className={cn('flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm shadow-sm', isAdmin ? 'border-[#d8c6ad] bg-[#fffaf0]' : 'border-[#eadfcf] bg-white')}>
          {filePreviewUrl ? (
            <img
              src={filePreviewUrl}
              alt={file.name}
              className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : classifyInboxAttachmentMime(file.type) === 'image' ? (
            <div className="flex items-center justify-center h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 shrink-0">
              <ImageIcon className="w-4 h-4 text-slate-400" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 shrink-0">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-[#211b16]">{file.name}</div>
            <div className="mt-0.5 text-[11px] text-[#7a6b58]">
              {classifyInboxAttachmentMime(file.type) === 'image' ? 'Screenshot preview ready. Paste another to replace it.' : 'PDF ready to send'}
            </div>
          </div>
          <button
            onClick={clearAttachment}
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
        <div className="space-y-4 rounded-2xl border border-[#d8c6ad] bg-[#fffaf0] px-5 py-4 shadow-lg ring-1 ring-black/5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b5b42]">
            <Wand2 className="h-3.5 w-3.5" />
            Composer Polish
          </div>
          <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#211b16]">{polished}</div>
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
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-all',
          isAdmin
            ? 'border-[#d8c6ad] bg-[#fffaf0] shadow-[0_18px_48px_rgba(52,39,23,0.12)] focus-within:border-[#a14f43]/50'
            : 'border-[#eadfcf] bg-white shadow-[0_12px_34px_rgba(63,45,24,0.08)] focus-within:border-[#7f8f69]/50',
        )}
      >
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eadfcf] bg-[#fff8ea] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#182131] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#f7edd7]">
                <Sparkles className="h-3 w-3 text-[#f0d28e]" />
                Smart: {deliveryLabel[deliveryMode]}
              </span>
              <span className="hidden text-[11px] font-semibold text-[#7a6b58] sm:inline">
                Recommended {deliveryLabel[smartDeliveryScaffold.recommended]} · {smartDeliveryScaffold.reason}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[#eadfcf] p-1">
              {(['message', 'email', 'both'] as DeliveryMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDeliveryMode(mode)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] transition',
                    deliveryMode === mode ? 'bg-[#a14f43] text-white shadow-sm' : 'text-[#5f513f] hover:bg-white/70',
                  )}
                >
                  {deliveryLabel[mode]}
                </button>
              ))}
            </div>
          </div>
        )}
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
          onFocus={() => setComposerFocused(true)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={isAdmin ? 'Message with files, templates, and assignment context...' : 'Ask Joshua a question or send study context'}
          className={cn(
            'w-full resize-none border-0 bg-transparent px-5 py-4 text-[15px] font-medium shadow-none focus-visible:ring-0',
            isAdmin ? 'text-[#211b16] placeholder:text-[#9a8b76]' : 'text-slate-800 placeholder:text-slate-400',
          )}
          style={{ height: isAdmin && composerFocused ? '82px' : '54px', overflowY: 'hidden', transition: 'height 160ms ease' }}
        />
        {isAdmin && composerFocused && (
          <div className="grid gap-3 border-t border-[#eadfcf] bg-[#fffaf0] px-3 py-3 md:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap items-center gap-2">
              {['Coaching reply', 'Assignment note', 'Check-in', 'File follow-up'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMessageType(label)}
                  className={cn(
                    'rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] transition',
                    messageType === label
                      ? 'border-[#a14f43] bg-[#a14f43] text-white'
                      : 'border-[#d8c6ad] bg-white/70 text-[#5f513f] hover:border-[#a14f43]/50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-[#eadfcf] px-2.5 py-2 text-[11px] font-black text-[#5f513f]">
                <Bot className="h-3.5 w-3.5" />
                Context sources
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-[#eadfcf] px-2.5 py-2 text-[11px] font-black text-[#5f513f]">
                <CalendarPlus className="h-3.5 w-3.5" />
                Follow-up
              </button>
            </div>
            <div className="md:col-span-2 rounded-xl bg-[#f1e6d4] px-3 py-2 text-[11px] font-semibold text-[#665a4b]">
              Training scaffold: {smartDeliveryScaffold.signals.join(' / ')}. Override is captured in UI state; backend persistence is pending.
            </div>
          </div>
        )}
        <div className={cn('flex items-center gap-2 border-t px-3 py-2', isAdmin ? 'border-[#eadfcf]' : 'border-slate-50')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Attach PDF or screenshot"
            className={cn('h-9 w-9 rounded-xl', isAdmin ? 'text-[#7a6b58] hover:bg-[#eadfcf] hover:text-[#211b16]' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50')}
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
              className="h-9 w-9 rounded-xl text-[#7a6b58] hover:bg-[#eadfcf] hover:text-[#211b16]"
            >
              <Sparkles className={`w-4.5 h-4.5 ${polishing ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          {isAdmin && (
            <div className="hidden items-center gap-1.5 text-[11px] font-black text-[#7a6b58] sm:flex">
              {deliveryMode === 'message' ? <MessageSquareText className="h-3.5 w-3.5" /> : deliveryMode === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              {deliveryLabel[deliveryMode]} selected
            </div>
          )}
          <div className="flex-1" />
          <Button
            onClick={send}
            disabled={sending || !canSend}
            size="icon"
            variant={canSend ? 'default' : 'ghost'}
            aria-label="Send"
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              canSend
                ? isAdmin
                  ? 'bg-[#a14f43] text-white shadow-sm hover:bg-[#8d453a]'
                  : 'bg-[#203024] text-white shadow-sm hover:bg-[#2c4231]'
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
