import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowRight, Calendar, Check, ChevronLeft, Clock, Loader2, Paperclip, Video, X } from "lucide-react";
import { bookingErrorMessage } from "@/lib/edgeFunctionError";
import "@/pages/booking/booking-theme.css";

// Shared, phased booking-confirm dialog used by BOTH the authed schedule panel
// and the Calendly-clone booking card. Three phases:
//   1. "confirm" — the session ticket (the hero) + fast-book / add-work paths
//   2. "work"    — optional attachments + note (only when `upload` is provided)
//   3. "success" — a sleek, monochrome "You're booked" reveal
// Motion signature (ease-open + spring) is borrowed from src/pages/Auth.tsx.
// Renders NO sessions-count / "remaining" language — that pressure copy is gone.

export type StagedFile = { file: File; clientUploadId: string };

type UploadApi = {
  uploadFiles: (files: StagedFile[], idempotencyKey: string) => Promise<{ uploaded: number; clientUploadIds: string[] }>;
  discardUpload?: (clientUploadId: string, idempotencyKey: string) => Promise<void>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotIso: string | null;
  durationMinutes: number;
  /** Commit the booking. Shares the idempotency key with any uploaded files. */
  book: (slotIso: string, idempotencyKey: string, note?: string) => Promise<void>;
  /** Called after a SUCCESSFUL booking: parent refreshes state and clears the
   *  picked slot. May return the Google Meet URL for the just-booked slot to
   *  show on the success screen; return null/void if not (yet) known. */
  onBooked?: (slotIso: string) => Promise<string | null> | void;
  /** Called after a FAILED booking so the parent can refresh (e.g. drop a slot
   *  that was just taken). */
  onCommitError?: () => void | Promise<void>;
  /** When present, Phase 2 (attach work) is offered. Absent = fast-book only. */
  upload?: UploadApi;
  /** Matches CalendlyBookingCard's `theme`. The dialog portals to the document
   *  root, so it cannot inherit the page palette and must be told. */
  theme?: "booking" | "app";
};

const MAX_UPLOAD_FILES = 5;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_NOTE_CHARS = 2000;

// House easing token (easeOutExpo), matching Auth.tsx / academy.tsx.
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const STEP_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: EASE },
};

function durationLabel(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** The session summary "ticket" — the hero of the confirm and success phases. */
function Ticket({ slotIso, durationMinutes }: { slotIso: string; durationMinutes: number }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
        <Calendar className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold tracking-tight text-foreground">{fmtDate(slotIso)}</div>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{fmtTime(slotIso)}</span>
          <span aria-hidden className="text-border">·</span>
          <span>{durationLabel(durationMinutes)}</span>
        </div>
      </div>
    </div>
  );
}

type Step = "confirm" | "work" | "success";

