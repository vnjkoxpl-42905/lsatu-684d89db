import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  FileText,
  Image as ImageIcon,
  Link2,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

const QUICK_EMOJIS = [
  '😀', '😁', '😂', '🙂', '😊', '😍', '😎', '🤔',
  '👍', '👏', '🙌', '🙏', '💪', '🔥', '✨', '🎉',
  '✅', '❌', '⭐', '💡', '📚', '📝', '⏰', '🚀',
  '❤️', '💯', '😅', '😬', '😴', '🤝', '👀', '🎯',
];

interface MessageComposerProps {
  conversationId: string | null;
  onSent?: () => void;
  onResolveConversation?: () => Promise<string>;
  onConversationResolved?: (conversationId: string) => void;
  studentFacing?: boolean;
}

export function MessageComposer({
  conversationId,
  onSent,
  onResolveConversation,
  onConversationResolved,
  studentFacing = false,
}: MessageComposerProps) {
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
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

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

  const isAdmin = !studentFacing && !permissions.loading && permissions.is_admin;
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
    if (text.length < 3 || !conversationId) return;
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

  const insertAtCursor = (snippet: string, selectInsideOffset?: number) => {
    const el = textareaRef.current;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    setPolished(null);
    requestAnimationFrame(() => {
      adjustHeight();
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      const caret = start + (selectInsideOffset ?? snippet.length);
      node.setSelectionRange(caret, caret);
    });
  };

  const openLinkDialog = () => {
    const el = textareaRef.current;
    const selected = el ? body.slice(el.selectionStart, el.selectionEnd) : '';
    setLinkText(selected);
    setLinkUrl('');
    setLinkOpen(true);
  };

  const applyLink = () => {
    let url = linkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) {
      url = `https://${url}`;
    }
    const text = linkText.trim();
    const snippet = text ? `[${text}](${url})` : url;
    insertAtCursor(snippet);
    setLinkOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setEmojiOpen(false);
  };

  const send = async () => {
    if (!user) return;
    const text = body.trim();
    if (!text && !file && driveAttachments.length === 0) return;
    setSending(true);

    try {
      let resolvedConversationId = conversationId;
      if (!resolvedConversationId) {
        if (!onResolveConversation) throw new Error('No conversation available');
        resolvedConversationId = await onResolveConversation();
        onConversationResolved?.(resolvedConversationId);
      }

      const { data: msg, error: msgErr } = await supabase
        .from('messages')
        .insert({ conversation_id: resolvedConversationId, sender_id: user.id, body: text })
        .select()
        .single();
      if (msgErr || !msg) throw msgErr ?? new Error('Failed to send');

      if (file) {
        const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
        const path = `${resolvedConversationId}/${msg.id}/${Date.now()}-${safeName}`;
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

        // For non-admin (student) uploads, mirror the file into a per-student
        // folder in the private `inbox-uploads` bucket. This gives each student
        // their own archive folder that also feeds the admin review queue via
        // `external_work_uploads`.
        let mirrorBucket = 'message-attachments';
        let mirrorPath = path;
        if (!isAdmin && classifyInboxAttachmentMime(mimeType) === 'image') {
          const inboxPath = `${user.id}/${msg.id}-${safeName}`;
          const { error: copyErr } = await supabase.storage
            .from('message-attachments')
            .copy(path, inboxPath, { destinationBucket: 'inbox-uploads' } as { destinationBucket: string });
          if (copyErr) {
            console.warn('[MessageComposer] inbox-uploads mirror copy failed', copyErr);
          } else {
            mirrorBucket = 'inbox-uploads';
            mirrorPath = inboxPath;
          }
        }

        const externalUploadRow = buildExternalWorkUploadInsert({
          senderId: user.id,
          senderIsAdmin: isAdmin,
          fileName: file.name,
          fileType: mimeType,
          storagePath: mirrorPath,
        }, { storageBucket: mirrorBucket });
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
    <div className={cn('shrink-0 bg-transparent', isAdmin ? 'px-3 py-3 sm:px-5' : 'px-4 py-5 sm:px-6')}>
      <div className={cn('mx-auto space-y-3', isAdmin ? 'max-w-5xl' : 'max-w-3xl')}>
      {file && (
        <div className={cn('flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm shadow-sm', isAdmin ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 bg-white')}>
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
            <div className="truncate text-xs font-bold text-zinc-900">{file.name}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
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
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 shadow-lg ring-1 ring-black/5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <Wand2 className="h-3.5 w-3.5" />
            Composer Polish
          </div>
          <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-zinc-900">{polished}</div>
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
              disabled={sending || polishing || body.trim().length < 3 || !conversationId}
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
          'relative overflow-hidden rounded-[22px] border transition-all',
          isAdmin
            ? 'border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:border-zinc-300'
            : 'border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:border-zinc-300',
        )}
      >
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
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={isAdmin ? 'Message this student...' : 'Ask Joshua a question or send study context'}
          className={cn(
            'w-full resize-none border-0 bg-transparent px-5 py-3.5 text-[15px] font-medium shadow-none focus-visible:ring-0',
            isAdmin ? 'text-zinc-800 placeholder:text-zinc-400' : 'text-zinc-800 placeholder:text-zinc-400',
          )}
          style={{ height: '54px', overflowY: 'hidden', transition: 'height 160ms ease' }}
        />
        <div className={cn('flex items-center gap-2 border-t px-3 py-2', isAdmin ? 'border-zinc-100' : 'border-zinc-100')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Attach PDF or screenshot"
            className={cn('h-9 w-9 rounded-xl', isAdmin ? 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600')}
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
              disabled={sending || polishing || body.trim().length < 3 || !conversationId}
              aria-label="Polish with AI"
              title="Polish with AI"
              className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <Sparkles className={`w-4.5 h-4.5 ${polishing ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={openLinkDialog}
            disabled={sending}
            aria-label="Add link"
            title="Add link"
            className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <Link2 className="w-4.5 h-4.5" />
          </Button>
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={sending}
                aria-label="Insert emoji"
                title="Insert emoji"
                className="h-9 w-9 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <Smile className="w-4.5 h-4.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <div className="grid grid-cols-8 gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-zinc-100"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex-1" />
          <Button
            onClick={send}
            disabled={sending || !canSend || (!conversationId && !onResolveConversation)}
            size="icon"
            variant={canSend ? 'default' : 'ghost'}
            aria-label="Send"
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              canSend
                ? 'bg-[#18181b] text-white shadow-sm hover:bg-[#27272a]'
                : "text-zinc-300 hover:bg-transparent"
            )}
          >
            <Send className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Add link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="composer-link-url" className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                URL
              </Label>
              <Input
                id="composer-link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                placeholder="https://..."
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="composer-link-text" className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Text
              </Label>
              <Input
                id="composer-link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                placeholder="Optional link text..."
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={applyLink}
              disabled={!linkUrl.trim()}
              className="bg-[#2F6A8D] px-8 text-white hover:bg-[#295d7c]"
            >
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
