/**
 * What the runner is told about the run it is about to start.
 *
 * A Drill Launch names a run (`?drill=saved-set&set=…`). This is that name
 * turned into the working shape the runner uses: the mode, the config, and the
 * handful of ids that say which stored row this run belongs to.
 *
 * It replaces `drillRouteState`, which derived the same thing by re-reading the
 * query string in a second, parallel grammar. There is now one reader — the
 * codec in `drillLaunch` — and one shape, built here and handed down by
 * `DrillLaunchGate`. The address bar keeps the short link it arrived with; the
 * runner no longer needs it expanded into a long one.
 *
 * See `docs/adr/0016-a-drill-link-names-a-run-it-does-not-contain-one.md`.
 */

import type {
  DrillMode,
  FullSectionConfig,
  TimerConfig,
  TypeDrillConfig,
} from '@/types/drill';
import { DrillLaunchError, type DrillLaunch, type DrillLaunchBody, type PtLegRef } from '@/lib/drillLaunch';
import type { DrillResumeIdentity } from '@/lib/drillResumeSession';
import type { StandaloneDrillRun } from '@/lib/drillRunLedger';

export interface DrillRunSpec {
  /** Account-owned frozen sitting, resolved before the runner opens. */
  savedStandaloneRun?: StandaloneDrillRun;
  /**
   * The Drill Launch kind this run came from. `mode` is not the run kind (ADR
   * 0016: six kinds share `type-drill`), so anything that must tell a guided
   * drill from a filter drill or a Smart Drill reads this, never `mode`.
   */
  launchKind?: DrillLaunchBody['kind'];
  mode?: DrillMode;
  config?: FullSectionConfig | TypeDrillConfig;
  /** Heading shown while the drill runs. */
  practicingLabel?: string;
  /** Where the runner's exit sends the student. Always app-relative. */
  returnTo?: string;
  /** True when the runner is launched from a Guided Drill. */
  isGuidedDrill?: boolean;
  guidedDurationMinutes?: number;
  /**
   * Presentation hint, independent of `mode`. When 'smart', the runner renders
   * the adaptive Smart-Drill chrome even for a fixed-queue type-drill.
   */
  present?: 'smart';
  /**
   * Seals the run: Answer and Explanation are not rendered at all, for the
   * whole session, for every question. A launch property and not a student
   * setting, because the person who assigns the section decides.
   */
  sealed?: boolean;
  /** Open on this question rather than the first. */
  initialIndex?: number;
  /**
   * A full-section run that must show only these questions: an assigned set
   * that happens to come from one section is not the whole section.
   */
  restrictQids?: string[];

  // ── Which stored row this run belongs to ────────────────────────────────
  // Previously read straight off the query string by the runner, in a second
  // grammar that only agreed with the codec by coincidence.
  /** A classroom homework assignment. */
  assignmentId?: string;
  guidedSetId?: string;
  guidedDrillId?: string;
  guidedAssignmentId?: string;
  /** Intro to LR practice set: what it is, and which pool. */
  practiceSource?: string;
  practiceSlug?: string;
  /** Names the Run Record for a bootcamp day, so a re-draw cannot orphan it. */
  resumeIdentity?: DrillResumeIdentity;
  /** Which practice-test run and leg this section closes out. */
  ptRun?: PtLegRef;
}

export interface DrillTimerConfig {
  mode: 'countdown' | 'stopwatch';
  durationMs?: number;
}

function typeDrillConfig(qids: string[]): TypeDrillConfig {
  return {
    qtypes: [],
    difficulties: [],
    pts: [],
    count: qids.length,
    selectedQids: qids,
  };
}

const QID_PATTERN = /^PT(\d+)-S(\d+)-Q\d+$/;

/**
 * A homework set built from one real section — every qid comes from the same
 * PT and section number, the shape `assign.ts` and the admin set builder both
 * produce today. Such a set is a section wearing a homework row, not a mixed
 * question list, so it runs under a real countdown instead of the untimed
 * stopwatch every other homework set gets. A set that mixes sections (or PTs)
 * returns null and keeps the untimed behaviour, because there is no one clock
 * that honestly times a blend.
 */
export function singleSectionOf(qids: string[]): { pt: number; section: number } | null {
  if (qids.length === 0) return null;
  let pt: number | null = null;
  let section: number | null = null;
  for (const qid of qids) {
    const match = QID_PATTERN.exec(qid);
    if (!match) return null;
    const qPt = Number(match[1]);
    const qSection = Number(match[2]);
    if (pt === null) {
      pt = qPt;
      section = qSection;
    } else if (qPt !== pt || qSection !== section) {
      return null;
    }
  }
  return pt !== null && section !== null ? { pt, section } : null;
}

/**
 * Build the run spec from a launch.
 *
 * `resolvedQids` is how the id-named kinds arrive: their question list lives in
 * a row, and `resolveDrillLaunch` reads that row before this is called.
 */
