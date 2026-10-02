import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CircleAlert, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSessionLinkWriter, useTeacherSessionChain, type ExpectedLink, type SessionChainState, type WriterResult } from '@/hooks/useSessionChain';
import {
  bookingKey,
  bookingStateLabel,
  canLinkToBooking,
  displayTimeZone,
  formatAppointment,
  groupsFor,
  isCanceledBooking,
  isLinkCandidate,
  itemStatusLabel,
  itemTypeLabel,
  makeLink,
  parseSessionChain,
  PHASE_ACTION,
  PHASE_EMPTY,
  PHASE_LABEL,
  phasesFor,
  SESSION_LINK_UNVERIFIED,
  SESSION_LINK_WRITES_BLOCKED,
  SESSION_LINK_WRITES_ENABLED,
  SESSION_PHASES,
  teacherOnlyReason,
  type BookingIdentity,
  type LinkedRecord,
  type SessionBooking,
  type SessionChainLink,
  type SessionPhase,
} from '@/lib/sessionChain';
import { cn } from '@/lib/utils';

export interface SessionLinkWriter {
  save: (itemId: string, expected: ExpectedLink, next: SessionChainLink | null) => Promise<WriterResult | null>;
  pending: boolean;
}

interface Props {
  state: SessionChainState;
  /** Decoded selection. `null` with `selectionInvalid` means a bad URL value. */
  selected: BookingIdentity | null;
  selectionInvalid?: boolean;
  onBack: () => void;
  backLabel?: string;
  /** Teacher only: the student the panel is about. */
  studentName?: string | null;
  /** Teacher only. Without it the panel is read-only. */
  writer?: SessionLinkWriter;
  /**
   * Whether link writes may be offered at all. Defaults to the server-contract
   * gate; tests pass true to exercise the gated-off controls.
   */
  writesEnabled?: boolean;
}

const ISSUE_COPY = {
  invalid_metadata: 'Association data is unreadable',
  appointment_unavailable: 'Linked appointment is not in this student’s verified bookings',
  phase_mismatch: 'Linked under a phase this record type cannot hold',
} as const;

function describeLink(link: SessionChainLink, bookings: SessionBooking[]): string {
  const booking = bookings.find((b) => bookingKey(b) === bookingKey({ source: link.booking_source, id: link.booking_id }));
  const when = booking ? formatAppointment(booking) : 'an appointment not in this student’s verified bookings';
  return `${PHASE_LABEL[link.phase]} for ${when}`;
}

