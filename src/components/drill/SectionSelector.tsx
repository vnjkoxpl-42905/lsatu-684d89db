import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import type { FullSectionConfig, TimerMode } from '@/types/drill';
// TimerMode used in handleStart to type the local `mode` variable
import { questionBank, type QuestionManifest } from '@/lib/questionLoader';
import SectionTimingPicker, {
  AccommodationNote,
  STANDARD_TIMING,
  type SectionTiming,
} from '@/components/drill/SectionTimingPicker';
import { loadAllIndexPassages } from '@/features/rc/lib/rcBank';
import {
  buildRcSections,
  formatRcSectionClock,
  rcSectionHref,
  rcSectionPreptests,
  rcSectionsForPreptest,
  type RcSection,
  type RcSectionPaceId,
} from '@/features/rc/lib/rcSections';

/**
 * Which kind of section a student is sitting. Logical Reasoning sections come
 * out of the LR question bank; Reading Comprehension sections are the four
 * published passages of one real section, started through the RC hub.
 */
export type SectionKind = 'lr' | 'rc';

interface SectionSelectorProps {
  manifest: QuestionManifest;
  onStartSection: (config: FullSectionConfig) => void;
  /** Starts an RC section by navigating to the link `rcSectionHref` builds. */
  onStartRcSection?: (href: string) => void;
  /**
   * Which kind the selector opens on. The drill hub's RC section passes 'rc'
   * so a student who has already thrown the LR/RC switch is not asked the same
   * question twice. Uncontrolled after mount — the selector's own tab strip
   * still switches it.
   */
  initialKind?: SectionKind;
  onCancel: () => void;
}

