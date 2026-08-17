import { useEffect, useRef, useState } from 'react';
import { Camera, Send, X, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startJoshuaConversation } from '@/lib/joshuaThread';
import { useConversationMessages } from '@/hooks/useInbox';
import { AttachmentCard } from '@/components/inbox/AttachmentCard';
import { ScreenshotContextCard } from '@/components/inbox/ScreenshotContextCard';
import {
  getHelpSnapshot,
  helpSnapshotHeading,
  type HelpSnapshot,
} from '@/lib/helpContextBus';
import { captureViewportPng } from '@/lib/helpScreenshot';
import {
  isVisibleHelpAttachment,
  findHelpContextAttachment,
  findHelpScreenshotAttachment,
  stripHelpContextFromBody,
} from '@/lib/inboxAttachments';
import { cn } from '@/lib/utils';

// Item A — student-facing Help sheet. Replaces the old single-shot
// HelpDialog with a live thread + screenshot + context capture.

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LocalScreenshotPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <img
      src={url ?? ''}
      alt="Screenshot preview"
      className="h-10 w-14 rounded object-cover border border-border"
    />
  );
}

export default function HelpSheet({ open, onOpenChange }: HelpSheetProps) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [convoErr, setConvoErr] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [snapshot, setSnapshot] = useState<HelpSnapshot | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, refresh } = useConversationMessages(conversationId);

  // Establish the thread once the sheet opens.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setConvoErr(null);
    (async () => {
      try {
        const id = await startJoshuaConversation();
        if (!cancelled) setConversationId(id);
      } catch (e) {
        if (!cancelled) setConvoErr(e instanceof Error ? e.message : 'Could not open thread');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Snapshot context the moment the sheet mounts (before any user input).
  useEffect(() => {
    if (!open) return;
    setSnapshot(getHelpSnapshot());
    // Auto-capture a screenshot in the background; student can swap it out.
    setCapturing(true);
    captureViewportPng('help-screenshot.png')
      .then((f) => setScreenshot(f))
      .catch((e) => {
        console.warn('[HelpSheet] screenshot failed', e);
      })
      .finally(() => setCapturing(false));
  }, [open]);

  // Reset transient state on close.
  useEffect(() => {
    if (open) return;
    setBody('');
    setScreenshot(null);
    setSnapshot(null);
  }, [open]);

  // Scroll to latest message when messages change.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const retakeScreenshot = async () => {
    setCapturing(true);
    try {
      const f = await captureViewportPng('help-screenshot.png');
      setScreenshot(f);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Screenshot failed');
    } finally {
      setCapturing(false);
    }
  };

  const send = async () => {
    if (!user || !conversationId) return;
    const text = body.trim();
    if (!text && !screenshot) return;
    setSending(true);
    try {
      const snap = snapshot ?? getHelpSnapshot();
      // Send just the student's words. The page context rides along as the
      // structured context.json attachment below (rendered as a clean card in
      // the thread) rather than as raw text baked into the message body.
      const composed = text.length > 0 ? text : '[Help request]';

      const { data: msg, error: msgErr } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, body: composed })
        .select()
        .single();
      if (msgErr || !msg) throw msgErr ?? new Error('Failed to send');

      if (screenshot) {
        const path = `${conversationId}/${msg.id}/${screenshot.name}`;
        const { error: upErr } = await supabase.storage
          .from('message-attachments')
          .upload(path, screenshot, {
            contentType: screenshot.type || 'image/png',
            upsert: false,
          });
        if (upErr) throw upErr;
        const { error: attErr } = await supabase.from('message_attachments').insert({
          message_id: msg.id,
          kind: 'storage',
          storage_path: path,
          file_name: screenshot.name,
          file_size: screenshot.size,
          mime_type: screenshot.type || 'image/png',
        });
        if (attErr) throw attErr;
      }

      // Attach a tiny context.json blob alongside, so the teacher's view can
      // structurally read the snapshot if it wants to.
      const ctxBlob = new Blob([JSON.stringify(snap, null, 2)], {
        type: 'application/json',
      });
      const ctxFile = new File([ctxBlob], 'context.json', { type: 'application/json' });
      const ctxPath = `${conversationId}/${msg.id}/${ctxFile.name}`;
      const { error: ctxUpErr } = await supabase.storage
        .from('message-attachments')
        .upload(ctxPath, ctxFile, { contentType: 'application/json', upsert: false });
      if (!ctxUpErr) {
        await supabase.from('message_attachments').insert({
          message_id: msg.id,
          kind: 'storage',
          storage_path: ctxPath,
          file_name: ctxFile.name,
          file_size: ctxFile.size,
          mime_type: 'application/json',
        });
      }

      setBody('');
      // Keep the screenshot field empty so the next message is just text
      // unless the student explicitly clicks "Capture".
      setScreenshot(null);
      await refresh();
      toast.success('Sent to Joshua');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[440px] p-0 flex flex-col"
        data-help-overlay
      >
        <SheetHeader className="px-4 py-3 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base">Help — Joshua</SheetTitle>
          <SheetDescription className="text-xs">
            Send a question, with a screenshot of what you're seeing. Replies show up here.
          </SheetDescription>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        >
          {convoErr ? (
            <div className="text-xs text-rose-300">{convoErr}</div>
          ) : !conversationId ? (
            <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening your thread…
            </div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No messages yet. Type below to start the conversation.
            </div>
          ) : (
            messages.slice(-30).map((m) => {
              const mine = m.sender_id === user?.id;
              const helpContext = findHelpContextAttachment(m.attachments);
              const helpScreenshot = findHelpScreenshotAttachment(m.attachments);
              const isHelpScreenshot = !!helpContext && !!helpScreenshot;
              const visibleAttachments = m.attachments.filter(isVisibleHelpAttachment);
              const bodyText = isHelpScreenshot
                ? stripHelpContextFromBody(m.body)
                : m.body;
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[88%] space-y-2', mine ? 'items-end' : 'items-start')}>
                    {bodyText ? (
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
                          mine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground',
                        )}
                      >
                        {bodyText}
                      </div>
                    ) : null}
                    {isHelpScreenshot ? (
                      <div className={cn('flex flex-col gap-2', mine ? 'items-end' : 'items-start')}>
                        <ScreenshotContextCard image={helpScreenshot} context={helpContext} />
                      </div>
                    ) : visibleAttachments.length > 0 ? (
                      <div
                        className={cn(
                          'flex flex-col gap-2',
                          mine ? 'items-end' : 'items-start',
                        )}
                      >
                        {visibleAttachments.map((a) => (
                          <AttachmentCard key={a.id} attachment={a} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Context preview */}
        {snapshot && (
          <div className="px-4 pt-2 pb-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              We'll include where you are
            </div>
            <div className="text-[11px] text-foreground/80 bg-muted/40 border border-border rounded-md px-2.5 py-1.5 leading-relaxed">
              {helpSnapshotHeading(snapshot)}
            </div>
          </div>
        )}

        {/* Screenshot preview */}
        <div className="px-4 pt-2">
          {capturing ? (
            <div className="rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Capturing screen…
            </div>
          ) : screenshot ? (
            <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2 flex items-center gap-2.5">
              <LocalScreenshotPreview file={screenshot} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">Screenshot ready</div>
                <div className="text-[10px] text-muted-foreground">
                  {(screenshot.size / 1024).toFixed(0)} KB · attached on send
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setScreenshot(null)}
                aria-label="Remove screenshot"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={retakeScreenshot}
              className="gap-1.5 h-8 text-xs"
            >
              <Camera className="w-3.5 h-3.5" /> Capture screenshot
            </Button>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border px-3 py-2.5 mt-2 shrink-0">
          <Textarea
            ref={composerRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="What's not working? Be specific."
            className="min-h-[64px] text-sm resize-none"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={retakeScreenshot}
              disabled={capturing || sending}
              className="gap-1.5 text-xs"
              title="Retake screenshot"
            >
              <Camera className="w-3.5 h-3.5" /> Retake
            </Button>
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground/60 mr-1 select-none">⌘↵</span>
            <Button
              size="sm"
              onClick={send}
              disabled={sending || !conversationId || (!body.trim() && !screenshot)}
              className="gap-1.5"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
