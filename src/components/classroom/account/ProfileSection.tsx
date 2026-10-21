import * as React from "react";
import { Check, KeyRound, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import PrepSection from "@/components/classroom/account/PrepSection";
import StudySettingsSection from "@/components/classroom/account/StudySettingsSection";

// The Profile tab: identity (editable name, password) plus study preferences.
// Everything is styled with classroom tokens — no shadcn primitives, so dark
// mode inherits the classroom palette instead of the broken global .dark vars.
// Study settings (timing, question pool) live in StudySettingsSection.

interface ProfileStats {
  overall_answered?: number;
  overall_correct?: number;
}

export default function ProfileSection() {
  const { user } = useAuth();
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

        {/* ── Section timing and question pool ──────────────────────────── */}
        <StudySettingsSection />
      </div>
    </div>
  );
}
