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
  newManualSectionLaunch,
} from '@/lib/timedSectionAdoption';

/**
 * Which kind of section a student is sitting. Logical Reasoning sections come
 * out of the LR question bank; Reading Comprehension sections are the four
 * published passages of one real section, started through the RC hub.
 */
export type SectionKind = 'lr' | 'rc';

interface SectionSelectorProps {
  manifest: QuestionManifest;
  ownerId?: string;
  onStartSection: (config: FullSectionConfig) => void;
  onStartRcSection?: (href: string, state?: { timedSectionStart: string }) => void;
  /**
   * Which kind the selector opens on. The drill hub's RC section passes 'rc'
   * so a student who has already thrown the LR/RC switch is not asked the same
   * question twice. Uncontrolled after mount: the selector's own tab strip
   * still switches it.
   */
  hideStatus?: boolean;
  randomizeOnOpen?: boolean;
  initialKind?: SectionKind;
  /** Optional initial timing state for testing or pre-selected pace. */
  initialTiming?: SectionTiming;
  onCancel: () => void;
}

export function SectionSelector({
  manifest,
  ownerId,
  onStartSection,
  onStartRcSection,
  hideStatus = false,
  randomizeOnOpen = false,
  initialKind = 'lr',
  initialTiming,
  onCancel,
}: SectionSelectorProps) {
  const { settings, profileTimingStatus } = useUserSettings();
  const [kind, setKind] = useState<SectionKind>(initialKind);
  const [selectedPT, setSelectedPT] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedTiming, setTiming] = useState<SectionTiming>(() => initialTiming ?? (settings.defaultTimingMode === 'unlimited' ? { mode: 'unlimited' } : STANDARD_TIMING));
  const profileBaseMinutes =
    settings.defaultTimingMode === '52.5' ? 52.5 : settings.defaultTimingMode === '70' ? 70 : 35;
  const [explicitBaseMinutes, setExplicitBaseMinutes] = useState<number | null>(() => initialTiming ? profileBaseMinutes : null);
  const timingTouched = useRef(false);
  const checkingProfileTiming = profileTimingStatus === 'loading' && !initialTiming && !timingTouched.current;
  const timing: SectionTiming = !initialTiming && !timingTouched.current
    ? settings.defaultTimingMode === 'unlimited' ? { mode: 'unlimited' } : STANDARD_TIMING
    : selectedTiming;
  // A PrepTest is a consumable, so the first question is which sections are
  // still unspent. Defaults to Fresh, which is what a student wants nine times
  // in ten and the only state that gives a clean read on where they stand.
  const [selectedFreshness, setFreshnessFilter] = useState<FreshnessFilter>('fresh');
  const freshnessFilter = hideStatus ? 'any' : selectedFreshness;
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
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const startLocked = useRef(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
  // Once a clock is explicitly selected, later profile hydration must not
  // reinterpret its percentage against a different base.
  const baseMinutes = explicitBaseMinutes ?? profileBaseMinutes;

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

  const randomized = useRef(false);
  useEffect(() => {
    if (!randomizeOnOpen || randomized.current || !pickableSections.length) return;
    const picked = pickableSections[Math.floor(Math.random() * pickableSections.length)];
    randomized.current = true;
    setSelectedPT(picked.pt);
    setSelectedSection(picked.section);
  }, [pickableSections, randomizeOnOpen]);

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
    if (checkingProfileTiming || startLocked.current || !isReadyToStart) return;
    startLocked.current = true;
    setStarting(true);
    setStartError(false);
    try {
      if (kind === 'rc' && chosenRcSection && onStartRcSection) {
        const { preptest, section } = chosenRcSection;
        const protectedPace = rcProtectedPaceForTiming(timing.mode === 'unlimited' ? timing : {
          mode: 'timed',
          percent: Math.round(timing.percent * baseMinutes / 35 * 1e6) / 1e6,
        });
        const canUseProtectedSection = ownerId && protectedPace
          && manualSectionCoverage('rc', preptest, section)
          && await manualSectionsEnabled(ownerId);
        if (!isMounted.current) return;
        if (canUseProtectedSection && protectedPace && ownerId) {
          const { href, state } = newManualSectionLaunch('rc', preptest, section, protectedPace, ownerId);
          onStartRcSection(href, state);
        } else {
          onStartRcSection(rcSectionHref(chosenRcSection, rcPaceId));
        }
        return;
      }
      if (!selectedPT || !selectedSection) return;
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
    } catch {
      if (!isMounted.current) return;
      startLocked.current = false;
      setStartError(true);
      setStarting(false);
    }
  };

  const chosenQuestionCount = useMemo(() => {
    if (kind === 'rc') return chosenRcSection?.questionCount;
    if (!selectedPT || !selectedSection) return undefined;
    return questionBank.getSection(selectedPT, selectedSection).length || undefined;
  }, [kind, chosenRcSection, selectedPT, selectedSection]);

  const isReadyToStart =
    kind === 'rc' ? Boolean(chosenRcSection && onStartRcSection) : Boolean(selectedPT && selectedSection);

  return (
    <div className="testing-section-launcher">
      <fieldset className="testing-section-fields space-y-4" disabled={starting}>
        <div className="grid gap-1.5">
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
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
            role="group"
          >
            {([
              { key: 'lr', label: 'Logical Reasoning' },
              { key: 'rc', label: 'Reading Comprehension' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                autoFocus={key === initialKind}
                aria-pressed={kind === key}
                onClick={() => switchKind(key)}
                className={cn(
                  "min-h-[44px] rounded-md px-2 py-2 text-sm font-semibold transition-colors duration-150",
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
        <div className="space-y-4">
          {!hideStatus && (
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
          )}

          {/* PrepTest, then section. Two steps rather than one flat list of
              `PT130.S3` rows: a student picks the test first and the section
              number second, which is the order they already hold it in. The
              Status filter above has decided which tests are offered at all,
              so nothing here needs counts or percentages on the rows. */}
          <div className="grid gap-1.5">
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
              centerValue
              emptyMessage={hideStatus ? "No PrepTest by that number." : "No PrepTest by that number, under this filter."}
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

          <div className="grid gap-1.5">
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
                className="relative justify-center px-8 text-sm [&>svg]:absolute [&>svg]:right-3"
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
        <div>
          {checkingProfileTiming ? <p className="text-sm text-muted-foreground" role="status">Checking profile timing…</p> : <SectionTimingPicker
            value={timing}
            onChange={value => { timingTouched.current = true; setExplicitBaseMinutes(baseMinutes); setTiming(typeof value === 'function' ? value(timing) : value); }}
            baseMinutes={baseMinutes}
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
            accommodationNote={explicitBaseMinutes !== null && explicitBaseMinutes !== profileBaseMinutes
              ? 'Your selected timing is kept. New setups use your updated profile timing.'
              : undefined}
            className="min-h-[44px] rounded-md"
            contentClassName="testing-menu min-w-0 max-w-[var(--radix-popover-content-available-width)]"
          />}
          <p className="mt-1 min-h-5 text-sm text-muted-foreground" role="status">
            {chosenQuestionCount ? `${chosenQuestionCount} questions` : null}
          </p>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="testing-section-actions mt-3 border-t border-border pt-3">
        {startError && (
          <p role="alert" className="mb-2 text-sm">
            We couldn’t open your section. Your timer hasn’t started.
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
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
            disabled={!isReadyToStart || starting || checkingProfileTiming}
            className={cn(
              "min-h-[44px] rounded-md px-8 py-3 text-sm font-semibold",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2",
              isReadyToStart && !checkingProfileTiming && !starting
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {starting ? 'Opening section…' : startError ? 'Try again' : 'Start section'}
          </button>
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
