import { conditionalUnits } from './content';
import { conditionalActivityAllowed, type ConditionalActivityConfig } from './activityRegistry';

/** The player receives a concrete unit set, even when a future caller skips the centre view. */
export function conditionalLegacyPracticeUnits(grant: Parameters<typeof conditionalActivityAllowed>[0] | undefined, config: ConditionalActivityConfig, isAdmin = false): string[] {
  if (config.activity !== 'legacy-practice' || !isAdmin && (!grant || !conditionalActivityAllowed(grant, config))) return [];
  return conditionalUnits.filter(unit => unit.phase === 'conditional' && (!config.unit || unit.id === config.unit)
    && (isAdmin || grant!.target.scope === 'course' || grant!.target.scope === 'activity' || grant!.unitIds.includes(unit.id))).map(unit => unit.id);
}
