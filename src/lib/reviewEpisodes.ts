import { supabase } from '@/integrations/supabase/client';

export type EpisodeReason = 'missed' | 'teacher_selected';
export type EpisodeSource = 'intro_lr_attempts' | 'hs_capstone';
export interface ReviewEpisode {
  id: string; student_id: string; actor_id: string; source_kind: EpisodeSource;
  source_id: string; question_id: string; reason: EpisodeReason; selection_reason: string | null; created_at: string;
}
export type ReviewEventKind = 'blind_answer' | 'reveal' | 'reflection' | 'complete';
export interface ReviewEpisodeEvent {
  id: string; episode_id: string; actor_id: string; kind: ReviewEventKind;
  payload: Record<string, string>; created_at: string;
}
export interface EpisodeTransport {
  actor(): Promise<string | null>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}
const defaultTransport: EpisodeTransport = {
  async actor() { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data.user?.id ?? null; },
  // Additive RPCs remain unpublished until the separately reviewed artifact is deployed.
  rpc: (name, args) => (supabase as unknown as { rpc: EpisodeTransport['rpc'] }).rpc(name, args),
};
function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Review save was not acknowledged.');
  return value as Record<string, unknown>;
}
function requiredText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function timestamp(value: unknown): value is string { return requiredText(value) && Number.isFinite(Date.parse(value)); }
function verifiedEpisode(value: unknown): ReviewEpisode {
  const data = row(value);
  if (![data.id, data.student_id, data.actor_id, data.source_id, data.question_id].every(requiredText)
    || typeof data.source_kind !== 'string' || !['intro_lr_attempts', 'hs_capstone'].includes(data.source_kind)
    || typeof data.reason !== 'string' || !['missed', 'teacher_selected'].includes(data.reason) || !timestamp(data.created_at)
    || (data.reason === 'missed' ? data.selection_reason !== null : !requiredText(data.selection_reason))) {
    throw new Error('Review episode was not acknowledged.');
  }
  return data as unknown as ReviewEpisode;
}
function verifiedEvent(value: unknown, episode: ReviewEpisode): ReviewEpisodeEvent {
  const data = row(value);
  if (![data.id, data.episode_id, data.actor_id].every(requiredText) || data.episode_id !== episode.id || data.actor_id !== episode.student_id
    || typeof data.kind !== 'string' || !['blind_answer', 'reveal', 'reflection', 'complete'].includes(data.kind) || !timestamp(data.created_at)) {
    throw new Error('Review event was not acknowledged.');
  }
  validateReviewEvent(data.kind as ReviewEventKind, row(data.payload) as Record<string, string>, episode.reason);
  return data as unknown as ReviewEpisodeEvent;
}
export function validateReviewEvent(kind: ReviewEventKind, payload: Record<string, string>, reason: EpisodeReason): void {
  if (!['blind_answer', 'reveal', 'reflection', 'complete'].includes(kind) || !['missed', 'teacher_selected'].includes(reason)) throw new Error('Review event could not be verified.');
  if (Object.values(row(payload)).some(value => typeof value !== 'string')) throw new Error('Review fields must be text.');
  if (kind === 'blind_answer' && !payload.answer?.trim()) throw new Error('Choose a blind answer before saving.');
  if (kind === 'complete' && reason === 'missed' && (!payload.error_diagnosis?.trim() || !payload.right_answer_diagnosis?.trim())) {
    throw new Error('Explain the error and why the right answer is right before completing this miss.');
  }
}
export function reviewEpisodeState(events: ReviewEpisodeEvent[]) {
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return { completed: ordered.some(event => event.kind === 'complete'), revealed: ordered.some(event => event.kind === 'reveal'),
    blindAnswer: ordered.find(event => event.kind === 'blind_answer')?.payload.answer ?? null,
    reflection: ordered.filter(event => event.kind === 'reflection').at(-1)?.payload.text ?? null };
}
export function createReviewEpisodeService(transport: EpisodeTransport = defaultTransport) {
  async function call(actorId: string, name: string, args: Record<string, unknown>) {
    if (await transport.actor() !== actorId) throw new Error('The signed-in account changed.');
    const result = await transport.rpc(name, args);
    if (result.error) throw result.error;
    if (await transport.actor() !== actorId) throw new Error('The signed-in account changed.');
    return result.data;
  }
  return {
    async open(input: { actorId: string; studentId: string; source: EpisodeSource; sourceId: string; reason: EpisodeReason; selectionReason?: string }) {
      if (input.reason === 'teacher_selected' && !input.selectionReason?.trim()) throw new Error('Give the student a reason for this review.');
      const data = verifiedEpisode(await call(input.actorId, 'open_review_episode_v1', {
        p_student: input.studentId, p_source: input.source, p_source_id: input.sourceId, p_reason: input.reason, p_selection_reason: input.selectionReason?.trim() || null,
      }));
      if (data.student_id !== input.studentId || data.actor_id !== input.actorId || data.source_kind !== input.source || data.source_id !== input.sourceId || data.reason !== input.reason || typeof data.id !== 'string'
        || typeof data.question_id !== 'string' || !data.question_id || data.selection_reason !== (input.reason === 'teacher_selected' ? input.selectionReason?.trim() : null)) throw new Error('Review episode was not acknowledged.');
      return data as unknown as ReviewEpisode;
    },
    async append(actorId: string, episode: ReviewEpisode, id: string, kind: ReviewEventKind, payload: Record<string, string>) {
      validateReviewEvent(kind, payload, episode.reason);
      verifiedEpisode(episode);
      if (!requiredText(id)) throw new Error('Review event identity could not be verified.');
      const data = verifiedEvent(await call(actorId, 'append_review_event_v1', { p_episode: episode.id, p_event: id, p_kind: kind, p_payload: payload }), episode);
      const returned = row(data.payload);
      if (data.id !== id || data.episode_id !== episode.id || data.actor_id !== actorId || data.kind !== kind
        || Object.keys(returned).length !== Object.keys(payload).length || Object.entries(payload).some(([key, value]) => returned[key] !== value)) throw new Error('Review event was not acknowledged.');
      return data as unknown as ReviewEpisodeEvent;
    },
    async list(actorId: string, studentId: string): Promise<{ episodes: ReviewEpisode[]; events: ReviewEpisodeEvent[] }> {
      const data = row(await call(actorId, 'read_review_episodes_v1', { p_student: studentId }));
      if (!Array.isArray(data.episodes) || !Array.isArray(data.events) || data.episodes.some(item => row(item).student_id !== studentId)) throw new Error('Review records could not be verified.');
      const episodes = data.episodes.map(verifiedEpisode);
      const episodeById = new Map(episodes.map(item => [item.id, item]));
      if (episodeById.size !== episodes.length) throw new Error('Review episode identity could not be verified.');
      const events = data.events.map(value => {
        const episode = episodeById.get(row(value).episode_id as string);
        if (!episode) throw new Error('Review event scope could not be verified.');
        return verifiedEvent(value, episode);
      });
      if (new Set(events.map(event => event.id)).size !== events.length) throw new Error('Review event identity could not be verified.');
      for (const episode of episodes) {
        const history = events.filter(event => event.episode_id === episode.id);
        if (['blind_answer', 'reveal', 'complete'].some(kind => history.filter(event => event.kind === kind).length > 1)) {
          throw new Error('Review event history could not be verified.');
        }
      }
      return { episodes, events };
    },
  };
}
