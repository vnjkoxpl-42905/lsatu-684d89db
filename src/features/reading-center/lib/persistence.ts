import { countWords } from "./tokenize";
import type { Passage } from "./types";

export interface PassageMetadata {
  passage_id: string;
  tags?: string[];
  hidden?: boolean;
  title_override?: string | null;
  body_override?: string | null;
  author_override?: string | null;
  genre_override?: string | null;
  cover_url_override?: string | null;
}

/** Null means no override; empty optional fields deliberately clear the original. */
export function mergePassageMetadata(passage: Passage, metadata?: PassageMetadata): Passage | null {
  if (metadata?.hidden) return null;
  if (!metadata) return { ...passage, tags: [] };
  const body = metadata.body_override ?? passage.body;
  return {
    ...passage,
    title: metadata.title_override ?? passage.title,
    body,
    word_count: countWords(body),
    author: metadata.author_override == null ? passage.author : metadata.author_override || null,
    genre: metadata.genre_override == null ? passage.genre : metadata.genre_override || null,
    cover_url: metadata.cover_url_override == null ? passage.cover_url : metadata.cover_url_override || null,
    tags: metadata.tags ?? [],
  };
}

export function metadataForEdit(input: Partial<Passage>): Partial<PassageMetadata> {
  const result: Partial<PassageMetadata> = {};
  for (const field of ["title", "body", "author", "genre", "cover_url"] as const) {
    if (Object.prototype.hasOwnProperty.call(input, field)) result[`${field}_override`] = input[field] ?? "";
  }
  if (input.tags) result.tags = input.tags;
  return result;
}

export function progressPayload(userId: string, input: { passage_id: string; word_index: number; completed?: boolean; hidden_from_recent?: boolean }) {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: userId,
    passage_id: input.passage_id,
    word_index: Math.max(0, Math.floor(input.word_index)),
    last_opened_at: now,
  };
  if (input.completed !== undefined) payload.completed_at = input.completed ? now : null;
  if (input.hidden_from_recent !== undefined) payload.hidden_from_recent = input.hidden_from_recent;
  return payload;
}

export const readingCenterKey = (userId: string | undefined, ...parts: unknown[]) => ["reading-center", userId, ...parts];
