import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { AnimatedButton } from '@/components/ui/animated-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User, Search, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  SCORE_BANDS,
  LAST_SCORE_EXTRAS,
  TARGET_SCORE_EXTRAS,
  LIFE_STAGES,
  STUDY_TIME_OPTIONS,
  DAYS,
  DEFAULT_STUDY_TIME,
  STEP_ORDER,
  REQUIRED_STEPS,
  type OnboardingAnswers,
  type OnboardingStepId,
  type LastScoreValue,
  type TargetScoreValue,
  type LifeStage,
  type StudyTimeValue,
  type DayKey,
} from '@/lib/onboarding';

// ── Academy-skinned glass shell (from the prior onboarding), restrained ──────
const GlassShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(0,0,0,0.9),0_4px_20px_-4px_rgba(0,0,0,0.55)]">
    <BorderBeam duration={8} color="rgba(198,164,103,0.4)" borderWidth={1.5} arcSize={0.12} />
    <div
      className={cn(
        'relative p-6 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8 bg-[#0A0908]/90 backdrop-blur-xl',
        'shadow-[0_0_0_1px_rgba(234,229,218,0.07),inset_0_1px_0_rgba(234,229,218,0.09)]',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C6A467]/20 to-transparent pointer-events-none" />
      {children}
    </div>
  </div>
);

// ── Selectable chip (single-select bands, study-time cells) ──────────────────
const Chip = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      'px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C6A467]/40',
      selected
        ? 'bg-[#C6A467]/[0.14] border-[#C6A467]/40 text-[#E8CF96]'
        : 'bg-black/40 border-white/[0.07] text-neutral-300 hover:border-white/[0.16] hover:text-white',
    )}
  >
    {children}
  </button>
);

