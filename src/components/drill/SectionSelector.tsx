import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrepTestCombobox } from '@/components/testing/PrepTestCombobox';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import type { FullSectionConfig, TimerMode } from '@/types/drill';
// TimerMode used in handleStart to type the local `mode` variable
import { questionBank, type QuestionManifest } from '@/lib/questionLoader';
import { useClassId } from '@/hooks/useClassId';
import {
  buildSectionFreshness,
  fetchAnsweredQids,
  matchesFreshness,
  sectionKey,
  type FreshnessFilter,
  type SectionFreshness,
} from '@/lib/sectionFreshness';
import SectionTimingPicker, {
  AccommodationNote,
  STANDARD_TIMING,
  type SectionTiming,
} from '@/components/drill/SectionTimingPicker';
import { loadAllIndexPassages } from '@/features/rc/lib/rcBank';
import {
  buildRcSections,
  fetchRcSectionFreshness,
  rcProtectedPaceForTiming,
  rcSectionHref,
  type RcSection,
  type RcSectionPaceId,
} from '@/features/rc/lib/rcSections';
import {
  manualSectionCoverage,
  manualSectionsEnabled,
  newManualSectionHref,
} from '@/lib/timedSectionAdoption';

/**
 * Which kind of section a student is sitting. Logical Reasoning sections come
 * out of the LR question bank; Reading Comprehension sections are the four
 * published passages of one real section, started through the RC hub.
 */
export type SectionKind = 'lr' | 'rc';

interface SectionSelectorProps {
  manifest: QuestionManifest;
  onStartSection: (config: FullSectionConfig) => void;
  /** Starts an RC section by navigating to the link `rcSectionHref` or `newManualSectionHref` builds. */
  onStartRcSection?: (href: string) => void;
  /**
   * Which kind the selector opens on. The drill hub's RC section passes 'rc'
   * so a student who has already thrown the LR/RC switch is not asked the same
   * question twice. Uncontrolled after mount: the selector's own tab strip
   * still switches it.
   */
  initialKind?: SectionKind;
  /** Optional initial timing state for testing or pre-selected pace. */
  initialTiming?: SectionTiming;
  onCancel: () => void;
}

