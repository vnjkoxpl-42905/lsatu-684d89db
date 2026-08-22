import { useState, useEffect, useMemo, useRef } from 'react';
import {
  parseSpec,
  formatSpec,
  parseExactRefs,
  type DrillSpec,
  type SpecIssue,
  type SpecVocabulary,
} from '@/lib/drillSpecParser';
import { encodeLRFilterState } from '@/lib/drillFilterCodec';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, X, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypeDrillConfig } from '@/types/drill';
import type { QuestionManifest, LRQuestion } from '@/lib/questionLoader';
import { questionBank, CANONICAL_QTYPES, shuffleArray } from '@/lib/questionLoader';
import { getFeatureFamiliesWithFallback } from '@/lib/questionFeatureFamilies';
import {
  createEmptyLRDrillFilters,
  filterLRQuestions,
  getLRDrillContextualOptionCounts,
  getVisibleLRDrillOptions,
  type LRDrillFilters,
} from '@/lib/lrDrillFilters';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSavedSets } from '@/hooks/useSavedSets';
import { Bookmark } from 'lucide-react';
import { recordExposures } from '@/lib/questionExposure';

// Item J — abbreviations for the table's Type pill so multi-word qtypes
// stay on one line at a consistent height. Full name surfaces via title.
const QTYPE_ABBREVIATIONS: Record<string, string> = {
  'Necessary Assumption': 'Nec. Assumption',
  'Sufficient Assumption': 'Suf. Assumption',
  'Principle-Strengthen': 'Principle (S)',
  'Principle-Conform': 'Principle (C)',
  'Most Strongly Supported': 'MSS',
  'Must Be True': 'Must Be True',
  'Must Be False': 'Must Be False',
  'Method of Reasoning': 'Method',
  'Main Conclusion': 'Main Conc.',
  'Parallel Reasoning': 'Parallel',
  'Parallel Flaw': 'Parallel Flaw',
  'Agree/Disagree': 'Agree/Disagr.',
};
const abbreviateQtype = (qtype: string): string => QTYPE_ABBREVIATIONS[qtype] ?? qtype;

