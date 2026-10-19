import { createReviewEpisodeService, reviewEpisodeState, type ReviewEpisode, type ReviewEpisodeEvent } from '@/lib/reviewEpisodes';
import { assertActiveStudentScope } from '@/lib/studentScopedWork';
import type { StudentSubjectScope } from '@/lib/studentSubjectScope';
import { loadNativeLabReview } from '@/components/review/nativeLabReviewSource';
import { loadHardSentencesReview } from '@/components/review/hardSentencesReviewSource';
import type { ReviewQueueItem } from '@/components/review/reviewQueueModel';
import { resolveStudentAccountId } from '@/lib/studentAccountScope';

export function boundedReviewBinding(item: ReviewQueueItem) {
  const native = /^\/review\/native-lab\/([^/?]+)$/.exec(item.href);
  const hs = /^\/review\/hard-sentences\/(cluster|capstone)\/([^/?]+)$/.exec(item.href);
  if (!native && !hs) return null;
  try { return { source: hs?.[1] === 'capstone' ? 'hs_capstone' as const : 'intro_lr_attempts' as const, sourceId: decodeURIComponent(native?.[1] ?? hs![2]) }; }
  catch { return null; }
}
/** Exact attempt identity, never question-wide completion or flag removal. */
export function projectReviewEpisodes(items: ReviewQueueItem[], studentId: string, episodes: ReviewEpisode[], events: ReviewEpisodeEvent[]) {
  const matching = (item: ReviewQueueItem) => {
    const binding = boundedReviewBinding(item);
    return binding ? episodes.filter(episode => episode.student_id === studentId && episode.source_kind === binding.source && episode.source_id === binding.sourceId && episode.question_id === item.qid) : [];
  };
  const active: ReviewQueueItem[] = []; const supported = new Set<string>();
  for (const item of items) {
    const bound = matching(item); bound.forEach(episode => supported.add(episode.id));
    const completed = (episode: ReviewEpisode) => reviewEpisodeState(events.filter(event => event.episode_id === episode.id)).completed;
    const ownMiss = bound.find(episode => episode.reason === 'missed' && episode.actor_id === studentId);
    if (!ownMiss || !completed(ownMiss)) active.push(ownMiss ? { ...item, href: `${item.href}?episode=${encodeURIComponent(ownMiss.id)}` } : item);
    for (const episode of bound.filter(episode => episode.reason === 'teacher_selected' && !completed(episode))) active.push({
      ...item, key: `review-episode:${episode.id}`, reasons: ['teacher_selected'], sources: [...item.sources, 'review_episodes'],
      reflection: episode.selection_reason, href: `${item.href}?episode=${encodeURIComponent(episode.id)}`,
      lastActivityAt: episode.created_at, actionLabel: 'Open teacher-selected review',
    });
  }
  const unavailable = episodes.filter(episode => episode.student_id === studentId && !supported.has(episode.id)
    && !reviewEpisodeState(events.filter(event => event.episode_id === episode.id)).completed).length;
  return { items: active.sort((a,b) => b.lastActivityAt.localeCompare(a.lastActivityAt)), unavailable };
}
const service = createReviewEpisodeService();
export const scopedReviewDependencies = {
  assertScope: assertActiveStudentScope, native: loadNativeLabReview, hardSentences: loadHardSentencesReview,
  list: service.list, open: service.open, resolveOwnerId: resolveStudentAccountId,
};
export async function loadScopedReviewSelections(scope: StudentSubjectScope, deps = scopedReviewDependencies) {
  await deps.assertScope(scope);
  const ownerId = await deps.resolveOwnerId(scope);
  const result = await Promise.allSettled([deps.native(ownerId), deps.hardSentences(ownerId), deps.list(scope.actorId, ownerId)]);
  await deps.assertScope(scope);
  const [native, hs, records] = result;
  const unavailable = [native.status === 'rejected' && 'Native lab misses', hs.status === 'rejected' && 'Hard Sentences misses', records.status === 'rejected' && 'Saved review episodes',
    ...(hs.status === 'fulfilled' ? hs.value.unavailable : [])].filter((value): value is string => typeof value === 'string');
  return { items: [...(native.status === 'fulfilled' ? native.value : []), ...(hs.status === 'fulfilled' ? hs.value.items : [])],
    episodes: records.status === 'fulfilled' ? records.value.episodes : [], events: records.status === 'fulfilled' ? records.value.events : [],
    ownerId, canSelect: records.status === 'fulfilled', unavailable };
}
export async function selectScopedReview(scope: StudentSubjectScope, item: ReviewQueueItem, reason: string, deps = scopedReviewDependencies) {
  if (scope.mode !== 'selected_student' || !reason.trim()) throw new Error('Teacher review selection requires a selected student and a reason.');
  const binding = boundedReviewBinding(item); if (!binding) throw new Error('This saved source does not support teacher selection yet.');
  await deps.assertScope(scope);
  const ownerId = await deps.resolveOwnerId(scope);
  const saved = await deps.open({ actorId: scope.actorId, studentId: ownerId, source: binding.source, sourceId: binding.sourceId, reason: 'teacher_selected', selectionReason: reason.trim() });
  await deps.assertScope(scope);
  if (saved.question_id !== item.qid) throw new Error('The selected source question was not acknowledged.');
  return saved;
}