export function drillRunSpecFromLaunch(
  launch: DrillLaunch,
  resolvedQids?: string[],
  now: number = Date.now(),
): DrillRunSpec {
  const options = launch.options ?? {};
  const base: DrillRunSpec = {
    launchKind: launch.kind,
    returnTo: options.returnTo,
    practicingLabel: options.label,
    present: options.present,
    initialIndex: options.initialIndex,
  };

  switch (launch.kind) {
    case 'smart-drill':
      return { ...base, mode: 'adaptive', sealed: false };

    case 'section': {
      const config: FullSectionConfig = {
        pt: launch.pt,
        section: launch.section,
        timer: {
          mode: launch.timerMode ?? (launch.minutes ? 'custom' : '35'),
          customMinutes: launch.minutes,
          isPaused: false,
          elapsedMs: 0,
          startedAt: now,
        },
      };
      return {
        ...base,
        mode: 'full-section',
        config,
        sealed: !!launch.sealed,
        ptRun: launch.ptLeg,
      };
    }

    case 'questions': {
      const carry = launch.carry;
      return {
        ...base,
        mode: carry?.mode ?? 'type-drill',
        config: typeDrillConfig(launch.qids),
        sealed: carry?.sealed ?? false,
        isGuidedDrill: carry?.isGuidedDrill ?? false,
        guidedDurationMinutes: carry?.guidedDurationMinutes,
        assignmentId: carry?.assignmentId,
        guidedSetId: carry?.guidedSetId,
        guidedDrillId: carry?.guidedDrillId,
        guidedAssignmentId: carry?.guidedAssignmentId,
        practiceSource: carry?.practiceSource,
        practiceSlug: carry?.practiceSlug,
        resumeIdentity: carry?.resumeIdentity,
        ptRun: carry?.ptLeg,
      };
    }

    case 'filter':
      return {
        ...base,
        mode: 'type-drill',
        config: {
          qtypes: launch.qtypes ?? [],
          difficulties: launch.difficulties ?? [],
          pts: launch.pts ?? [],
          sections: launch.sections,
          qfeatures: launch.qfeatures,
          count: launch.count,
        },
        sealed: false,
      };

    case 'saved-set':
    case 'assignment':
    case 'guided-drill':
    case 'practice-set':
    case 'bootcamp-day': {
      if (!resolvedQids) {
        throw new DrillLaunchError(
          `a ${launch.kind} launch must have its questions resolved before it can run`,
        );
      }

      if (launch.kind === 'assignment') {
        const section = singleSectionOf(resolvedQids);
        if (section) {
          return {
            ...base,
            mode: 'full-section',
            config: {
              pt: section.pt,
              section: section.section,
              timer: {
                // An accommodated student carries her clock on the launch,
                // the same way a section sat from the section door does.
                mode: launch.timerMode ?? '35',
                isPaused: false,
                elapsedMs: 0,
                startedAt: now,
              },
            },
            // A section assigned as a measurement stays sealed until it is
            // scored. Blind review is where the thinking gets checked.
            sealed: !launch.revealAllowed,
            // A set drawn from one section is still only the questions that
            // were assigned. The runner shows these, never the whole section.
            restrictQids: resolvedQids,
            assignmentId: launch.assignmentId,
            guidedSetId: launch.guidedSetId,
          };
        }
      }

      const spec: DrillRunSpec = {
        ...base,
        mode: 'type-drill',
        config: typeDrillConfig(resolvedQids),
        sealed: false,
        isGuidedDrill: launch.kind === 'guided-drill',
      };
      if (launch.kind === 'assignment') {
        spec.assignmentId = launch.assignmentId;
        spec.guidedSetId = launch.guidedSetId;
      }
      if (launch.kind === 'guided-drill') {
        spec.guidedDurationMinutes = launch.durationMinutes;
        spec.guidedDrillId = launch.drillId;
        spec.guidedAssignmentId = launch.assignmentId;
      }
      if (launch.kind === 'practice-set') {
        // The two values the runner uses to recognise an Intro to LR practice
        // set and map it back to its module-progress completion id.
        spec.practiceSource = launch.source ?? 'intro-to-lr-practice-drills';
        spec.practiceSlug = launch.slug;
      }
      if (launch.kind === 'bootcamp-day') {
        // Keeps the Run Record named by the day rather than by the list the
        // picker happened to draw.
        spec.resumeIdentity = {
          kind: 'bootcamp-day',
          day: launch.day,
          part: launch.part,
        };
      }
      return spec;
    }
  }
}

/** The clock this run starts under. */
export function timerConfigForRunSpec(
  spec: DrillRunSpec | null | undefined,
): DrillTimerConfig | null {
  if (spec?.isGuidedDrill && spec.guidedDurationMinutes) {
    return { mode: 'countdown', durationMs: spec.guidedDurationMinutes * 60 * 1000 };
  }

  if ((spec?.mode === 'type-drill' || spec?.mode === 'practice-set') && spec.config) {
    const config = spec.config as TypeDrillConfig;
    if (config.selectedQids && config.selectedQids.length > 0) {
      return { mode: 'stopwatch' };
    }
  }

  if (spec?.mode === 'full-section' && spec.config) {
    const timer = (spec.config as FullSectionConfig).timer as TimerConfig;

    if (timer.mode === 'unlimited') {
      return { mode: 'stopwatch' };
    }

    let durationMs: number;
    switch (timer.mode) {
      case '35':
        durationMs = 35 * 60 * 1000;
        break;
      case '52.5':
        durationMs = 52.5 * 60 * 1000;
        break;
      case '70':
        durationMs = 70 * 60 * 1000;
        break;
      case 'custom':
        durationMs = (timer.customMinutes || 35) * 60 * 1000;
        break;
      default:
        durationMs = 35 * 60 * 1000;
    }

    return { mode: 'countdown', durationMs };
  }

  return { mode: 'stopwatch' };
}
