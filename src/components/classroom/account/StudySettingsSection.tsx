import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings, type SettingsSaveState } from "@/contexts/UserSettingsContext";
import { QuestionPoolService } from "@/lib/questionPoolService";
import { ProfileTimingPreference } from './ProfileTimingPreference';
import {
  POOL_HISTORY_NOTE,
  RECYCLE_MAX_DAYS,
  RECYCLE_MIN_DAYS,
  legacyOfferSummary,
  parseRecycleDays,
  poolConsequence,
  timingConsequence,
} from "@/lib/studySettings";

/**
 * Study settings on the Account page: section timing and the question pool.
 * Each control says what it changes and when, and the card says honestly
 * where the value is stored and whether the last change was stored.
 *
 * Only settings something in the app actually reads are offered. The old AI
 * tutor and voice coach switches changed nothing anywhere, so they are gone
 * from this page; their stored values are kept untouched.
 */

function Toggle({
  checked,
  onChange,
  label,
  describedBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      className={`classroom-toggle${checked ? " classroom-toggle-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <i aria-hidden="true" />
    </button>
  );
}

function PrefRow({
  label,
  description,
  descriptionId,
  children,
}: {
  label: string;
  description?: string;
  descriptionId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="classroom-account-pref-row">
      <div className="classroom-account-pref-copy">
        <span>{label}</span>
        {description ? <small id={descriptionId}>{description}</small> : null}
      </div>
      {children}
    </div>
  );
}

export function SaveStatus({
  state,
  onRetry,
}: {
  state: SettingsSaveState;
  onRetry: () => void;
}) {
  return (
    <div className="classroom-account-card-note" role="status" aria-live="polite">
      {state === "unsaved" ? (
        <>
          <span>
            This browser would not store your last change. It still applies until you close this tab.
          </span>{" "}
          <button type="button" className="classroom-account-ghost-button" onClick={onRetry}>
            Try saving again
          </button>
        </>
      ) : state === "signed-out" ? (
        <span>Sign in to keep these settings.</span>
      ) : (
        <span>
          Saved in this browser for your account. On another device or browser you start from the
          defaults.
        </span>
      )}
    </div>
  );
}

function RecycleDaysInput({
  value,
  onCommit,
  describedBy,
}: {
  value: number;
  onCommit: (days: number) => void;
  describedBy: string;
}) {
  const [draft, setDraft] = React.useState(String(value));
  const [error, setError] = React.useState<string | null>(null);
  const errorId = React.useId();

  // A saved value that changes underneath (retry, another control) wins over
  // an untouched draft.
  React.useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value]);

  const commit = () => {
    const days = parseRecycleDays(draft);
    if (days === null) {
      setError(`Enter a whole number from ${RECYCLE_MIN_DAYS} to ${RECYCLE_MAX_DAYS}. Still using ${value}.`);
      return;
    }
    setError(null);
    if (days !== value) onCommit(days);
  };

  return (
    <div className="grid justify-items-end gap-1">
      <input
        type="number"
        inputMode="numeric"
        min={RECYCLE_MIN_DAYS}
        max={RECYCLE_MAX_DAYS}
        step={1}
        className="classroom-account-number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value));
            setError(null);
          }
        }}
        aria-label="Days before a seen question can come back"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${describedBy} ${errorId}` : describedBy}
      />
      {error ? (
        <small id={errorId} role="alert" className="max-w-[16rem] text-right">
          {error}
        </small>
      ) : null}
    </div>
  );
}