const stepHeadingCls = 'text-[1.35rem] sm:text-[1.5rem] font-semibold tracking-tight text-[#EAE5DA] mb-1.5';
const stepSubCls = 'text-[12px] text-neutral-500 mb-5 leading-relaxed';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, authReady, signOut } = useAuth();

  // step 0 = name; steps 1..6 = the six intake steps (index into STEP_ORDER is stepIndex-1)
  const [stepIndex, setStepIndex] = React.useState(0);
  const [name, setName] = React.useState('');
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({});
  const [schoolInput, setSchoolInput] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  const TOTAL_INTAKE_STEPS = STEP_ORDER.length; // 6

  // Redirect out if not logged in.
  React.useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [authReady, user, navigate]);

  // Hydrate name + any partial answers, then resume at the first unanswered step.
  React.useEffect(() => {
    if (!user || hydrated) return;
    const meta = user.user_metadata;
    const prefill = meta?.display_name || meta?.full_name || meta?.name || '';

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, onboarding, onboarding_completed_at')
        .eq('class_id', user.id)
        .maybeSingle();

      // Completed already (defensive: gate should have kept them out) -> leave.
      if (data?.onboarding_completed_at) {
        navigate('/mainhub', { replace: true });
        return;
      }

      const existingName = data?.display_name || prefill;
      const existing = (data?.onboarding as OnboardingAnswers) || {};
      setName(existingName);
      setAnswers(existing);

      // Resume: if a name exists, jump to the first unanswered required intake step.
      if (existingName) {
        const firstUnanswered = STEP_ORDER.findIndex(
          (s) => REQUIRED_STEPS[s] && !isStepAnswered(s, existing),
        );
        setStepIndex(firstUnanswered === -1 ? TOTAL_INTAKE_STEPS : firstUnanswered + 1);
      } else {
        setStepIndex(0);
      }
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hydrated]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      navigate('/auth', { replace: true });
    }
  };

  // Persist name (step 0). Creates the profile row if absent.
  const saveName = async (): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter your name');
      return false;
    }
    if (trimmed.length > 50) {
      toast.error('Name must be 50 characters or less');
      return false;
    }
    const { error } = await supabase
      .from('profiles')
      .upsert({ class_id: user!.id, display_name: trimmed }, { onConflict: 'class_id' });
    if (error) {
      toast.error(error.message || 'Could not save your name. Please try again.');
      return false;
    }
    supabase.auth.updateUser({ data: { display_name: trimmed } }).catch(() => {});
    return true;
  };

  // Persist the accumulated answers so far (per-step save + resume).
  const saveAnswers = async (next: OnboardingAnswers): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { class_id: user!.id, onboarding: next as unknown as Json },
        { onConflict: 'class_id' },
      );
    if (error) {
      toast.error(error.message || 'Could not save. Please try again.');
      return false;
    }
    return true;
  };

  // Mark onboarding complete (explicit Skip or Finish). Sets the one-time gate.
  const complete = async (final: OnboardingAnswers): Promise<void> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            class_id: user!.id,
            onboarding: final as unknown as Json,
            onboarding_completed_at: new Date().toISOString(),
          },
          { onConflict: 'class_id' },
        );
      if (error) {
        toast.error(error.message || 'Could not finish. Please try again.');
        return;
      }
      navigate('/mainhub', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const currentStepId: OnboardingStepId | null =
    stepIndex >= 1 && stepIndex <= TOTAL_INTAKE_STEPS ? STEP_ORDER[stepIndex - 1] : null;

  const canContinue = (): boolean => {
    if (stepIndex === 0) return !!name.trim();
    if (!currentStepId) return true;
    if (!REQUIRED_STEPS[currentStepId]) return true; // optional steps always continuable
    // study_time is defaulted (DEFAULT_STUDY_TIME) — always satisfiable even if
    // the user never taps a cell, so Finish is never blocked on the last step.
    if (currentStepId === 'study_time') return true;
    return isStepAnswered(currentStepId, answers);
  };

  const goNext = async () => {
    setSaving(true);
    try {
      if (stepIndex === 0) {
        if (!(await saveName())) return;
        setStepIndex(1);
        return;
      }
      // On the last step (study time), fall back to the default schedule if the
      // user never touched it, so we never store an empty study_time.
      const nextAnswers =
        currentStepId === 'study_time' && !answers.study_time
          ? { ...answers, study_time: DEFAULT_STUDY_TIME }
          : answers;
      if (!(await saveAnswers(nextAnswers))) return;
      if (stepIndex >= TOTAL_INTAKE_STEPS) {
        await complete(nextAnswers);
        return;
      }
      setAnswers(nextAnswers);
      setStepIndex((i) => i + 1);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const skip = async () => {
    // An explicit Skip completes the gate permanently, saving whatever's answered.
    await complete(answers);
  };

  const setAnswer = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  const addSchool = () => {
    const s = schoolInput.trim();
    if (!s) return;
    const current = answers.schools || [];
    if (current.length >= 5 || current.includes(s)) {
      setSchoolInput('');
      return;
    }
    setAnswer('schools', [...current, s]);
    setSchoolInput('');
  };

  const removeSchool = (s: string) => {
    setAnswer('schools', (answers.schools || []).filter((x) => x !== s));
  };

  if (!authReady || !hydrated) return null;

  const progress = stepIndex === 0 ? 0 : (stepIndex / TOTAL_INTAKE_STEPS) * 100;
  const isLastStep = stepIndex === TOTAL_INTAKE_STEPS;

  return (
    <div className="relative isolate min-h-screen bg-[#0A0908] overflow-hidden">
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_80%_70%_at_50%_40%,transparent_30%,rgba(9,9,11,0.4)_75%)]" />

      <div className="relative z-10 min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          className="w-full sm:max-w-[460px]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassShell>
            {/* Progress bar (intake steps only) */}
            <div className="mb-6 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#C6A467] to-[#E8CF96]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* ── Step 0: name ── */}
                {stepIndex === 0 && (
                  <div>
                    <h2 className={stepHeadingCls}>Welcome to LSAT U</h2>
                    <p className={stepSubCls}>What should we call you?</p>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="pl-10 h-12 bg-black/50 border-white/[0.06] focus-visible:border-[#C6A467]/40 text-white placeholder:text-neutral-600 rounded-lg"
                        maxLength={50}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && canContinue() && goNext()}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 1: last score ── */}
                {currentStepId === 'last_score' && (
                  <div>
                    <h2 className={stepHeadingCls}>What did you get on your last LSAT?</h2>
                    <p className={stepSubCls}>This sets your starting point.</p>
                    <div className="flex flex-wrap gap-2">
                      {[...SCORE_BANDS, ...LAST_SCORE_EXTRAS].map((o) => (
                        <Chip
                          key={o.value}
                          selected={answers.last_score_band === o.value}
                          onClick={() => setAnswer('last_score_band', o.value as LastScoreValue)}
                        >
                          {o.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2: experience (optional) ── */}
                {currentStepId === 'experience' && (
                  <div>
                    <h2 className={stepHeadingCls}>How has your LSAT experience been so far?</h2>
                    <p className={stepSubCls}>
                      Share what has felt easy and what has felt hard so we can personalize your plan.
                    </p>
                    <textarea
                      value={answers.experience_text || ''}
                      onChange={(e) => setAnswer('experience_text', e.target.value)}
                      placeholder="Logic Games felt easier, but Necessary Assumption questions are still hard for me."
                      rows={5}
                      className="w-full rounded-lg bg-black/50 border border-white/[0.06] focus:border-[#C6A467]/40 focus:outline-none text-[14px] text-white placeholder:text-neutral-600 p-3.5 resize-none"
                      autoFocus
                    />
                  </div>
                )}

                {/* ── Step 3: schools (optional) ── */}
                {currentStepId === 'schools' && (
                  <div>
                    <h2 className={stepHeadingCls}>What schools are you interested in?</h2>
                    <p className={stepSubCls}>
                      We'll build your experience with LSAT U around getting into these schools.
                    </p>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                      <Input
                        value={schoolInput}
                        onChange={(e) => setSchoolInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSchool();
                          }
                        }}
                        placeholder="Type a school, press Enter"
                        className="pl-10 h-11 bg-black/50 border-white/[0.06] focus-visible:border-[#C6A467]/40 text-white placeholder:text-neutral-600 rounded-lg"
                        disabled={(answers.schools || []).length >= 5}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-600 mb-2">Add up to 5 schools.</p>
                    <div className="space-y-2">
                      {(answers.schools || []).map((s, i) => (
                        <div
                          key={s}
                          className="flex items-center gap-3 rounded-lg bg-black/40 border border-white/[0.06] px-3 py-2.5"
                        >
                          <span className="text-[11px] text-neutral-600 w-4">{i + 1}</span>
                          <span className="flex-1 text-[13px] text-neutral-200">{s}</span>
                          <button
                            type="button"
                            onClick={() => removeSchool(s)}
                            className="text-neutral-600 hover:text-white transition-colors"
                            aria-label={`Remove ${s}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 4: target score ── */}
                {currentStepId === 'target_score' && (
                  <div>
                    <h2 className={stepHeadingCls}>What score are you aiming for?</h2>
                    <p className={stepSubCls}>This helps us set the right pace for your prep.</p>
                    <div className="flex flex-wrap gap-2">
                      {[...SCORE_BANDS, ...TARGET_SCORE_EXTRAS].map((o) => (
                        <Chip
                          key={o.value}
                          selected={answers.target_score_band === o.value}
                          onClick={() => setAnswer('target_score_band', o.value as TargetScoreValue)}
                        >
                          {o.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 5: life stage ── */}
                {currentStepId === 'life_stage' && (
                  <div>
                    <h2 className={stepHeadingCls}>Which best describes you?</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {LIFE_STAGES.map((o) => {
                        const selected = answers.life_stage === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setAnswer('life_stage', o.value as LifeStage)}
                            aria-pressed={selected}
                            className={cn(
                              'text-left rounded-xl border p-4 transition-all duration-150',
                              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C6A467]/40',
                              selected
                                ? 'bg-[#C6A467]/[0.12] border-[#C6A467]/40'
                                : 'bg-black/40 border-white/[0.07] hover:border-white/[0.16]',
                            )}
                          >
                            <div className={cn('text-[14px] font-semibold mb-1', selected ? 'text-[#E8CF96]' : 'text-white')}>
                              {o.title}
                            </div>
                            <div className="text-[11px] text-neutral-500 leading-snug">{o.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 6: study time ── */}
                {currentStepId === 'study_time' && (
                  <div>
                    <h2 className={stepHeadingCls}>When can you study?</h2>
                    <p className={stepSubCls}>
                      Set how much time you have each day. You can always change this later.
                    </p>
                    <div className="space-y-2">
                      {DAYS.map((d) => {
                        const current = (answers.study_time || DEFAULT_STUDY_TIME)[d.key as DayKey];
                        return (
                          <div
                            key={d.key}
                            className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/[0.05] px-3 py-2"
                          >
                            <span className="w-9 text-[12px] font-semibold text-neutral-300">{d.label}</span>
                            <div className="flex flex-1 gap-1.5 justify-end flex-wrap">
                              {STUDY_TIME_OPTIONS.map((o) => {
                                const sel = current === o.value;
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() =>
                                      setAnswer('study_time', {
                                        ...DEFAULT_STUDY_TIME,
                                        ...(answers.study_time || {}),
                                        [d.key]: o.value as StudyTimeValue,
                                      })
                                    }
                                    className={cn(
                                      'px-2.5 py-1.5 rounded-md text-[11px] transition-all duration-150 border',
                                      sel
                                        ? 'bg-[#C6A467]/[0.16] border-[#C6A467]/40 text-[#E8CF96]'
                                        : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300',
                                    )}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Nav row ── */}
            <div className="flex items-center gap-3 mt-7">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors py-2.5 px-1 disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Go back
                </button>
              )}
              <div className="flex-1" />
              <AnimatedButton
                type="button"
                onClick={goNext}
                disabled={saving || !canContinue()}
                loading={saving}
                variant="cta"
                size="default"
              >
                <span className="flex items-center gap-2">
                  {stepIndex === 0 ? 'Continue' : isLastStep ? 'Finish' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </AnimatedButton>
            </div>

            {/* ── Skip / sign out ── */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={skip}
                  disabled={saving}
                  className="text-[11px] text-neutral-600 hover:text-neutral-300 transition-colors py-1 disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut || saving}
                className="text-[11px] text-neutral-700 hover:text-neutral-400 transition-colors py-1 disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </GlassShell>
        </motion.div>
      </div>
    </div>
  );
}

// ── Whether a given step's answer is present (used for resume + required gate) ─
function isStepAnswered(step: OnboardingStepId, a: OnboardingAnswers): boolean {
  switch (step) {
    case 'last_score':
      return !!a.last_score_band;
    case 'experience':
      return !!a.experience_text?.trim();
    case 'schools':
      return !!a.schools && a.schools.length > 0;
    case 'target_score':
      return !!a.target_score_band;
    case 'life_stage':
      return !!a.life_stage;
    case 'study_time':
      return !!a.study_time; // defaulted at finish if untouched
    default:
      return false;
  }
}