function FilterMenuHeader({
  title,
  activeCount,
  onClear,
}: {
  title: string;
  activeCount: number;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium">{title}</p>
      {activeCount > 0 && (
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}

interface QuestionPickerProps {
  manifest: QuestionManifest;
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

type FilterState = LRDrillFilters;

const REASONING_TYPE_LABELS: Record<string, string> = {
  'Conditional Reasoning': 'Conditional Logic',
  Causation: 'Causation',
  'Comparative Reasoning': 'Comparison',
};
const ALL_DIFFICULTIES = [1, 2, 3, 4, 5] as const;

/**
 * Fixed column widths, border-box, each including the shared cell's 32px
 * horizontal padding. Sized against real content, not headers:
 * Type must clear a ~92px badge, so 128 is its floor, not a preference.
 */
const COL = {
  select: 56,
  pt: 60,
  sectionQ: 76,
  type: 128,
  level: 60,
  attempts: 60,
} as const;

const FIXED_COLS_WIDTH = 440; // sum of COL
const STEM_MIN_WIDTH = 204;

/**
 * Narrowest the table may get before it scrolls rather than crushing the stem.
 */
const TABLE_MIN_WIDTH = FIXED_COLS_WIDTH + STEM_MIN_WIDTH; // 644

/** Fixed width of the summary rail. */
const SUMMARY_RAIL_WIDTH = 320;

/**
 * Container width at which the summary rail moves beside the table.
 *
 * Derived from measurement, and the measurement is the whole point. The
 * container is capped by `.drill-observatory-canvas` (max-width 1140) less the
 * launcher's 56px of padding, so it can never exceed ~1084px — and on a 1440px
 * laptop it is only ~1008px, because the canvas is viewport-constrained well
 * before its max-width. The old 1140px threshold was above even the ceiling,
 * which is why the rail never once appeared beside the table.
 *
 * 644 + 320 + 16 = 980 fits inside 1008, so the split now engages on a 1440px
 * screen. Keep in sync with the `@[980px]` utilities below; Tailwind needs the
 * literal at build time and the geometry test asserts the two agree.
 */
const SPLIT_AT = TABLE_MIN_WIDTH + SUMMARY_RAIL_WIDTH + 16; // 980

const reasoningTypeLabel = (value: string): string => REASONING_TYPE_LABELS[value] ?? value;

interface QuestionRow extends LRQuestion {
  attemptCount: number;
}

export function QuestionPicker({ manifest, onStartDrill, onCancel }: QuestionPickerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(() => createEmptyLRDrillFilters());
  
  // Selection state
  const [selectedQids, setSelectedQids] = useState<Set<string>>(new Set());

  // Item N (Wave 4) — Save set dialog (used by both selection and preview branches)
  const { save: saveSetMut } = useSavedSets();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [attemptCounts, setAttemptCounts] = useState<Map<string, number>>(new Map());

  // Target set size for Generate
  const [setSize, setSetSize] = useState<number>(10);
  const setSizeOptions = [5, 10, 15, 25];

  // Materialized preview of a generated set (exact qids that would launch).
  // null = no active preview.
  const [previewedQids, setPreviewedQids] = useState<string[] | null>(null);

  // Drawer state — single qid open at a time
  const [drawerQid, setDrawerQid] = useState<string | null>(null);
  /** The one element that owns horizontal overflow. Asserted by the geometry suite. */
  const tableScrollerRef = useRef<HTMLDivElement>(null);
  const [revealAnswer, setRevealAnswer] = useState(false);
  
  // Available options
  const allPTs = useMemo(() => 
    Array.from(new Set(manifest.sections.map(s => s.pt))).sort((a, b) => a - b),
    [manifest]
  );
  
  // Question type filter UI state
  const [qtypeSearch, setQtypeSearch] = useState('');
  const [reasoningSearch, setReasoningSearch] = useState('');
  const [featureSearch, setFeatureSearch] = useState('');

  const allReasoningTypes = useMemo(
    () => Object.keys(manifest.byReasoningType || {}).sort(),
    [manifest],
  );
  const allQuestionFeatures = useMemo(
    () => Object.keys(manifest.byFeature || {}).sort(),
    [manifest],
  );
  const featureFamilies = useMemo(
    () => getFeatureFamiliesWithFallback(allQuestionFeatures),
    [allQuestionFeatures],
  );
  const allSections = useMemo(
    () =>
      Object.keys(manifest.bySection || {})
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b),
    [manifest],
  );

  const allQuestions = useMemo(() => questionBank.getAllQuestions(), []);

  const contextualCounts = useMemo(
    () => ({
      prepTests: getLRDrillContextualOptionCounts(allQuestions, filters, 'prepTests', allPTs),
      sections: getLRDrillContextualOptionCounts(allQuestions, filters, 'sections', allSections),
      questionTypes: getLRDrillContextualOptionCounts(
        allQuestions,
        filters,
        'questionTypes',
        CANONICAL_QTYPES.allTypes,
      ),
      reasoningTypes: getLRDrillContextualOptionCounts(
        allQuestions,
        filters,
        'reasoningTypes',
        allReasoningTypes,
      ),
      questionFeatures: getLRDrillContextualOptionCounts(
        allQuestions,
        filters,
        'questionFeatures',
        allQuestionFeatures,
      ),
      difficulties: getLRDrillContextualOptionCounts(
        allQuestions,
        filters,
        'difficulties',
        ALL_DIFFICULTIES,
      ),
    }),
    [allPTs, allQuestionFeatures, allQuestions, allReasoningTypes, allSections, filters],
  );

  const visiblePTs = useMemo(
    () => getVisibleLRDrillOptions(allPTs, filters.prepTests, contextualCounts.prepTests),
    [allPTs, contextualCounts.prepTests, filters.prepTests],
  );
  const visibleSections = useMemo(
    () => getVisibleLRDrillOptions(allSections, filters.sections, contextualCounts.sections),
    [allSections, contextualCounts.sections, filters.sections],
  );
  /* ---- Spec line -------------------------------------------------------
     The bar and the PT/S/Q controls are two notations for one state. The
     filters are the source of truth; `specText` is a draft buffer that only
     writes back on an explicit commit. Parsing on a debounce would
     canonicalize mid-token — `PT1` is a complete, valid spec while you are
     still typing `PT101` — and eat the caret. */

  const specVocabulary = useMemo<SpecVocabulary>(
    () => ({
      prepTests: allPTs,
      sections: allSections,
      maxQuestionNumber: allQuestions.reduce((max, q) => Math.max(max, q.qnum), 0) || 26,
    }),
    [allPTs, allSections, allQuestions],
  );

  const specFromFilters = useMemo<DrillSpec>(
    () => ({
      prepTests: filters.prepTests,
      sections: filters.sections,
      questionNumbers: filters.questionNumbers,
    }),
    [filters.prepTests, filters.sections, filters.questionNumbers],
  );

  const [specText, setSpecText] = useState(() => formatSpec(specFromFilters));
  const [specIssues, setSpecIssues] = useState<SpecIssue[]>([]);

  // Any PT/S/Q mutation from anywhere — popover, chip grid, badge remove,
  // "Any PT" — re-runs the one formatter, so the bar can never show stale text.
  const canonicalSpecText = formatSpec(specFromFilters);
  useEffect(() => {
    setSpecText(canonicalSpecText);
    setSpecIssues([]);
  }, [canonicalSpecText]);

  const commitSpec = () => {
    const result = parseSpec(specText, specVocabulary);
    setSpecIssues(result.issues);
    if (!result.ok) return; // nothing is written while anything is rejected

    // A commit replaces all three grammar-owned facets. Absence means
    // unrestricted — otherwise deleting the last `S2` would leave sections
    // unnamed, the old value would survive, and the formatter would write it
    // straight back, making deletion impossible.
    setFilters((prev) => ({
      ...prev,
      prepTests: result.spec.prepTests,
      sections: result.spec.sections,
      questionNumbers: result.spec.questionNumbers,
    }));
    setCurrentPage(1);
    setSpecText(formatSpec(result.spec));
  };

  /* ---- Exact references ------------------------------------------------
     A separate input on purpose. Sharing one field would allow
     `PT101 PT102.S2.Q1`, which requests a generated set and a manual one at
     once, with the manual qids silently overriding the visible spec. */

  const [exactText, setExactText] = useState('');
  const [exactIssues, setExactIssues] = useState<SpecIssue[]>([]);

  const commitExactRefs = () => {
    const parsed = parseExactRefs(exactText);
    if (!parsed.ok) {
      setExactIssues(parsed.issues);
      return;
    }
    if (parsed.refs.length === 0) {
      setExactIssues([]);
      return;
    }

    // Resolve against the bank before touching state. Atomic: if any reference
    // names a question that does not exist, nothing is added at all — a
    // partially accepted paste is how a set quietly becomes the wrong set.
    const resolved: string[] = [];
    const missing: string[] = [];
    for (const ref of parsed.refs) {
      const q = allQuestions.find(
        (x) => x.pt === ref.pt && x.section === ref.section && x.qnum === ref.qnum,
      );
      if (q) resolved.push(q.qid);
      else missing.push(ref.label);
    }

    if (missing.length > 0) {
      setExactIssues([
        {
          kind: 'unknown-value',
          token: missing.join(', '),
          message: `Not in the bank: ${missing.join(', ')}. Nothing was added.`,
        },
      ]);
      return;
    }

    setSelectedQids((prev) => {
      const next = new Set(prev);
      resolved.forEach((qid) => next.add(qid));
      return next;
    });
    setPreviewedQids(null);
    setExactIssues([]);
    setExactText('');
    toast({
      title: `Added ${resolved.length} question${resolved.length === 1 ? '' : 's'}`,
      description: 'Your set is now a manual selection.',
    });
  };

  const visibleDifficulties = useMemo(
    () =>
      getVisibleLRDrillOptions(
        ALL_DIFFICULTIES,
        filters.difficulties,
        contextualCounts.difficulties,
      ),
    [contextualCounts.difficulties, filters.difficulties],
  );
  
  // Load attempt counts
  useEffect(() => {
    async function loadAttempts() {
      if (!user) return;
      
      try {
        const { data: student } = await supabase
          .from('students')
          .select('class_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!student?.class_id) return;
        
        const { data: attempts } = await supabase
          .from('attempts')
          .select('qid')
          .eq('class_id', student.class_id);
        
        if (attempts) {
          const counts = new Map<string, number>();
          attempts.forEach(a => {
            counts.set(a.qid, (counts.get(a.qid) || 0) + 1);
          });
          setAttemptCounts(counts);
        }
      } catch (err) {
        console.error('Failed to load attempt counts:', err);
      }
    }
    
    loadAttempts();
  }, [user]);
  
  // Filter and paginate questions
  const { filteredQuestions, totalCount } = useMemo(() => {
    const questions = filterLRQuestions(allQuestions, filters);
    
    return {
      filteredQuestions: questions,
      totalCount: questions.length
    };
  }, [allQuestions, filters]);
  
  // Paginated questions
  const paginatedQuestions: QuestionRow[] = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return filteredQuestions
      .slice(startIndex, endIndex)
      .map(q => ({
        ...q,
        attemptCount: attemptCounts.get(q.qid) || 0
      }));
  }, [filteredQuestions, currentPage, pageSize, attemptCounts]);
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Toggle filter chip
  const toggleFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ) => {
    setFilters(prev => {
      const current = prev[key] as unknown[];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValue };
    });
    setCurrentPage(1); // Reset to first page
  };
  
  // Remove filter chip
  const removeFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as unknown[]).filter(v => v !== value)
    }));
    setCurrentPage(1);
  };

  const clearArrayFilter = (
    key: 'prepTests' | 'sections' | 'questionTypes' | 'reasoningTypes' | 'questionFeatures' | 'difficulties',
  ) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters(createEmptyLRDrillFilters());
    setQtypeSearch('');
    setReasoningSearch('');
    setFeatureSearch('');
    setCurrentPage(1);
  };
  
  // Toggle question selection
  const toggleQuestion = (qid: string) => {
    setSelectedQids(prev => {
      const next = new Set(prev);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next;
    });
  };
  
  // Add random questions
  const addRandomQuestions = (count: number) => {
    const available = filteredQuestions
      .filter(q => !selectedQids.has(q.qid))
      .map(q => q.qid);
    
    if (available.length === 0) {
      if (filteredQuestions.length === 0) {
        toast({
          title: "No questions available",
          description: "Try adjusting your filters to see more questions.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "All questions selected",
          description: "All questions matching your filters are already selected.",
          variant: "destructive",
        });
      }
      return;
    }
    
    const toAdd = Math.min(count, available.length);
    const randomQids = shuffleArray(available).slice(0, toAdd);
    
    setSelectedQids(prev => {
      const next = new Set(prev);
      randomQids.forEach(qid => next.add(qid));
      return next;
    });
    
    toast({
      title: `Added ${randomQids.length} questions`,
      description: `${randomQids.length} random questions added to your selection.`,
    });
  };
  
  const hasAnyFilter =
    filters.prepTests.length > 0 ||
    filters.questionTypes.length > 0 ||
    filters.reasoningTypes.length > 0 ||
    filters.questionFeatures.length > 0 ||
    filters.sections.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.searchQuery.trim() !== '' ||
    filters.questionNumbers.length > 0;

  // Materialize a fresh preview from the current filter pool.
  // No filter is a valid pool — it means the whole bank — because every facet
  // already treats an empty array as unrestricted. Refusing to generate from
  // it was a dead end that made the panel promise a set it would not build.
  const handleGeneratePreview = () => {
    if (filteredQuestions.length === 0) {
      toast({
        title: "No questions match filters",
        description: "Try relaxing your filters to find more questions.",
        variant: "destructive",
      });
      return;
    }
    const count = Math.min(setSize, filteredQuestions.length);
    const sample = questionBank.shuffleQuestions(filteredQuestions).slice(0, count);
    setPreviewedQids(sample.map((q) => q.qid));
  };

  // Convert the current preview into an editable selection (qids land in selectedQids)
  const handleEditPreview = () => {
    if (!previewedQids || previewedQids.length === 0) return;
    setSelectedQids(new Set(previewedQids));
    setPreviewedQids(null);
  };

  // Launch the drill. Source-of-truth order:
  //   1. selectedQids (manual picks)
  //   2. previewedQids (generated preview)
  //   3. otherwise: materialize now from filters (legacy fallback)
  const handleLaunch = () => {
    let questionsToUse: LRQuestion[] = [];

    if (selectedQids.size === 0 && (!previewedQids || previewedQids.length === 0)) {
      if (!hasAnyFilter) {
        toast({
          title: "Nothing to build a set from",
          description: "Pick at least one filter or select questions from the table.",
          variant: "destructive",
        });
        return;
      }

      if (filteredQuestions.length === 0) {
        toast({
          title: "No questions match filters",
          description: "Try relaxing your filters to find more questions.",
          variant: "destructive",
        });
        return;
      }

      const count = Math.min(setSize, filteredQuestions.length);
      questionsToUse = questionBank.shuffleQuestions(filteredQuestions).slice(0, count);
    } else if (selectedQids.size === 0 && previewedQids && previewedQids.length > 0) {
      questionsToUse = previewedQids
        .map((qid) => questionBank.getQuestion(qid))
        .filter(Boolean) as LRQuestion[];
      if (questionsToUse.length === 0) {
        toast({
          title: "Preview invalid",
          description: "Generated questions could not be loaded. Try Generate again.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Use manually selected questions
      questionsToUse = Array.from(selectedQids)
        .map(qid => questionBank.getQuestion(qid))
        .filter(Boolean) as LRQuestion[];
      
      if (questionsToUse.length === 0) {
        toast({
          title: "Invalid selection",
          description: "None of the selected questions could be found. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (questionsToUse.length !== selectedQids.size) {
        toast({
          title: "Some questions unavailable",
          description: `${selectedQids.size - questionsToUse.length} selected questions could not be found and were skipped.`,
        });
      }
    }
    
    const qtypes = Array.from(new Set(questionsToUse.map(q => q.qtype)));
    const difficulties = Array.from(new Set(questionsToUse.map(q => q.difficulty)));
    const pts = Array.from(new Set(questionsToUse.map(q => q.pt)));
    
    const config: TypeDrillConfig = {
      qtypes,
      difficulties,
      pts,
      count: questionsToUse.length,
      selectedQids: questionsToUse.map(q => q.qid),
      qfeatures: filters.questionFeatures.length > 0 ? [...filters.questionFeatures] : undefined,
      reasoningTypes: filters.reasoningTypes.length > 0 ? [...filters.reasoningTypes] : undefined,
      sections: filters.sections.length > 0 ? [...filters.sections] : undefined,
      searchQuery: filters.searchQuery.trim() || undefined,
      // No question-number metadata. `selectedQids` above already carries the
      // resolved set, so passing it would duplicate state the runner does not
      // read — and `TypeDrillConfig`'s field is a scalar that cannot hold the
      // list this builder can now express.
    };

    // Wave 3 / Item A — record exposures for the questions we're about to
    // serve so Smart Drill and the other generators exclude them from the
    // user's recent-500 window.
    if (user?.id && config.selectedQids && config.selectedQids.length > 0) {
      recordExposures(user.id, config.selectedQids).catch((e) =>
        console.error('[QuestionPicker] recordExposures failed', e),
      );
    }

    onStartDrill(config);
  };
  
  // Invalidate preview when filters, size, or selection change
  useEffect(() => {
    setPreviewedQids(null);
  }, [filters, setSize, selectedQids]);

  // Reset reveal toggle whenever a different drawer opens
  useEffect(() => {
    setRevealAnswer(false);
  }, [drawerQid]);

  // Clear selection
  const clearSelection = () => {
    setSelectedQids(new Set());
    toast({
      title: "Selection cleared",
      description: "All selected questions have been removed.",
    });
  };
  
  // Live summary stats — selectedQids wins, then previewedQids, then filter pool
  const summary = useMemo(() => {
    let mode: 'selection' | 'preview' | 'pool' = 'pool';
    let source: LRQuestion[];
    if (selectedQids.size > 0) {
      mode = 'selection';
      source = Array.from(selectedQids)
        .map(qid => questionBank.getQuestion(qid))
        .filter(Boolean) as LRQuestion[];
    } else if (previewedQids && previewedQids.length > 0) {
      mode = 'preview';
      source = previewedQids
        .map(qid => questionBank.getQuestion(qid))
        .filter(Boolean) as LRQuestion[];
    } else {
      source = filteredQuestions;
    }

    const qtypeCounts = new Map<string, number>();
    const diffBucket = { easy: 0, med: 0, hard: 0 };
    let minPT = Infinity;
    let maxPT = -Infinity;
    let attempted = 0;

    for (const q of source) {
      qtypeCounts.set(q.qtype, (qtypeCounts.get(q.qtype) || 0) + 1);
      if (q.difficulty <= 2) diffBucket.easy++;
      else if (q.difficulty === 3) diffBucket.med++;
      else diffBucket.hard++;
      if (q.pt < minPT) minPT = q.pt;
      if (q.pt > maxPT) maxPT = q.pt;
      if ((attemptCounts.get(q.qid) || 0) > 0) attempted++;
    }

    const qtypeMix = Array.from(qtypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type, n]) => `${n} ${type}`)
      .join(' · ');

    return {
      total: source.length,
      qtypeMix: qtypeMix || 'None',
      difficulty: `Easy ${diffBucket.easy} · Med ${diffBucket.med} · Hard ${diffBucket.hard}`,
      ptRange:
        source.length === 0
          ? 'None'
          : minPT === maxPT
          ? `PT ${minPT}`
          : `PT ${minPT}–${maxPT}`,
      attempted,
      unseen: source.length - attempted,
      mode,
      isFromSelection: mode === 'selection',
      isFromPreview: mode === 'preview',
    };
  }, [selectedQids, previewedQids, filteredQuestions, attemptCounts]);

  const hasPreview = !!previewedQids && previewedQids.length > 0;

  // Enabled whenever there is a pool and no manual selection. An unfiltered
  // pool is the full bank, which is a legitimate thing to draw a set from.
  const canGenerate = selectedQids.size === 0 && filteredQuestions.length > 0;

  const generateHint =
    filteredQuestions.length === 0 ? 'No questions match. Adjust your filters.' : null;

  // Get first 6-7 words of stem
  const getStemPreview = (stem: string): string => {
    const words = stem.split(' ').slice(0, 7);
    return words.join(' ') + (stem.split(' ').length > 7 ? '...' : '');
  };
  
  return (
    <div className="@container flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-3xl font-bold tracking-[-0.025em]">Set up an LR drill</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Combine any PrepTests, question types, reasoning, features, and levels. Preview the
            exact questions before you begin.
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Container query, not `lg:` — this picker no longer owns a full page.
          It renders inside the drill hub's deck, so the viewport can be wide
          while the panel is not. Keying the split to the viewport put a
          `1fr + 320px` grid inside an ~795px box and the table column, whose
          min-content floor is the table itself, overflowed and got clipped by
          the deck's `overflow: hidden`. `minmax(0,1fr)` lets that column
          shrink instead of blowing the grid out.

          THE THRESHOLD MUST BE REACHABLE. The previous value was 1140px, but
          this container is capped by the classroom shell at ~1084px, so the
          query never matched at any viewport size. The summary rail — the
          whole live-feedback loop plus the primary CTA — always rendered
          full-width *below* a 25-row table, ~2400px down a 3400px document.
          It was never once seen beside the table in production.

          980px is derived, not guessed — see SPLIT_AT. The table was narrowed
          to reach it; its min-content used to be ~880px, which no threshold
          could have fitted inside a container that peaks at ~1084px and is only
          ~1008px on a 1440px laptop. Above 980 the table keeps its 644px floor;
          below, the rail stacks and the table scrolls inside its own wrapper. */}
      <div className="flex-1 min-h-0 @[980px]:grid @[980px]:grid-cols-[minmax(0,1fr)_320px] @[980px]:gap-4">
        <div className="flex flex-col min-h-0">
      {/* Filter Bar */}
      <Card className="mb-5 overflow-visible border-border/70 bg-card/80 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
              <p className="text-lg font-semibold tracking-[-0.015em]">Filter the question bank</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {totalCount.toLocaleString()} matching {totalCount === 1 ? 'question' : 'questions'}
              </p>
            </div>
            {hasAnyFilter && (
              <Button variant="ghost" size="sm" className="h-9 px-3" onClick={clearAllFilters}>
                Clear all
              </Button>
            )}
          </div>
          {/* Filter Controls
              Item D order: PrepTest → Section → Q# → Type → Reasoning →
              Features → Levels → Search. Reordered from the legacy layout
              (PT → Type → Reasoning → Features → Section → Levels → Search). */}
          <div className="space-y-5 border-t border-border/60 px-5 py-5">
            {/* Spec line. Replaces a single `Q#` number input that could hold
                exactly one value — so "Q1, 6, 8, 23", the thing you actually
                want when rebuilding a set, was not expressible at all.

                It owns PT, section and question number only. Type, reasoning,
                features and levels stay in their popovers, because a bar that
                round-tripped through a grammar unable to express them would
                drop them silently on every commit. */}
            <div className="grid gap-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4">
              {/* "Spec" was the internal name for the grammar and it read as
                  jargon on screen: it sat above SOURCE and FOCUS, which name
                  what you are choosing, while this one named the machinery.
                  The row is the typed alternative to the popovers below, so it
                  says that. Each label carries a hint for the same reason —
                  three bare nouns in a column give no order to follow. */}
              <div className="sm:pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/75">
                  Type it
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Faster than clicking
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      value={specText}
                      onChange={(e) => {
                        setSpecText(e.target.value);
                        if (specIssues.length > 0) setSpecIssues([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitSpec();
                        }
                      }}
                      onBlur={commitSpec}
                      placeholder="PT 101-110 S2,3 Q1,6,8,23"
                      aria-label="Type a PrepTest, section and question range"
                      aria-invalid={specIssues.length > 0}
                      aria-describedby={specIssues.length > 0 ? 'spec-errors' : undefined}
                      className={cn(
                        'h-11 pr-4 text-[15px] font-mono',
                        specIssues.length > 0 && 'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 px-4"
                    onClick={commitSpec}
                    disabled={specText === formatSpec(specFromFilters)}
                  >
                    Apply
                  </Button>
                </div>
                {specIssues.length > 0 && (
                  <div id="spec-errors" role="alert" className="space-y-0.5">
                    {specIssues.map((issue, i) => (
                      <p key={`${issue.token}-${i}`} className="text-xs text-destructive">
                        {issue.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Naming exact questions is a different job from narrowing a
                    pool, so it gets its own field. These append to the
                    selection and never touch the facets above. */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      value={exactText}
                      onChange={(e) => {
                        setExactText(e.target.value);
                        // Editing is an attempt to fix the problem; keeping the
                        // old error on screen just makes it look unfixable.
                        if (exactIssues.length > 0) setExactIssues([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitExactRefs();
                        }
                      }}
                      placeholder="Add exact questions — PT101.S2.Q1, PT101.S2.Q6"
                      aria-label="Add exact questions"
                      aria-invalid={exactIssues.length > 0}
                      aria-describedby={exactIssues.length > 0 ? 'exact-errors' : undefined}
                      className={cn(
                        'h-10 text-sm font-mono',
                        exactIssues.length > 0 && 'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 px-4"
                    onClick={commitExactRefs}
                    disabled={exactText.trim() === ''}
                  >
                    Add
                  </Button>
                </div>
                {exactIssues.length > 0 && (
                  <div id="exact-errors" role="alert" className="space-y-0.5">
                    {exactIssues.map((issue, i) => (
                      <p key={`${issue.token}-${i}`} className="text-xs text-destructive">
                        {issue.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 border-t border-border/50 pt-5 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4">
              <div className="sm:pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/75">
                  Source
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Where they come from
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            {/* PrepTest Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-[15px] sm:w-auto sm:min-w-[168px]">
                  PrepTests {filters.prepTests.length > 0 && `(${filters.prepTests.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              {/* A chip grid, not a checkbox column. Sixty PTs in a 400px-tall
                  scrolling list showed about ten at a time, so picking a spread
                  meant scrolling and hunting. Five across fits the whole bank
                  in one glance. */}
              <PopoverContent className="drill-observatory-launcher-panel w-[344px]" align="start">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      PrepTests
                    </span>
                    {/* One action, not All + Clear. An empty selection already
                        means every PT, so "All" and "Clear" would do the same
                        thing under different names. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={filters.prepTests.length === 0}
                      onClick={() => clearArrayFilter('prepTests')}
                    >
                      Any PT
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                    {visiblePTs.map(pt => {
                      const active = filters.prepTests.includes(pt);
                      const count = contextualCounts.prepTests.get(pt) ?? 0;
                      return (
                        <button
                          key={pt}
                          id={`pt-${pt}`}
                          type="button"
                          role="checkbox"
                          aria-checked={active}
                          aria-label={`PT${pt}, ${count} questions`}
                          title={`PT${pt} · ${count} questions`}
                          onClick={() => toggleFilter('prepTests', pt)}
                          className={cn(
                            'h-9 rounded-md border text-xs tabular-nums transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                              ? 'border-primary bg-primary text-primary-foreground font-semibold'
                              : count === 0
                              ? 'border-border/40 text-muted-foreground/40'
                              : 'border-border text-foreground hover:bg-accent',
                          )}
                        >
                          {pt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Section Filter (moved earlier per Item D) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-[15px] sm:w-auto sm:min-w-[148px]">
                  Section {filters.sections.length > 0 && `(${filters.sections.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel w-56" align="start">
                <div className="space-y-2">
                  <FilterMenuHeader
                    title="Select Sections"
                    activeCount={filters.sections.length}
                    onClear={() => clearArrayFilter('sections')}
                  />
                  {visibleSections.map((s) => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${s}`}
                        checked={filters.sections.includes(s)}
                        onCheckedChange={() => toggleFilter('sections', s)}
                      />
                      <label htmlFor={`section-${s}`} className="text-sm cursor-pointer flex-1">
                        Section {s} ({contextualCounts.sections.get(s) ?? 0})
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

              </div>
            </div>


            <div className="grid gap-3 border-t border-border/50 pt-5 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4">
              <div className="sm:pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/75">
                  Focus
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  What they test
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            {/* Question Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-[15px] sm:w-auto sm:min-w-[188px]">
                  Question Type {filters.questionTypes.length > 0 && `(${filters.questionTypes.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel w-80 max-h-[500px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <FilterMenuHeader
                    title="Select Question Types"
                    activeCount={filters.questionTypes.length}
                    onClear={() => clearArrayFilter('questionTypes')}
                  />
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search types..."
                      value={qtypeSearch}
                      onChange={(e) => setQtypeSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const visible = CANONICAL_QTYPES.allTypes.filter(qtype => {
                          const count = contextualCounts.questionTypes.get(qtype) ?? 0;
                          if (count === 0 && !filters.questionTypes.includes(qtype)) return false;
                          if (!qtypeSearch) return true;
                          return qtype.toLowerCase().includes(qtypeSearch.toLowerCase());
                        });
                        setFilters(prev => ({
                          ...prev,
                          questionTypes: [...new Set([...prev.questionTypes, ...visible])]
                        }));
                      }}
                      className="h-8 text-xs"
                    >
                      Select all shown
                    </Button>
                  </div>

                  {/* Types List - Grouped by Category */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {CANONICAL_QTYPES.groups.map(group => {
                      const visibleTypes = group.types.filter(qtype => {
                        const count = contextualCounts.questionTypes.get(qtype) ?? 0;
                        if (count === 0 && !filters.questionTypes.includes(qtype)) return false;
                        if (!qtypeSearch) return true;
                        return qtype.toLowerCase().includes(qtypeSearch.toLowerCase());
                      });
                      
                      // Don't show group if no visible types
                      if (visibleTypes.length === 0) return null;
                      
                      return (
                        <div key={group.name} className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {group.name}
                          </div>
                          {visibleTypes.map(qtype => {
                            const count = contextualCounts.questionTypes.get(qtype) ?? 0;
                            return (
                              <div key={qtype} className="flex items-center space-x-2 pl-2">
                                <Checkbox
                                  id={`qtype-${qtype}`}
                                  checked={filters.questionTypes.includes(qtype)}
                                  onCheckedChange={() => toggleFilter('questionTypes', qtype)}
                                />
                                <label htmlFor={`qtype-${qtype}`} className="text-sm cursor-pointer flex-1">
                                  {qtype} <span className="text-muted-foreground">({count})</span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Reasoning Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-[15px] sm:w-auto sm:min-w-[194px]">
                  Reasoning Types {filters.reasoningTypes.length > 0 && `(${filters.reasoningTypes.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel w-80 max-h-[500px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <FilterMenuHeader
                    title="Select Reasoning Types"
                    activeCount={filters.reasoningTypes.length}
                    onClear={() => clearArrayFilter('reasoningTypes')}
                  />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={reasoningSearch}
                      onChange={(e) => setReasoningSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-[340px] overflow-y-auto">
                    {allReasoningTypes
                      .filter((rt) => {
                        const count = contextualCounts.reasoningTypes.get(rt) ?? 0;
                        if (count === 0 && !filters.reasoningTypes.includes(rt)) return false;
                        if (!reasoningSearch) return true;
                        return reasoningTypeLabel(rt).toLowerCase().includes(reasoningSearch.toLowerCase());
                      })
                      .map((rt) => {
                        const count = contextualCounts.reasoningTypes.get(rt) ?? 0;
                        return (
                          <div key={rt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`rt-${rt}`}
                              checked={filters.reasoningTypes.includes(rt)}
                              onCheckedChange={() => toggleFilter('reasoningTypes', rt)}
                            />
                            <label htmlFor={`rt-${rt}`} className="text-sm cursor-pointer flex-1">
                              {reasoningTypeLabel(rt)} <span className="text-muted-foreground">({count})</span>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Question Features Filter (Item F — family-grouped accordion).
                The declared feature tags are bucketed into named families and
                any future bank-only tags fall back to Other. Each family is a
                collapsed disclosure; the family header shows the count of
                selected features in that family. Search filters across all
                families simultaneously. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-[15px] sm:w-auto sm:min-w-[220px]">
                  Question Features {filters.questionFeatures.length > 0 && `(${filters.questionFeatures.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel w-96 max-h-[520px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <FilterMenuHeader
                    title="Select Question Features"
                    activeCount={filters.questionFeatures.length}
                    onClear={() => clearArrayFilter('questionFeatures')}
                  />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search features..."
                      value={featureSearch}
                      onChange={(e) => setFeatureSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {featureFamilies.map((family) => {
                      // Apply search + zero-count filtering family-locally
                      const visibleFeatures = family.features.filter((f) => {
                        const count = contextualCounts.questionFeatures.get(f) ?? 0;
                        if (count === 0 && !filters.questionFeatures.includes(f)) return false;
                        if (!featureSearch) return true;
                        return (
                          f.toLowerCase().includes(featureSearch.toLowerCase()) ||
                          family.label.toLowerCase().includes(featureSearch.toLowerCase())
                        );
                      });
                      if (visibleFeatures.length === 0) return null;
                      const selectedCount = visibleFeatures.filter((f) =>
                        filters.questionFeatures.includes(f),
                      ).length;
                      // Auto-expand if any feature in this family is selected
                      // or the user has typed a search query.
                      const defaultOpen = selectedCount > 0 || !!featureSearch;
                      return (
                        <details
                          key={family.id}
                          open={defaultOpen}
                          className="group/family rounded-md border border-border bg-card/60"
                        >
                          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-2.5 py-1.5 select-none">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover/family:text-foreground transition-colors">
                              {family.label}
                              {selectedCount > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                  {selectedCount}
                                </span>
                              )}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open/family:rotate-180" />
                          </summary>
                          <div className="space-y-1.5 px-3 pt-1 pb-2">
                            {visibleFeatures.map((f) => {
                              const count = contextualCounts.questionFeatures.get(f) ?? 0;
                              return (
                                <div key={f} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`feat-${f}`}
                                    checked={filters.questionFeatures.includes(f)}
                                    onCheckedChange={() => toggleFilter('questionFeatures', f)}
                                  />
                                  <label htmlFor={`feat-${f}`} className="text-sm cursor-pointer flex-1">
                                    {f} <span className="text-muted-foreground">({count})</span>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Difficulty Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-[15px] sm:w-auto sm:min-w-[132px]">
                  Levels {filters.difficulties.length > 0 && `(${filters.difficulties.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel w-64" align="start">
                <div className="space-y-2">
                  <FilterMenuHeader
                    title="Select Levels"
                    activeCount={filters.difficulties.length}
                    onClear={() => clearArrayFilter('difficulties')}
                  />
                  {visibleDifficulties.map(diff => (
                    <div key={diff} className="flex items-center space-x-2">
                      <Checkbox
                        id={`diff-${diff}`}
                        checked={filters.difficulties.includes(diff)}
                        onCheckedChange={() => toggleFilter('difficulties', diff)}
                      />
                      <label htmlFor={`diff-${diff}`} className="text-sm cursor-pointer flex-1">
                        Level {diff} ({contextualCounts.difficulties.get(diff) ?? 0})
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Search */}
            <div className="relative w-full flex-none">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search questions..."
                value={filters.searchQuery}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
                  setCurrentPage(1);
                }}
                className="h-11 pl-10 pr-10 text-[15px]"
                aria-label="Search question text"
              />
              {filters.searchQuery.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, searchQuery: '' }));
                    setCurrentPage(1);
                  }}
                  className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear question search"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
              </div>
            </div>
          </div>
          
          {/* Active Filters */}
          {(filters.prepTests.length > 0 ||
            filters.questionTypes.length > 0 ||
            filters.reasoningTypes.length > 0 ||
            filters.questionFeatures.length > 0 ||
            filters.sections.length > 0 ||
            filters.difficulties.length > 0 ||
            filters.questionNumbers.length > 0 ||
            filters.searchQuery.trim() !== '') && (
            <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-4">
              {filters.prepTests.map(pt => (
                <Badge key={`pt-${pt}`} variant="secondary" className="gap-1">
                  PT{pt}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('prepTests', pt)} />
                </Badge>
              ))}
              {filters.questionTypes.map(qtype => (
                <Badge key={`qtype-${qtype}`} variant="secondary" className="gap-1">
                  {qtype}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('questionTypes', qtype)} />
                </Badge>
              ))}
              {filters.reasoningTypes.map(rt => (
                <Badge key={`rt-${rt}`} variant="secondary" className="gap-1">
                  {reasoningTypeLabel(rt)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('reasoningTypes', rt)} />
                </Badge>
              ))}
              {filters.questionFeatures.map(f => (
                <Badge key={`feat-${f}`} variant="secondary" className="gap-1">
                  {f}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('questionFeatures', f)} />
                </Badge>
              ))}
              {filters.sections.map(s => (
                <Badge key={`section-${s}`} variant="secondary" className="gap-1">
                  Section {s}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('sections', s)} />
                </Badge>
              ))}
              {filters.difficulties.map(diff => (
                <Badge key={`diff-${diff}`} variant="secondary" className="gap-1">
                  Level {diff}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('difficulties', diff)} />
                </Badge>
              ))}
              {filters.questionNumbers.map((qnum) => (
                <Badge key={`qnum-${qnum}`} variant="secondary" className="gap-1">
                  Q{qnum}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        questionNumbers: prev.questionNumbers.filter((n) => n !== qnum),
                      }));
                      setCurrentPage(1);
                    }}
                  />
                </Badge>
              ))}
              {filters.searchQuery.trim() !== '' && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.searchQuery.trim()}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, searchQuery: '' }));
                      setCurrentPage(1);
                    }}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Shortcuts, shown while nothing is narrowed yet. This used to replace
          the results table entirely, which contradicted the rail: the summary
          offered a set from the full bank while this told you no set existed
          yet. The table now always renders and these sit above it. */}
      {!hasAnyFilter && selectedQids.size === 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-dashed px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Drawing from all {totalCount.toLocaleString()} questions. Narrow it down:
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (allPTs.length === 0) return;
                const latest = Math.max(...allPTs);
                setFilters((prev) => ({ ...prev, prepTests: [latest] }));
                setCurrentPage(1);
              }}
            >
              Latest PT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters((prev) => ({ ...prev, questionTypes: ['Flaw'] }));
                setCurrentPage(1);
              }}
            >
              Flaw questions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters((prev) => ({ ...prev, difficulties: [4, 5] }));
                setCurrentPage(1);
              }}
            >
              Hard only
            </Button>
          </div>
        </Card>
      )}

      <>
      {/* Results header — Item J: groups page-size with the table not the filters. */}
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          Showing <span className="font-medium text-foreground">{paginatedQuestions.length}</span>{' '}
          of <span className="font-medium text-foreground">{totalCount}</span> questions
          {selectedQids.size > 0 && (
            <span className="text-foreground"> · {selectedQids.size} selected</span>
          )}
        </div>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            setPageSize(parseInt(value));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="drill-observatory-launcher-panel">
            <SelectItem value="10">Show 10</SelectItem>
            <SelectItem value="25">Show 25</SelectItem>
            <SelectItem value="50">Show 50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Table */}
      <Card className="flex-1 overflow-hidden flex flex-col mb-20">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* One scroller, not two. `Table` already wraps itself in an
              `overflow-auto` div, so the extra `overflow-x-auto` here meant two
              nested scrollers and no single element that could be asserted on:
              the outer one reported no overflow while the inner one scrolled. */}
          <Table
            wrapperRef={tableScrollerRef}
            wrapperClassName="flex-1"
            style={{ tableLayout: 'fixed', minWidth: TABLE_MIN_WIDTH }}
          >
            {/* Only the stem flexes; everything else is pinned so the table has
                a knowable minimum. Widths come from COL, which is sized against
                real content rather than headers — Type has to clear a ~92px
                badge plus 32px of cell padding, so 128 is a floor. */}
            <colgroup>
              <col style={{ width: COL.select }} />
              <col style={{ width: COL.pt }} />
              <col style={{ width: COL.sectionQ }} />
              <col style={{ minWidth: STEM_MIN_WIDTH }} />
              <col style={{ width: COL.type }} />
              <col style={{ width: COL.level }} />
              <col style={{ width: COL.attempts }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    aria-label="Select all questions on this page"
                    checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQids.has(q.qid))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQids(prev => {
                          const next = new Set(prev);
                          paginatedQuestions.forEach(q => next.add(q.qid));
                          return next;
                        });
                      } else {
                        setSelectedQids(prev => {
                          const next = new Set(prev);
                          paginatedQuestions.forEach(q => next.delete(q.qid));
                          return next;
                        });
                      }
                    }}
                  />
                </TableHead>
                <TableHead>PT</TableHead>
                {/* Sec and Q# merged. Two headers cost ~112px to show four
                    characters of data; one column shows the same as `2 · 14`. */}
                <TableHead>S/Q</TableHead>
                <TableHead>Stem</TableHead>
                <TableHead>Type</TableHead>
                <TableHead
                  title="1 = easiest · 5 = hardest. Blue / green / yellow / orange / red."
                  className="cursor-help"
                >
                  Lvl
                </TableHead>
                <TableHead>Att</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestions.length === 0 ? (
                <TableRow>
                  {/* Seven columns since Sec and Q# merged. Under
                      `table-layout: fixed` a colSpan of 8 would mint an
                      anonymous eighth column and skew every width. */}
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No questions match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedQuestions.map((q) => (
                  <TableRow
                    key={q.qid}
                    className={cn(
                      "h-12 cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/40",
                      selectedQids.has(q.qid) && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => setDrawerQid(q.qid)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-0">
                      <Checkbox
                        aria-label={`Select PT${q.pt} section ${q.section} question ${q.qnum}`}
                        checked={selectedQids.has(q.qid)}
                        onCheckedChange={() => toggleQuestion(q.qid)}
                      />
                    </TableCell>
                    <TableCell className="py-0 font-medium tabular-nums">{q.pt}</TableCell>
                    <TableCell className="py-0 tabular-nums text-muted-foreground">
                      <span className="text-foreground">{q.section}</span>
                      <span className="px-1 opacity-40">·</span>
                      <span className="text-foreground">{q.qnum}</span>
                    </TableCell>
                    <TableCell className="py-0 text-sm">
                      {/* The column is the clamp now; a fixed max-width here
                          would stop the stem growing with the table. */}
                      <span className="block truncate" title={q.questionStem}>
                        {getStemPreview(q.questionStem)}
                      </span>
                    </TableCell>
                    <TableCell className="py-0">
                      <Badge
                        variant="outline"
                        title={q.qtype}
                        className="h-6 px-2 text-[11px] font-medium whitespace-nowrap"
                      >
                        {abbreviateQtype(q.qtype)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-0">
                      <Badge
                        variant="secondary"
                        title={`Level ${q.difficulty} of 5`}
                        className={cn(
                          "h-6 px-2 text-[11px] font-semibold tabular-nums",
                          q.difficulty === 5 && "bg-red-500/10 text-red-400",
                          q.difficulty === 4 && "bg-orange-500/10 text-orange-400",
                          q.difficulty === 3 && "bg-yellow-500/10 text-yellow-400",
                          q.difficulty === 2 && "bg-green-500/10 text-green-400",
                          q.difficulty === 1 && "bg-blue-500/10 text-blue-400"
                        )}
                      >
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-0 text-muted-foreground tabular-nums">{q.attemptCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      </>

        </div>

        {/* Right rail — sticky summary.
            Item G (Wave 4) — empty until a filter is applied, then renders
            a tiered hierarchy: tier 1 composition headline (largest, gold),
            tier 2 type + difficulty (body), tier 3 PT range + history (muted). */}
        {/* Rail and tray are one decision, so they key off the same container
            condition. They used to disagree — `lg:` on both — which meant a wide
            viewport around a narrow panel could show both or neither. */}
        <aside className="hidden @[980px]:block" data-testid="summary-rail">
          <div className="sticky top-4">
            <Card className="p-4 space-y-3">
              <div className="font-semibold text-sm">
                {summary.isFromPreview
                  ? 'Preview'
                  : summary.isFromSelection
                  ? 'Selection'
                  : 'Set Summary'}
              </div>

              {/* No empty state here. The rail is the feedback loop, so it
                  always shows real numbers — unfiltered, those describe the
                  full bank, which is exactly what Generate would draw from. */}
              {(
                <>
                  {/* Tier 1: composition headline */}
                  <div className="rounded-md bg-primary/[0.06] border border-primary/15 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                      Composition
                    </div>
                    <div className="mt-1 text-2xl font-bold text-primary tabular-nums">
                      {summary.isFromSelection
                        ? `${summary.total} selected`
                        : summary.isFromPreview
                        ? `${summary.total} ready`
                        : `${Math.min(setSize, summary.total)} / ${setSize}`}
                    </div>
                    {!summary.isFromSelection && !summary.isFromPreview && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        from pool of {summary.total.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Tier 2: type + difficulty */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                        Question types
                      </div>
                      <div className="font-medium text-foreground">{summary.qtypeMix}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                        Difficulty
                      </div>
                      <div className="font-medium text-foreground">{summary.difficulty}</div>
                    </div>
                  </div>

                  {/* Tier 3: PT range + history */}
                  <div className="space-y-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    <div className="flex items-baseline justify-between gap-2">
                      <span>PT range</span>
                      <span className="font-medium text-foreground/70 tabular-nums">{summary.ptRange}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span>History</span>
                      <span className="font-medium text-foreground/70 tabular-nums">
                        {summary.attempted} attempted · {summary.unseen} unseen
                      </span>
                    </div>
                  </div>
                </>
              )}

              {hasPreview && previewedQids && (
                <div className="pt-2 border-t space-y-1">
                  <div className="text-xs text-muted-foreground">Preview</div>
                  <ul className="text-xs space-y-0.5">
                    {previewedQids.slice(0, 5).map((qid) => {
                      const q = questionBank.getQuestion(qid);
                      if (!q) return null;
                      return (
                        <li key={qid} className="flex items-baseline gap-2">
                          <span className="font-medium tabular-nums">PT{q.pt}·Q{q.qnum}</span>
                          <span className="text-muted-foreground truncate">
                            {q.qtype} · L{q.difficulty}
                          </span>
                        </li>
                      );
                    })}
                    {previewedQids.length > 5 && (
                      <li className="text-muted-foreground italic">
                        and {previewedQids.length - 5} more…
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-muted-foreground">Set size</label>
                  <Select
                    value={setSize.toString()}
                    onValueChange={(v) => setSetSize(parseInt(v))}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="drill-observatory-launcher-panel">
                      {setSizeOptions.map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedQids.size > 0 ? (
                  <div className="space-y-2">
                    <Button onClick={handleLaunch} className="w-full">
                      Launch ({selectedQids.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSaveDialogName('');
                        setSaveDialogOpen(true);
                      }}
                      className="w-full gap-2"
                    >
                      <Bookmark className="h-3.5 w-3.5" aria-hidden /> Save set
                    </Button>
                  </div>
                ) : hasPreview ? (
                  <div className="space-y-2">
                    <Button onClick={handleLaunch} className="w-full">
                      Launch this set ({previewedQids!.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSaveDialogName('');
                        setSaveDialogOpen(true);
                      }}
                      className="w-full gap-2"
                    >
                      <Bookmark className="h-3.5 w-3.5" aria-hidden /> Save set
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGeneratePreview}
                      className="w-full"
                    >
                      Generate another
                    </Button>
                    <button
                      type="button"
                      onClick={handleEditPreview}
                      className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
                    >
                      Edit in table
                    </button>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={handleGeneratePreview}
                      disabled={!canGenerate}
                      className={cn(
                        "w-full transition-all",
                        canGenerate
                          ? "shadow-sm hover:shadow-md hover:-translate-y-px"
                          : "opacity-60 cursor-not-allowed hover:bg-primary",
                      )}
                    >
                      {canGenerate
                        ? `Generate ${Math.min(setSize, filteredQuestions.length)}`
                        : 'Generate preview'}
                    </Button>
                    {generateHint && (
                      <div className="text-xs text-muted-foreground">{generateHint}</div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </aside>
      </div>

      {/* Selection tray — the narrow-container counterpart to the summary rail.
          Stays viewport-fixed on purpose: a sticky element cannot be pulled
          above its normal flow position, and this renders after the whole
          table, so sticky would only appear once you had scrolled past every
          row. Converting it properly means restructuring the scroll container,
          which is its own change. */}
      <div
        data-testid="selection-tray"
        className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 @[980px]:hidden"
      >
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="font-medium">
                Selected: <span className="text-primary">{selectedQids.size}</span>
              </div>
              {selectedQids.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={setSize.toString()}
                onValueChange={(v) => setSetSize(parseInt(v))}
              >
                <SelectTrigger className="w-20 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="drill-observatory-launcher-panel">
                  {setSizeOptions.map((n) => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filteredQuestions.length > selectedQids.size && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const count = Math.min(setSize, filteredQuestions.length - selectedQids.size);
                    addRandomQuestions(count);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add {Math.min(setSize, filteredQuestions.length - selectedQids.size)} Random
                </Button>
              )}

              {selectedQids.size > 0 ? (
                <Button onClick={handleLaunch} className="min-w-[160px]">
                  Start Drill ({selectedQids.size})
                </Button>
              ) : hasPreview ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                  >
                    Regenerate
                  </Button>
                  <Button onClick={handleLaunch} className="min-w-[160px]">
                    Launch ({previewedQids!.length})
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!canGenerate}
                  className="min-w-[160px]"
                  title={generateHint ?? undefined}
                >
                  {canGenerate
                    ? `Generate ${Math.min(setSize, filteredQuestions.length)}`
                    : 'Generate Preview'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Preview Drawer */}
      <Sheet open={!!drawerQid} onOpenChange={(open) => !open && setDrawerQid(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
          {(() => {
            if (!drawerQid) return null;
            const q = questionBank.getQuestion(drawerQid);
            if (!q) return (
              <div className="text-sm text-muted-foreground">Question not found.</div>
            );
            const isSelected = selectedQids.has(q.qid);
            const tags = [
              ...(q.reasoningType || []),
              ...(q.questionFeatures || []),
            ];
            const attemptedN = attemptCounts.get(q.qid) || 0;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base">
                    PT{q.pt} · S{q.section} · Q{q.qnum}
                  </SheetTitle>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline">{q.qtype}</Badge>
                    <Badge variant="secondary">Level {q.difficulty}</Badge>
                    {attemptedN > 0 && (
                      <Badge variant="secondary">Attempted {attemptedN}×</Badge>
                    )}
                  </div>
                </SheetHeader>

                <div className="space-y-4 mt-4 text-sm">
                  {q.stimulus && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Stimulus
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{q.stimulus}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Question
                    </div>
                    <div className="font-medium leading-relaxed">{q.questionStem}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Answer Choices
                    </div>
                    {(['A','B','C','D','E'] as const).map((letter) => {
                      const isCorrect = q.correctAnswer === letter;
                      return (
                        <div
                          key={letter}
                          className={cn(
                            "flex gap-3 p-2 rounded border",
                            revealAnswer && isCorrect && "border-green-500/40 bg-green-500/5"
                          )}
                        >
                          <span className="font-bold w-6 shrink-0">{letter}.</span>
                          <span className="flex-1">{q.answerChoices[letter]}</span>
                          {revealAnswer && isCorrect && (
                            <Badge variant="secondary" className="bg-green-500/15 text-green-500 shrink-0">
                              Correct
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {!revealAnswer ? (
                      <button
                        type="button"
                        onClick={() => setRevealAnswer(true)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Reveal answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevealAnswer(false)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Hide answer
                      </button>
                    )}
                  </div>

                  {tags.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Tags
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <SheetFooter className="mt-6 flex-row gap-2 sm:justify-between">
                  <Button
                    variant={isSelected ? 'outline' : 'default'}
                    onClick={() => toggleQuestion(q.qid)}
                    className="flex-1"
                  >
                    {isSelected ? 'Remove from set' : 'Add to set'}
                  </Button>
                  <Button variant="ghost" onClick={() => setDrawerQid(null)}>
                    Close
                  </Button>
                </SheetFooter>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Item N (Wave 4) — Save Set dialog. Captures a name + persists the
          current set's question_ids + filter_state to user_saved_sets via
          the savedSets service. Saved sets surface in /practice/sets. */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="drill-observatory-launcher-panel">
          <DialogHeader>
            <DialogTitle>Save this set</DialogTitle>
            <DialogDescription>
              Give your set a name. You'll find it under "My Sets" on the
              Practice Hub.
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
                void (async () => {
                  const name = saveDialogName.trim();
                  if (!name) return;
                  const ids = selectedQids.size > 0
                    ? Array.from(selectedQids)
                    : (previewedQids ?? []);
                  if (ids.length === 0) {
                    toast({ title: 'Nothing to save', description: 'Select or generate questions first.' });
                    return;
                  }
                  try {
                    await saveSetMut.mutateAsync({
                      name,
                      filter_state: encodeLRFilterState(filters),
                      question_ids: ids,
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
                })();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!saveDialogName.trim() || saveSetMut.isPending}
              onClick={async () => {
                const name = saveDialogName.trim();
                if (!name) return;
                const ids = selectedQids.size > 0
                  ? Array.from(selectedQids)
                  : (previewedQids ?? []);
                if (ids.length === 0) {
                  toast({ title: 'Nothing to save', description: 'Select or generate questions first.' });
                  return;
                }
                try {
                  await saveSetMut.mutateAsync({
                    name,
                    filter_state: encodeLRFilterState(filters),
                    question_ids: ids,
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
              }}
            >
              {saveSetMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
