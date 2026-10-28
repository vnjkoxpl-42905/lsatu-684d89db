import { CONDITIONAL_ACTIVITIES, normalizeConditionalActivityConfig, type ConditionalActivityConfig, type ConditionalActivityId } from '../activityRegistry';

export function conditionalPracticeSetupKey(userId: string, assignmentId: string, edition: string): string {
  return `conditional-practice-setup:v1:${JSON.stringify([userId, assignmentId, edition])}`;
}
export interface PracticeSetupState { selected?: ConditionalActivityId; drafts: Partial<Record<ConditionalActivityId, ConditionalActivityConfig>> }
export function readPracticeSetup(storageKey: string): PracticeSetupState {
  const empty: PracticeSetupState = { drafts: {} };
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
    const value = raw as Record<string, unknown>;
    const drafts: PracticeSetupState['drafts'] = {};
    if (value.drafts && typeof value.drafts === 'object' && !Array.isArray(value.drafts)) {
      const saved = value.drafts as Record<string, unknown>;
      for (const { id } of CONDITIONAL_ACTIVITIES) {
        if (!Object.prototype.hasOwnProperty.call(saved, id)) continue;
        const config = normalizeConditionalActivityConfig(saved[id]);
        if (config?.activity === id) drafts[id] = config;
      }
    }
    const selected = CONDITIONAL_ACTIVITIES.find(item => item.id === value.selected)?.id;
    return { selected, drafts };
  } catch { return empty; }
}
export function writePracticeSetup(storageKey: string, state: PracticeSetupState): void {
  try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Setup remains available in memory when storage is unavailable. */ }
}
