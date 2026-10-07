import { supabase } from '@/integrations/supabase/client';
import coverage from './timedSectionCoverage.generated.json';
import type { PracticeTestPaceId } from './practiceTest';
import type { RcDrillConfig } from '@/features/rc/lib/rcTypes';

export const TIMED_SECTION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function timedSectionResumeHref(id: string): string {
  if (!TIMED_SECTION_UUID.test(id)) throw new Error('The saved section identity is invalid.');
  return `/testing/sections/${encodeURIComponent(id)}`;
}
export function manualSectionCoverage(kind: 'lr' | 'rc', pt: number, section: number) {
  return coverage.find(row => row.kind === kind && row.pt === pt && row.section === section);
}
export function canonicalRcSection(ids: number[]) {
  return coverage.find(row => row.kind === 'rc' && row.passageIds.length === ids.length && row.passageIds.every((id, index) => id === ids[index]));
}
export function sectionPace(minutes: number | null): PracticeTestPaceId | null {
  return minutes === null ? 'untimed' : minutes === 35 ? 'standard' : minutes === 52.5 ? 'time-and-a-half' : minutes === 70 ? 'double-time' : null;
}
export async function manualSectionsEnabled(ownerId?: string): Promise<boolean> {
  try {
    const { data: actor, error: actorError } = await supabase.auth.getUser();
    if (actorError || !actor.user || (ownerId && actor.user.id !== ownerId)) return false;
    const { data, error } = await (supabase as unknown as { rpc(name: string): Promise<{ data: unknown; error: unknown }> }).rpc('timed_section_capability_v1');
    const { data: after, error: afterError } = await supabase.auth.getUser();
    if (error || afterError || after.user?.id !== actor.user.id || !data || typeof data !== 'object') return false;
    const capability = data as Record<string, unknown>;
    const operations = capability.operations;
    return capability.contractVersion === 1 && capability.workKind === 'standalone-section' && capability.enabled === true &&
      Array.isArray(capability.sources) && capability.sources.includes('manual-canonical') &&
      Array.isArray(operations) && ['create', 'read', 'start'].every(operation => operations.includes(operation));
  } catch { return false; }
}
export function newManualSectionHref(kind: 'lr' | 'rc', pt: number, section: number, pace: PracticeTestPaceId): string {
  if (!manualSectionCoverage(kind, pt, section)) throw new Error('This section is not available for protected timing.');
  const query = new URLSearchParams({ kind, pt: String(pt), section: String(section), pace });
  return `${timedSectionResumeHref(crypto.randomUUID())}?${query}`;
}
export function missedRcConfig(config: RcDrillConfig): RcDrillConfig {
  const { timedSectionSittingId: _sitting, practiceTestRunId: _test, practiceTestLegIndex: _leg,
    clockElapsedSeconds: _clock, currentQuestionIndex: _index, lastActiveAt: _active,
    timerSeconds: _budget, mode: _mode, analysis: _analysis, ...fresh } = config as RcDrillConfig & { timerSeconds?: number; mode?: string; analysis?: unknown };
  return { ...fresh, source: 'manual' };
}
