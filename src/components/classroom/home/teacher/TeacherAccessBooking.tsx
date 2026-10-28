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
export function AccessSheet({
  person,
  onClose,
  onSaved,
  save = saveHomeAccess,
}: {
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
  React.useEffect(() => {
    if (person) {
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
      open={!!person}
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
                  await save(
                    person,
                    tier,
                    tier === "tier_2" ? draft : undefined,
                  );
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
}: {
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
  const [amount, setAmount] = React.useState(5);
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
  const target = students.find((s) => s.class_id === studentId);
  const name = target?.display_name || target?.email || "student";
  React.useEffect(() => {
    if (!open) return;
    setError("");
    setNotice("");
    setRevoke(false);
    setPass(null);
    setLoaded(false);
    const version = ++generation.current;
    if (!studentId) return;
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
        <SheetTitle>Session link</SheetTitle>
        <SheetDescription>
          Private booking access, with no payment step. Anyone with the link can
          book.
        </SheetDescription>
        <label className="home-desk-label">
          Student
          <select
            disabled={busy || !!pending}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Choose a student</option>
            {students.map((s) => (
              <option key={s.class_id} value={s.class_id}>
                {s.display_name || s.email}
              </option>
            ))}
          </select>
        </label>
        {error || pendingError ? (
          <p role="alert">{error || pendingError}</p>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        {pendingError && target ? (
          <div className="home-desk-confirm">
            <p>
              Review {name}’s current balance and any successful addition before
              starting a new request. This cannot retry the unreadable request.
            </p>
            <label>
              <input
                type="checkbox"
                checked={confirmRecovery}
                onChange={(e) => setConfirmRecovery(e.target.checked)}
              />
              I have reviewed the named student and want to recover this
              session’s booking controls.
            </label>
            <button
              disabled={busy || !confirmRecovery}
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
              Confirm recovery for {name}
            </button>
          </div>
        ) : null}
        {pending ? (
          <div className="home-desk-confirm">
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
          </div>
        ) : null}
        {loaded && target ? (
          <>
            <h3>{name}</h3>
            {pass ? (
              <>
                <p>
                  {pass.credits_remaining} sessions remaining · {pass.status}
                </p>
                <p className="home-desk-empty">
                  {pass.session_length_minutes} minutes per session
                  {pass.expires_at
                    ? ` · Expires ${new Date(pass.expires_at).toLocaleDateString()}`
                    : " · No expiry"}
                </p>
                {pass.booking_url ? (
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
            <label className="home-desk-label">
              {pass ? "Sessions to add" : "Initial sessions"}
              <select
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={busy || !!pending}
              >
                <option value="1">1 session</option>
                <option value="5">5 sessions</option>
                <option value="10">10 sessions</option>
                <option value="0">Custom</option>
              </select>
            </label>
            {![1, 5, 10].includes(amount) ? (
              <label className="home-desk-label">
                Custom number
                <input
                  type="number"
                  min="1"
                  max="50"
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
                ? `Add ${amount} sessions for ${name}, preserving ${pass.credits_remaining} remaining.`
                : `Create ${amount} sessions for ${name}.`}
            </p>
            <button
              className="home-desk-primary"
              disabled={
                busy ||
                !!pendingError ||
                !actorId ||
                (!pass && (sessionMinutes < 15 || sessionMinutes > 480)) ||
                amount < 1 ||
                amount > 50 ||
                expired ||
                pass?.status === "revoked"
              }
              onClick={() =>
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
                      setNotice("New booking link and sessions verified.");
                    } catch (error) {
                      if (
                        error instanceof Error &&
                        error.message.startsWith("pass_exists:")
                      ) {
                        setPass(await api.loadHomeBooking(studentId));
                        setNotice(
                          "An existing booking link was found. No sessions were added. Review its balance, then confirm Add sessions.",
                        );
                      } else throw error;
                    }
                  }
                })
              }
            >
              {busy
                ? "Checking…"
                : pending
                  ? "Retry pending addition"
                  : pass
                    ? "Confirm add sessions"
                    : "Confirm create link"}
            </button>
            {pass && pass.status !== "revoked" ? (
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