export default function BookingConfirmDialog({ open, onOpenChange, slotIso, durationMinutes, book, onBooked, onCommitError, upload, theme = "booking" }: Props) {
  const reduceMotion = useReducedMotion();
  const phaseMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : STEP_MOTION;
  const [step, setStep] = useState<Step>("confirm");
  const [booking, setBooking] = useState(false);
  const [bookingKey, setBookingKey] = useState(() => crypto.randomUUID());
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [stagedUploadIds, setStagedUploadIds] = useState<Set<string>>(() => new Set());
  const [note, setNote] = useState("");
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [bookedMeetUrl, setBookedMeetUrl] = useState<string | null>(null);

  // Reset to the first phase whenever the dialog re-opens.
  useEffect(() => {
    if (open) setStep("confirm");
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (booking) return; // never close mid-commit
    if (!next) {
      // Full reset on close so the next open starts clean.
      setFiles([]);
      setStagedUploadIds(new Set());
      setNote("");
      setBookedSlot(null);
      setBookedMeetUrl(null);
      setBookingKey(crypto.randomUUID());
    }
    onOpenChange(next);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const picked = Array.from(incoming);
    const tooBig = picked.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) { toast.error(`"${tooBig.name}" is over 20 MB.`); return; }
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of picked) {
        if (merged.length >= MAX_UPLOAD_FILES) { toast.error(`Up to ${MAX_UPLOAD_FILES} files.`); break; }
        if (!merged.some((m) => m.file.name === f.name && m.file.size === f.size)) {
          merged.push({ file: f, clientUploadId: crypto.randomUUID() });
        }
      }
      return merged;
    });
  }

  async function removeFile(index: number) {
    const entry = files[index];
    if (!entry) return;
    if (stagedUploadIds.has(entry.clientUploadId) && upload?.discardUpload) {
      try {
        await upload.discardUpload(entry.clientUploadId, bookingKey);
        setStagedUploadIds((current) => {
          const next = new Set(current);
          next.delete(entry.clientUploadId);
          return next;
        });
      } catch (e) {
        toast.error("Could not remove that file. Try again.");
        return;
      }
    }
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function commit() {
    if (!slotIso) return;
    setBooking(true);
    try {
      if (upload && files.length > 0) {
        const pending = files.filter((entry) => !stagedUploadIds.has(entry.clientUploadId));
        if (pending.length > 0) {
          const uploaded = await upload.uploadFiles(pending, bookingKey);
          setStagedUploadIds((current) => new Set([...current, ...uploaded.clientUploadIds]));
        }
      }
      const trimmedNote = note.trim().slice(0, MAX_NOTE_CHARS);
      await book(slotIso, bookingKey, trimmedNote || undefined);

      setBookedSlot(slotIso);
      setStep("success");
      // Clear staging so a subsequent booking starts fresh; keep bookedSlot for display.
      setFiles([]);
      setStagedUploadIds(new Set());
      setNote("");
      setBookingKey(crypto.randomUUID());

      // The booking is already committed. Refreshing the parent and resolving
      // the Meet URL are best-effort follow-up work; a refresh failure must
      // never tell the student that a successful booking failed or invite a
      // duplicate retry.
      if (onBooked) {
        try {
          const r = await onBooked(slotIso);
          setBookedMeetUrl(typeof r === "string" ? r : null);
        } catch {
          toast.info("You're booked. Calendar details may take a moment to appear.");
        }
      }
    } catch (e) {
      // Never toast a raw message here. An unrecognised backend code, or the
      // bare supabase-js wrapper, both resolve to the plain fallback rather
      // than leaking an internal string like "redeem_failed" at a student.
      const msg = e instanceof Error ? e.message : "";
      toast.error(bookingErrorMessage(msg));
      if (onCommitError) await onCommitError(); // refresh so a taken slot disappears
    } finally {
      setBooking(false);
    }
  }

  const showCounter = note.length > MAX_NOTE_CHARS * 0.8;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => { if (booking) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (booking) event.preventDefault(); }}
        className={`booking-dialog ${theme === "booking" ? "booking-holo " : ""}booking-shadow gap-0 overflow-hidden rounded-2xl border-border p-0 sm:max-w-md`}
      >
        {/* Accessible label for screen readers; visible headings are styled per phase below. */}
        <DialogTitle className="sr-only">
          {step === "success" ? "Session booked" : step === "work" ? "Bring work to review" : "Confirm your session"}
        </DialogTitle>
        <div role="status" aria-live="polite" className="sr-only">
          {booking ? "Booking your session" : step === "success" ? "Your session is booked" : step === "work" ? "Add optional work for Joshua to review" : "Confirm your session"}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {step === "success" && bookedSlot ? (
            <motion.div key="success" {...phaseMotion} className="flex flex-col items-center px-6 py-8 text-center">
              <motion.div
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30, delay: 0.05 }}
                className={`${theme === "booking" ? "holo-surface" : "bg-primary text-primary-foreground"} flex h-14 w-14 items-center justify-center rounded-full shadow-sm`}
              >
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </motion.div>

              <motion.h2
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: EASE, delay: 0.14 }}
                className="mt-4 text-xl font-semibold tracking-tight text-foreground"
              >
                You're booked
              </motion.h2>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE, delay: 0.2 }}
                className="mt-4 w-full"
              >
                <Ticket slotIso={bookedSlot} durationMinutes={durationMinutes} />
                <p className="mt-3 text-sm text-muted-foreground">
                  Your calendar invite is on its way to your email.
                </p>
              </motion.div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE, delay: 0.26 }}
                className="mt-5 flex w-full items-center justify-center gap-2"
              >
                {bookedMeetUrl && (
                  <Button asChild variant="outline">
                    <a href={bookedMeetUrl} target="_blank" rel="noreferrer">
                      <Video className="h-4 w-4" /> Join link
                    </a>
                  </Button>
                )}
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </motion.div>
            </motion.div>
          ) : step === "work" ? (
            <motion.div key="work" {...phaseMotion} className="px-6 pb-6 pt-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Bringing work to review?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Attach sections, PTs, or anything you'd like Joshua to look at, and add a note. Totally optional.
              </p>

              {/* Recessed tray — a distinct plane inside the card. */}
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted p-4 shadow-inner">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background/70 px-4 py-5 text-center transition hover:border-primary/50 hover:bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{files.length > 0 ? "Add more files" : "Attach files"}</span>
                  <span className="text-xs text-muted-foreground">Sections, PTs, anything to review</span>
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    disabled={booking || files.length >= MAX_UPLOAD_FILES}
                    onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
                  />
                </label>

                {files.length > 0 && (
                  <ul className="space-y-1.5">
                    {files.map((entry, i) => (
                      <li key={entry.clientUploadId} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{entry.file.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{(entry.file.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button
                          type="button"
                          disabled={booking}
                          onClick={() => void removeFile(i)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove ${entry.file.name}`}
                        ><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}

                <div>
                  <label htmlFor="booking-note" className="mb-1.5 block text-sm font-medium text-foreground">Note for Joshua <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <textarea
                    id="booking-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_CHARS))}
                    disabled={booking}
                    rows={3}
                    placeholder="Any updates for Joshua? What you'd like to focus on, where you're stuck…"
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60"
                  />
                  {showCounter && (
                    <div className="mt-1 text-right text-xs text-muted-foreground">{note.length}/{MAX_NOTE_CHARS}</div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep("confirm")} disabled={booking}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => void commit()} disabled={booking}>
                  {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Book it
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="confirm" {...phaseMotion} className="px-6 pb-6 pt-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Confirm your session</h2>
              <p className="mt-1 text-sm text-muted-foreground">Here's your 1:1 with Joshua.</p>

              <div className="mt-4">
                {slotIso ? <Ticket slotIso={slotIso} durationMinutes={durationMinutes} /> : (
                  <p className="text-sm text-muted-foreground">Pick a time first.</p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={booking}>Cancel</Button>
                {upload && (
                  <Button variant="outline" onClick={() => setStep("work")} disabled={booking || !slotIso}>
                    Add work first <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={() => void commit()} disabled={booking || !slotIso}>
                  {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Book it
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