export function SectionSelector({
  manifest,
  onStartSection,
  onStartRcSection,
  initialKind = 'lr',
  onCancel,
}: SectionSelectorProps) {
  const { settings } = useUserSettings();
  const [kind, setKind] = useState<SectionKind>(initialKind);
  const [selectedPT, setSelectedPT] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [timing, setTiming] = useState<SectionTiming>(STANDARD_TIMING);

  // RC sections come from the passage index, which is small and separate from
  // the LR bank. Loaded once when the student switches to RC rather than on
  // mount, so an LR-only visit pays nothing for it.
  const [rcSections, setRcSections] = useState<RcSection[] | null>(null);
  const [rcError, setRcError] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== 'rc' || rcSections !== null) return;
    let cancelled = false;
    loadAllIndexPassages()
      .then((passages) => {
        if (!cancelled) setRcSections(buildRcSections(passages));
      })
      .catch(() => {
        if (!cancelled) setRcError('Reading Comprehension sections could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [kind, rcSections]);

  /**
   * The student's own standard clock, in minutes — 35 unless they carry extra
   * time. Every percentage on the timing control is a percentage of this, so
   * 100% means "my normal section" for everyone.
   */
  const baseMinutes =
    settings.defaultTimingMode === '52.5' ? 52.5 : settings.defaultTimingMode === '70' ? 70 : 35;

  const rcPTs = useMemo(() => (rcSections ? rcSectionPreptests(rcSections) : []), [rcSections]);
  const rcSectionsForPT = useMemo(
    () => (rcSections && selectedPT ? rcSectionsForPreptest(rcSections, selectedPT) : []),
    [rcSections, selectedPT],
  );
  const chosenRcSection = rcSectionsForPT.find((s) => s.section === selectedSection) ?? null;

  /**
   * RC's clock is a per-passage budget, so it can only run the three paces
   * that budget divides into. The timing control is restricted to those for
   * RC, which makes this mapping total rather than a silent rounding.
   */
  const rcPaceId: RcSectionPaceId =
    timing.mode === 'timed' && timing.percent >= 200
      ? 'double-time'
      : timing.mode === 'timed' && timing.percent >= 150
        ? 'time-and-a-half'
        : 'standard';

  const switchKind = (next: SectionKind) => {
    if (next === kind) return;
    // A PrepTest number means something different in each bank, and section 2 of
    // PT 110 is an LR section in one and does not exist in the other. Carrying
    // the choice across would start the wrong thing.
    setKind(next);
    setSelectedPT(null);
    setSelectedSection(null);
  };

  const lrPTs = Array.from(new Set(manifest.sections.map(s => s.pt))).sort((a, b) => a - b);
  const availablePTs = kind === 'rc' ? rcPTs : lrPTs;

  const availableSections = !selectedPT
    ? []
    : kind === 'rc'
      ? rcSectionsForPT.map((s) => s.section)
      : Array.from(
          new Set(
            manifest.sections
              .filter(s => s.pt === selectedPT)
              .map(s => s.section)
          )
        ).sort((a, b) => a - b);

  const handleStart = () => {
    if (kind === 'rc') {
      if (chosenRcSection && onStartRcSection) {
        onStartRcSection(rcSectionHref(chosenRcSection, rcPaceId));
      }
      return;
    }
    if (selectedPT && selectedSection) {
      let mode: TimerMode;
      let customMins: number | undefined;
      if (timing.mode === 'unlimited') {
        mode = 'unlimited';
      } else if (timing.percent === 100) {
        // 100% IS the student's standing default, whatever that is, so hand
        // the timer the same mode it would have got before this control existed.
        mode = settings.defaultTimingMode;
      } else {
        // Everything else is a derived clock. customMinutes is consumed as
        // `minutes * 60 * 1000`, so a fractional value is exact to the second
        // and 94% of 35:00 runs for 32:54 rather than a rounded 33:00.
        mode = 'custom';
        customMins = (baseMinutes * timing.percent) / 100;
      }
      onStartSection({
        pt: selectedPT,
        section: selectedSection,
        timer: {
          mode,
          customMinutes: customMins,
          isPaused: false,
          elapsedMs: 0,
          startedAt: Date.now(),
        },
      });
    }
  };

  /**
   * Questions in the section actually chosen, which is what turns a clock into
   * a pace. Undefined until a section is picked; the control then shows the
   * clock alone rather than a per-question figure for a section nobody chose.
   */
  const chosenQuestionCount = useMemo(() => {
    if (kind === 'rc') return chosenRcSection?.questionCount;
    if (!selectedPT || !selectedSection) return undefined;
    // Counted off the queue the runner will actually serve, NOT off
    // manifest.sections[].count. The manifest counts parsed rows while the bank
    // is keyed by qid, so a section with a duplicated qid manifests as 26 and
    // runs as 25 — and a per-question pace quoted off the wrong denominator is
    // a number the student paces against and misses by.
    return questionBank.getSection(selectedPT, selectedSection).length || undefined;
  }, [kind, chosenRcSection, selectedPT, selectedSection]);

  const isReadyToStart =
    kind === 'rc' ? Boolean(chosenRcSection) : Boolean(selectedPT && selectedSection);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      {/* Floating Panel */}
      <div className="relative max-w-2xl w-full">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent rounded-3xl blur-3xl" />
        
        {/* Main Panel */}
        <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold tracking-tight mb-3">
              Full Section
            </h1>
            <p className="text-muted-foreground/70 text-base leading-relaxed">
              Sit a real section, start to finish
            </p>
          </div>

          {/* Which section. Named for what the student sits, not for a data
              source: "Reading Comprehension" is four published passages in
              their published order, and "Logical Reasoning" is a whole LR
              section. */}
          <div className="space-y-3 mb-8">
            <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
              Section type
            </label>
            <div className="grid grid-cols-1 gap-2 p-1.5 bg-muted/30 rounded-xl sm:grid-cols-2 sm:gap-3" role="tablist">
              {([
                { key: 'lr', label: 'Logical Reasoning' },
                { key: 'rc', label: 'Reading Comprehension' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={kind === key}
                  onClick={() => switchKind(key)}
                  className={cn(
                    "px-4 py-3.5 rounded-lg text-sm font-semibold transition-all duration-150 sm:px-6",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                    kind === key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {kind === 'rc' && rcError && (
              <p className="text-sm text-muted-foreground/70">{rcError}</p>
            )}
            {kind === 'rc' && !rcError && rcSections === null && (
              <p className="text-sm text-muted-foreground/70">Loading sections…</p>
            )}
          </div>

          {/* PrepTest & Section Selectors */}
          <div className="space-y-8 mb-12">
            {/* PrepTest */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
                PrepTest
              </label>
              <Select
                value={selectedPT?.toString()}
                onValueChange={(val) => {
                  setSelectedPT(Number(val));
                  setSelectedSection(null);
                }}
              >
                <SelectTrigger 
                  className="h-14 text-base border-border/50 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-foreground/20"
                  id="pt-select"
                >
                  <SelectValue placeholder="Select PrepTest" />
                </SelectTrigger>
                <SelectContent className="drill-observatory-launcher-panel bg-background/95 backdrop-blur-xl border-border/50">
                  {availablePTs.map(pt => (
                    <SelectItem 
                      key={pt} 
                      value={pt.toString()}
                      className="text-base py-3 focus:bg-foreground/5"
                    >
                      PrepTest {pt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section (appears only after PT selected) */}
            {selectedPT && (
              <div 
                className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
                  Section
                </label>
                <Select
                  value={selectedSection?.toString()}
                  onValueChange={(val) => setSelectedSection(Number(val))}
                >
                  <SelectTrigger 
                    className="h-14 text-base border-border/50 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-foreground/20"
                    id="section-select"
                  >
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent className="drill-observatory-launcher-panel bg-background/95 backdrop-blur-xl border-border/50">
                    {availableSections.map(section => {
                      const rc = rcSectionsForPT.find((s) => s.section === section);
                      return (
                        <SelectItem
                          key={section}
                          value={section.toString()}
                          className="text-base py-3 focus:bg-foreground/5"
                        >
                          {rc
                            ? `Section ${section} · ${rc.passageCount} passages · ${rc.questionCount} question${rc.questionCount === 1 ? '' : 's'}${rc.fullLength ? '' : ' (short)'}`
                            : `Section ${section}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Timing Selector */}
          {/* The picker carries its own TIMING eyebrow, the way the PrepTest and
              Section fields carry theirs, so this block adds no second label. */}
          <div className="space-y-3 mb-12">
            <SectionTimingPicker
              value={timing}
              onChange={setTiming}
              baseMinutes={kind === 'rc' ? 35 : baseMinutes}
              questionCount={chosenQuestionCount}
              // RC runs a per-passage budget, so it offers only the three paces
              // that budget divides into — no speed training, no arbitrary clock.
              allowedPercents={kind === 'rc' ? [100, 150, 200] : undefined}
              labels={
                kind === 'rc'
                  ? { 100: 'Standard', 150: 'Time & a half', 200: 'Double time' }
                  : undefined
              }
              accommodationNote={kind === 'rc' ? undefined : <AccommodationNote baseMinutes={baseMinutes} />}
              className="h-14 border-border/50 bg-background/50 hover:bg-background/80"
              contentClassName="drill-observatory-launcher-panel bg-background/95 backdrop-blur-xl border-border/50"
            />

            {/* What the chosen section will actually run for. */}
            {kind === 'rc' && chosenRcSection && (
              <p className="text-sm text-muted-foreground/70">
                {chosenRcSection.passageCount} passages ·{' '}
                {chosenRcSection.questionCount} questions ·{' '}
                {formatRcSectionClock(chosenRcSection, rcPaceId)}
                {chosenRcSection.fullLength
                  ? ''
                  : '. Shorter than a real section, because questions without a published explanation cannot be drilled'}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-8" />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:underline"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleStart}
              disabled={!isReadyToStart}
              className={cn(
                "px-8 py-3.5 rounded-xl text-base font-semibold",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2",
                isReadyToStart
                  ? "bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              Start Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 
 * Alternative concept variants (not implemented):
 * 
 * 1. Split Hero Layout:
 *    - Large PrepTest selector (left 60%), timing controls (right 40%)
 *    - Vertical divider between sections
 *    - Dramatic typography scale difference
 * 
 * 2. Ultra-Clean Borderless:
 *    - No visible panel borders, just spacing
 *    - Floating controls with individual shadows
 *    - More whitespace, less containment
 */