function StudySettingsCards() {
  const { user } = useAuth();
  const { settings, updateSettings, saveState, retrySave, source, legacyOffer, adoptLegacy } = useUserSettings();
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const poolDescId = React.useId();
  const repeatsDescId = React.useId();
  const unseenDescId = React.useId();
  const recycleDescId = React.useId();

  const retry = () => {
    if (retrySave()) toast.success("Saved");
  };

  const resetPool = async () => {
    if (!user) return;
    setResetting(true);
    try {
      await QuestionPoolService.resetPool(user.id);
      toast.success("Question pool reset");
      setConfirmReset(false);
    } catch {
      // Leave the dialog open so the student can try again or back out.
      toast.error("Could not reset your question pool. Nothing was changed. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <section className="classroom-account-card" aria-labelledby="study-timing-heading">
        <header className="classroom-account-card-head">
          <h2 id="study-timing-heading">Section timing</h2>
        </header>
        {source === "unavailable" ? (
          <p className="classroom-account-card-note" role="alert">
            Local question-pool preferences could not be read. Their defaults apply until this browser allows access.
            Profile timing is saved separately.
          </p>
        ) : source === "unreadable" ? (
          <p className="classroom-account-card-note" role="alert">
            Local question-pool preferences could not be read. Their next change replaces the unreadable local copy.
            Profile timing is saved separately.
          </p>
        ) : null}
        {legacyOffer ? (
          <div className="classroom-account-card-note" data-testid="legacy-offer">
            <p>
              This browser has settings saved before settings belonged to each account. We cannot tell
              whose they are, so they are not applied to your account: {legacyOfferSummary(legacyOffer)}.
            </p>
            <button
              type="button"
              className="classroom-account-ghost-button"
              onClick={() => {
                if (adoptLegacy()) toast.success("Those settings are now saved for your account");
              }}
            >
              Use these settings for my account
            </button>
          </div>
        ) : null}
        <ProfileTimingPreference />
        <p className="classroom-account-card-note">{timingConsequence(settings.defaultTimingMode)}</p>
      </section>

      <section className="classroom-account-card" aria-labelledby="study-pool-heading">
        <header className="classroom-account-card-head">
          <h2 id="study-pool-heading">Question pool</h2>
        </header>
        <p className="classroom-account-card-note" id={poolDescId} aria-live="polite">
          {poolConsequence(settings)}
        </p>
        <PrefRow
          label="Allow repeats"
          description="Lets a drill use questions you have already answered."
          descriptionId={repeatsDescId}
        >
          <Toggle
            checked={settings.allowRepeats}
            onChange={(v) => updateSettings({ allowRepeats: v })}
            label="Allow repeats"
            describedBy={`${repeatsDescId} ${poolDescId}`}
          />
        </PrefRow>
        <PrefRow
          label="New questions first"
          description="Uses questions you have never answered before anything else, while any are left."
          descriptionId={unseenDescId}
        >
          <Toggle
            checked={settings.preferUnseen}
            onChange={(v) => updateSettings({ preferUnseen: v })}
            label="New questions first"
            describedBy={`${unseenDescId} ${poolDescId}`}
          />
        </PrefRow>
        <PrefRow
          label="Days before a seen question can come back"
          description={
            settings.allowRepeats
              ? "Not used while repeats are allowed."
              : "Counted from the last time you saw the question."
          }
          descriptionId={recycleDescId}
        >
          <RecycleDaysInput
            value={settings.recycleAfterDays}
            onCommit={(days) => updateSettings({ recycleAfterDays: days })}
            describedBy={recycleDescId}
          />
        </PrefRow>
        <p className="classroom-account-card-note">{POOL_HISTORY_NOTE}</p>
        <SaveStatus state={saveState} onRetry={retry} />
        <div className="classroom-account-card-foot">
          <button
            type="button"
            className="classroom-account-ghost-button"
            onClick={() => setConfirmReset(true)}
          >
            <RefreshCw size={12} aria-hidden="true" />
            Reset question pool
          </button>
        </div>
      </section>

      {/* Reset-pool confirm, rendered in-tree so it stays on classroom tokens */}
      {confirmReset ? (
        <div
          className="classroom-account-dialog-veil"
          role="presentation"
          onClick={() => {
            if (!resetting) setConfirmReset(false);
          }}
        >
          <div
            className="classroom-account-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-pool-title"
            aria-describedby="reset-pool-body"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !resetting) setConfirmReset(false);
            }}
          >
            <h3 id="reset-pool-title">Reset your question pool?</h3>
            <p id="reset-pool-body">
              Every question counts as new again for choosing what comes next. Your past answers,
              scores and history stay exactly as they are. This can't be undone.
            </p>
            <div className="classroom-account-dialog-actions">
              <button
                type="button"
                className="classroom-account-ghost-button"
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                autoFocus
              >
                Keep my pool
              </button>
              <button
                type="button"
                className="classroom-account-primary-button"
                onClick={() => void resetPool()}
                disabled={resetting}
              >
                {resetting ? (
                  <Loader2 size={13} className="classroom-spin" aria-hidden="true" />
                ) : null}
                Reset pool
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Keyed on the account that owns the settings, so drafts, open dialogs and
 * field errors from one account never survive into another.
 */
export default function StudySettingsSection() {
  const { ownerId, ready } = useUserSettings();
  if (!ready) {
    return (
      <section className="classroom-account-card">
        <header className="classroom-account-card-head">
          <h2>Section timing</h2>
        </header>
        <div className="classroom-skeleton-stack">
          <span className="classroom-skeleton" />
        </div>
      </section>
    );
  }
  return <StudySettingsCards key={ownerId ?? "signed-out"} />;
}
