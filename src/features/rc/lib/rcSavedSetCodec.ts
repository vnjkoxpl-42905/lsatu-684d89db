import type { RcDrillConfig } from './rcTypes';
import type { RcSelectionFilters } from './rcAdaptive';

export const RC_SAVED_KIND = 'rc-builder';
export type RcSavedPayload = {
  kind: typeof RC_SAVED_KIND; version: 1; mode: 'fixed' | 'recipe';
  config: Pick<RcDrillConfig, 'reveal' | 'timing'>;
  filters: RcSelectionFilters; count: number; passageIds: number[]; questionIds: number[];
};
export type RcSavedDecode = { status: 'ok'; value: RcSavedPayload } | { status: 'not-ours' | 'invalid' | 'unsupported-version' };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 100 && v.every(s => typeof s === 'string' && s.length <= 200);
const ids = (v: unknown): v is number[] => Array.isArray(v) && v.length <= 3000 && v.every(n => Number.isSafeInteger(n) && n > 0) && new Set(v).size === v.length;
export function isRcSavedState(v: unknown): boolean { return record(v) && v.kind === RC_SAVED_KIND; }
export function decodeRcSavedSet(raw: unknown): RcSavedDecode {
  if (!record(raw) || raw.kind !== RC_SAVED_KIND) return { status: 'not-ours' };
  if (raw.version !== 1) return { status: 'unsupported-version' };
  if (!['fixed', 'recipe'].includes(String(raw.mode)) || !record(raw.config) || !record(raw.filters)) return { status: 'invalid' };
  const config = raw.config; const f = raw.filters;
  if (!['per_question', 'per_passage', 'end_of_set'].includes(String(config.reveal)) || !record(config.timing)
    || !['unlimited', 'per_passage_budget'].includes(String(config.timing.mode))
    || config.timing.mode === 'per_passage_budget' && (!Number.isSafeInteger(config.timing.secondsPerPassage) || Number(config.timing.secondsPerPassage) < 60 || Number(config.timing.secondsPerPassage) > 3600)
    || !Number.isSafeInteger(raw.count) || Number(raw.count) < 1 || Number(raw.count) > 320
    || !ids(raw.passageIds) || !ids(raw.questionIds)
    || raw.mode === 'fixed' && (!raw.passageIds.length || raw.passageIds.length > 320 || raw.count !== raw.passageIds.length || !raw.questionIds.length)
    || raw.mode === 'recipe' && (raw.passageIds.length > 0 || raw.questionIds.length > 0 || Number(raw.count) > 8)
    || !['topics', 'formats', 'frameworks', 'families'].every(key => strings(f[key]))
    || !Array.isArray(f.difficulties) || !f.difficulties.every(n => Number.isInteger(n) && n >= 1 && n <= 5)
    || !['any', 'fresh', 'strict_no_exposure', 'incorrect_before', 'incorrect_last'].includes(String(f.status))
    || !Number.isInteger(f.preptestMin) || !Number.isInteger(f.preptestMax)
    || Number(f.preptestMin) < 101 || Number(f.preptestMax) > 159 || Number(f.preptestMin) > Number(f.preptestMax)) return { status: 'invalid' };
  return { status: 'ok', value: {
    kind: RC_SAVED_KIND, version: 1, mode: raw.mode as RcSavedPayload['mode'],
    config: { reveal: config.reveal as RcDrillConfig['reveal'], timing: config.timing.mode === 'unlimited' ? { mode: 'unlimited' } : { mode: 'per_passage_budget', secondsPerPassage: Number(config.timing.secondsPerPassage) } },
    filters: { topics: [...f.topics as string[]], formats: [...f.formats as string[]], frameworks: [...f.frameworks as string[]], families: [...f.families as string[]], difficulties: [...f.difficulties as number[]], status: f.status as RcSelectionFilters['status'], preptestMin: Number(f.preptestMin), preptestMax: Number(f.preptestMax) },
    count: Number(raw.count), passageIds: [...raw.passageIds], questionIds: [...raw.questionIds],
  } };
}