export function SectionSelector({
  manifest,
  onStartSection,
  onStartRcSection,
  initialKind = 'lr',
  initialTiming,
  onCancel,
}: SectionSelectorProps) {
  const { settings, profileTimingStatus } = useUserSettings();
  const [kind, setKind] = useState<SectionKind>(initialKind);
  const [selectedPT, setSelectedPT] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [timing, setTiming] = useState<SectionTiming>(() => initialTiming ?? (settings.defaultTimingMode === 'unlimited' ? { mode: 'unlimited' } : STANDARD_TIMING));
  const timingTouched = useRef(false);
  useEffect(() => {
    if (!initialTiming && !timingTouched.current) setTiming(settings.defaultTimingMode === 'unlimited' ? { mode: 'unlimited' } : STANDARD_TIMING);
  }, [initialTiming, settings.defaultTimingMode]);
  // A PrepTest is a consumable, so the first question is which sections are
  // still unspent. Defaults to Fresh, which is what a student wants nine times
  // in ten and the only state that gives a clean read on where they stand.
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessFilter>('fresh');
  const [freshness, setFreshness] = useState<Map<string, SectionFreshness> | null>(null);
  const [freshnessLoading, setFreshnessLoading] = useState(true);
  const [freshnessError, setFreshnessError] = useState<string | null>(null);

  // RC sections come from the passage index, which is small and separate from
  // the LR bank. Loaded once when the student switches to RC rather than on
  // mount, so an LR-only visit pays nothing for it.
  const [rcSections, setRcSections] = useState<RcSection[] | null>(null);
  const [rcFreshness, setRcFreshness] = useState<Map<string, SectionFreshness> | null>(null);
  const [rcFreshnessLoading, setRcFreshnessLoading] = useState(false);
  const [rcFreshnessError, setRcFreshnessError] = useState<string | null>(null);
  const [rcError, setRcError] = useState<string | null>(null);
  // Whether an RC start goes through the protected section preflight. The
  // "clock begins after Start section" copy is only true on that path.
  const [rcManualEnabled, setRcManualEnabled] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (kind !== 'rc') return;
    let cancelled = false;
    manualSectionsEnabled()
      .then((enabled) => {
        if (!cancelled) setRcManualEnabled(enabled);
      })
      .catch(() => {
        if (!cancelled) setRcManualEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    if (kind !== 'rc' || rcSections !== null) return;
    let cancelled = false;
    setRcFreshnessLoading(true);
    loadAllIndexPassages()
      .then((passages) => {
        if (cancelled) return;
        const built = buildRcSections(passages);
        return fetchRcSectionFreshness(built, passages)
          .then((freshMap) => {
            if (cancelled) return;
            setRcFreshness(freshMap);
            setRcFreshnessError(null);
            setRcFreshnessLoading(false);
            setRcSections(built);
          })
          .catch(() => {
            if (cancelled) return;
            setRcFreshness(null);
            setRcFreshnessError("Couldn't check which sections you've already worked.");
            setRcFreshnessLoading(false);
            setRcSections(built);
          });
      })
      .catch(() => {
        if (!cancelled) {
          setRcError('Reading Comprehension sections could not be loaded.');
          setRcFreshnessLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, rcSections]);

  /**
   * The student's own standard clock, in minutes (35 unless they carry extra
   * time). Every percentage on the timing control is a percentage of this, so
   * 100% means "my normal section" for everyone.
   */
  const baseMinutes =
    settings.defaultTimingMode === '52.5' ? 52.5 : settings.defaultTimingMode === '70' ? 70 : 35;

  /**
   * Load every question the student has answered in LR and fold it into
   * per-section freshness. RC freshness is computed separately via T01's
   * passage-attempt and timed-sitting exposure rules.
   */
  const { classId, loading: classIdLoading } = useClassId();
  useEffect(() => {
    if (classIdLoading) return;
    if (!classId) {
      // Signed out or unprovisioned: no history to read, so claim none.
      setFreshness(null);
      setFreshnessLoading(false);
      return;
    }
    let cancelled = false;
    setFreshnessLoading(true);
    fetchAnsweredQids(classId)
      .then((answered) => {
        if (cancelled) return;
        const sections = manifest.sections.map((s) => ({
          pt: s.pt,
          section: s.section,
          qids: questionBank.getSection(s.pt, s.section).map((q) => q.qid),
        }));
        setFreshness(buildSectionFreshness(sections, answered));
        setFreshnessError(null);
      })
      .catch(() => {
        if (cancelled) return;
        // Say so rather than showing everything as fresh. An unknown section
        // still passes every filter, so nothing becomes unreachable.
        setFreshness(null);
        setFreshnessError("Couldn't check which sections you've already worked.");
      })
      .finally(() => {
        if (!cancelled) setFreshnessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, classIdLoading, manifest]);

  const chosenRcSection = useMemo(
    () =>
      rcSections && selectedPT && selectedSection
        ? (rcSections.find((s) => s.preptest === selectedPT && s.section === selectedSection) ??
          null)
        : null,
    [rcSections, selectedPT, selectedSection],
  );

  /**
   * RC's clock is a per-passage budget, so it can only run the three paces
   * that budget divides into. The timing control is restricted to those for
   * RC, which makes this mapping total rather than a silent rounding.
   */
  const rcPaceId: RcSectionPaceId =
    timing.mode === 'unlimited' ? 'untimed' : baseMinutes * timing.percent / 100 >= 70 - .01
      ? 'double-time'
      : baseMinutes * timing.percent / 100 >= 52.5 - .01
        ? 'time-and-a-half'
        : 'standard';
  const rcPercents = [35, 52.5, 70].map(minutes => minutes / baseMinutes * 100);
  const rcTimingLabels = Object.fromEntries(rcPercents.map((percent, index) => [percent, ['Standard', 'Time and a half', 'Double time'][index]]));

  const switchKind = (next: SectionKind) => {
    if (next === kind) return;
    // A PrepTest number means something different in each bank, and section 2 of
    // PT 110 is an LR section in one and does not exist in the other. Carrying
    // the choice across would start the wrong thing.
    setKind(next);
    setSelectedPT(null);
    setSelectedSection(null);
  };

  // LR sections surviving the freshness filter. A section whose freshness is
  // unknown survives both filters, so a failed history read narrows nothing.
  const lrSectionsInFilter = useMemo(
    () =>
      manifest.sections.filter((s) =>
        matchesFreshness(freshness?.get(sectionKey(s.pt, s.section)), freshnessFilter),
      ),
    [manifest, freshness, freshnessFilter],
  );

  // RC sections surviving the freshness filter. When rcFreshness is null
  // (signed out or history check failed), matchesFreshness(undefined, ...)
  // returns true so every RC section stays reachable.
  const rcSectionsInFilter = useMemo(
    () =>
      (rcSections ?? []).filter((s) =>
        matchesFreshness(rcFreshness?.get(sectionKey(s.preptest, s.section)), freshnessFilter),
      ),
    [rcSections, rcFreshness, freshnessFilter],
  );

  /**
   * Every section that can be started right now, as one flat list, newest
   * first. A PrepTest picker feeding a Section picker made the student walk an
   * index we already hold the answer to: the Status filter has already decided
   * what is offered, so the only real question left is which of these to sit.
   * Newest first because the recent PrepTests are the ones nearest test day.
   */
  const pickableSections = useMemo(() => {
    const rows =
      kind === 'rc'
        ? rcSectionsInFilter.map((s) => ({ pt: s.preptest, section: s.section }))
        : lrSectionsInFilter.map((s) => ({ pt: s.pt, section: s.section }));
    return rows.sort((a, b) => b.pt - a.pt || a.section - b.section);
  }, [kind, rcSectionsInFilter, lrSectionsInFilter]);

  /**
   * The PrepTest step. A student thinks in PrepTests first and a section
   * number second, so the pickable sections are rolled up to the tests that
   * still have something in them, newest first.
   */
  const pickablePTs = useMemo(
    () => [...new Set(pickableSections.map((s) => s.pt))],
    [pickableSections],
  );

  /** Sections of the chosen PrepTest, in published order. */
  const ptOptions = useMemo(() => pickablePTs.map((pt) => ({ pt })), [pickablePTs]);

  const sectionsForPT = useMemo(
    () => pickableSections.filter((s) => s.pt === selectedPT).map((s) => s.section),
    [pickableSections, selectedPT],
  );

  // Flipping the filter can strand a choice that no longer qualifies. Drop it
  // rather than leaving a trigger naming a section the list no longer offers.
  useEffect(() => {
    if (!selectedPT) return;
    if (!pickableSections.some((s) => s.pt === selectedPT)) {
      setSelectedPT(null);
      setSelectedSection(null);
      return;
    }
    if (!selectedSection) return;
    const stillOffered = pickableSections.some(
      (s) => s.pt === selectedPT && s.section === selectedSection,
    );
    if (!stillOffered) setSelectedSection(null);
  }, [pickableSections, selectedPT, selectedSection]);

  const handleStart = async () => {
    if (profileTimingStatus === 'loading' && !initialTiming && !timingTouched.current) return;
    if (kind === 'rc') {
      if (chosenRcSection && onStartRcSection && !starting) {
        setStarting(true);
        try {
          const protectedPace = rcProtectedPaceForTiming(timing.mode === 'unlimited' ? timing : {
            mode: 'timed', percent: Math.round(timing.percent * baseMinutes / 35 * 1e6) / 1e6,
          });
          const canUseManualSection =
            protectedPace !== null &&
            manualSectionCoverage('rc', chosenRcSection.preptest, chosenRcSection.section) &&
            (await manualSectionsEnabled());
          const href =
            canUseManualSection && protectedPace
              ? newManualSectionHref(
                  'rc',
                  chosenRcSection.preptest,
                  chosenRcSection.section,
                  protectedPace,
                )
              : rcSectionHref(chosenRcSection, rcPaceId);
          onStartRcSection(href);
        } finally {
          setStarting(false);
        }
      }
      return;
    }
    if (selectedPT && selectedSection) {
      let mode: TimerMode;
      let customMins: number | undefined;
      if (timing.mode === 'unlimited') {
        mode = 'unlimited';
      } else if (timing.percent === 100) {
        // A timed choice always uses the displayed numeric base. In particular,
        // choosing Standard after an Unlimited profile default must start 35:00.
        mode = baseMinutes === 52.5 ? '52.5' : baseMinutes === 70 ? '70' : '35';
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
    // Read from the bank, the same call the runner makes, rather than from
    // manifest.sections[].count — one source for the denominator means the
    // quoted pace and the served section cannot describe different sections.
    // (The runner can still serve fewer: a full section is currently passed
    // through the question-pool dedupe filter, which drops questions the
    // student has already seen. That is a bug in the runner, not a reason to
    // quote a pace for anything other than the real published section.)
    return questionBank.getSection(selectedPT, selectedSection).length || undefined;
  }, [kind, chosenRcSection, selectedPT, selectedSection]);

  const isReadyToStart =
    kind === 'rc' ? Boolean(chosenRcSection) : Boolean(selectedPT && selectedSection);

  // Only an RC start that will really open the preflight screen can promise
  // that the clock waits for "Start section". LR and the live-drill fallback
  // keep the older wording because their clock starts as soon as they open.
  const clockWaitsForStart =
    kind === 'rc' &&
    rcManualEnabled === true &&
    chosenRcSection != null &&
    rcProtectedPaceForTiming(timing.mode === 'unlimited' ? timing : {
      mode: 'timed',
      percent: Math.round(timing.percent * baseMinutes / 35 * 1e6) / 1e6,
    }) !== null &&
    manualSectionCoverage('rc', chosenRcSection.preptest, chosenRcSection.section);

  return (
    // No wrapper card and no header. The Testing Centre's panel is the card,
    // and its door already said "Take a section / One real LR or RC section
    // from an official PrepTest" — a heading here only said it again.
    <div className="testing-section-launcher">
      {/* Which section. Named for what the student sits, not for a data
          source: "Reading Comprehension" is four published passages in
          their published order, and "Logical Reasoning" is a whole LR
          section. */}
      <div className="space-y-3 mb-8">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          id="section-kind-label"
        >
          Section type
        </span>
        {/* Two toggle buttons in a labelled group, not role="tab". A tab
            must point at a tabpanel through aria-controls and there is
            none; a radiogroup owes the user arrow-key navigation this
            never implemented. Pressed buttons are the pattern that is
            actually complete here. */}
        <div
          aria-labelledby="section-kind-label"
          className="grid grid-cols-1 gap-2 rounded-lg bg-muted p-1.5 sm:grid-cols-2 sm:gap-3"
          role="group"
        >
          {([
            { key: 'lr', label: 'Logical Reasoning' },
            { key: 'rc', label: 'Reading Comprehension' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={kind === key}
              onClick={() => switchKind(key)}
              className={cn(
                "px-4 py-3.5 rounded-lg text-sm font-semibold transition-all duration-150 sm:px-6",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                kind === key
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {/* A live region that is always in the tree while RC is chosen, so a
            screen reader hears the sections arrive or fail. A region added
            with its message is skipped by most readers: only a change inside
            an existing region is announced. The empty element costs nothing
            and is what makes the two states below audible at all. */}
        {kind === 'rc' && (
          <p className="text-sm text-muted-foreground empty:!mt-0" role="status" aria-live="polite">
            {rcError ? rcError : rcSections === null ? 'Loading sections…' : null}
          </p>
        )}
      </div>

      {/* PrepTest & Section Selectors */}
      <div className="space-y-8 mb-12">
        {/* Status comes before the PrepTest because it decides which
            PrepTests are even offered. Both LR and RC sections are consumables,
            so "have I already spent this one" is the first question. */}
        <div className="space-y-3">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            htmlFor="status-select"
            id="status-select-label"
          >
            Status
          </label>
          <Select
            value={freshnessFilter}
            onValueChange={(val) => setFreshnessFilter(val as FreshnessFilter)}
          >
            <SelectTrigger
              aria-labelledby="status-select-label status-select"
              className="text-sm"
              id="status-select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="testing-menu">
              {/* "Fresh" on its own is our word, not the student's, so it
                  says what it filters to. Single-line, because the
                  trigger renders the chosen item's children and has to
                  keep reading straight once the menu closes. "Any" needs
                  no gloss: it is the absence of the filter, and spelling
                  that out only makes the pair harder to scan. */}
              <SelectItem value="fresh" className="text-sm focus:bg-foreground/5">
                {kind === 'rc' ? 'No recorded attempt or exposure' : 'Fresh · never attempted'}
              </SelectItem>
              <SelectItem value="any" className="text-sm focus:bg-foreground/5">
                Any
              </SelectItem>
            </SelectContent>
          </Select>
          {/* One live region, always present, for the three things the
              filter can report: still checking, could not check, nothing
              left. Sighted students watch this line change under the
              control; a screen reader only hears it if the region was
              already there when the text arrived. Polite, because none of
              the three blocks the form: every section stays reachable
              through Any. */}
          <p className="text-sm text-muted-foreground empty:!mt-0" role="status" aria-live="polite">
            {(kind === 'rc' ? rcFreshnessLoading : freshnessLoading)
              ? 'Checking what you have worked…'
              : (kind === 'rc' ? rcFreshnessError : freshnessError)
                ? `${kind === 'rc' ? rcFreshnessError : freshnessError} Every section is listed until it can.`
                : pickableSections.length === 0 && (kind === 'lr' || rcSections !== null)
                  ? kind === 'rc'
                    ? 'No untouched RC sections left. Switch to Any to sit one again.'
                    : 'No untouched LR sections left. Switch to Any to sit one again.'
                  : null}
          </p>
          {kind === 'rc' && <p className="text-xs text-muted-foreground">Exposure tracking covers recorded previews and practice. Earlier untracked reading cannot be ruled out.</p>}
        </div>

        {/* PrepTest, then section. Two steps rather than one flat list of
            `PT130.S3` rows: a student picks the test first and the section
            number second, which is the order they already hold it in. The
            Status filter above has decided which tests are offered at all,
            so nothing here needs counts or percentages on the rows. */}
        <div className="space-y-3">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            htmlFor="preptest-select"
            id="preptest-select-label"
          >
            PrepTest
          </label>
          {/* Same combobox as the practice-test door. This was a plain Select
              until an audit put the two side by side: 54 rows of scroll here,
              type-to-filter there, for the identical decision. */}
          <PrepTestCombobox
            emptyMessage="No PrepTest by that number, under this filter."
            id="preptest-select"
            labelId="preptest-select-label"
            onChange={(pt) => {
              setSelectedPT(pt);
              // The section number means a different section in a different
              // test, so carrying it across would start the wrong thing.
              setSelectedSection(null);
            }}
            options={ptOptions}
            placeholder="Select a PrepTest"
            value={selectedPT}
          />
        </div>

        <div className="space-y-3">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            htmlFor="section-select"
            id="section-select-label"
          >
            Section
          </label>
          <Select
            value={selectedSection ? String(selectedSection) : ''}
            onValueChange={(val) => setSelectedSection(Number(val))}
            disabled={!selectedPT}
          >
            <SelectTrigger
              aria-labelledby="section-select-label section-select"
              className="text-sm"
              id="section-select"
            >
              <SelectValue
                placeholder={selectedPT ? 'Select a section' : 'Pick a PrepTest first'}
              />
            </SelectTrigger>
            <SelectContent className="testing-menu">
              {sectionsForPT.map((section) => (
                <SelectItem
                  key={section}
                  value={String(section)}
                  className="text-sm focus:bg-foreground/5"
                >
                  Section {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timing Selector */}
      {/* The picker carries its own TIMING eyebrow, the way the PrepTest and
          Section fields carry theirs, so this block adds no second label. */}
      <div className="space-y-3 mb-12">
        <SectionTimingPicker
          value={timing}
          onChange={value => { timingTouched.current = true; setTiming(value); }}
          baseMinutes={baseMinutes}
          questionCount={chosenQuestionCount}
          // Three clocks and no more. 100% is the student's own standard,
          // and the two above it are the accommodations the LSAT actually
          // grants (+50% and +100%). The old speed-training presets (97%,
          // 94%, 70%) and the custom stepper read as arbitrary numbers on
          // a panel whose job is to start a real section.
          allowedPercents={kind === 'rc' ? rcPercents : [100, 150, 200]}
          // RC's clock is a per-passage budget with only three paces, and
          // no stopwatch to fall back to.
          allowUnlimited
          labels={kind === 'rc' ? rcTimingLabels : { 100: 'Standard', 150: 'Time and a half', 200: 'Double time' }}
          accommodationNote={<AccommodationNote baseMinutes={baseMinutes} />}
          className="min-h-[44px] rounded-md"
          contentClassName="testing-menu"
        />

        {/* Nothing under the control. No counts, no caveats: the clock
            is already on it and the panel is four fields and a button. */}
      </div>

      {/* Divider */}
      <div className="mb-8 h-px bg-border" />

      {/* What the button does. Every field above states a choice; none of
          them says what happens once the choice is made, and a student
          pressing Start should already know they are committing to the
          whole section rather than a drill they can leave. Appears only
          once a section is actually chosen, so the count is the real one
          and this is never a promise about nothing. Deliberately not under
          the timing control, which was cleared on purpose. */}
      {isReadyToStart && chosenQuestionCount && (
        <p className="mb-6 text-sm text-muted-foreground">
          All {chosenQuestionCount} questions, in their published order.{' '}
          {timing.mode === 'unlimited'
            ? 'No clock, so take as long as you want.'
            : clockWaitsForStart
              ? 'The clock begins only after you press Start section.'
              : 'The clock starts straight away.'}{' '}
          It is scored when you submit, and blind review comes after.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] px-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:underline focus-visible:outline-none"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleStart}
          disabled={!isReadyToStart || starting || (profileTimingStatus === 'loading' && !initialTiming && !timingTouched.current)}
          className={cn(
            "min-h-[44px] rounded-md px-8 py-3 text-sm font-semibold",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2",
            isReadyToStart
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          Start Section
        </button>
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
