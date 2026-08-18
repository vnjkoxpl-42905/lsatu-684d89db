import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import type { FullSectionConfig, TimerMode } from '@/types/drill';
// TimerMode used in handleStart to type the local `mode` variable
import type { QuestionManifest } from '@/lib/questionLoader';
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
  onCancel: () => void;
}

export function SectionSelector({
  manifest,
  onStartSection,
  onStartRcSection,
  onCancel,
}: SectionSelectorProps) {
  const { settings } = useUserSettings();
  const [kind, setKind] = useState<SectionKind>('lr');
  const [selectedPT, setSelectedPT] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [timingOption, setTimingOption] = useState<'standard' | '1.5x' | '2x' | 'custom'>('standard');
  const [customMinutes, setCustomMinutes] = useState<number | ''>(35);

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

  const rcPTs = useMemo(() => (rcSections ? rcSectionPreptests(rcSections) : []), [rcSections]);
  const rcSectionsForPT = useMemo(
    () => (rcSections && selectedPT ? rcSectionsForPreptest(rcSections, selectedPT) : []),
    [rcSections, selectedPT],
  );
  const chosenRcSection = rcSectionsForPT.find((s) => s.section === selectedSection) ?? null;

  /** The LR timing control maps onto RC's paces one for one. */
  const rcPaceId: RcSectionPaceId =
    timingOption === '1.5x' ? 'time-and-a-half' : timingOption === '2x' ? 'double-time' : 'standard';

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
        onStartRcSection(
          rcSectionHref(chosenRcSection, timingOption === 'custom' ? 'standard' : rcPaceId),
        );
      }
      return;
    }
    if (selectedPT && selectedSection) {
      let mode: TimerMode;
      let customMins: number | undefined;
      if (timingOption === 'standard') {
        mode = settings.defaultTimingMode;
      } else if (timingOption === '1.5x') {
        mode = '52.5';
      } else if (timingOption === '2x') {
        mode = '70';
      } else {
        mode = 'custom';
        customMins = customMinutes === '' ? 35 : customMinutes;
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

  const getStandardTimingLabel = () => {
    const mode = settings.defaultTimingMode;
    if (mode === '35') return '35:00';
    if (mode === '52.5') return '52:30';
    if (mode === '70') return '70:00';
    return 'Stopwatch';
  };

  const isReadyToStart =
    kind === 'rc'
      ? Boolean(chosenRcSection)
      : Boolean(
          selectedPT &&
            selectedSection &&
            (timingOption !== 'custom' || (customMinutes !== '' && customMinutes > 0)),
        );

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
          <div className="space-y-4 mb-12">
            <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
              Timing
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/30 rounded-xl sm:gap-3">
              {(
                [
                  { key: 'standard', label: 'Standard', sub: kind === 'rc' ? '35:00' : getStandardTimingLabel() },
                  { key: '1.5x',     label: 'Time & a Half', sub: '52 min' },
                  { key: '2x',       label: 'Double Time',   sub: '70 min' },
                  // An RC section's clock is a per-passage budget, so an
                  // arbitrary total has nowhere to live. Offering it here and
                  // silently rounding it to Standard would be a lie.
                  ...(kind === 'rc' ? [] : [{ key: 'custom', label: 'Custom', sub: 'Set your time' } as const]),
                ] as const
              ).map(({ key, label, sub }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTimingOption(key)}
                  className={cn(
                    "relative px-2 py-4 rounded-lg text-sm font-medium transition-all duration-150 sm:px-6",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                    timingOption === key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="whitespace-nowrap text-[13px] font-semibold sm:text-sm">{label}</span>
                    <span className="whitespace-nowrap text-xs opacity-60">{sub}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* What the chosen section will actually run for. */}
            {kind === 'rc' && chosenRcSection && (
              <p className="text-sm text-muted-foreground/70">
                {chosenRcSection.passageCount} passages ·{' '}
                {chosenRcSection.questionCount} questions ·{' '}
                {formatRcSectionClock(chosenRcSection, rcPaceId)}
                {chosenRcSection.fullLength
                  ? ''
                  : ' — shorter than a real section, because questions without a published explanation cannot be drilled'}
              </p>
            )}

            {/* Custom Time Input */}
            {kind !== 'rc' && timingOption === 'custom' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                  className={cn(
                    "w-full h-12 px-4 text-base text-center rounded-lg",
                    "bg-background/50 border border-border/50",
                    "focus:outline-none focus:ring-2 focus:ring-foreground/20",
                    "transition-all duration-200"
                  )}
                  placeholder="Minutes"
                  aria-label="Custom minutes"
                />
              </div>
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
