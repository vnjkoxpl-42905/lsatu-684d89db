import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  FileText,
  Image as ImageIcon,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import './inbox-thread.css';
import { appendQuestionContext, seedQuestionContext } from '@/lib/inboxQuestionContext';

const QUICK_EMOJIS = [
  '😀', '😁', '😂', '🙂', '😊', '😍', '😎', '🤔',
  '👍', '👏', '🙌', '🙏', '💪', '🔥', '✨', '🎉',
  '✅', '❌', '⭐', '💡', '📚', '📝', '⏰', '🚀',
  '❤️', '💯', '😅', '😬', '😴', '🤝', '👀', '🎯',
];

/** Text handed to the composer from outside (e.g. empty-state prompt chips).
 *  `nonce` forces re-application when the same text is picked twice. */
export interface ComposerSeed {
  text: string;
  nonce: number;
}

/** Optimistic-send hooks: the thread view renders a local bubble the moment
 *  send is pressed, and reconciles or marks it failed from these callbacks. */
export interface PendingHandlers {
  onPendingStart: (p: { localId: string; body: string }) => void;
  onPendingResolve: (localId: string, ok: boolean) => void;
}

interface MessageComposerProps {
  conversationId: string | null;
  onSent?: () => void;
  onResolveConversation?: () => Promise<string>;
  onConversationResolved?: (conversationId: string) => void;
  studentFacing?: boolean;
  seed?: ComposerSeed | null;
  contextDraft?: string | null;
  pendingHandlers?: PendingHandlers;
  onTyping?: () => void;
  onTypingStop?: () => void;
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="h-9 w-9 rounded-xl text-[var(--msg-meta)] transition-colors hover:bg-[var(--msg-hover)] hover:text-[var(--msg-ink)]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-semibold">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function MessageComposer({
  conversationId,
  onSent,
  onResolveConversation,
  onConversationResolved,
  studentFacing = false,
  seed = null,
  contextDraft = null,
  pendingHandlers,
  onTyping,
  onTypingStop,
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

  // Apply seeded text (empty-state prompt chips) and put the caret at the end.
  useEffect(() => {
    if (!seed) return;
    setBody(seed.text);
    setPolished(null);
    requestAnimationFrame(() => {
      adjustHeight();
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(seed.text.length, seed.text.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce]);

  useEffect(() => {
    if (contextDraft) setBody(current => seedQuestionContext(current, contextDraft));
  }, [contextDraft]);

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
    if (next.trim().length > 0) onTyping?.();
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

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setEmojiOpen(false);
  };

  const resetComposer = () => {
    setBody('');
    clearAttachment();
    setDriveAttachments([]);
    setPolished(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  const send = async () => {
    if (!user) return;
    const text = body.trim();
    if (!text && !file && driveAttachments.length === 0) return;
    onTypingStop?.();

    // Optimistic path: text-only sends into an existing thread clear the
    // composer immediately and render a local pending bubble. Attachment sends
    // keep the blocking flow so a failure doesn't lose the picked file.
    const optimistic =
      !!pendingHandlers && !!conversationId && !!text && !file && driveAttachments.length === 0;
    const localId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    if (optimistic) {
      pendingHandlers.onPendingStart({ localId, body: text });
      resetComposer();
    } else {
      setSending(true);
    }

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

      if (!optimistic) resetComposer();
      onSent?.();
      if (optimistic) pendingHandlers.onPendingResolve(localId, true);
    } catch (e: unknown) {
      if (optimistic) {
        pendingHandlers.onPendingResolve(localId, false);
      } else {
        toast.error(errorMessage(e, 'Failed to send message'));
      }
    } finally {
      if (!optimistic) setSending(false);
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
    // Enter sends; Shift+Enter inserts a newline. Cmd/Ctrl+Enter still sends
    // for muscle memory.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={cn('msgs-scope shrink-0 bg-transparent', isAdmin ? 'px-3 py-3 sm:px-5' : 'px-4 py-4 sm:px-6')}>
      <div className={cn('mx-auto space-y-3', isAdmin ? 'max-w-5xl' : 'max-w-3xl')}>
      {contextDraft && !body.includes(contextDraft) && <div className="rounded border p-3 text-sm" role="status">
        Your existing draft has been kept. Add the question details when you are ready.
        <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => setBody(current => appendQuestionContext(current, contextDraft))}>Insert question context</Button>
      </div>}
      {file && (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--msg-line)] bg-[var(--msg-panel)] shadow-[var(--msg-shadow)]">
          <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt={file.name}
                className="h-12 w-12 rounded-lg object-cover border border-[var(--msg-line)] shrink-0"
              />
            ) : classifyInboxAttachmentMime(file.type) === 'image' ? (
              <div className="flex items-center justify-center h-12 w-12 rounded-lg border border-[var(--msg-line)] bg-[var(--msg-page)] shrink-0">
                <ImageIcon className="w-4 h-4 text-[var(--msg-meta)]" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-12 w-12 rounded-lg border border-[var(--msg-line)] bg-[var(--msg-page)] shrink-0">
                <FileText className="w-4 h-4 text-[var(--msg-meta)]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-[var(--msg-ink)]">{file.name}</div>
              <div className="mt-0.5 text-[11px] text-[var(--msg-meta)]">
                {sending
                  ? 'Uploading…'
                  : classifyInboxAttachmentMime(file.type) === 'image'
                  ? 'Screenshot preview ready. Paste another to replace it.'
                  : 'PDF ready to send'}
              </div>
            </div>
            <button
              onClick={clearAttachment}
              disabled={sending}
              className="text-[var(--msg-meta)] hover:text-[var(--msg-ink)] transition-colors"
              aria-label="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {sending ? (
            <div className="h-0.5 w-full overflow-hidden bg-[var(--msg-line)]">
              <div className="msgs-progress-bar h-full w-1/3 rounded-full bg-[var(--msg-accent)]" />
            </div>
          ) : null}
        </div>
      )}
      {driveAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {driveAttachments.map((d) => (
            <div
              key={d.id}
              className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--msg-line)] bg-[var(--msg-panel)] text-xs max-w-full shadow-[var(--msg-shadow)]"
            >
              <Cloud className="w-3.5 h-3.5 text-[var(--msg-meta)] shrink-0" />
              <span className="truncate max-w-[200px] font-semibold text-[var(--msg-ink)]">{d.file_name}</span>
              <button
                onClick={() => removeDriveFile(d.id)}
                className="text-[var(--msg-meta)] hover:text-[var(--msg-ink)] shrink-0 transition-colors"
                aria-label={`Remove ${d.file_name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {polished !== null && (
        <div className="space-y-4 rounded-2xl border border-[var(--msg-line)] bg-[var(--msg-panel)] px-5 py-4 shadow-[var(--msg-shadow-deep)]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--msg-meta)]">
            <Wand2 className="h-3.5 w-3.5" />
            Composer Polish
          </div>
          <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--msg-ink)]">{polished}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                setBody(polished);
                setPolished(null);
              }}
              disabled={sending || polishing}
              className="h-8 rounded-lg bg-[var(--msg-accent)] px-4 text-xs font-bold text-white hover:brightness-110"
            >
              Apply this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPolished(null)}
              disabled={sending || polishing}
              className="h-8 rounded-lg px-4 text-xs font-bold text-[var(--msg-meta)] hover:bg-[var(--msg-hover)]"
            >
              Discard
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={polish}
              disabled={sending || polishing || body.trim().length < 3 || !conversationId}
              className="h-8 rounded-lg px-4 text-xs font-bold text-[var(--msg-meta)] hover:bg-[var(--msg-hover)]"
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
        className="relative overflow-hidden rounded-[22px] border border-[var(--msg-line)] bg-[var(--msg-panel)] shadow-[var(--msg-shadow)] transition-all focus-within:border-[var(--msg-accent)] focus-within:shadow-[var(--msg-shadow-deep)] focus-within:ring-2 focus-within:ring-[var(--msg-accent-soft)]"
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
          onBlur={() => onTypingStop?.()}
          placeholder={isAdmin ? 'Message this student...' : 'Ask Joshua a question or send study context'}
          className="w-full resize-none border-0 bg-transparent px-5 py-3.5 text-[15px] font-medium text-[var(--msg-ink)] shadow-none placeholder:text-[var(--msg-meta-soft)] focus-visible:ring-0"
          style={{ height: '54px', overflowY: 'hidden', transition: 'height 160ms ease' }}
        />
        <div className="flex items-center gap-1.5 border-t border-[var(--msg-line)] px-3 py-2">
          <ToolButton
            label="Attach a PDF or screenshot"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="w-4.5 h-4.5" />
          </ToolButton>
          {showDrive && (
            <DriveAttachmentPicker onAttach={addDriveFiles} disabled={sending} />
          )}
          {showPolish && (
            <ToolButton
              label="Polish with AI"
              onClick={polish}
              disabled={sending || polishing || body.trim().length < 3 || !conversationId}
            >
              <Sparkles className={`w-4.5 h-4.5 ${polishing ? 'animate-pulse' : ''}`} />
            </ToolButton>
          )}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={sending}
                    aria-label="Insert emoji"
                    className="h-9 w-9 rounded-xl text-[var(--msg-meta)] transition-colors hover:bg-[var(--msg-hover)] hover:text-[var(--msg-ink)]"
                  >
                    <Smile className="w-4.5 h-4.5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-semibold">
                Insert emoji
              </TooltipContent>
            </Tooltip>
            <PopoverContent align="start" className="w-auto p-2">
              <div className="grid grid-cols-8 gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-[var(--msg-hover)]"
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
            aria-label="Send message"
            className={cn(
              'h-9 rounded-full px-4 text-[13px] font-bold transition-all active:scale-95',
              canSend
                ? 'bg-[var(--msg-accent)] text-white shadow-[var(--msg-shadow)] hover:brightness-110'
                : 'bg-[var(--msg-hover)] text-[var(--msg-meta-soft)] hover:bg-[var(--msg-hover)]',
            )}
          >
            Send
            <Send className="ml-1.5 w-4 h-4" />
          </Button>
        </div>
      </div>
      </div>

    </div>
  );
}
