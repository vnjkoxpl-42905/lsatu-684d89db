import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, HardDrive, Loader2, Minus, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useGmailContacts, useGmailSend } from "../hooks";
import { GmailRecipientInput } from "./GmailRecipientInput";
import { GoogleDrivePicker } from "@/components/drive/GoogleDrivePicker";
import { downloadDriveFile } from "@/lib/googleDriveClient";
import { toast } from "sonner";
import type { GmailOutgoingAttachment } from "../api";
import { TemplateSuggestionPalette } from "@/components/teacher/templates/TemplateSuggestionPalette";
import {
  filterMessageTemplates,
  listMessageTemplates,
  replaceSlashCommand,
  slashTemplateQuery,
  type MessageTemplate,
} from "@/lib/messageTemplates";

interface GmailComposeProps {
  open: boolean;
  onClose: () => void;
  /** Optional prefill (e.g. from a "compose to student" entry point). */
  prefill?: { to?: string; subject?: string; body?: string };
}

interface PendingAttachment extends GmailOutgoingAttachment {
  id: string;
  size: number;
}

// Hard cap to keep multipart payload + supabase function body under safe limits.
// Gmail caps at 25MB inclusive of base64 overhead; we cap raw bytes at ~18MB total.
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<{ dataBase64: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:<mime>;base64," prefix.
      const idx = result.indexOf(",");
      resolve({ dataBase64: idx >= 0 ? result.slice(idx + 1) : result, size: file.size });
    };
    reader.readAsDataURL(file);
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function GmailCompose({ open, onClose, prefill }: GmailComposeProps) {
  const [to, setTo] = useState(prefill?.to ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [minimized, setMinimized] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [readingFiles, setReadingFiles] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templatePaletteOpen, setTemplatePaletteOpen] = useState(false);
  const [templatePaletteIndex, setTemplatePaletteIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const send = useGmailSend();
  const contactsQuery = useGmailContacts({ enabled: open });
  const contacts = contactsQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listMessageTemplates("email")
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch((error) => {
        if (!cancelled) console.error("Failed to load email templates", error);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const templateQuery = slashTemplateQuery(body);
  const filteredTemplates = useMemo(
    () => filterMessageTemplates(templates, templateQuery ?? ""),
    [templates, templateQuery],
  );

  if (!open) return null;

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);
  const canSend = to.trim().length > 0 && body.trim().length > 0 && !send.isPending && !readingFiles;

  function reset() {
    setTo(""); setCc(""); setBcc(""); setSubject(""); setBody("");
    setShowCc(false); setShowBcc(false);
    setTemplatePaletteOpen(false);
    setAttachments([]);
  }

  function handleBodyChange(next: string) {
    setBody(next);
    const query = slashTemplateQuery(next);
    setTemplatePaletteOpen(query !== null && templates.length > 0);
    setTemplatePaletteIndex(0);
  }

  function insertTemplate(template: MessageTemplate) {
    const next = replaceSlashCommand(body, template.body);
    setBody(next);
    if (!subject.trim() && template.subject) {
      setSubject(template.subject);
    }
    setTemplatePaletteOpen(false);
  }

  function handleSend() {
    send.mutate(
      {
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        text: body,
        attachments: attachments.length
          ? attachments.map(({ filename, mimeType, dataBase64 }) => ({ filename, mimeType, dataBase64 }))
          : undefined,
      },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  function handleDiscard() {
    reset();
    onClose();
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setReadingFiles(true);
    try {
      const next: PendingAttachment[] = [];
      let runningTotal = totalBytes;
      for (const file of Array.from(fileList)) {
        if (runningTotal + file.size > MAX_TOTAL_BYTES) {
          toast.error("Attachment too large", {
            description: `Total attachments must stay under ${formatBytes(MAX_TOTAL_BYTES)}.`,
          });
          break;
        }
        const { dataBase64, size } = await readFileAsBase64(file);
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          dataBase64,
          size,
        });
        runningTotal += file.size;
      }
      if (next.length) setAttachments((prev) => [...prev, ...next]);
    } catch (e) {
      toast.error("Could not read file", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setReadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDriveAttach(files: Array<{ filename: string; mimeType: string; dataBase64: string; size: number }>) {
    const remaining = MAX_TOTAL_BYTES - totalBytes;
    let used = 0;
    const accepted: PendingAttachment[] = [];
    for (const f of files) {
      if (used + f.size > remaining) {
        toast.error("Attachment too large", {
          description: `Skipped "${f.filename}" — total cap is ${formatBytes(MAX_TOTAL_BYTES)}.`,
        });
        continue;
      }
      used += f.size;
      accepted.push({
        id: `drive-${f.filename}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...f,
      });
    }
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handleBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!templatePaletteOpen || filteredTemplates.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTemplatePaletteIndex((index) => (index + 1) % filteredTemplates.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setTemplatePaletteIndex((index) => (index - 1 + filteredTemplates.length) % filteredTemplates.length);
      return;
    }
    if (event.key === "Tab" || (event.key === "Enter" && !event.metaKey && !event.ctrlKey)) {
      event.preventDefault();
      insertTemplate(filteredTemplates[templatePaletteIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setTemplatePaletteOpen(false);
    }
  }

  return (
    <>
      <div
        role="dialog"
        aria-label="New message"
        className={cn(
          "fixed bottom-0 right-6 z-40 w-[540px] max-w-[calc(100vw-32px)] shadow-2xl",
          "rounded-t-lg border border-border border-b-0 bg-background overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-foreground text-background select-none cursor-grab">
          <span className="text-xs font-medium truncate">{subject || "New message"}</span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-background hover:bg-white/15 hover:text-background"
              onClick={() => setMinimized((v) => !v)}
              aria-label={minimized ? "Expand" : "Minimize"}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-background hover:bg-white/15 hover:text-background"
              onClick={handleDiscard}
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {!minimized ? (
          <div className="flex flex-col">
            <ComposeRow>
              <label className="w-12 text-xs text-muted-foreground shrink-0 self-start pt-2">To</label>
              <GmailRecipientInput
                value={to}
                onChange={setTo}
                placeholder="recipient@example.com"
                contacts={contacts}
              />
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground pr-2 self-start pt-2">
                {!showCc ? (
                  <button type="button" className="hover:text-foreground" onClick={() => setShowCc(true)}>Cc</button>
                ) : null}
                {!showBcc ? (
                  <button type="button" className="hover:text-foreground" onClick={() => setShowBcc(true)}>Bcc</button>
                ) : null}
              </div>
            </ComposeRow>
            {showCc ? (
              <ComposeRow>
                <label className="w-12 text-xs text-muted-foreground shrink-0 self-start pt-2">Cc</label>
                <GmailRecipientInput
                  value={cc}
                  onChange={setCc}
                  placeholder="cc@example.com"
                  contacts={contacts}
                />
              </ComposeRow>
            ) : null}
            {showBcc ? (
              <ComposeRow>
                <label className="w-12 text-xs text-muted-foreground shrink-0 self-start pt-2">Bcc</label>
                <GmailRecipientInput
                  value={bcc}
                  onChange={setBcc}
                  placeholder="bcc@example.com"
                  contacts={contacts}
                />
              </ComposeRow>
            ) : null}
            <ComposeRow>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="border-0 focus-visible:ring-0 h-8 text-sm shadow-none px-3"
              />
            </ComposeRow>
            <div className="relative">
              <TemplateSuggestionPalette
                open={templatePaletteOpen}
                templates={filteredTemplates}
                activeIndex={templatePaletteIndex}
                onActiveIndexChange={setTemplatePaletteIndex}
                onSelect={insertTemplate}
                onClose={() => setTemplatePaletteOpen(false)}
              />
              <Textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder="Write your message…"
                rows={9}
                className="border-0 focus-visible:ring-0 resize-none text-sm min-h-[200px] px-3 py-2"
              />
            </div>

            {attachments.length > 0 ? (
              <div className="px-3 pt-2 pb-1 flex flex-wrap gap-2 border-t border-border">
                {attachments.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded border border-border bg-muted/40 pl-2 pr-1 py-1 text-xs"
                    title={`${a.filename} · ${formatBytes(a.size)}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[180px]">{a.filename}</span>
                    <span className="text-muted-foreground">{formatBytes(a.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="rounded hover:bg-foreground/10 p-0.5"
                      aria-label={`Remove ${a.filename}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Button onClick={handleSend} disabled={!canSend} className="gap-1.5" size="sm">
                  {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={readingFiles}
                  aria-label="Attach file"
                  title="Attach file"
                >
                  {readingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDrivePickerOpen(true)}
                  aria-label="Attach from Drive"
                  title="Attach from Drive"
                >
                  <HardDrive className="w-4 h-4" />
                </Button>
                {totalBytes > 0 ? (
                  <span className="text-[11px] text-muted-foreground">{formatBytes(totalBytes)}</span>
                ) : null}
              </div>
              <Button variant="ghost" size="sm" onClick={handleDiscard}>Discard</Button>
            </div>
          </div>
        ) : null}
      </div>

      <GoogleDrivePicker
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        confirmLabel="Attach"
        onConfirm={async (files) => {
          const downloaded = [];
          for (const f of files) downloaded.push(await downloadDriveFile(f));
          handleDriveAttach(downloaded);
        }}
      />
    </>
  );
}

function ComposeRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 border-b border-border px-3">{children}</div>
  );
}
