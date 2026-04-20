import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, LogOut, Clock, Library, RefreshCw, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { QuestionPoolService } from '@/lib/questionPoolService';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getLevelProgress } from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StatsData {
  xp_total?: number;
  streak_current?: number;
  overall_answered?: number;
  overall_correct?: number;
  class_id?: string;
  level?: number;
  longest_streak?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Academic phase mapping
// ─────────────────────────────────────────────────────────────────────────────
function getPhase(level: number): { roman: string; label: string } {
  if (level <= 3)  return { roman: 'I',   label: 'Foundation' };
  if (level <= 6)  return { roman: 'II',  label: 'Development' };
  if (level <= 10) return { roman: 'III', label: 'Competency' };
  if (level <= 15) return { roman: 'IV',  label: 'Proficiency' };
  return            { roman: 'V',   label: 'Mastery' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitive components
// ─────────────────────────────────────────────────────────────────────────────

/** Semantic card with border + shadow */
function PremiumCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl',
        'ring-1 ring-border',
        'shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Instrument-grade label */
function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

/** Card section header */
function SectionHead({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <IL>{title}</IL>
    </div>
  );
}

/** Settings toggle row */
function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  indent,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-3',
        indent && 'pl-3',
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      <div className="min-w-0">
        <div className="text-[13px] text-foreground/80 leading-snug">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">
            {description}
          </div>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  // ── Auth guard + data load ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (student?.class_id) {
        const { data: profileStats } = await supabase
          .from('profiles')
          .select(
            'xp_total, streak_current, overall_answered, overall_correct, class_id, level, longest_streak',
          )
          .eq('class_id', student.class_id)
          .maybeSingle();

        if (profileStats) setStats(profileStats);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleResetPool = async () => {
    if (!stats?.class_id) return;
    try {
      await QuestionPoolService.resetPool(stats.class_id);
      toast.success('Question pool reset');
    } catch {
      toast.error('Failed to reset question pool');
    }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const email        = user?.email ?? '';
  const displayName  =
    user?.user_metadata?.display_name ||
    email.split('@')[0] ||
    'Student';
  const initials     = displayName.slice(0, 2).toUpperCase();
  const capitalName  =
    displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();

  const level         = stats?.level ?? 1;
  const totalXP       = stats?.xp_total ?? 0;
  const phase         = getPhase(level);
  const progress      = getLevelProgress(totalXP, level);

  const endurance     = stats?.streak_current ?? 0;
  const bestEndurance = stats?.longest_streak ?? 0;
  const volumeLogged  = stats?.overall_answered ?? 0;
  const accuracy      =
    volumeLogged > 0
      ? Math.round(((stats?.overall_correct ?? 0) / volumeLogged) * 100)
      : 0;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : null;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border border-border border-t-foreground/30 rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
            onClick={() => navigate('/foyer')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Main Hub
          </Button>
          <IL>Profile</IL>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 items-start">

          {/* ════════════════════════════════════════════════════════════════
              LEFT  —  Identity bento + Academic status band
          ════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">

            {/* Identity anchor card */}
            <PremiumCard className="p-6">
              <div className="flex items-start gap-4">
                {/* Monogram avatar */}
                <div className="w-14 h-14 rounded-xl bg-secondary ring-1 ring-border flex items-center justify-center shrink-0">
                  <span className="text-base font-semibold text-foreground/80 tracking-wide">
                    {initials}
                  </span>
                </div>

                {/* Name + email + member since */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-[15px] font-medium text-foreground leading-snug truncate">
                    {capitalName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{email}</div>
                  {memberSince && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <IL>Since</IL>
                      <span className="text-[10px] text-foreground/60 tracking-wide tabular-nums">
                        {memberSince}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </PremiumCard>

            {/* Phase + Endurance */}
            <div className="grid grid-cols-2 gap-3">
              {/* Phase */}
              <PremiumCard className="p-4">
                <IL>Phase</IL>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[2rem] font-light text-foreground tabular-nums tracking-tight leading-none">
                    {phase.roman}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  {phase.label}
                </div>
              </PremiumCard>

              {/* Endurance */}
              <PremiumCard className="p-4">
                <IL>Endurance</IL>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-[2rem] font-light text-foreground tabular-nums tracking-tight leading-none">
                    {endurance}
                  </span>
                  <span className="text-[11px] text-muted-foreground mb-0.5">days</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  Peak&nbsp;&nbsp;{bestEndurance}
                </div>
              </PremiumCard>
            </div>

            {/* Academic status band */}
            <PremiumCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <IL>Phase progression</IL>
                <span className="text-[10px] text-foreground/60 tabular-nums tracking-wide">
                  {phase.roman}&thinsp;of&thinsp;V
                </span>
              </div>

              {/* Thin razor track */}
              <div className="relative h-px w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-foreground/60 rounded-full"
                  style={{
                    width: `${progress.percentage}%`,
                    transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>

              {/* Three instrument readouts */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-border">
                <div className="pr-4">
                  <IL>Volume Logged</IL>
                  <div className="text-[13px] font-medium text-foreground/80 tabular-nums mt-1.5">
                    {volumeLogged.toLocaleString()}
                  </div>
                </div>
                <div className="px-4">
                  <IL>Accuracy</IL>
                  <div className="text-[13px] font-medium text-foreground/80 tabular-nums mt-1.5">
                    {accuracy}%
                  </div>
                </div>
                <div className="pl-4">
                  <IL>Phase&nbsp;%</IL>
                  <div className="text-[13px] font-medium text-foreground/80 tabular-nums mt-1.5">
                    {Math.round(progress.percentage)}%
                  </div>
                </div>
              </div>
            </PremiumCard>

          </div>

          {/* ════════════════════════════════════════════════════════════════
              RIGHT  —  Settings + Account controls
          ════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">

            {/* Practice Settings ─────────────────────────────────────────── */}
            <PremiumCard className="p-5">
              <SectionHead icon={Clock} title="Practice Settings" />

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-normal">
                  Default Timing Mode
                </Label>
                <Select
                  value={settings.defaultTimingMode}
                  onValueChange={(value) =>
                    updateSettings({
                      defaultTimingMode: value as '35' | '52.5' | '70' | 'unlimited',
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-secondary border-border text-foreground text-[13px] h-9 focus:ring-0 focus:ring-offset-0 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="35"        className="text-[13px] focus:bg-accent focus:text-foreground">35:00 — Standard</SelectItem>
                    <SelectItem value="52.5"      className="text-[13px] focus:bg-accent focus:text-foreground">52:30 — 1.5× Accommodation</SelectItem>
                    <SelectItem value="70"        className="text-[13px] focus:bg-accent focus:text-foreground">70:00 — 2× Accommodation</SelectItem>
                    <SelectItem value="unlimited" className="text-[13px] focus:bg-accent focus:text-foreground">Stopwatch — No Timer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground/70 mt-1.5 leading-snug">
                  Applied when starting Full Section mode with Standard timing.
                </p>
              </div>
            </PremiumCard>

            {/* Question Pool ─────────────────────────────────────────────── */}
            <PremiumCard className="p-5">
              <SectionHead icon={Library} title="Question Pool" />

              <div className="divide-y divide-border">
                <ToggleRow
                  label="Allow Repeats"
                  description="Practice the same questions across sessions"
                  checked={settings.allowRepeats}
                  onCheckedChange={(v) => updateSettings({ allowRepeats: v })}
                />
                <ToggleRow
                  label="Prefer Unseen"
                  description="Prioritise questions not yet encountered"
                  checked={settings.preferUnseen}
                  onCheckedChange={(v) => updateSettings({ preferUnseen: v })}
                  disabled={!settings.allowRepeats}
                />
                <div className="py-3 space-y-2">
                  <Label className="text-[11px] text-muted-foreground font-normal">
                    Recycle After Days
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.recycleAfterDays}
                    onChange={(e) =>
                      updateSettings({ recycleAfterDays: parseInt(e.target.value) || 30 })
                    }
                    className="bg-secondary border-border text-foreground text-[13px] h-9 w-28 focus:ring-0 focus:ring-offset-0"
                  />
                  <p className="text-[11px] text-muted-foreground/70 leading-snug">
                    Questions re-enter the pool after this many days.
                  </p>
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetPool}
                  className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent text-[11px] h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset Question Pool
                </Button>
              </div>
            </PremiumCard>

            {/* AI Features ───────────────────────────────────────────────── */}
            <PremiumCard className="p-5">
              <SectionHead icon={Bot} title="AI Features" />

              <div className="divide-y divide-border">
                <ToggleRow
                  label="AI Tutor"
                  description="Real-time reasoning assistance during practice"
                  checked={settings.tutorEnabled}
                  onCheckedChange={(v) => updateSettings({ tutorEnabled: v })}
                />
                <ToggleRow
                  label="Voice Coach"
                  description="Speak your reasoning aloud for targeted feedback"
                  checked={settings.voiceCoachEnabled}
                  onCheckedChange={(v) => updateSettings({ voiceCoachEnabled: v })}
                />
                {settings.voiceCoachEnabled && (
                  <div className="pt-2 pb-1 pl-3 border-l border-border ml-0.5 divide-y divide-border">
                    <ToggleRow
                      label="Show answer contrast"
                      checked={settings.showContrast}
                      onCheckedChange={(v) => updateSettings({ showContrast: v })}
                      indent
                    />
                    <ToggleRow
                      label="Teach-back on correct"
                      checked={settings.teachBackOnCorrect}
                      onCheckedChange={(v) => updateSettings({ teachBackOnCorrect: v })}
                      indent
                    />
                    <ToggleRow
                      label="Section debrief"
                      checked={settings.sectionDebriefEnabled}
                      onCheckedChange={(v) => updateSettings({ sectionDebriefEnabled: v })}
                      indent
                    />
                    <ToggleRow
                      label="Store full transcripts"
                      checked={settings.storeFullTranscript}
                      onCheckedChange={(v) => updateSettings({ storeFullTranscript: v })}
                      indent
                    />
                  </div>
                )}
              </div>
            </PremiumCard>

            {/* Account ────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-1 pt-1">
              <IL>Account</IL>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 text-muted-foreground/70 hover:text-foreground hover:bg-accent text-[11px] h-8 px-3"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Bottom-left hub return — high-contrast, theme-adaptive */}
      <div className="fixed bottom-7 left-8 z-20">
        <Button
          onClick={() => navigate('/foyer')}
          className="bg-foreground hover:bg-foreground/90 text-background border border-border shadow-md px-10 h-20 text-[18px] font-medium rounded-xl"
        >
          Return to Main Hub
        </Button>
      </div>

    </div>
  );
}
