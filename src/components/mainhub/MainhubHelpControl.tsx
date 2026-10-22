"use client";

import * as React from "react";
import { FileText, Loader2, Mic, Paperclip, Send, Smile, Square, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainhubAvatarFab from "@/components/mainhub/MainhubAvatarFab";
import { useConversationMessages } from "@/hooks/useInbox";
import { AttachmentCard } from "@/components/inbox/AttachmentCard";
import { startJoshuaConversation } from "@/lib/joshuaThread";
import {
  MAINHUB_ATTACHMENT_ACCEPT,
  insertEmojiAtSelection,
  validateStudyThreadFile,
} from "@/lib/mainhubComposer";

const MAINHUB_EMOJI_CHOICES = ["🙂", "👍", "🔥", "💪", "✅", "🙏", "📌", "🧠", "🎯", "✍️", "📚", "✨"];

export default function MainhubHelpControl({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [threadError, setThreadError] = React.useState<string | null>(null);
  const [composerError, setComposerError] = React.useState<string | null>(null);
  const [openingThread, setOpeningThread] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const mediaChunksRef = React.useRef<Blob[]>([]);
  // Only an open panel acknowledges what it shows; a closed one that receives
  // a message must leave it unread.
  const {
    messages,
    loading,
    refresh,
    error: threadLoadError,
    readError,
    retryRead,
  } = useConversationMessages(conversationId, { active: open });

  React.useEffect(() => {
    if (!open || conversationId) return;
    let cancelled = false;
    setOpeningThread(true);
    setThreadError(null);

    startJoshuaConversation()
      .then((id) => {
        if (!cancelled) setConversationId(id);
      })
      .catch((error) => {
        if (!cancelled) {
          setThreadError(error instanceof Error ? error.message : "Could not open your thread.");
        }
      })
      .finally(() => {
        if (!cancelled) setOpeningThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, open]);

  React.useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, open]);

  // Move focus into the composer once the panel is open and the thread is
  // ready (the textarea is disabled until conversationId resolves).
  React.useEffect(() => {
    if (!open || !conversationId) return;
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, conversationId]);

  React.useEffect(() => {
    if (open) return;
    setBody("");
    setAttachment(null);
    setComposerError(null);
    setEmojiOpen(false);
  }, [open]);

  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const canRecord =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const chooseAttachment = (file: File | null) => {
    if (!file) return;
    const error = validateStudyThreadFile(file);
    if (error) {
      setComposerError(error);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setComposerError(null);
    setAttachment(file);
  };

  const selectEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const { next, cursor } = insertEmojiAtSelection(
      body,
      emoji,
      el?.selectionStart,
      el?.selectionEnd,
    );
    setBody(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  };

  const stopRecordingTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const startRecording = async () => {
    if (!canRecord || recording || sending) return;
    setComposerError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type });
        mediaChunksRef.current = [];
        stopRecordingTracks();
        setRecording(false);
        if (blob.size === 0) return;
        setAttachment(
          new File([blob], `voice-message-${Date.now()}.webm`, {
            type,
          }),
        );
      };
      recorder.start();
      setRecording(true);
    } catch (error) {
      stopRecordingTracks();
      setRecording(false);
      setComposerError(error instanceof Error ? error.message : "Could not access your microphone.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    mediaChunksRef.current = [];
    if (recorder && recorder.state === "recording") {
      recorder.onstop = () => {
        stopRecordingTracks();
        setRecording(false);
      };
      recorder.stop();
    } else {
      stopRecordingTracks();
      setRecording(false);
    }
  };

  React.useEffect(() => {
    if (open || !recording) return;
    cancelRecording();
  }, [open, recording]);

  const uploadAttachment = async (messageId: string, file: File) => {
    if (!conversationId) return;
    const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
    const path = `${conversationId}/${messageId}/${Date.now()}-${safeName}`;
    const mimeType = file.type || "application/octet-stream";
    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(path, file, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;

    const { error: attachmentError } = await supabase.from("message_attachments").insert({
      message_id: messageId,
      kind: "storage",
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: mimeType,
    });
    if (attachmentError) throw attachmentError;
  };

  const sendMessage = async () => {
    const text = body.trim();
    if (!user || !conversationId || (!text && !attachment) || sending || recording) return;
    setSending(true);
    setComposerError(null);
    try {
      const { data: message, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
        .select("id")
        .single();
      if (error || !message) throw error ?? new Error("Could not send your message.");
      if (attachment) await uploadAttachment(message.id, attachment);
      setBody("");
      setAttachment(null);
      setEmojiOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const canSend = !!body.trim() || !!attachment;

  return (
    <>
      <MainhubAvatarFab open={open} onToggle={() => onOpenChange(!open)} />

      {open && (
        <section
          role="dialog"
          aria-label="LSAT U support chat"
          data-help-overlay
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              onOpenChange(false);
            }
          }}
          className="fixed bottom-20 right-5 z-50 flex h-[min(560px,calc(100dvh-7rem))] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-[#fbfcff] text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
        >
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[13px] font-semibold text-white shadow-sm"
              aria-hidden
            >
              J
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">LSAT U Support</div>
              <div className="truncate text-[11px] text-slate-500">Joshua and your Study Thread</div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Minimize support chat"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5"
          >
            {readError ? (
              <div role="status" className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>{readError}</span>
                <button type="button" className="underline underline-offset-2 hover:text-slate-800" onClick={retryRead}>
                  Try again
                </button>
              </div>
            ) : null}
            {threadError ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                {threadError}
              </div>
            ) : threadLoadError ? (
              <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500">
                <span>{threadLoadError}.</span>
                <button type="button" className="underline underline-offset-2 hover:text-slate-800" onClick={() => void refresh()}>
                  Retry
                </button>
              </div>
            ) : openingThread || loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Opening your thread...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-start justify-center pt-5 text-center">
                <p className="text-[22px] font-medium tracking-normal text-slate-500">
                  Need some help?
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                        message.sender_id === user?.id
                          ? "rounded-br-md bg-slate-950 text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-800"
                      }`}
                    >
                      {message.body}
                      {message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((item) => (
                            <AttachmentCard key={item.id} attachment={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200/80 bg-[#fbfcff] px-3 py-3">
            <input
              ref={fileRef}
              type="file"
              accept={MAINHUB_ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(event) => chooseAttachment(event.target.files?.[0] ?? null)}
            />
            <div className="relative min-h-[124px] rounded-[24px] border border-slate-200 bg-white shadow-sm transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-300/50">
              {attachment && (
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    aria-label="Remove attachment"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
              {recording && (
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-900" aria-hidden />
                  <span className="flex-1">Recording voice message...</span>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="rounded-full px-2 py-1 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!conversationId || sending}
                placeholder="Message..."
                rows={2}
                className="min-h-[118px] w-full resize-none rounded-[24px] border-0 bg-transparent px-4 pb-14 pt-4 text-[15px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-default disabled:opacity-60"
              />
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={sending || recording}
                  aria-label="Attach file"
                  title="Attach file"
                  className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Paperclip className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                </button>
                <div className="pointer-events-auto relative">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((next) => !next)}
                    disabled={!conversationId || sending}
                    aria-label="Add emoji"
                    aria-expanded={emojiOpen}
                    title="Add emoji"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Smile className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                  </button>
                  {emojiOpen && (
                    <div className="absolute bottom-10 left-0 z-10 grid w-[184px] grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                      {MAINHUB_EMOJI_CHOICES.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => selectEmoji(emoji)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition hover:bg-slate-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!conversationId || sending || !canRecord}
                  aria-label="Record voice message"
                  title={canRecord ? (recording ? "Stop recording" : "Record voice message") : "Voice messages coming soon"}
                  className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {recording ? (
                    <Square className="h-[15px] w-[15px]" strokeWidth={2.1} aria-hidden />
                  ) : (
                    <Mic className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
                  )}
                </button>
              </div>
              <div className="absolute bottom-3 right-3">
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!conversationId || !canSend || sending || recording}
                  aria-label="Send message"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            {composerError && (
              <div className="mt-2 px-2 text-xs text-slate-500" role="status">
                {composerError}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
