import { useState, useEffect, useMemo, useRef } from 'react';
import './lr-builder.css';
import {
  parseSpec,
  parseExactRefs,
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
import { ArrowLeft, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypeDrillConfig } from '@/types/drill';
import type { QuestionManifest, LRQuestion } from '@/lib/questionLoader';
import { questionBank, CANONICAL_QTYPES } from '@/lib/questionLoader';
import { getFeatureFamiliesWithFallback } from '@/lib/questionFeatureFamilies';
import {
  createEmptyLRDrillFilters,
  filterLRQuestions,
  getLRDrillContextualOptionCounts,
  getVisibleLRDrillOptions,
  type LRDrillFilters,
} from '@/lib/lrDrillFilters';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
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
import { LrQuestionInspectList } from './LrQuestionInspectList';
import { composeLRDrillSet, getLRDrillSetAvailability } from '@/lib/lrDrillSetComposition';

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
const DIFFICULTY_GROUPS = [
  { label: 'Easy', values: [1, 2] },
  { label: 'Medium', values: [3] },
  { label: 'Hard', values: [4, 5] },
];
const difficultyLabel = (difficulty: number) => difficulty <= 2 ? 'Easy' : difficulty === 3 ? 'Medium' : 'Hard';

/**
 * Fixed column widths, border-box, each including the shared cell's 32px
 * horizontal padding. Sized against real content, not headers:
 * Type must clear a ~92px badge, so 128 is its floor, not a preference.
 */
const COL = {
  select: 48,
  pt: 84,
  section: 76,
  qnum: 52,
  type: 164,
  level: 100,
} as const;

const FIXED_COLS_WIDTH = Object.values(COL).reduce((sum, width) => sum + width, 0);
const STEM_MIN_WIDTH = 204;

/**
 * Narrowest the table may get before it scrolls rather than crushing the stem.
 */
const TABLE_MIN_WIDTH = FIXED_COLS_WIDTH + STEM_MIN_WIDTH;

const reasoningTypeLabel = (value: string): string => REASONING_TYPE_LABELS[value] ?? value;

function getSearchMode(value: string): 'text' | 'exact' | 'range' {
  const text = value.trim();
  if (/\.s\d+\.q\d+/i.test(text)) return 'exact';
  if (!/^pt\d+-s\d+-q\d+$/i.test(text) && /^(?:pt\s*\d|[sq]\s*\d)/i.test(text)) return 'range';
  return 'text';
}

export function QuestionPicker({ manifest, onStartDrill, onCancel }: QuestionPickerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(() => createEmptyLRDrillFilters());
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [specificQuestionsOpen, setSpecificQuestionsOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  
  // Selection state
  const [selectedQids, setSelectedQids] = useState<Set<string>>(new Set());
  const [searchIssues, setSearchIssues] = useState<SpecIssue[]>([]);

  // Item N (Wave 4) — Save set dialog (used by both selection and preview branches)
  const { save: saveSetMut } = useSavedSets();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Target set size for Generate
  const [setSize, setSetSize] = useState<number>(manifest.totalQuestions >= 10 ? 10 : 5);
  const setSizeOptions = [5, 10, 15, 25];

  // Materialized preview of a generated set (exact qids that would launch),
  // stamped with the composition it was drawn from. It is the active preview
  // only while that composition is unchanged, so a stale preview can never
  // launch even in the render before an effect would have cleared it.
  const [previewSnapshot, setPreviewSnapshot] = useState<{ key: string; qids: string[] } | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  /* Set synchronously on launch: a double click lands before the parent
     navigates away, and each call would start its own run. */
  const launchingRef = useRef(false);
  const viewQuestionsRef = useRef<HTMLButtonElement>(null);
  const pendingPreviewFocusRef = useRef(false);
  const pendingEditFocusRef = useRef(false);
  const questionSearchRef = useRef<HTMLInputElement>(null);

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
  const questionByAddress = useMemo(
    () => new Map(allQuestions.map((question) => [
      `${question.pt}.${question.section}.${question.qnum}`,
      question,
    ])),
    [allQuestions],
  );

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
  const addressNumbers = useMemo(() => {
    if (filters.prepTests.length !== 1 || filters.sections.length !== 1) return [];
    return Array.from(new Set(allQuestions
      .filter((question) => question.pt === filters.prepTests[0] && question.section === filters.sections[0])
      .map((question) => question.qnum))).sort((a, b) => a - b);
  }, [allQuestions, filters.prepTests, filters.sections]);
  const specVocabulary = useMemo<SpecVocabulary>(
    () => ({
      prepTests: allPTs,
      sections: allSections,
      maxQuestionNumber: allQuestions.reduce((max, question) => Math.max(max, question.qnum), 0) || 26,
    }),
    [allPTs, allSections, allQuestions],
  );
  const searchMode = getSearchMode(discoverySearch);
  const exactSearch = useMemo(
    () => searchMode === 'exact' ? parseExactRefs(discoverySearch) : null,
    [discoverySearch, searchMode],
  );

  const applySearchInput = () => {
    const text = discoverySearch.trim();
    if (!text || searchMode === 'text') return;
    if (searchMode === 'exact') {
      const parsed = parseExactRefs(text);
      if (!parsed.ok) {
        setSearchIssues(parsed.issues);
        return;
      }
      const missing = parsed.refs.filter((ref) => !questionByAddress.has(`${ref.pt}.${ref.section}.${ref.qnum}`));
      if (missing.length > 0) {
        setSearchIssues([{ kind: 'unknown-value', token: missing.map((ref) => ref.label).join(', '), message: 'Nothing was added. Check your question references.' }]);
        return;
      }
      setSelectedQids((previous) => new Set([
        ...previous,
        ...parsed.refs.map((ref) => questionByAddress.get(`${ref.pt}.${ref.section}.${ref.qnum}`)!.qid),
      ]));
      setDiscoverySearch('');
      setSearchIssues([]);
      return;
    }
    const result = parseSpec(text, specVocabulary);
    setSearchIssues(result.issues);
    if (!result.ok) return;
    setFilters((previous) => ({ ...previous, ...result.spec }));
    setCurrentPage(1);
    setDiscoverySearch('');
  };

  // Filter and paginate questions
  const filteredQuestions = useMemo(() => filterLRQuestions(allQuestions, filters), [allQuestions, filters]);
  const visibleQuestions = useMemo(
    () => searchMode === 'exact' && exactSearch?.ok
      ? exactSearch.refs.map((ref) => questionByAddress.get(`${ref.pt}.${ref.section}.${ref.qnum}`)).filter((question): question is LRQuestion => Boolean(question))
      : searchMode === 'range' || !discoverySearch.trim()
      ? filteredQuestions
      : filterLRQuestions(filteredQuestions, { ...createEmptyLRDrillFilters(), searchQuery: discoverySearch }),
    [filteredQuestions, discoverySearch, searchMode, exactSearch, questionByAddress],
  );
  const totalCount = visibleQuestions.length;
  
  // Paginated questions
  const paginatedQuestions: LRQuestion[] = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return visibleQuestions.slice(startIndex, endIndex);
  }, [visibleQuestions, currentPage, pageSize]);
  
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
    setDiscoverySearch('');
    setSearchIssues([]);
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
  
  const availability = getLRDrillSetAvailability(selectedQids, filteredQuestions, setSize);
  const canGenerate = !availability.exceedsSize && availability.missingCount === 0;
  const generateHint = availability.exceedsSize
    ? 'Increase the number of questions, or remove an added question.'
    : availability.missingCount > 0
    ? 'Choose fewer questions, or broaden your choices.'
    : null;
  
  const hasAnyFilter =
    filters.prepTests.length > 0 ||
    filters.questionTypes.length > 0 ||
    filters.reasoningTypes.length > 0 ||
    filters.questionFeatures.length > 0 ||
    filters.sections.length > 0 ||
    filters.difficulties.length > 0 ||
    discoverySearch.trim() !== '' ||
    filters.questionNumbers.length > 0;

  // Everything that decides which questions a preview may contain. Search is
  // discovery only and is deliberately absent.
  const compositionKey = JSON.stringify({ filters, setSize, picks: Array.from(selectedQids) });
  const previewedQids = previewSnapshot?.key === compositionKey ? previewSnapshot.qids : null;
  const previewIsStale = previewSnapshot !== null && previewedQids === null;

  // Materialize exact picks plus the remaining places from the filtered pool.
  const handleGeneratePreview = () => {
    const sample = composeLRDrillSet(
      selectedQids,
      allQuestions,
      filteredQuestions,
      setSize,
      questionBank.shuffleQuestions,
    );
    if (!sample) {
      toast({
        title: "Adjust your drill",
        description: generateHint ?? "Check your choices.",
        variant: "destructive",
      });
      return;
    }
    launchingRef.current = false;
    pendingPreviewFocusRef.current = true;
    setPreviewSnapshot({ key: compositionKey, qids: sample.map((q) => q.qid) });
  };

  useEffect(() => {
    if (specificQuestionsOpen && pendingEditFocusRef.current) {
      pendingEditFocusRef.current = false;
      questionSearchRef.current?.focus();
    }
    if (previewedQids && pendingPreviewFocusRef.current) {
      pendingPreviewFocusRef.current = false;
      viewQuestionsRef.current?.focus();
    }
  }, [previewedQids, specificQuestionsOpen]);

  // Convert the current preview into an editable selection (qids land in selectedQids)
  const handleEditPreview = () => {
    if (!previewedQids || previewedQids.length === 0) return;
    setSelectedQids(new Set(previewedQids));
    setPreviewSnapshot(null);
  };

  // The displayed preview is the launch contract. A filter or selection change
  // invalidates it, so nothing can silently resample after review.
  const handleLaunch = () => {
    if (launchingRef.current) return;
    const previewQuestions = previewedQids?.map((qid) => questionBank.getQuestion(qid)) ?? [];
    if (
      !canGenerate ||
      previewQuestions.length !== setSize ||
      previewQuestions.some((question) => !question) ||
      new Set(previewedQids).size !== previewQuestions.length
    ) {
      toast({ title: 'Preview your drill first', description: 'Preview your questions before starting.', variant: 'destructive' });
      return;
    }
    const questionsToUse = previewQuestions as LRQuestion[];
    launchingRef.current = true;
    
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
      searchQuery: undefined,
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
  
  // A changed composition closes the inspect dialog; the stale preview itself
  // is already inactive through `compositionKey`, and says so in the summary.
  useEffect(() => {
    setPreviewDialogOpen(false);
  }, [compositionKey]);

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
  
  // Before preview, these are candidate-pool statistics, not a promised mix.
  const selectedDifficultyLabels = DIFFICULTY_GROUPS.filter((group) => group.values.some((value) => filters.difficulties.includes(value))).map((group) => group.label);
  const hasPreview = !!previewedQids && previewedQids.length > 0;

  // Get first 6-7 words of stem
  const getStemPreview = (stem: string): string => {
    const words = stem.split(' ').slice(0, 7);
    return words.join(' ') + (stem.split(' ').length > 7 ? '...' : '');
  };
  
  return (
    <div className="lr-builder @container flex flex-col h-full">
      <header className="lr-builder-header">
        <h1>Build an LR drill</h1>
        <Button variant="ghost" onClick={onCancel} className="gap-2"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to practice</Button>
      </header>
      <div className="lr-builder-layout">
        <Card className="lr-builder-filters">
          <div className="lr-builder-section-heading">
            <h2>Choose your questions</h2>
            {hasAnyFilter && <Button variant="ghost" size="sm" onClick={clearAllFilters}>Reset options</Button>}
          </div>
          <div className="lr-builder-primary-filters">
            {/* Question Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" aria-label={`Question type${filters.questionTypes.length ? `: ${filters.questionTypes.join(', ')}` : ''}`} className="h-11 w-full min-w-0 justify-between px-4 text-sm">
                  {filters.questionTypes.length === 1 ? filters.questionTypes[0] : 'Question type'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel lr-builder-panel w-80 max-h-[500px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <FilterMenuHeader
                    title="Question types"
                    activeCount={filters.questionTypes.length}
                    onClear={() => clearArrayFilter('questionTypes')}
                  />

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search types…"
                      aria-label="Search question types"
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
                            return (
                              <div key={qtype} className="flex items-center space-x-2 pl-2">
                                <Checkbox
                                  id={`qtype-${qtype}`}
                                  checked={filters.questionTypes.includes(qtype)}
                                  onCheckedChange={() => toggleFilter('questionTypes', qtype)}
                                />
                                <label htmlFor={`qtype-${qtype}`} className="text-sm cursor-pointer flex-1">
                                  {qtype}
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
            
            {/* Difficulty Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" aria-label={`Difficulty${selectedDifficultyLabels.length ? `: ${selectedDifficultyLabels.join(', ')}` : ''}`} className="h-11 w-full min-w-0 justify-between px-4 text-sm">
                  {selectedDifficultyLabels.length === DIFFICULTY_GROUPS.length ? 'Any difficulty' : selectedDifficultyLabels.join(', ') || 'Difficulty'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel lr-builder-panel w-64" align="start">
                <div className="space-y-2">
                  <FilterMenuHeader
                    title="Difficulty"
                    activeCount={filters.difficulties.length}
                    onClear={() => clearArrayFilter('difficulties')}
                  />
                  {DIFFICULTY_GROUPS.filter((group) => group.values.some((value) => filters.difficulties.includes(value) || (contextualCounts.difficulties.get(value) ?? 0) > 0)).map((group) => {
                    const checked = group.values.every((value) => filters.difficulties.includes(value));
                    return (
                      <div key={group.label} className="flex items-center space-x-2">
                        <Checkbox id={`difficulty-${group.label.toLowerCase()}`} checked={checked} onCheckedChange={() => {
                          setFilters((previous) => ({ ...previous, difficulties: checked ? previous.difficulties.filter((value) => !group.values.includes(value)) : [...new Set([...previous.difficulties, ...group.values])] }));
                          setCurrentPage(1);
                        }} />
                        <label htmlFor={`difficulty-${group.label.toLowerCase()}`} className="text-sm cursor-pointer flex-1">{group.label}</label>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <button type="button" className="lr-builder-disclosure" aria-expanded={moreFiltersOpen} aria-controls="lr-more-filters" onClick={() => setMoreFiltersOpen((open) => !open)}>
            <span>More options</span><ChevronDown className="h-4 w-4" aria-hidden />
          </button>
          {moreFiltersOpen && <div id="lr-more-filters" className="lr-builder-primary-filters">
            {/* Reasoning Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-sm">
                  Reasoning
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel lr-builder-panel w-80 max-h-[500px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <FilterMenuHeader
                    title="Reasoning"
                    activeCount={filters.reasoningTypes.length}
                    onClear={() => clearArrayFilter('reasoningTypes')}
                  />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reasoning…"
                      aria-label="Search reasoning"
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
                        return (
                          <div key={rt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`rt-${rt}`}
                              checked={filters.reasoningTypes.includes(rt)}
                              onCheckedChange={() => toggleFilter('reasoningTypes', rt)}
                            />
                            <label htmlFor={`rt-${rt}`} className="text-sm cursor-pointer flex-1">
                              {reasoningTypeLabel(rt)}
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
                <Button variant="outline" className="h-11 w-full min-w-0 justify-between px-4 text-sm">
                  Question features
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel lr-builder-panel w-96 max-h-[520px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <FilterMenuHeader
                    title="Question features"
                    activeCount={filters.questionFeatures.length}
                    onClear={() => clearArrayFilter('questionFeatures')}
                  />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search features…"
                      aria-label="Search question features"
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
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open/family:rotate-180" />
                          </summary>
                          <div className="space-y-1.5 px-3 pt-1 pb-2">
                            {visibleFeatures.map((f) => {
                              return (
                                <div key={f} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`feat-${f}`}
                                    checked={filters.questionFeatures.includes(f)}
                                    onCheckedChange={() => toggleFilter('questionFeatures', f)}
                                  />
                                  <label htmlFor={`feat-${f}`} className="text-sm cursor-pointer flex-1">
                                    {f}
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

          </div>}
          {/* Additional choices remain removable without duplicating primary controls. */}
          {(filters.prepTests.length > 0 || filters.reasoningTypes.length > 0 || filters.questionFeatures.length > 0 || filters.sections.length > 0 || filters.questionNumbers.length > 0) && (
            <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-4">
              {filters.prepTests.map(pt => (
                <Badge key={`pt-${pt}`} variant="secondary" className="gap-1">
                  PT{pt}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('prepTests', pt)} />
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

            </div>
          )}        </Card>
        <aside className="lr-builder-summary" data-testid="summary-rail" aria-label="Your drill">
          <Card className="lr-builder-summary-card">
            <h2>Your drill{hasPreview ? ' is ready' : ''}</h2>
            <div className="lr-builder-count">
              <label htmlFor="drill-set-size">Questions</label>
              <Select value={setSize.toString()} onValueChange={(value) => setSetSize(Number(value))}>
                <SelectTrigger id="drill-set-size" className="w-24" aria-label="Number of questions"><SelectValue /></SelectTrigger>
                <SelectContent className="drill-observatory-launcher-panel lr-builder-panel">
                  {setSizeOptions.map((number) => <SelectItem key={number} value={String(number)}>{number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedQids.size > 0 && <Button variant="ghost" size="sm" onClick={clearSelection}>Clear added questions</Button>}
            {previewIsStale && <p className="lr-builder-note" role="status">Your choices changed. Preview your drill again before starting.</p>}
            {hasPreview ? (
              <div className="lr-builder-actions">
                <Button onClick={handleLaunch} className="w-full">Start drill</Button>
                <Button ref={viewQuestionsRef} type="button" variant="outline" className="w-full" onClick={() => setPreviewDialogOpen(true)}>View questions</Button>
                <div className="lr-builder-secondary-actions">
                  <Button variant="ghost" onClick={handleGeneratePreview}>Choose again</Button>
                  <Button variant="ghost" onClick={() => { setSaveDialogName(''); setSaveDialogOpen(true); }}><Bookmark className="h-4 w-4" aria-hidden /> Save set</Button>
                </div>
                <Button variant="ghost" onClick={() => { pendingEditFocusRef.current = true; handleEditPreview(); setSpecificQuestionsOpen(true); }}>Edit questions</Button>
              </div>
            ) : <Button onClick={handleGeneratePreview} disabled={!canGenerate} className="w-full">Preview drill</Button>}
            {generateHint && <p className="lr-builder-note" role="status">{generateHint}</p>}
          </Card>
        </aside>
        <section className="lr-builder-specific">
          <button type="button" className="lr-builder-disclosure" aria-expanded={specificQuestionsOpen} aria-controls="lr-specific-questions" onClick={() => setSpecificQuestionsOpen((open) => !open)}>
            <span>Add specific questions</span><ChevronDown className="h-4 w-4" aria-hidden />
          </button>
          {specificQuestionsOpen && <div id="lr-specific-questions" className="lr-builder-specific-content">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Find questions</h2>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-white/65" aria-hidden />
                <Input
                  ref={questionSearchRef}
                  type="search"
                  placeholder="Find a question"
                  value={discoverySearch}
                  onChange={(event) => {
                    setDiscoverySearch(event.target.value);
                    setSearchIssues([]);
                    setCurrentPage(1);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchMode !== 'text') {
                      event.preventDefault();
                      applySearchInput();
                    }
                  }}
                  className="drill-setup-search h-11 pl-11 pr-11 text-sm"
                  aria-label="Find questions by text or PrepTest reference"
                  aria-invalid={searchIssues.length > 0}
                  aria-describedby={searchIssues.length > 0 ? 'search-errors' : undefined}
                />
                {discoverySearch && (
                  <button
                    type="button"
                    className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-full text-white/75 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    onClick={() => { setDiscoverySearch(''); setSearchIssues([]); }}
                    aria-label="Clear question search"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              {searchMode !== 'text' && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{searchMode === 'exact' ? 'Add these exact questions to your set.' : 'Use this selection.'}</span>
                  <Button type="button" variant="outline" size="sm" onClick={applySearchInput}>
                    {searchMode === 'exact'
                      ? exactSearch?.ok && exactSearch.refs.length === 1 ? 'Add question' : 'Add questions'
                      : 'Apply choices'}
                  </Button>
                </div>
              )}
              {searchIssues.length > 0 && (
                <div id="search-errors" role="alert" className="space-y-1 text-xs text-destructive">
                  <p>Nothing was added. Check the PrepTest, section and question numbers.</p>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground">Search by words or choose a PrepTest and section, then add a question.</p>
              <div className="grid min-w-0 gap-2 sm:grid-cols-3">
            {/* PrepTest Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" aria-label={`PrepTest selector, ${filters.prepTests.length ? filters.prepTests.join(', ') : 'any'}`} className="h-11 w-full min-w-0 justify-between px-4 text-sm">
                  {filters.prepTests.length === 1 ? `PT ${filters.prepTests[0]}` : 'PrepTests'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              {/* A chip grid, not a checkbox column. Sixty PTs in a 400px-tall
                  scrolling list showed about ten at a time, so picking a spread
                  meant scrolling and hunting. Five across fits the whole bank
                  in one glance. */}
              <PopoverContent className="drill-observatory-launcher-panel lr-builder-panel w-[344px]" align="start">
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
                          aria-label={`PrepTest ${pt}`}
                          title={`PrepTest ${pt}`}
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
                <Button variant="outline" aria-label={`Section selector, ${filters.sections.length ? filters.sections.join(', ') : 'any'}`} className="h-11 w-full min-w-0 justify-between px-4 text-sm">
                  {filters.sections.length === 1 ? `Section ${filters.sections[0]}` : 'Sections'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="drill-observatory-launcher-panel lr-builder-panel w-56" align="start">
                <div className="space-y-2">
                  <FilterMenuHeader
                    title="Sections"
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
                        Section {s}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Select
              value=""
              disabled={addressNumbers.length === 0}
              onValueChange={(value) => {
                const question = questionByAddress.get(`${filters.prepTests[0]}.${filters.sections[0]}.${value}`);
                if (question) setSelectedQids((previous) => new Set([...previous, question.qid]));
              }}
            >
              <SelectTrigger className="h-11 w-full text-sm" aria-label="Question number">
                <SelectValue placeholder="Question number" />
              </SelectTrigger>
              <SelectContent className="drill-observatory-launcher-panel lr-builder-panel">
                {addressNumbers.map((number) => (
                  <SelectItem key={number} value={String(number)}>Question {number}</SelectItem>
                ))}
              </SelectContent>
            </Select>

              </div>
              {selectedQids.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Questions added to the set">
                  {Array.from(selectedQids).map((qid) => {
                    const question = questionBank.getQuestion(qid);
                    if (!question) return null;
                    return (
                      <button key={qid} type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground" onClick={() => toggleQuestion(qid)} aria-label={`Remove PT${question.pt} section ${question.section} question ${question.qnum}`}>
                        PT {question.pt} · Section {question.section} · Question {question.qnum}<X className="h-3 w-3" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>


      <h2 className="mb-3">Questions</h2>

      {/* Results Table */}
      <Card className="flex-1 overflow-hidden flex flex-col mb-0">
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
              <col style={{ width: COL.section }} />
              <col style={{ width: COL.qnum }} />
              <col style={{ minWidth: STEM_MIN_WIDTH }} />
              <col style={{ width: COL.type }} />
              <col style={{ width: COL.level }} />
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
                <TableHead>PrepTest</TableHead>
                {/* Split on 2026-10-29 so each is labelled like its neighbours.
                    16px padding (not the cell's 32) keeps the pair to 128px. */}
                <TableHead className="px-2">Section</TableHead>
                <TableHead className="px-2">Q#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead
                  
                >
                  Difficulty
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestions.length === 0 ? (
                <TableRow>
                  {/* Seven columns. Under `table-layout: fixed` a colSpan
                      short of the real count would skew every width. */}
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {discoverySearch.trim() ? 'No questions match this search' : 'No questions match your choices'}
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
                    <TableCell className="px-2 py-0 tabular-nums">{q.section}</TableCell>
                    <TableCell className="px-2 py-0 tabular-nums">{q.qnum}</TableCell>
                    <TableCell className="py-0 text-sm">
                      {/* The column is the clamp now; a fixed max-width here
                          would stop the stem growing with the table. */}
                      <button type="button" className="block w-full truncate text-left" title={q.questionStem} aria-label={`Preview PT ${q.pt} section ${q.section} question ${q.qnum}`} onClick={(event) => { event.stopPropagation(); setDrawerQid(q.qid); }}>
                        {getStemPreview(q.questionStem)}
                      </button>
                    </TableCell>
                    <TableCell className="py-0">
                      <Badge
                        variant="outline"
                        title={q.qtype}
                        className="max-w-full px-2 py-1 text-xs font-normal whitespace-normal leading-snug"
                      >
                        {q.qtype}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-0">
                      <Badge
                        variant="secondary"
                        title={difficultyLabel(q.difficulty)}
                        className="h-6 px-2 text-[11px] font-medium"
                      >
                        {difficultyLabel(q.difficulty)}
                      </Badge>
                    </TableCell>
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
              Page {currentPage}
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
          </div>}
        </section>
      </div>
      {/* Question Preview Drawer */}
      <Sheet open={!!drawerQid} onOpenChange={(open) => !open && setDrawerQid(null)}>
        <SheetContent side="right" className="drill-observatory-launcher-panel lr-builder-panel w-full sm:max-w-[480px] overflow-y-auto">
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
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base">
                    PT {q.pt} · Section {q.section} · Question {q.qnum}
                  </SheetTitle>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline">{q.qtype}</Badge>
                    <Badge variant="secondary">{difficultyLabel(q.difficulty)}</Badge>
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
                      Answer choices
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

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); viewQuestionsRef.current?.focus(); }} className="drill-observatory-launcher-panel lr-builder-panel max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col [&>button]:right-1 [&>button]:top-1 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
          <DialogHeader>
            <DialogTitle>Your drill</DialogTitle>
            <DialogDescription className="sr-only">
              Questions in this drill.
            </DialogDescription>
          </DialogHeader>
          {/* The list keeps a floor so large text or a short screen cannot
              squeeze it to nothing behind the header and footer; past that
              floor the dialog itself scrolls. */}
          <div className="flex min-h-[10rem] flex-1 flex-col">
            <LrQuestionInspectList qids={previewedQids ?? []} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewDialogOpen(false)}>Back to setup</Button>
            <Button type="button" onClick={handleLaunch}>Start drill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item N (Wave 4) — Save Set dialog. Captures a name + persists the
          current set's question_ids + filter_state to user_saved_sets via
          the savedSets service. Saved sets surface in /practice/sets. */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="drill-observatory-launcher-panel lr-builder-panel">
          <DialogHeader>
            <DialogTitle>Save this set</DialogTitle>
            <DialogDescription>
              Name this set to find it in My Sets.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={saveDialogName}
            onChange={(e) => setSaveDialogName(e.target.value)}
            placeholder="e.g. Hard flaw questions"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void (async () => {
                  const name = saveDialogName.trim();
                  if (!name) return;
                  const ids = previewedQids ?? [];
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
                  } catch {
                    toast({
                      title: "Couldn't save set",
                      description: 'Please try again.',
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
                const ids = previewedQids ?? [];
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
                } catch {
                  toast({
                    title: "Couldn't save set",
                    description: 'Please try again.',
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
