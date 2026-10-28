import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wand2,
  Loader2,
  ArrowLeft,
  Bookmark,
  Play,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { questionBank, CANONICAL_QTYPES } from '@/lib/questionLoader';
import type { LRQuestion } from '@/lib/questionLoader';
import { recordExposures } from '@/lib/questionExposure';
import { useRecentExposures } from '@/hooks/useRecentExposures';
import { useSavedSets } from '@/hooks/useSavedSets';
import type { TypeDrillConfig } from '@/types/drill';

interface NaturalDrillCreatorProps {
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

interface ParsedConfig {
  qtypes: string[];
  difficulties: number[];
  pts: number[];
  features: string[];
  reasoningTypes: string[];
  set_size: number;
  explanation: string;
  skipRecent: boolean;
}

type Stage = 'prompt' | 'form' | 'preview';

const ALL_DIFFICULTIES = [1, 2, 3, 4, 5];

// Item H — Smart Builder hybrid flow:
//   1) prompt: free-text → parse-drill-request (Gemini) → ParsedConfig
//   2) form: user adjusts qtypes / difficulties / PT range / count / features /
//      reasoningTypes + "Skip recent 500" toggle (default ON — Wave 3A)
//   3) preview: list of candidate qids with metadata; Save / Adjust / Start
export function NaturalDrillCreator({ onStartDrill, onCancel }: NaturalDrillCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { excludedQids } = useRecentExposures(500);
  const { save: saveSetMut } = useSavedSets();

  const [stage, setStage] = useState<Stage>('prompt');
  const [request, setRequest] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Form-stage state (also drives preview)
  const [config, setConfig] = useState<ParsedConfig>({
    qtypes: [],
    difficulties: ALL_DIFFICULTIES,
    pts: [],
    features: [],
    reasoningTypes: [],
    set_size: 10,
    explanation: '',
    skipRecent: true,
  });
  const [previewedQids, setPreviewedQids] = useState<string[] | null>(null);
  const [previewSeed, setPreviewSeed] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');

  // ── Stage 1: parse ───────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!request.trim()) {
      toast({ title: 'Please enter a request', description: 'Describe what you want to practice', variant: 'destructive' });
      return;
    }
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-drill-request', {
        body: { request: request.trim() },
      });
      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({ title: 'Rate limit reached', description: 'Please wait a moment and try again.', variant: 'destructive' });
          return;
        }
        if (error.message?.includes('credits')) {
          toast({ title: 'AI credits depleted', description: 'Please add credits to continue.', variant: 'destructive' });
          return;
        }
        throw error;
      }
      if (!data) throw new Error('No data returned from parsing');

      setConfig((prev) => ({
        ...prev,
        qtypes: Array.isArray(data.qtypes) ? data.qtypes : [],
        difficulties: Array.isArray(data.difficulties) && data.difficulties.length > 0 ? data.difficulties : ALL_DIFFICULTIES,
        pts: Array.isArray(data.pts) ? data.pts : [],
        features: Array.isArray(data.features) ? data.features : [],
        reasoningTypes: Array.isArray(data.reasoningTypes) ? data.reasoningTypes : [],
        set_size: typeof data.set_size === 'number' && data.set_size > 0 ? data.set_size : 10,
        explanation: typeof data.explanation === 'string' ? data.explanation : '',
      }));
      setStage('form');
    } catch (err) {
      console.error('[SmartBuilder] parse failed:', err);
      toast({
        title: 'Failed to parse request',
        description: 'Try rephrasing, or fill in the form manually below.',
        variant: 'destructive',
      });
      // Fail-open: still advance to the form so the user can fill it manually
      setStage('form');
    } finally {
      setIsParsing(false);
    }
  };

  // ── Candidate generation (used by stage 3) ───────────────────────────────
  const candidates = useMemo<LRQuestion[]>(() => {
    const filters = {
      qtypes: config.qtypes,
      difficulties: config.difficulties,
      pts: config.pts,
    };
    const base = questionBank.getQuestionsByFilter(filters);
    return base.filter((q) => {
      if (config.features.length > 0) {
        const f = q.questionFeatures ?? [];
        if (!config.features.some((x) => f.includes(x))) return false;
      }
      if (config.reasoningTypes.length > 0) {
        const r = q.reasoningType ?? [];
        if (!config.reasoningTypes.some((x) => r.includes(x))) return false;
      }
      if (config.skipRecent && excludedQids.has(q.qid)) return false;
      return true;
    });
  }, [config, excludedQids]);

  const previewSet = useMemo<LRQuestion[]>(() => {
    if (previewedQids === null) return [];
    return previewedQids
      .map((qid) => questionBank.getQuestion(qid))
      .filter((q): q is LRQuestion => !!q);
  }, [previewedQids]);

  const handleGeneratePreview = () => {
    if (candidates.length === 0) {
      toast({
        title: 'No questions match',
        description: config.skipRecent
          ? "After excluding your recent 500, nothing's left. Toggle off Skip recent or broaden filters."
          : 'Broaden your filters and try again.',
        variant: 'destructive',
      });
      return;
    }
    // Per-roll shuffle keyed by user.id + previewSeed so re-rolling gives a
    // different set; same seed gives the same set across refreshes within a
    // session. Mulberry32 + FNV-1a hash, mirroring the dayQuestions util.
    const seed = `${user?.id ?? 'anon'}:${previewSeed}:smart-builder`;
    const shuffled = deterministicShuffle(candidates, seed);
    setPreviewedQids(shuffled.slice(0, config.set_size).map((q) => q.qid));
    setStage('preview');
  };

  const handleStart = () => {
    if (!previewedQids || previewedQids.length === 0) return;
    if (user?.id) {
      recordExposures(user.id, previewedQids).catch((e) =>
        console.error('[SmartBuilder] recordExposures failed', e),
      );
    }
    const drillConfig: TypeDrillConfig = {
      qtypes: config.qtypes,
      difficulties: config.difficulties,
      pts: config.pts,
      count: previewedQids.length,
      selectedQids: previewedQids,
      qfeatures: config.features.length > 0 ? [...config.features] : undefined,
      reasoningTypes: config.reasoningTypes.length > 0 ? [...config.reasoningTypes] : undefined,
    };
    onStartDrill(drillConfig);
  };

  const handleSaveSet = async () => {
    const name = saveDialogName.trim();
    if (!name || !previewedQids || previewedQids.length === 0) return;
    try {
      await saveSetMut.mutateAsync({
        name,
        filter_state: config as unknown as Record<string, unknown>,
        question_ids: previewedQids,
      });
      toast({ title: 'Set saved', description: `${name} is now in My Sets.` });
      setSaveDialogOpen(false);
      setSaveDialogName('');
    } catch (err) {
      toast({
        title: "Couldn't save set",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // ── Stage helpers ───────────────────────────────────────────────────────
  const toggleQtype = (q: string) => {
    setConfig((c) => ({
      ...c,
      qtypes: c.qtypes.includes(q) ? c.qtypes.filter((x) => x !== q) : [...c.qtypes, q],
    }));
  };
  const toggleDifficulty = (d: number) => {
    setConfig((c) => ({
      ...c,
      difficulties: c.difficulties.includes(d)
        ? c.difficulties.filter((x) => x !== d)
        : [...c.difficulties, d].sort((a, b) => a - b),
    }));
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Builder</h1>
          <p className="text-muted-foreground mt-2">
            {stage === 'prompt' && "Describe what you want to practice; I'll assemble it."}
            {stage === 'form' && 'Adjust the filters, then generate a preview.'}
            {stage === 'preview' && 'Review the set. Save or launch when ready.'}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {/* ── Stage 1: free-text prompt ───────────────────────────────────── */}
      {stage === 'prompt' && (
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">What do you want to practice?</label>
            <Textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder={'Examples:\n• 20 hard flaw questions from PT 70-80\n• Causal reasoning, medium\n• Conditional diagramming practice'}
              className="min-h-[150px] resize-none"
              disabled={isParsing}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleParse}
              disabled={isParsing || !request.trim()}
              className="flex-1"
              size="lg"
            >
              {isParsing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing…</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" /> Parse</>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStage('form')}
              disabled={isParsing}
            >
              Skip to manual
            </Button>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Name the question type (Flaw, Strengthen, Necessary Assumption, etc.)</li>
              <li>Difficulty: easy, medium, hard, or 1-5</li>
              <li>PT range: "PT 110-120" or "recent tests"</li>
              <li>Count: "20 questions" (default 10)</li>
            </ul>
          </div>
        </Card>
      )}

      {/* ── Stage 2: structured form ────────────────────────────────────── */}
      {stage === 'form' && (
        <Card className="p-6 space-y-5">
          {config.explanation && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
              {config.explanation}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
              Question types
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CANONICAL_QTYPES.allTypes.map((q) => {
                const on = config.qtypes.includes(q);
                return (
                  <Button
                    key={q}
                    type="button"
                    variant={on ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleQtype(q)}
                    className="h-7 text-[11px]"
                  >
                    {q}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Count
              </div>
              <Input
                type="number"
                min={1}
                max={50}
                value={config.set_size}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1));
                  setConfig((c) => ({ ...c, set_size: n }));
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Difficulty
              </div>
              <div className="flex gap-1">
                {ALL_DIFFICULTIES.map((d) => {
                  const on = config.difficulties.includes(d);
                  return (
                    <Button
                      key={d}
                      type="button"
                      variant={on ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDifficulty(d)}
                      className="h-9 w-9 p-0"
                    >
                      {d}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                PTs (comma list, blank = any)
              </div>
              <Input
                value={config.pts.join(', ')}
                onChange={(e) => {
                  const parts = e.target.value
                    .split(',')
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => Number.isFinite(n) && n > 0);
                  setConfig((c) => ({ ...c, pts: parts }));
                }}
                placeholder="70, 71, …"
                className="h-9"
              />
            </div>
          </div>

          {(config.features.length > 0 || config.reasoningTypes.length > 0) && (
            <div className="space-y-2 text-xs">
              {config.features.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold mr-1">Features</span>
                  {config.features.map((f) => (
                    <Badge key={f} variant="secondary" className="font-normal">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              {config.reasoningTypes.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold mr-1">Reasoning</span>
                  {config.reasoningTypes.map((r) => (
                    <Badge key={r} variant="secondary" className="font-normal">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t">
            <Switch
              checked={config.skipRecent}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, skipRecent: v }))}
              aria-label="Skip recent questions"
            />
            <div className="text-sm">
              Skip questions I've seen in the last 500
              <div className="text-[11px] text-muted-foreground">
                {excludedQids.size > 0 ? `${excludedQids.size} recent qids loaded` : 'No history yet'}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStage('prompt')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to prompt
            </Button>
            <div className="flex-1" />
            <Button
              onClick={handleGeneratePreview}
              disabled={config.qtypes.length === 0 && config.features.length === 0 && config.reasoningTypes.length === 0}
              size="lg"
            >
              Generate preview ({Math.min(config.set_size, candidates.length)})
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {candidates.length} questions match these filters
            {config.skipRecent ? ' after recent-exposure exclusion' : ''}.
          </div>
        </Card>
      )}

      {/* ── Stage 3: preview ────────────────────────────────────────────── */}
      {stage === 'preview' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Preview
              </div>
              <h2 className="text-xl font-bold mt-1">
                {previewSet.length} {previewSet.length === 1 ? 'question' : 'questions'} ready
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewSeed((s) => s + 1);
                handleGeneratePreview();
              }}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-roll
            </Button>
          </div>

          <ul className="divide-y divide-border rounded-md border border-border max-h-[420px] overflow-y-auto">
            {previewSet.map((q) => (
              <li key={q.qid} className="px-3 py-2 flex items-baseline gap-3">
                <span className="font-mono text-[11px] tabular-nums text-foreground/70 shrink-0">
                  PT {q.pt} · S {q.section} · Q {q.qnum}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {q.qtype} · L{q.difficulty}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <Button variant="ghost" onClick={() => setStage('form')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Adjust
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogName('');
                setSaveDialogOpen(true);
              }}
              className="gap-1.5"
            >
              <Bookmark className="h-3.5 w-3.5" /> Save set
            </Button>
            <Button onClick={handleStart} size="lg" className="gap-1.5">
              <Play className="h-4 w-4" /> Start drill
            </Button>
          </div>
        </Card>
      )}

      {/* ── Save dialog ─────────────────────────────────────────────────── */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this set</DialogTitle>
            <DialogDescription>
              Give your set a name. You'll find it under "My Sets" on the Practice Hub.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={saveDialogName}
            onChange={(e) => setSaveDialogName(e.target.value)}
            placeholder="e.g. PT 70-80 Hard Flaws"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveSet();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSet} disabled={!saveDialogName.trim() || saveSetMut.isPending}>
              {saveSetMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mulberry32 + FNV-1a deterministic shuffle. Identical pattern to the one
// in src/bootcamps/principle-flaw/lib/dayQuestions.ts.
function deterministicShuffle<T>(items: T[], seed: string): T[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let s = h >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
