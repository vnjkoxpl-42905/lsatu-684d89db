import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, X, Search, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypeDrillConfig } from '@/types/drill';
import type { QuestionManifest, LRQuestion } from '@/lib/questionLoader';
import { questionBank, CANONICAL_QTYPES, shuffleArray } from '@/lib/questionLoader';
import { FEATURE_FAMILIES } from '@/lib/questionFeatureFamilies';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface QuestionPickerProps {
  manifest: QuestionManifest;
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

interface FilterState {
  prepTests: number[];
  questionTypes: string[];
  reasoningTypes: string[];
  questionFeatures: string[];
  sections: number[];
  difficulties: number[];
  searchQuery: string;
  questionNumber: number | null; // Item D — direct jump-to-Q affordance
}

interface QuestionRow extends LRQuestion {
  attemptCount: number;
}

export function QuestionPicker({ manifest, onStartDrill, onCancel }: QuestionPickerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    prepTests: [],
    questionTypes: [],
    reasoningTypes: [],
    questionFeatures: [],
    sections: [],
    difficulties: [],
    searchQuery: '',
    questionNumber: null,
  });
  
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

  // Get all canonical question types with counts
  const allQTypesWithCounts = useMemo(() => {
    return CANONICAL_QTYPES.allTypes.map(type => ({
      type,
      count: manifest.byQType[type] || 0
    }));
  }, [manifest]);

  const allReasoningTypes = useMemo(
    () => Object.keys(manifest.byReasoningType || {}).sort(),
    [manifest],
  );
  const allQuestionFeatures = useMemo(
    () => Object.keys(manifest.byFeature || {}).sort(),
    [manifest],
  );
  const allSections = useMemo(
    () =>
      Object.keys(manifest.bySection || {})
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b),
    [manifest],
  );

  const allDifficulties = [1, 2, 3, 4, 5];
  
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
  
  // Get count for a question type (reflecting current filters except qtype itself)
  const getQTypeCount = (qtype: string): number => {
    let questions = questionBank.getAllQuestions().filter(q => q.qtype === qtype);
    if (filters.prepTests.length > 0) questions = questions.filter(q => filters.prepTests.includes(q.pt));
    if (filters.difficulties.length > 0) questions = questions.filter(q => filters.difficulties.includes(q.difficulty));
    if (filters.sections.length > 0) questions = questions.filter(q => filters.sections.includes(q.section));
    if (filters.reasoningTypes.length > 0) questions = questions.filter(q => (q.reasoningType || []).some(r => filters.reasoningTypes.includes(r)));
    if (filters.questionFeatures.length > 0) questions = questions.filter(q => (q.questionFeatures || []).some(f => filters.questionFeatures.includes(f)));
    return questions.length;
  };

  const getReasoningCount = (rtype: string): number => {
    let questions = questionBank.getAllQuestions().filter(q => (q.reasoningType || []).includes(rtype));
    if (filters.prepTests.length > 0) questions = questions.filter(q => filters.prepTests.includes(q.pt));
    if (filters.questionTypes.length > 0) questions = questions.filter(q => filters.questionTypes.includes(q.qtype));
    if (filters.difficulties.length > 0) questions = questions.filter(q => filters.difficulties.includes(q.difficulty));
    if (filters.sections.length > 0) questions = questions.filter(q => filters.sections.includes(q.section));
    if (filters.questionFeatures.length > 0) questions = questions.filter(q => (q.questionFeatures || []).some(f => filters.questionFeatures.includes(f)));
    return questions.length;
  };

  const getFeatureCount = (feature: string): number => {
    let questions = questionBank.getAllQuestions().filter(q => (q.questionFeatures || []).includes(feature));
    if (filters.prepTests.length > 0) questions = questions.filter(q => filters.prepTests.includes(q.pt));
    if (filters.questionTypes.length > 0) questions = questions.filter(q => filters.questionTypes.includes(q.qtype));
    if (filters.difficulties.length > 0) questions = questions.filter(q => filters.difficulties.includes(q.difficulty));
    if (filters.sections.length > 0) questions = questions.filter(q => filters.sections.includes(q.section));
    if (filters.reasoningTypes.length > 0) questions = questions.filter(q => (q.reasoningType || []).some(r => filters.reasoningTypes.includes(r)));
    return questions.length;
  };

  // Filter and paginate questions
  const { filteredQuestions, totalCount } = useMemo(() => {
    let questions = questionBank.getAllQuestions();
    
    // Apply filters
    if (filters.prepTests.length > 0) {
      questions = questions.filter(q => filters.prepTests.includes(q.pt));
    }

    if (filters.questionTypes.length > 0) {
      questions = questions.filter(q => filters.questionTypes.includes(q.qtype));
    }

    if (filters.reasoningTypes.length > 0) {
      questions = questions.filter(q => (q.reasoningType || []).some(r => filters.reasoningTypes.includes(r)));
    }

    if (filters.questionFeatures.length > 0) {
      questions = questions.filter(q => (q.questionFeatures || []).some(f => filters.questionFeatures.includes(f)));
    }

    if (filters.sections.length > 0) {
      questions = questions.filter(q => filters.sections.includes(q.section));
    }

    if (filters.difficulties.length > 0) {
      questions = questions.filter(q => filters.difficulties.includes(q.difficulty));
    }

    if (filters.searchQuery.trim()) {
      // Item E (Wave 4): full-text substring over stimulus + stem + qid.
      // Bank is fully in-browser, ~2500 questions × ~500 chars ≈ 1.25 MB.
      // Substring match completes well under 50ms even on mobile.
      const query = filters.searchQuery.toLowerCase();
      questions = questions.filter(q =>
        (q.stimulus ?? '').toLowerCase().includes(query) ||
        q.questionStem.toLowerCase().includes(query) ||
        q.qid.toLowerCase().includes(query)
      );
    }

    // Item D (Wave 4): Question Number filter. Combines with PT + Section
    // for a direct jump; alone it filters any qnum across the bank.
    if (filters.questionNumber !== null && Number.isFinite(filters.questionNumber)) {
      const target = filters.questionNumber;
      questions = questions.filter(q => q.qnum === target);
    }
    
    return {
      filteredQuestions: questions,
      totalCount: questions.length
    };
  }, [filters]);
  
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
    filters.questionNumber !== null;

  // Materialize a fresh preview from the current filter pool
  const handleGeneratePreview = () => {
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
      qtypeMix: qtypeMix || '—',
      difficulty: `Easy ${diffBucket.easy} · Med ${diffBucket.med} · Hard ${diffBucket.hard}`,
      ptRange:
        source.length === 0
          ? '—'
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

  // Generate-Preview button enabled when we have a usable filter pool and no selection
  const canGenerate =
    selectedQids.size === 0 && hasAnyFilter && filteredQuestions.length > 0;

  // Launch enabled if we have a manual selection OR an active preview
  const launchDisabled = selectedQids.size === 0 && !hasPreview;

  const generateHint =
    !hasAnyFilter
      ? 'Pick at least one filter or select questions.'
      : filteredQuestions.length === 0
      ? 'No questions match — adjust filters.'
      : null;

  // Get first 6-7 words of stem
  const getStemPreview = (stem: string): string => {
    const words = stem.split(' ').slice(0, 7);
    return words.join(' ') + (stem.split(' ').length > 7 ? '...' : '');
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Build a Set</h1>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
        <div className="flex flex-col min-h-0">
      {/* Filter Bar */}
      <Card className="p-4 mb-4">
        <div className="space-y-4">
          {/* Filter Controls
              Item D order: PrepTest → Section → Q# → Type → Reasoning →
              Features → Levels → Search. Reordered from the legacy layout
              (PT → Type → Reasoning → Features → Section → Levels → Search). */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* PrepTest Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  PrepTests {filters.prepTests.length > 0 && `(${filters.prepTests.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[400px] overflow-y-auto" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select PrepTests</div>
                  {allPTs.map(pt => (
                    <div key={pt} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pt-${pt}`}
                        checked={filters.prepTests.includes(pt)}
                        onCheckedChange={() => toggleFilter('prepTests', pt)}
                      />
                      <label htmlFor={`pt-${pt}`} className="text-sm cursor-pointer flex-1">
                        PT{pt} ({manifest.byPT[`PT${pt}`] || 0} questions)
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Section Filter (moved earlier per Item D) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Section {filters.sections.length > 0 && `(${filters.sections.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select Sections</div>
                  {allSections.map((s) => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${s}`}
                        checked={filters.sections.includes(s)}
                        onCheckedChange={() => toggleFilter('sections', s)}
                      />
                      <label htmlFor={`section-${s}`} className="text-sm cursor-pointer flex-1">
                        Section {s} ({manifest.bySection?.[s] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Question Number Filter (Item D — new direct-jump affordance).
                Combines with PT + Section to pinpoint a specific question;
                alone it filters every qnum across the bank. */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Q#</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={26}
                value={filters.questionNumber ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const parsed = raw === '' ? null : Number.parseInt(raw, 10);
                  setFilters((prev) => ({
                    ...prev,
                    questionNumber: parsed !== null && Number.isFinite(parsed) ? parsed : null,
                  }));
                  setCurrentPage(1);
                }}
                placeholder="14"
                className="h-9 w-20 px-2"
                aria-label="Question number"
              />
            </div>

            {/* Question Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Question Type {filters.questionTypes.length > 0 && `(${filters.questionTypes.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[500px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <div className="font-medium text-sm">Select Question Types</div>
                  
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
                          const count = getQTypeCount(qtype);
                          if (count === 0) return false;
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
                        const count = getQTypeCount(qtype);
                        if (count === 0) return false;
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
                            const count = getQTypeCount(qtype);
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
                <Button variant="outline" size="sm">
                  Reasoning Types {filters.reasoningTypes.length > 0 && `(${filters.reasoningTypes.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[500px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <div className="font-medium text-sm">Select Reasoning Types</div>
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
                        const count = getReasoningCount(rt);
                        if (count === 0) return false;
                        if (!reasoningSearch) return true;
                        return rt.toLowerCase().includes(reasoningSearch.toLowerCase());
                      })
                      .map((rt) => {
                        const count = getReasoningCount(rt);
                        return (
                          <div key={rt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`rt-${rt}`}
                              checked={filters.reasoningTypes.includes(rt)}
                              onCheckedChange={() => toggleFilter('reasoningTypes', rt)}
                            />
                            <label htmlFor={`rt-${rt}`} className="text-sm cursor-pointer flex-1">
                              {rt} <span className="text-muted-foreground">({count})</span>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Question Features Filter (Item F — family-grouped accordion).
                The 60 distinct feature tags are bucketed into 9 families
                (see src/lib/questionFeatureFamilies.ts). Each family is a
                collapsed disclosure; the family header shows the count of
                selected features in that family. Search filters across all
                families simultaneously. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Question Features {filters.questionFeatures.length > 0 && `(${filters.questionFeatures.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 max-h-[520px] flex flex-col z-[1000] bg-popover" align="start">
                <div className="space-y-3">
                  <div className="font-medium text-sm">Select Question Features</div>
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
                    {FEATURE_FAMILIES.map((family) => {
                      // Apply search + zero-count filtering family-locally
                      const visibleFeatures = family.features.filter((f) => {
                        const count = getFeatureCount(f);
                        if (count === 0) return false;
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
                              const count = getFeatureCount(f);
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
                <Button variant="outline" size="sm">
                  Levels {filters.difficulties.length > 0 && `(${filters.difficulties.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select Levels</div>
                  {allDifficulties.map(diff => (
                    <div key={diff} className="flex items-center space-x-2">
                      <Checkbox
                        id={`diff-${diff}`}
                        checked={filters.difficulties.includes(diff)}
                        onCheckedChange={() => toggleFilter('difficulties', diff)}
                      />
                      <label htmlFor={`diff-${diff}`} className="text-sm cursor-pointer flex-1">
                        Level {diff} ({manifest.byDifficulty[diff] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={filters.searchQuery}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
            
            {/* Page Size */}
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Show 10</SelectItem>
                <SelectItem value="25">Show 25</SelectItem>
                <SelectItem value="50">Show 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Active Filters */}
          {(filters.prepTests.length > 0 ||
            filters.questionTypes.length > 0 ||
            filters.reasoningTypes.length > 0 ||
            filters.questionFeatures.length > 0 ||
            filters.sections.length > 0 ||
            filters.difficulties.length > 0) && (
            <div className="flex flex-wrap gap-2">
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
                  {rt}
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
            </div>
          )}
        </div>
      </Card>
      
      {/* Item L (Wave 4) — empty state until at least one filter is applied
          OR rows are selected. Replaces the "25 of 3964" cold-start noise. */}
      {!hasAnyFilter && selectedQids.size === 0 ? (
        <Card className="mb-20 p-10 flex flex-col items-center text-center gap-4 border-dashed">
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold">Pick a filter to start building your set.</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The full bank is {totalCount.toLocaleString()} questions. Narrow it down by PT,
              type, or difficulty — or jump in with one of the shortcuts below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center pt-1">
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
      ) : (
        <>
      {/* Results Info */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {paginatedQuestions.length} of {totalCount} questions
        {selectedQids.size > 0 && ` • ${selectedQids.size} selected`}
      </div>

      {/* Results Table */}
      <Card className="flex-1 overflow-hidden flex flex-col mb-20">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
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
                <TableHead>Sec</TableHead>
                <TableHead>Q#</TableHead>
                <TableHead className="w-[300px]">Stem</TableHead>
                <TableHead className="w-[180px]">Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Attempts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No questions match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedQuestions.map((q) => (
                  <TableRow
                    key={q.qid}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedQids.has(q.qid) && "bg-primary/5"
                    )}
                    onClick={() => setDrawerQid(q.qid)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedQids.has(q.qid)}
                        onCheckedChange={() => toggleQuestion(q.qid)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{q.pt}</TableCell>
                    <TableCell>{q.section}</TableCell>
                    <TableCell>{q.qnum}</TableCell>
                    <TableCell className="text-sm">{getStemPreview(q.questionStem)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {q.qtype}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
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
                    <TableCell className="text-muted-foreground">{q.attemptCount}</TableCell>
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
      )}

        </div>

        {/* Right rail — sticky summary (lg+).
            Item G (Wave 4) — empty until a filter is applied, then renders
            a tiered hierarchy: tier 1 composition headline (largest, gold),
            tier 2 type + difficulty (body), tier 3 PT range + history (muted). */}
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <Card className="p-4 space-y-3">
              <div className="font-semibold text-sm">
                {summary.isFromPreview
                  ? 'Preview'
                  : summary.isFromSelection
                  ? 'Selection'
                  : 'Set Summary'}
              </div>

              {!hasAnyFilter && !summary.isFromSelection && !summary.isFromPreview ? (
                <div className="rounded-md bg-muted/30 px-3 py-4 text-xs text-muted-foreground leading-relaxed">
                  Pick a filter to start summarizing your set. The composition,
                  type mix, difficulty spread, and history will surface here.
                </div>
              ) : (
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
                    <SelectContent>
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
                      className="w-full"
                    >
                      {canGenerate
                        ? `Generate ${Math.min(setSize, filteredQuestions.length)}`
                        : 'Generate Preview'}
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

      {/* Sticky Selection Tray */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 lg:hidden">
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
                <SelectContent>
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
        <DialogContent>
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
                      filter_state: filters as unknown as Record<string, unknown>,
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
                    filter_state: filters as unknown as Record<string, unknown>,
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