function RecordRow({
  record,
  teacher,
  onOpen,
  onRemove,
  removeDisabled,
}: {
  record: LinkedRecord;
  teacher: boolean;
  onOpen: (route: string) => void;
  onRemove?: () => void;
  removeDisabled?: boolean;
}) {
  const status = itemStatusLabel(record.item);
  return (
    <li className="rounded-lg border border-border bg-background px-3 py-2.5">
      {/* Title above actions at every width: in a three-column layout a row
          has room for the title or for two buttons, not both side by side. */}
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium leading-5">{record.item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {itemTypeLabel(record.item.type)}
            {status ? ` · ${status}` : ''}
          </p>
          {record.teacherOnly ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Teacher only: {record.teacherOnly}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {record.route ? (
            <Button size="sm" variant="outline" onClick={() => onOpen(record.route!)} aria-label={`${PHASE_ACTION[record.phase]}: ${record.item.title}`}>
              {PHASE_ACTION[record.phase]}
            </Button>
          ) : null}
          {teacher && onRemove ? (
            <Button size="sm" variant="ghost" onClick={onRemove} disabled={removeDisabled} aria-label={`Remove link: ${record.item.title}`}>
              <Unlink className="mr-1 h-3.5 w-3.5" />Remove link
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

type Feedback = { tone: 'ok' | 'warn' | 'error'; text: string; recheck?: boolean } | null;

function feedbackFor(result: WriterResult, verb: 'linked' | 'removed', bookings: SessionBooking[]): Feedback {
  switch (result.kind) {
    case 'saved':
      return result.refreshFailed
        ? { tone: 'warn', text: `Saved: the record is ${verb}. The list could not refresh, so it may be out of date.`, recheck: true }
        : { tone: 'ok', text: verb === 'linked' ? 'Saved: the record is linked.' : 'Saved: the link is removed. The record is still in My Work.' };
    case 'conflict': {
      const now = result.current === 'invalid'
        ? 'unreadable association data'
        : result.current
          ? describeLink(result.current, bookings)
          : 'no appointment';
      return { tone: 'error', text: `Not saved. This record changed since it was shown and is now linked to ${now}. Review and try again.`, recheck: true };
    }
    case 'not_saved':
      return { tone: 'error', text: `Not saved: ${result.message}. Your selection is kept; you can try again.` };
    case 'unknown':
      return { tone: 'error', text: `We could not confirm whether this saved (${result.message}). Check the current state before trying again.`, recheck: true };
    case 'unavailable':
      return { tone: 'error', text: 'Not saved. This record is no longer available for this student.', recheck: true };
    default:
      return null;
  }
}

function FeedbackLine({ feedback, onRecheck }: { feedback: Feedback; onRecheck: () => void }) {
  if (!feedback) return null;
  return (
    <div
      role={feedback.tone === 'ok' ? 'status' : 'alert'}
      className={cn(
        'mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm',
        feedback.tone === 'ok' && 'border-border bg-muted/40',
        feedback.tone === 'warn' && 'border-amber-300/60 bg-amber-50 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100',
        feedback.tone === 'error' && 'border-destructive/40 bg-destructive/5 text-destructive',
      )}
    >
      <span className="min-w-0 flex-1">{feedback.text}</span>
      {feedback.recheck ? <Button size="sm" variant="outline" onClick={onRecheck}>Check current state</Button> : null}
    </div>
  );
}

function LinkDialog({
  open,
  onOpenChange,
  booking,
  state,
  writer,
  studentName,
  onResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: SessionBooking;
  state: SessionChainState;
  writer: SessionLinkWriter;
  studentName?: string | null;
  onResult: (result: WriterResult) => void;
}) {
  const [phase, setPhase] = React.useState<SessionPhase | ''>('');
  const [itemId, setItemId] = React.useState('');
  const [confirmMove, setConfirmMove] = React.useState(false);
  const [error, setError] = React.useState<Feedback>(null);
  const fieldId = React.useId();

  React.useEffect(() => {
    if (!open) { setPhase(''); setItemId(''); setConfirmMove(false); setError(null); }
  }, [open]);

  const subjectId = state.subjectId ?? '';
  const candidates = React.useMemo(
    () => state.items.filter((item) => isLinkCandidate(item, subjectId) && (!phase || phasesFor(item.type).includes(phase))),
    [state.items, subjectId, phase],
  );
  const item = candidates.find((c) => c.id === itemId) ?? null;
  const parsed = item ? parseSessionChain(item.metadata_json) : null;
  const existing = parsed?.kind === 'valid' ? parsed.link : null;
  const target = phase ? makeLink(booking, phase) : null;
  const alreadyHere = !!existing && !!target && existing.booking_source === target.booking_source && existing.booking_id === target.booking_id && existing.phase === target.phase;
  const isMove = !!existing && !alreadyHere;
  const expected: ExpectedLink = parsed?.kind === 'invalid' ? 'invalid' : existing;
  const canSave = !!item && !!target && !alreadyHere && ((!isMove && parsed?.kind !== 'invalid') || confirmMove) && !writer.pending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave || !item || !target) return;
    setError(null);
    const result = await writer.save(item.id, expected, target);
    if (!result || result.kind === 'superseded') return;
    if (result.kind === 'saved') { onResult(result); onOpenChange(false); return; }
    setError(feedbackFor(result, 'linked', state.bookings));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!writer.pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Link existing work</DialogTitle>
            <DialogDescription>
              For {studentName || 'this student'} · {formatAppointment(booking)}. This links a record that already exists. Nothing is created, assigned or sent.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor={`${fieldId}-phase`} className="block text-sm font-medium">Phase</label>
              <select
                id={`${fieldId}-phase`}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={phase}
                onChange={(e) => { setPhase(e.target.value as SessionPhase | ''); setItemId(''); setConfirmMove(false); }}
                required
              >
                <option value="">Choose a phase</option>
                {SESSION_PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${fieldId}-record`} className="block text-sm font-medium">Record</label>
              <select
                id={`${fieldId}-record`}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={itemId}
                onChange={(e) => { setItemId(e.target.value); setConfirmMove(false); setError(null); }}
                disabled={!phase}
                required
              >
                <option value="">{phase ? (candidates.length ? 'Choose a record' : 'No eligible records for this phase') : 'Choose a phase first'}</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {itemTypeLabel(c.type)} · {teacherOnlyReason(c) ?? 'Visible to student'}{parseSessionChain(c.metadata_json).kind !== 'none' ? ' · already linked' : ''} · {c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            {item ? (
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <dt className="text-muted-foreground">Title</dt><dd className="break-words">{item.title}</dd>
                <dt className="text-muted-foreground">Type</dt><dd>{itemTypeLabel(item.type)}</dd>
                <dt className="text-muted-foreground">Visibility</dt><dd>{teacherOnlyReason(item) ?? 'Visible to student'}</dd>
                <dt className="text-muted-foreground">Source</dt><dd className="break-all">{item.source_table ? `${item.source_table}` : 'Stand-alone record'}</dd>
                <dt className="text-muted-foreground">Current link</dt>
                <dd>{parsed?.kind === 'invalid' ? 'Unreadable association data' : existing ? describeLink(existing, state.bookings) : 'None'}</dd>
              </dl>
            ) : null}
            {alreadyHere ? <p role="status" className="text-sm text-muted-foreground">This record is already linked here under {PHASE_LABEL[existing!.phase]}.</p> : null}
            {item && (isMove || parsed?.kind === 'invalid') ? (
              <label className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                <input type="checkbox" className="mt-1" checked={confirmMove} onChange={(e) => setConfirmMove(e.target.checked)} />
                <span>
                  Move link from {parsed?.kind === 'invalid' ? 'unreadable association data' : describeLink(existing!, state.bookings)} to {target ? describeLink(target, state.bookings) : 'this appointment'}.
                </span>
              </label>
            ) : null}
            <FeedbackLine feedback={error} onRecheck={state.retry} />
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={writer.pending}>Cancel</Button>
            <Button type="submit" disabled={!canSave}>
              {writer.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
              {isMove ? 'Move link' : 'Save link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The appointment's Preparation, Recap and Follow-up, shared by the student's
 * Schedule and the teacher's dossier. Teacher controls render only when a
 * writer is supplied.
 */
export default function SessionChainPanel({
  state,
  selected,
  selectionInvalid = false,
  onBack,
  backLabel = 'Back to schedule',
  studentName,
  writer: suppliedWriter,
  writesEnabled = SESSION_LINK_WRITES_ENABLED,
}: Props) {
  const navigate = useNavigate();
  const teacher = state.audience === 'teacher';
  // Controls exist only when the server can enforce who may change a link.
  const writer = writesEnabled ? suppliedWriter : undefined;
  const writesGated = teacher && !!suppliedWriter && !writesEnabled;
  const gateId = React.useId();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<LinkedRecord | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback>(null);
  const headingId = React.useId();

  // A new subject or a new appointment starts with no dialog and no message.
  const contextKey = `${state.subjectId}|${selected ? bookingKey(selected) : ''}`;
  React.useEffect(() => { setLinkOpen(false); setRemoving(null); setFeedback(null); }, [contextKey]);

  const booking = selected ? state.bookings.find((b) => bookingKey(b) === bookingKey(selected)) ?? null : null;
  const groups = groupsFor(state.projection, booking);

  // The selection lives in the URL, so browser Back from the opened record
  // returns to this same appointment.
  const open = (route: string) => navigate(route);

  const shell = (children: React.ReactNode) => (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-4 @[640px]/schedule:p-5">
      {children}
    </section>
  );

  const back = <Button variant="outline" size="sm" onClick={onBack}>{backLabel}</Button>;

  if (selectionInvalid) {
    return shell(<><h2 id={headingId} className="text-base font-semibold">Appointment unavailable</h2><p className="mt-1 text-sm text-muted-foreground">This appointment link is not valid.</p><div className="mt-3">{back}</div></>);
  }
  if (!selected) return null;
  if (state.bookingsLoading) {
    return shell(<><h2 id={headingId} className="sr-only">Session work</h2><p role="status" aria-live="polite" className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading appointment…</p></>);
  }
  if (state.bookingsFailed) {
    return shell(<><h2 id={headingId} className="text-base font-semibold">Session work</h2><div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-destructive"><CircleAlert className="h-4 w-4" />Appointments could not load.<Button size="sm" variant="outline" onClick={state.retry}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button></div><div className="mt-3">{back}</div></>);
  }
  if (!booking) {
    return shell(<><h2 id={headingId} className="text-base font-semibold">Appointment unavailable</h2><p className="mt-1 text-sm text-muted-foreground">This appointment is not available in {teacher ? 'this student’s' : 'your'} schedule.</p><div className="mt-3">{back}</div></>);
  }

  const canceled = isCanceledBooking(booking);
  const linkable = !!writer && canLinkToBooking(booking) && !state.itemsFailed && !state.itemsLoading;

  const confirmRemove = async () => {
    if (!writer || !removing) return;
    const record = removing;
    const result = await writer.save(record.item.id, makeLink(booking, record.phase), null);
    setRemoving(null);
    if (!result || result.kind === 'superseded') return;
    setFeedback(feedbackFor(result, 'removed', state.bookings));
  };

  return shell(
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session work{teacher && studentName ? ` · ${studentName}` : ''}</p>
          <h2 id={headingId} className="mt-1 text-lg font-semibold tracking-tight">1:1 LSAT session</h2>
          <p className="text-sm text-muted-foreground">{formatAppointment(booking)} · {displayTimeZone()}</p>
          <p className={cn('mt-1 text-xs font-medium', canceled ? 'text-destructive' : 'text-muted-foreground')}>{bookingStateLabel(booking)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {writer ? (
            <Button size="sm" onClick={() => { setFeedback(null); setLinkOpen(true); }} disabled={!linkable || writer.pending} title={canceled ? 'Canceled appointments cannot take new links' : undefined}>
              <Link2 className="mr-1 h-4 w-4" />Link existing work
            </Button>
          ) : writesGated ? (
            <Button size="sm" disabled aria-describedby={gateId}>
              <Link2 className="mr-1 h-4 w-4" />Link existing work
            </Button>
          ) : null}
          {back}
        </div>
      </div>
      {writesGated ? (
        <div id={gateId} role="note" className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <p>{SESSION_LINK_WRITES_BLOCKED}</p>
        </div>
      ) : null}
      {teacher && !writer ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{SESSION_LINK_UNVERIFIED}</p> : null}
      {writer && canceled ? <p className="mt-2 text-xs text-muted-foreground">This appointment was canceled. Earlier links stay listed; new links are disabled.</p> : null}

      {state.stale ? (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
          <span className="min-w-0 flex-1">Could not refresh. Showing what loaded earlier.</span>
          <Button size="sm" variant="outline" onClick={state.retry}>Retry</Button>
        </div>
      ) : null}

      <FeedbackLine feedback={feedback} onRecheck={state.retry} />

      {state.itemsLoading ? (
        <p role="status" aria-live="polite" className="mt-4 flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading linked work…</p>
      ) : state.itemsFailed ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span className="min-w-0 flex-1">Preparation, recap and follow-up could not load, so links for this session are unknown.</span>
          <Button size="sm" variant="outline" onClick={state.retry}>Retry</Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 @[860px]/schedule:grid-cols-3">
          {SESSION_PHASES.map((phase) => {
            const records = groups[phase];
            const groupId = `${headingId}-${phase}`;
            return (
              <section key={phase} aria-labelledby={groupId} className="min-w-0">
                <h3 id={groupId} className="mb-2 text-sm font-semibold">{PHASE_LABEL[phase]}</h3>
                {records.length ? (
                  <ul className="space-y-2">
                    {records.map((record) => (
                      <RecordRow
                        key={record.item.id}
                        record={record}
                        teacher={teacher}
                        onOpen={open}
                        onRemove={writer ? () => setRemoving(record) : undefined}
                        removeDisabled={writer?.pending}
                      />
                    ))}
                  </ul>
                ) : <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">{PHASE_EMPTY[phase]}</p>}
              </section>
            );
          })}
        </div>
      )}

      {teacher && state.projection.issues.length ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">Associations that could not be shown</h3>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {state.projection.issues.map((issue) => <li key={issue.itemId} className="break-words">{issue.title}: {ISSUE_COPY[issue.problem]}</li>)}
          </ul>
        </div>
      ) : null}

      {writer ? (
        <>
          <LinkDialog
            open={linkOpen}
            onOpenChange={setLinkOpen}
            booking={booking}
            state={state}
            writer={writer}
            studentName={studentName}
            onResult={(result) => setFeedback(feedbackFor(result, 'linked', state.bookings))}
          />
          <AlertDialog open={!!removing} onOpenChange={(next) => { if (!next && !writer.pending) setRemoving(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove link?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removing ? `“${removing.item.title}” will no longer be listed under ${PHASE_LABEL[removing.phase]} for this session.` : ''} The record itself stays available in My Work. Nothing is deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={writer.pending}>Keep link</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmRemove(); }} disabled={writer.pending}>
                  {writer.pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}Remove link
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </>,
  );
}


/**
 * Teacher dossier: the selected student's verified appointments and the
 * Session work panel for the one Joshua picks. Selection, dialogs and any
 * in-flight save are bound to `studentId`; switching students resets them.
 */
export function TeacherSessionWork({ studentId, studentName }: { studentId: string; studentName: string | null }) {
  const { user } = useAuth();
  // Remounting on actor or student drops every draft, dialog and message.
  return <TeacherSessionWorkInner key={`${user?.id ?? ''}|${studentId}`} studentId={studentId} studentName={studentName} />;
}

function TeacherSessionWorkInner({ studentId, studentName }: { studentId: string; studentName: string | null }) {
  const state = useTeacherSessionChain(studentId);
  const writer = useSessionLinkWriter(studentId);
  const [selected, setSelected] = React.useState<BookingIdentity | null>(null);
  React.useEffect(() => { setSelected(null); }, [studentId]);

  return (
    <div className="@container/schedule space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Session work · {studentName || 'Selected student'}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Verified appointments for this student only. Possible email matches are not listed.</p>
        {state.bookingsLoading ? (
          <p role="status" className="mt-3 flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading appointments…</p>
        ) : state.bookingsFailed ? (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive"><CircleAlert className="h-4 w-4" />Appointments could not load.<Button size="sm" variant="outline" onClick={state.retry}>Retry</Button></div>
        ) : state.bookings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No verified appointments for this student.</p>
        ) : (
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1" aria-label="Verified appointments">
            {state.bookings.map((booking) => {
              const key = bookingKey(booking);
              const active = !!selected && bookingKey(selected) === key;
              const linked = groupsFor(state.projection, booking);
              const count = SESSION_PHASES.reduce((n, p) => n + linked[p].length, 0);
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(active ? null : { source: booking.source, id: booking.id })}
                    className={cn('flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40')}
                  >
                    <span className="min-w-0">{formatAppointment(booking)}</span>
                    <span className="text-xs text-muted-foreground">{bookingStateLabel(booking)}{count ? ` · ${count} linked${SESSION_LINK_WRITES_ENABLED ? '' : ' (unverified)'}` : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selected ? (
        <SessionChainPanel
          state={state}
          selected={selected}
          onBack={() => setSelected(null)}
          backLabel="Close"
          studentName={studentName}
          writer={writer}
        />
      ) : null}
    </div>
  );
}

/**
 * Past and canceled sessions, from the same verified booking source the
 * panel uses. The calendar shows only upcoming booked sessions, so without
 * this a canceled appointment's preparation or follow-up could be reached only
 * by someone who already had its link. Booking management is unchanged: this
 * list only selects a session for the Session work panel.
 */
export function SessionHistory({
  state,
  selectedKey,
  onSelect,
  now = new Date(),
}: {
  state: SessionChainState;
  selectedKey: string | null;
  onSelect: (identity: BookingIdentity) => void;
  now?: Date;
}) {
  if (state.bookingsLoading || state.bookingsFailed) return null;
  const history = state.bookings
    .filter((b) => isCanceledBooking(b) || b.status !== 'booked' || new Date(b.endAt ?? b.startAt).getTime() < now.getTime())
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  if (history.length === 0) return null;
  return (
    <section aria-labelledby="session-history-heading" className="mt-5 rounded-xl border border-border bg-card p-4">
      <h2 id="session-history-heading" className="text-base font-semibold">Past and canceled sessions</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Open a session to see the preparation, recap and follow-up linked to it.</p>
      <ul className="mt-3 space-y-1.5">
        {history.map((b) => {
          const key = bookingKey(b);
          const label = bookingStateLabel(b, now);
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span className="min-w-0 text-sm">
                {formatAppointment(b)}
                <span className={cn('ml-2 text-xs font-medium', isCanceledBooking(b) ? 'text-destructive' : 'text-muted-foreground')}>{label}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                aria-pressed={selectedKey === key}
                aria-label={`Session work: ${formatAppointment(b)}, ${label}`}
                onClick={() => onSelect({ source: b.source, id: b.id })}
              >
                Session work
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
