import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Play, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { getWAJEntries, type WAJEntry, type WAJHistoryItem } from '@/lib/wajService';
import { questionBank } from '@/lib/questionLoader';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(ms: number | null | undefined): string {
  if (ms == null || isNaN(ms)) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${seconds}s`;
}

/** Safely parse history_json — always returns an array */
function safeHistory(raw: unknown): WAJHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === 'object');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: 'wrong' | 'right' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium',
        status === 'right'
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
      )}
    >
      {status === 'right' ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {status === 'right' ? 'Correct' : 'Wrong'}
    </span>
  );
}

function QTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-foreground/80 ring-1 ring-border">
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function WrongAnswerJournal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = React.useState<WAJEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEntry, setSelectedEntry] = React.useState<WAJEntry | null>(null);
  const [classId, setClassId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<{
    qtype?: string;
    level?: number;
    pt?: number;
    last_status?: 'wrong' | 'right';
  }>({});

  // Auth guard
  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // Resolve class_id
  React.useEffect(() => {
    if (!user) return;
    const fetchClassId = async () => {
      try {
        const { data: student } = await supabase
          .from('students')
          .select('class_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (student?.class_id) {
          setClassId(student.class_id);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    fetchClassId();
  }, [user]);

  // Load entries when classId resolves or filters change
  React.useEffect(() => {
    if (classId) loadEntries();
  }, [filters, classId]);

  const loadEntries = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const data = await getWAJEntries(classId, filters);
      setEntries(data ?? []);
    } catch (err) {
      console.error('Failed to load WAJ entries:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReattempt = (entry: WAJEntry) => {
    navigate('/drill', {
      state: {
        mode: 'type-drill',
        config: {
          qtypes: [entry.qtype],
          difficulties: [entry.level],
          pts: [entry.pt],
          count: 1,
        },
      },
    });
  };

  const allQTypes = React.useMemo(() => {
    try {
      return Array.from(new Set(questionBank.getAllQuestions().map((q) => q.qtype)));
    } catch {
      return [];
    }
  }, []);

  const allPTs = React.useMemo(() => {
    try {
      return Array.from(new Set(questionBank.getAllQuestions().map((q) => q.pt))).sort(
        (a, b) => a - b,
      );
    } catch {
      return [];
    }
  }, []);

  const allLevels = [1, 2, 3, 4, 5];
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          <IL>Wrong Answer Journal</IL>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-5">

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Question Type */}
            <Select
              value={filters.qtype || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, qtype: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger className="w-[190px] h-8 bg-secondary border-border text-foreground text-[13px] focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All Question Types" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all" className="text-[13px] focus:bg-accent focus:text-foreground">
                  All Question Types
                </SelectItem>
                {allQTypes.map((qt) => (
                  <SelectItem key={qt} value={qt} className="text-[13px] focus:bg-accent focus:text-foreground">
                    {qt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Level */}
            <Select
              value={filters.level?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, level: v === 'all' ? undefined : parseInt(v) })
              }
            >
              <SelectTrigger className="w-[130px] h-8 bg-secondary border-border text-foreground text-[13px] focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all" className="text-[13px] focus:bg-accent focus:text-foreground">
                  All Levels
                </SelectItem>
                {allLevels.map((l) => (
                  <SelectItem key={l} value={l.toString()} className="text-[13px] focus:bg-accent focus:text-foreground">
                    Level {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* PT */}
            <Select
              value={filters.pt?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, pt: v === 'all' ? undefined : parseInt(v) })
              }
            >
              <SelectTrigger className="w-[120px] h-8 bg-secondary border-border text-foreground text-[13px] focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All PTs" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all" className="text-[13px] focus:bg-accent focus:text-foreground">
                  All PTs
                </SelectItem>
                {allPTs.map((pt) => (
                  <SelectItem key={pt} value={pt.toString()} className="text-[13px] focus:bg-accent focus:text-foreground">
                    PT {pt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={filters.last_status || 'all'}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  last_status: v === 'all' ? undefined : (v as 'wrong' | 'right'),
                })
              }
            >
              <SelectTrigger className="w-[140px] h-8 bg-secondary border-border text-foreground text-[13px] focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all" className="text-[13px] focus:bg-accent focus:text-foreground">
                  All Status
                </SelectItem>
                <SelectItem value="wrong" className="text-[13px] focus:bg-accent focus:text-foreground">
                  Still Wrong
                </SelectItem>
                <SelectItem value="right" className="text-[13px] focus:bg-accent focus:text-foreground">
                  Now Correct
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({})}
                className="gap-1.5 h-8 text-muted-foreground hover:text-foreground hover:bg-accent text-[11px] px-3"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* ── Entry list ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-8 h-8 border border-border border-t-foreground/30 rounded-full animate-spin" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-card border border-border shadow-sm p-16 flex flex-col items-center gap-3 text-center">
            <p className="text-foreground/80 text-[15px] font-medium">No wrong answers yet</p>
            <p className="text-muted-foreground text-[13px]">
              {hasFilters
                ? 'No entries match the current filters.'
                : 'Keep practicing — your missed questions will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={cn(
                  'group w-full text-left rounded-xl px-4 py-3.5',
                  'bg-card border border-border shadow-sm',
                  'hover:bg-accent/50 hover:border-border',
                  'transition-all duration-150',
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: identity + badges */}
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className="text-[13px] font-mono font-medium text-foreground shrink-0">
                      PT{entry.pt}–S{entry.section}–Q{entry.qnum}
                    </span>
                    <QTypeBadge label={entry.qtype} />
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      Lvl {entry.level}
                    </span>
                    <StatusBadge
                      status={entry.last_status === 'right' ? 'right' : 'wrong'}
                    />
                    {entry.revisit_count > 0 && (
                      <span className="text-[11px] text-muted-foreground/70 shrink-0">
                        {entry.revisit_count + 1} attempts
                      </span>
                    )}
                  </div>

                  {/* Right: reattempt button */}
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReattempt(entry);
                    }}
                    className="shrink-0 h-7 px-3 text-[11px] gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground/80 border-0"
                  >
                    <Play className="w-3 h-3" />
                    Reattempt
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background border-l border-border">
          {selectedEntry && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <SheetTitle className="text-foreground font-mono text-[15px]">
                  PT{selectedEntry.pt}–S{selectedEntry.section}–Q{selectedEntry.qnum}
                </SheetTitle>
                <div className="flex items-center gap-2 pt-1">
                  <QTypeBadge label={selectedEntry.qtype} />
                  <span className="text-[11px] text-muted-foreground">Level {selectedEntry.level}</span>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-3">
                {safeHistory(selectedEntry.history_json).length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    No attempt history available.
                  </p>
                ) : (
                  safeHistory(selectedEntry.history_json).map((item, idx) => {
                    const histItem = item as WAJHistoryItem;
                    const isCorrect = histItem.result === 1;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-xl border p-4 space-y-3 shadow-sm',
                          isCorrect
                            ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                            : 'bg-card border-border',
                        )}
                      >
                        {/* Row: date + result badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {histItem.attempt_at_iso
                              ? new Date(histItem.attempt_at_iso).toLocaleString()
                              : '—'}
                          </span>
                          <StatusBadge status={isCorrect ? 'right' : 'wrong'} />
                        </div>

                        {/* Answer + Time + Confidence grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div>
                            <IL>Chosen</IL>
                            <div className="text-[13px] text-foreground/80 mt-1 font-mono">
                              ({histItem.chosen_answer ?? '—'})
                            </div>
                          </div>
                          <div>
                            <IL>Correct</IL>
                            <div className="text-[13px] text-foreground/80 mt-1 font-mono">
                              ({histItem.correct_answer ?? '—'})
                            </div>
                          </div>
                          <div>
                            <IL>Time</IL>
                            <div className="text-[13px] text-foreground/80 mt-1 tabular-nums">
                              {formatTime(histItem.time_ms)}
                            </div>
                          </div>
                          {histItem.confidence_1_5 != null && (
                            <div>
                              <IL>Confidence</IL>
                              <div className="text-[13px] text-foreground/80 mt-1 tabular-nums">
                                {histItem.confidence_1_5} / 5
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Review notes */}
                        {histItem.review && (
                          <div className="pt-3 border-t border-border space-y-3">
                            {histItem.review.q1 && (
                              <div>
                                <IL>Why I chose the wrong answer</IL>
                                <p className="text-[13px] text-foreground/80 mt-1 leading-relaxed">
                                  {histItem.review.q1}
                                </p>
                              </div>
                            )}
                            {histItem.review.q2 && (
                              <div>
                                <IL>Why I eliminated the right answer</IL>
                                <p className="text-[13px] text-foreground/80 mt-1 leading-relaxed">
                                  {histItem.review.q2}
                                </p>
                              </div>
                            )}
                            {histItem.review.q3 && (
                              <div>
                                <IL>Plan to avoid next time</IL>
                                <p className="text-[13px] text-foreground/80 mt-1 leading-relaxed">
                                  {histItem.review.q3}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
