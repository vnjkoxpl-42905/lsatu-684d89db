import * as React from "react";
import { Check, KeyRound, Loader2, Pencil, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { QuestionPoolService } from "@/lib/questionPoolService";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import PrepSection from "@/components/classroom/account/PrepSection";

// The Profile tab: identity (editable name, password) plus study preferences.
// Everything is styled with classroom tokens — no shadcn primitives, so dark
// mode inherits the classroom palette instead of the broken global .dark vars.

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
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
  children,
  indent,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  indent?: boolean;
}) {
  return (
    <div
      className={`classroom-account-pref-row${indent ? " classroom-account-pref-indent" : ""}`}
    >
      <div className="classroom-account-pref-copy">
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </div>
      {children}
    </div>
  );
}

interface ProfileStats {
  overall_answered?: number;
  overall_correct?: number;
}

export default function ProfileSection() {
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const { displayName, setDisplayName } = useClassroomLayout();

  const [stats, setStats] = React.useState<ProfileStats | null>(null);

  // ── Name editing ──────────────────────────────────────────────────────────
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(displayName);
  const [savingName, setSavingName] = React.useState(false);

  // ── Password ──────────────────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = React.useState(false);
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);

  // ── Reset pool confirm ────────────────────────────────────────────────────
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("overall_answered, overall_correct")
        .eq("class_id", user.id)
        .maybeSingle();
      if (!cancelled && data) setStats(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const email = user?.email ?? "";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;
  const answered = stats?.overall_answered ?? 0;
  const accuracy =
    answered > 0
      ? Math.round(((stats?.overall_correct ?? 0) / answered) * 100)
      : null;

  const startEditName = () => {
    setNameDraft(displayName);
    setEditingName(true);
  };

  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next) {
      toast.error("Your name can't be empty.");
      return;
    }
    if (next === displayName) {
      setEditingName(false);
      return;
    }
    if (!user) return;
    setSavingName(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: next })
        .eq("class_id", user.id);
      if (profileError) throw profileError;
      // Keep auth metadata in step so both identity sources agree.
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: next },
      });
      if (authError) throw authError;
      setDisplayName(next);
      setEditingName(false);
      toast.success("Name updated");
    } catch {
      toast.error("Could not update your name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    if (pw1.length < 8) {
      toast.error("Password needs at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      toast.error("The two passwords don't match.");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      setPwOpen(false);
      toast.success("Password updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.toLowerCase().includes("reauthent") ||
          msg.toLowerCase().includes("expired")
          ? "For security, sign out and back in, then change your password."
          : msg || "Could not update your password. Please try again.",
      );
    } finally {
      setSavingPw(false);
    }
  };

  const resetPool = async () => {
    if (!user) return;
    setResetting(true);
    try {
      await QuestionPoolService.resetPool(user.id);
      toast.success("Question pool reset");
    } catch {
      toast.error("Failed to reset question pool");
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  return (
    <div className="classroom-account-single">
      <div className="classroom-account-main">
        {/* ── Identity ──────────────────────────────────────────────────── */}
        <section className="classroom-account-card">
          <div className="classroom-account-identity">
            <div className="classroom-avatar classroom-account-avatar" aria-hidden="true">
              {displayName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="classroom-account-identity-copy">
              {editingName ? (
                <div className="classroom-account-name-edit">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    maxLength={60}
                    autoFocus
                    aria-label="Display name"
                  />
                  <button
                    type="button"
                    className="classroom-account-icon-button"
                    onClick={() => void saveName()}
                    disabled={savingName}
                    aria-label="Save name"
                  >
                    {savingName ? (
                      <Loader2 size={14} className="classroom-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="classroom-account-icon-button"
                    onClick={() => setEditingName(false)}
                    disabled={savingName}
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="classroom-account-name">
                  {displayName}
                  <button
                    type="button"
                    className="classroom-account-icon-button"
                    onClick={startEditName}
                    aria-label="Edit name"
                    title="Edit name"
                  >
                    <Pencil size={13} />
                  </button>
                </span>
              )}
              <small>{email}</small>
              <div className="classroom-account-identity-meta">
                {memberSince ? <span>Member since {memberSince}</span> : null}
                {answered > 0 && accuracy !== null ? (
                  <span>
                    {answered.toLocaleString()} questions answered · {accuracy}%
                    accuracy
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="classroom-account-password">
            {pwOpen ? (
              <div className="classroom-account-password-form">
                <input
                  type="password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  aria-label="New password"
                />
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  aria-label="Repeat new password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void savePassword();
                  }}
                />
                <div className="classroom-account-password-actions">
                  <button
                    type="button"
                    className="classroom-account-primary-button"
                    onClick={() => void savePassword()}
                    disabled={savingPw}
                  >
                    {savingPw ? (
                      <Loader2 size={13} className="classroom-spin" aria-hidden="true" />
                    ) : null}
                    Update password
                  </button>
                  <button
                    type="button"
                    className="classroom-account-ghost-button"
                    onClick={() => {
                      setPwOpen(false);
                      setPw1("");
                      setPw2("");
                    }}
                    disabled={savingPw}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="classroom-account-ghost-button"
                onClick={() => setPwOpen(true)}
              >
                <KeyRound size={13} aria-hidden="true" />
                Change password
              </button>
            )}
          </div>
        </section>

        {/* ── Your prep (the orientation card's answers, editable) ──────── */}
        <PrepSection />

        {/* ── Practice ──────────────────────────────────────────────────── */}
        <section className="classroom-account-card">
          <header className="classroom-account-card-head">
            <h2>Practice</h2>
          </header>
          <PrefRow
            label="Default timing mode"
            description="Applied when starting Full Section mode with Standard timing."
          >
            <select
              className="classroom-account-select"
              value={settings.defaultTimingMode}
              onChange={(e) =>
                updateSettings({
                  defaultTimingMode: e.target.value as
                    | "35"
                    | "52.5"
                    | "70"
                    | "unlimited",
                })
              }
              aria-label="Default timing mode"
            >
              <option value="35">35:00 — Standard</option>
              <option value="52.5">52:30 — 1.5× time</option>
              <option value="70">70:00 — 2× time</option>
              <option value="unlimited">Stopwatch — no timer</option>
            </select>
          </PrefRow>
        </section>

        {/* ── Question pool ─────────────────────────────────────────────── */}
        <section className="classroom-account-card">
          <header className="classroom-account-card-head">
            <h2>Question pool</h2>
          </header>
          <PrefRow
            label="Allow repeats"
            description="Practice the same questions across sessions."
          >
            <Toggle
              checked={settings.allowRepeats}
              onChange={(v) => updateSettings({ allowRepeats: v })}
              label="Allow repeats"
            />
          </PrefRow>
          <PrefRow
            label="Prefer unseen"
            description="Prioritize questions you haven't met yet."
            indent={!settings.allowRepeats}
          >
            <Toggle
              checked={settings.preferUnseen}
              onChange={(v) => updateSettings({ preferUnseen: v })}
              disabled={!settings.allowRepeats}
              label="Prefer unseen"
            />
          </PrefRow>
          <PrefRow
            label="Recycle after days"
            description="Questions re-enter the pool after this many days."
          >
            <input
              type="number"
              min={1}
              max={365}
              className="classroom-account-number"
              value={settings.recycleAfterDays}
              onChange={(e) =>
                updateSettings({
                  recycleAfterDays: parseInt(e.target.value) || 30,
                })
              }
              aria-label="Recycle after days"
            />
          </PrefRow>
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

        {/* ── AI features ───────────────────────────────────────────────── */}
        <section className="classroom-account-card">
          <header className="classroom-account-card-head">
            <h2>AI features</h2>
          </header>
          <PrefRow
            label="AI tutor"
            description="Real-time reasoning help during practice."
          >
            <Toggle
              checked={settings.tutorEnabled}
              onChange={(v) => updateSettings({ tutorEnabled: v })}
              label="AI tutor"
            />
          </PrefRow>
          <PrefRow
            label="Voice coach"
            description="Speak your reasoning aloud for targeted feedback."
          >
            <Toggle
              checked={settings.voiceCoachEnabled}
              onChange={(v) => updateSettings({ voiceCoachEnabled: v })}
              label="Voice coach"
            />
          </PrefRow>
          {settings.voiceCoachEnabled ? (
            <div className="classroom-account-subgroup">
              <PrefRow label="Show answer contrast" indent>
                <Toggle
                  checked={settings.showContrast}
                  onChange={(v) => updateSettings({ showContrast: v })}
                  label="Show answer contrast"
                />
              </PrefRow>
              <PrefRow label="Teach-back on correct" indent>
                <Toggle
                  checked={settings.teachBackOnCorrect}
                  onChange={(v) => updateSettings({ teachBackOnCorrect: v })}
                  label="Teach-back on correct"
                />
              </PrefRow>
              <PrefRow label="Section debrief" indent>
                <Toggle
                  checked={settings.sectionDebriefEnabled}
                  onChange={(v) => updateSettings({ sectionDebriefEnabled: v })}
                  label="Section debrief"
                />
              </PrefRow>
              <PrefRow label="Store full transcripts" indent>
                <Toggle
                  checked={settings.storeFullTranscript}
                  onChange={(v) => updateSettings({ storeFullTranscript: v })}
                  label="Store full transcripts"
                />
              </PrefRow>
            </div>
          ) : null}
        </section>
      </div>

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
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reset-pool-title">Reset your question pool?</h3>
            <p>
              Every question becomes available again, including ones you've
              already practiced. This can't be undone.
            </p>
            <div className="classroom-account-dialog-actions">
              <button
                type="button"
                className="classroom-account-ghost-button"
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
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
    </div>
  );
}
