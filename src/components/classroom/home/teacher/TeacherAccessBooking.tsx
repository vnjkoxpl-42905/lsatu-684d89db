import * as React from "react";
import type { DeskActions } from "./teachingDeskModel";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CONFIGURABLE_FLAG_KEYS,
  ALL_FLAG_LABELS,
  type ManagedUser,
  type AccessTier,
} from "@/lib/adminUsers";
import {
  saveHomeAccess,
  loadHomeBooking,
  prepareHomeTopUp,
  addHomeBookingCredits,
  revokeHomeBooking,
  createHomeBooking,
  getPendingHomeTopUp,
  resolvePendingHomeTopUp,
  discardUnreadableHomeTopUp,
  reactivateHomeBooking,
  type HomeBookingPass,
} from "@/lib/teacherHomeActions";

export function eligibleAccounts(students: ManagedUser[]) {
  return [...new Map(students.filter(s => s.role !== "admin" && !s.archived_at).map(s => [s.class_id, s])).values()].sort((a,b) => (a.display_name || a.email).toLocaleLowerCase().localeCompare((b.display_name || b.email).toLocaleLowerCase()) || a.email.localeCompare(b.email) || a.class_id.localeCompare(b.class_id));
}
export function AccountPicker({ students, value, onChange, disabled, state = "ready", onRetry }: {
  students: ManagedUser[]; value: string; onChange: (value: string) => void;
  disabled?: boolean; state?: string; onRetry?: () => void;
}) {
  const accounts = eligibleAccounts(students);
  const matches = accounts;
  return <div className="home-desk-account-picker">
    <label className="home-desk-label">Student<select value={value} disabled={disabled || state !== "ready"} onChange={e => onChange(e.target.value)}>
      <option value="">Choose a student</option>
      {matches.map(s => <option key={s.class_id} value={s.class_id}>{s.display_name || s.email} · {s.email}</option>)}
    </select></label>
    {state === "loading" ? <p role="status">Loading accounts…</p> : state !== "ready" ? <p role="alert">{state === "setup" ? "Account controls are not set up yet." : "Accounts could not be loaded."} {onRetry ? <button onClick={onRetry}>Retry accounts</button> : "Reload Home to check again."}</p> : !matches.length ? <p>No matching eligible accounts.</p> : null}
  </div>;
}
export function AccessSheet({
  person,
  onClose,
  onSaved,
  save = saveHomeAccess,
  open, students = [], onSelect, rosterState, onRetryRoster,
}: {
  open?: boolean;
  students?: ManagedUser[];
  onSelect?: (person: ManagedUser | null) => void;
  rosterState?: string;
  onRetryRoster?: () => void;
  save?: typeof saveHomeAccess;
  person: ManagedUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tier, setTier] = React.useState<AccessTier>("tier_2");
  const [draft, setDraft] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [baseline, setBaseline] = React.useState<ManagedUser | null>(person);
  React.useEffect(() => {
    if (person) {
      setBaseline(person);
      setTier("tier_2");
      setDraft(
        Object.fromEntries(CONFIGURABLE_FLAG_KEYS.map((k) => [k, !!person[k]])),
      );
      setError("");
      setSaved(false);
    }
  }, [person?.class_id]);
  return (
    <Sheet
      open={open ?? !!person}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <SheetContent
        className="home-desk-sheet"
        overlayClassName="home-desk-overlay"
      >
        <SheetTitle>Student access</SheetTitle>
        <SheetDescription>
          Review the named account and features before saving.
        </SheetDescription>
        {onSelect ? <AccountPicker students={students} value={person?.class_id ?? ""} disabled={busy} state={rosterState} onRetry={onRetryRoster} onChange={id => onSelect(eligibleAccounts(students).find(s => s.class_id === id) ?? null)} /> : null}
        {person ? (
          <>
            <h3>{person.display_name || person.email}</h3>
            <p>{person.email}</p>
            <label className="home-desk-label">
              Access choice
              <select
                value={tier}
                disabled={busy}
                onChange={(e) => {
                  setTier(e.target.value as AccessTier);
                  setSaved(false);
                }}
              >
                <option value="tier_1">Full (Tier 1)</option>
                <option value="tier_3">Basic (Tier 3)</option>
                <option value="tier_2">Customize (Tier 2)</option>
              </select>
            </label>
            {tier === "tier_2" ? (
              <fieldset className="home-desk-feature-list">
                <legend>Enabled features after saving</legend>
                {CONFIGURABLE_FLAG_KEYS.map((k) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={!!draft[k]}
                      disabled={busy}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, [k]: e.target.checked }));
                        setSaved(false);
                      }}
                    />
                    {ALL_FLAG_LABELS[k]}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="home-desk-confirm">
                {tier === "tier_1"
                  ? "All configurable features will be enabled."
                  : "Messages and Schedule will be enabled. Other configurable features will be off."}
              </p>
            )}
            <p className="home-desk-empty">
              This changes access for {person.display_name || person.email}. It
              does not add booking sessions or assign work.
            </p>
            {error ? <p role="alert">{error}</p> : null}
            {saved ? (
              <p role="status">
                Saved and verified for {person.display_name || person.email}.
              </p>
            ) : null}
            <button
              className="home-desk-primary"
              disabled={busy || saved}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const verified = await save(
                    baseline ?? person,
                    tier,
                    tier === "tier_2" ? draft : undefined,
                  );
                  setBaseline(verified);
                  setSaved(true);
                  onSaved();
                } catch {
                  setError(
                    "Access was not confirmed. Refresh the account before trying again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "Saving…"
                : saved
                  ? "Access saved"
                  : "Confirm access change"}
            </button>
            <button
              className="home-desk-text-button"
              disabled={busy}
              onClick={onClose}
            >
              {saved ? "Close" : "Cancel"}
            </button>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
export function BookingSheet({
  open,
  onClose,
  actorId,
  students,
  actions,
  mode = "credits", rosterState = "ready", onRetryRoster,
}: {
  mode?: "credits" | "link";
  rosterState?: string;
  onRetryRoster?: () => void;
  actions?: DeskActions;
  open: boolean;
  onClose: () => void;
  actorId?: string;
  students: ManagedUser[];
}) {
  const api = actions ?? {
    loadHomeBooking,
    prepareHomeTopUp,
    addHomeBookingCredits,
    revokeHomeBooking,
    createHomeBooking,
    getPendingHomeTopUp,
    resolvePendingHomeTopUp,
    discardUnreadableHomeTopUp,
    reactivateHomeBooking,
  };
  const [studentId, setStudentId] = React.useState("");
  const [sessionMinutes, setSessionMinutes] = React.useState(70);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [pass, setPass] = React.useState<HomeBookingPass | null>(null);
  const [amount, setAmount] = React.useState(1);
  const [customAmount, setCustomAmount] = React.useState(false);
  const [create, setCreate] = React.useState(false);
  const [additionVerified, setAdditionVerified] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [revoke, setRevoke] = React.useState(false);
  const [confirmRecovery, setConfirmRecovery] = React.useState(false);
  const generation = React.useRef(0);
  const expired =
    !!pass &&
    (pass.status === "expired" ||
      (!!pass.expires_at &&
        Number.isFinite(Date.parse(pass.expires_at)) &&
        Date.parse(pass.expires_at) <= Date.now()));
  const target = eligibleAccounts(students).find((s) => s.class_id === studentId);
  const recoveryTarget = students.find((s) => s.class_id === studentId);
  const name = target?.display_name || target?.email || "student";
  // A reopened sheet is a new intent. Pending recovery restores its exact
  // target and quantity below; changing students must not reset the form.
  React.useEffect(() => {
    if (!open) return;
    setStudentId("");
    setAmount(1);
    setCustomAmount(false);
    setSessionMinutes(70);
    setExpiresAt("");
    setConfirmRecovery(false);
    setBusy(false);
  }, [open, actorId]);
  React.useEffect(() => {
    if (!open) return;
    setError("");
    setNotice("");
    setRevoke(false);
    setCreate(false);
    setAdditionVerified(false);
    setConfirmRecovery(false);
    setPass(null);
    setLoaded(false);
    const version = ++generation.current;
    if (!studentId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    api
      .loadHomeBooking(studentId)
      .then((p) => {
        if (generation.current === version) {
          setPass(p);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (generation.current === version)
          setError("Could not load current sessions. No changes made.");
      })
      .finally(() => {
        if (generation.current === version) setBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [open, studentId, actorId]);
  let pending: ReturnType<typeof getPendingHomeTopUp> = null;
  let pendingError = "";
  try {
    if (open && actorId) pending = api.getPendingHomeTopUp(actorId);
  } catch {
    pendingError =
      "The saved booking operation could not be read. Keep this page open and check the operation before adding more sessions.";
  }
  React.useEffect(() => {
    if (open && pending) {
      setStudentId(pending.studentId);
      setAmount(pending.amount);
      setCustomAmount(![1, 5, 10].includes(pending.amount));
    }
  }, [open, pending?.operationKey]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch {
      setError(
        "The operation was not confirmed. Retry the same request to check it; do not create a second addition.",
      );
    } finally {
      setBusy(false);
    }
  };
  const creationError = () => {
    if (!Number.isInteger(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 480)
      return "Choose a whole session length between 15 and 480 minutes.";
    if (expiresAt) {
      const expiry = Date.parse(`${expiresAt}T23:59:59`);
      if (!Number.isFinite(expiry) || expiry <= Date.now())
        return "Choose a future expiry date, or leave expiry blank.";
    }
    return "";
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <SheetContent
        className="home-desk-sheet"
        overlayClassName="home-desk-overlay"
      >
        <SheetTitle>{mode === "credits" ? "Session credits" : "Individual booking links"}</SheetTitle>
        <SheetDescription>
          {mode === "credits" ? "Correct missed booking sessions for a named account. Credits do not record a payment or change platform access." : "Reuse a student’s private booking link, or explicitly create one with initial sessions. Anyone with the link can book."}
        </SheetDescription>
        <AccountPicker students={students} value={studentId} disabled={busy || !!pending} state={rosterState} onRetry={onRetryRoster} onChange={setStudentId} />
        {error || pendingError ? (
          <p role="alert">{error || pendingError}</p>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        {pendingError ? (
          <div className="home-desk-confirm">
            <p>
              {studentId ? `Account: ${recoveryTarget?.display_name || recoveryTarget?.email || studentId}. ` : "Choose an eligible account once the roster is available. "}
              Review its current balance and any successful addition before
              starting a new request. This cannot retry the unreadable request.
            </p>
            {!target || !loaded ? <p>Recovery requires a selected eligible account and its loaded session balance. {rosterState !== "ready" ? "Retry loading accounts before continuing." : "Choose the account and wait for its balance before confirming."}</p> : null}
            <label>
              <input
                type="checkbox"
                checked={confirmRecovery}
                disabled={!target || !loaded || busy}
                onChange={(e) => setConfirmRecovery(e.target.checked)}
              />
              I have reviewed the named student and want to recover this
              session’s booking controls.
            </label>
            <button
              disabled={busy || !confirmRecovery || !target || !loaded || !actorId}
              onClick={() =>
                void act(async () => {
                  const current = await api.discardUnreadableHomeTopUp(
                    actorId!,
                    studentId,
                    true,
                  );
                  setPass(current);
                  setLoaded(true);
                  setConfirmRecovery(false);
                  setNotice(
                    "Current balance loaded. Review it before a new intentional addition.",
                  );
                })
              }
            >
              Confirm recovery for {recoveryTarget?.display_name || recoveryTarget?.email || studentId || "selected account"}
            </button>
          </div>
        ) : null}
        {pending ? (
          <div className="home-desk-confirm">
            <p>Pending account: {students.find(s => s.class_id === pending.studentId)?.email || pending.studentId} · {pending.amount} {pending.amount === 1 ? "session" : "sessions"}</p>
            <p>
              An earlier session addition needs confirmation. Check it before
              starting another.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const result = await api.resolvePendingHomeTopUp(pending);
                  setPass(result.pass);
                  setLoaded(true);
                  setAdditionVerified(!!result.receipt);
                  setNotice(
                    result.receipt
                      ? "The earlier addition was applied and verified."
                      : "The earlier addition was not applied. Review the balance before starting a new addition.",
                  );
                })
              }
            >
              Check pending add
            </button>
            <button
              className="home-desk-primary"
              disabled={busy || !actorId || pending.actorId !== actorId}
              onClick={() => void act(async () => {
                const result = await api.addHomeBookingCredits(pending);
                setPass(result.pass);
                setLoaded(true);
                setAdditionVerified(true);
                setNotice("Session addition verified.");
              })}
            >Retry pending addition</button>
          </div>
        ) : null}
        {loaded && target ? (
          <>
            <h3>{name}</h3>
            <p className="home-desk-account-email">{target.email}</p>
            {pass ? (
              <>
                <p>
                  {pass.credits_remaining} {pass.credits_remaining === 1 ? "session" : "sessions"} remaining · {pass.status}
                </p>
                <p className="home-desk-empty">
                  {pass.session_length_minutes} minutes per session
                  {pass.expires_at
                    ? ` · Expires ${new Date(pass.expires_at).toLocaleDateString()}`
                    : " · No expiry"}
                </p>
                {mode === "link" && pass.booking_url && pass.status !== "revoked" ? (
                  <>
                    <a
                      className="home-desk-external"
                      href={pass.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open private booking link ↗
                    </a>
                    <button
                      className="home-desk-text-button"
                      disabled={busy}
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(pass.booking_url)
                          .then(() => setNotice("Private link copied."))
                          .catch(() =>
                            setError(
                              "Could not copy. Open the link and copy its address.",
                            ),
                          )
                      }
                    >
                      Copy private link
                    </button>
                  </>
                ) : null}
              </>
            ) : (
              <p>
                No active booking link. Creating one makes the selected sessions
                usable immediately.
              </p>
            )}
            {expired && pass ? (
              <details className="home-desk-confirm">
                <summary>Extend this expired booking link</summary>
                <p>
                  Remove the expiry for {name}, keep the same private link and
                  preserve all {pass.credits_remaining} remaining sessions. No
                  sessions are added by this action.
                </p>
                <button
                  disabled={busy || !!pending || !!pendingError}
                  onClick={() =>
                    void act(async () => {
                      setPass(
                        await api.reactivateHomeBooking(
                          studentId,
                          pass.id,
                          true,
                        ),
                      );
                      setNotice(
                        "Existing link reactivated. Review its balance before adding sessions.",
                      );
                    })
                  }
                >
                  Confirm reactivate existing link
                </button>
              </details>
            ) : null}
            {pass?.status === "revoked" ? <p role="status" className="home-desk-confirm">This private link is revoked. Sessions cannot be added here. Review the account in Students before issuing a replacement.</p> : null}
            {!pass && mode === "link" ? <button className="home-desk-text-button" disabled={busy || !!pending || !!pendingError} onClick={() => setCreate(true)}>Create link with initial sessions</button> : null}
            {mode === "credits" && additionVerified && !pending ? <button className="home-desk-text-button" disabled={busy} onClick={() => { setAdditionVerified(false); setAmount(1); setCustomAmount(false); }}>Add more sessions</button> : null}
            {((mode === "credits") || (!pass && create)) && !pending && !additionVerified ? <>
            <label className="home-desk-label">
              {pass ? "Sessions to add" : "Initial sessions"}
              <select
                value={customAmount ? 0 : amount}
                onChange={(e) => { setCustomAmount(e.target.value === "0"); setAmount(Number(e.target.value)); }}
                disabled={busy || !!pending}
              >
                <option value="1">1 session</option>
                <option value="5">5 sessions</option>
                <option value="10">10 sessions</option>
                <option value="0">Custom</option>
              </select>
            </label>
            {customAmount ? (
              <label className="home-desk-label">
                Custom number
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  disabled={busy || !!pending}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
            ) : null}
            {!pass ? (
              <div className="home-desk-filters">
                <label>
                  Session minutes
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={sessionMinutes}
                    onChange={(e) => setSessionMinutes(Number(e.target.value))}
                  />
                </label>
                <label>
                  Expiry (optional)
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </label>
              </div>
            ) : null}
            <p className="home-desk-confirm">
              {pass
                ? `Add ${amount} ${amount === 1 ? "session" : "sessions"} for ${name}. Balance: ${pass.credits_remaining} → ${pass.credits_remaining + amount} sessions remaining.`
                : `Create ${amount} ${amount === 1 ? "session" : "sessions"} for ${name}.`}
            </p>
            {!pass && creationError() ? <p role="alert">{creationError()}</p> : null}
            <button
              className="home-desk-primary"
              disabled={
                busy ||
                !!pendingError ||
                !actorId ||
                !target ||
                (!pass && (!Number.isInteger(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 480)) ||
                (!pass && !!creationError()) ||
                !Number.isInteger(amount) ||
                amount < 1 ||
                amount > 50 ||
                expired ||
                pass?.status === "revoked"
              }
              onClick={() => {
                const invalid = !pass ? creationError() : "";
                if (invalid) { setError(invalid); return; }
                void act(async () => {
                  if (pass) {
                    const request =
                      pending ??
                      api.prepareHomeTopUp(
                        actorId!,
                        studentId,
                        pass.id,
                        amount,
                      );
                    const result = await api.addHomeBookingCredits(request);
                    setPass(result.pass);
                    setAdditionVerified(true);
                    setNotice("Session addition verified.");
                  } else {
                    try {
                      setPass(
                        await api.createHomeBooking(studentId, amount, {
                          sessionMinutes,
                          expiresAt: expiresAt
                            ? new Date(`${expiresAt}T23:59:59`).toISOString()
                            : null,
                        }),
                      );
                      setAdditionVerified(true);
                      setNotice("New booking link and sessions verified.");
                    } catch (error) {
                      setAdditionVerified(true);
                      try { setPass(await api.loadHomeBooking(studentId)); }
                      catch { setError("Creation outcome is unknown and the balance could not be loaded. Check the account before a new addition."); }
                      setNotice(error instanceof Error && error.message.startsWith("pass_exists:")
                        ? "A booking pass already exists; review the balance before adding more."
                        : "Creation outcome is unknown. Review the current balance before adding more.");
                    }
                  }
                });
              }}
            >
              {busy
                ? "Checking…"
                : pending
                  ? "Retry pending addition"
                  : pass
                    ? `Add ${amount} ${amount === 1 ? "session" : "sessions"}`
                    : mode === "credits" ? `Add ${amount} ${amount === 1 ? "session" : "sessions"}` : "Confirm create link with initial sessions"}
            </button>
            </> : null}
            {mode === "link" && pass && pass.status !== "revoked" ? (
              <details
                open={revoke}
                onToggle={(e) => setRevoke(e.currentTarget.open)}
              >
                <summary>Revoke this private link</summary>
                <p>
                  Revoke the link for {name}? Students will no longer be able to
                  book with it.
                </p>
                <button
                  className="home-desk-danger"
                  disabled={busy || !!pending || !!pendingError}
                  onClick={() =>
                    void act(async () => {
                      setPass(
                        await api.revokeHomeBooking(studentId, pass.id, true),
                      );
                      setRevoke(false);
                      setNotice("This link has been revoked.");
                    })
                  }
                >
                  Confirm revoke
                </button>
              </details>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
