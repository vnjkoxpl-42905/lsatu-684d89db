import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { rcDb } from "../lib/db";
import { DEFAULT_PREFERENCES } from "../lib/constants";
import { countWords, slugify } from "../lib/tokenize";
import { mergePassageMetadata, metadataForEdit, progressPayload, readingCenterKey, type PassageMetadata } from "../lib/persistence";
import { matchesRecordedSession } from "../lib/sessionPersistence";
import type { Passage, Preferences, Progress, Bookmark, ReadingSession, UserTag } from "../lib/types";

async function checked<T>(request: PromiseLike<{ data?: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data as T;
}
function requireUser(userId?: string) {
  if (!userId) throw new Error("Sign in to save your reading work.");
  return userId;
}
const report = (error: Error) => toast.error(`Reading Center: ${error.message}`);

async function passagesForUser(userId: string, raw = false): Promise<Passage[]> {
  const rows = await checked<Passage[]>(rcDb("reading_center_passages").select("*").or(`owner_id.is.null,owner_id.eq.${userId}`).order("sort_order").order("title"));
  if (raw) return rows ?? [];
  const metadata = await checked<PassageMetadata[]>(rcDb("reading_center_passage_metadata").select("*").eq("user_id", userId));
  const byId = new Map((metadata ?? []).map((row) => [row.passage_id, row]));
  return (rows ?? []).map((row) => mergePassageMetadata(row, byId.get(row.id))).filter((row): row is Passage => !!row);
}

export function usePassages(raw = false) {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "passages", raw), queryFn: () => passagesForUser(requireUser(user?.id), raw), enabled: !!user });
}
export function usePassageBySlug(slug: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: readingCenterKey(user?.id, "passage", slug), enabled: !!user && !!slug,
    queryFn: async () => {
      const row = await checked<Passage | null>(rcDb("reading_center_passages").select("*").eq("slug", slug).or(`owner_id.is.null,owner_id.eq.${requireUser(user?.id)}`).maybeSingle());
      if (!row) return null;
      const metadata = await checked<PassageMetadata | null>(rcDb("reading_center_passage_metadata").select("*").eq("user_id", requireUser(user?.id)).eq("passage_id", row.id).maybeSingle());
      return mergePassageMetadata(row, metadata ?? undefined);
    },
  });
}
export function usePreferences() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "prefs"), enabled: !!user, queryFn: async (): Promise<Preferences> => {
    const row = await checked<Partial<Preferences> | null>(rcDb("reading_center_preferences").select("*").eq("user_id", requireUser(user?.id)).maybeSingle());
    return { ...DEFAULT_PREFERENCES, ...row, line_spacing: Number(row?.line_spacing ?? DEFAULT_PREFERENCES.line_spacing) };
  } });
}
export function useSavePreferences() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ scope: { id: `rc-preferences-${user?.id}` }, mutationFn: async (input: Partial<Preferences>) => {
    const userId = requireUser(user?.id);
    // Only changed columns are written so rapid independent controls cannot overwrite one another.
    await checked(rcDb("reading_center_preferences").upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("user_id").single());
    return input;
  }, onMutate: async (input) => {
    const key = readingCenterKey(user?.id, "prefs");
    await client.cancelQueries({ queryKey: key });
    const previous = client.getQueryData<Preferences>(key);
    client.setQueryData(key, { ...DEFAULT_PREFERENCES, ...previous, ...input });
    return { previous };
  }, onError: (error, _input, context) => {
    if (context?.previous) client.setQueryData(readingCenterKey(user?.id, "prefs"), context.previous);
    report(error);
  }, onSettled: () => client.invalidateQueries({ queryKey: readingCenterKey(user?.id, "prefs") }) });
}
export function useProgressList() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "progress"), enabled: !!user, queryFn: () => checked<Progress[]>(rcDb("reading_center_progress").select("*").eq("user_id", requireUser(user?.id))) });
}
export interface SaveProgressInput { passage_id: string; word_index: number; completed?: boolean; hidden_from_recent?: boolean }
export function useSaveProgress() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ scope: { id: `rc-progress-${user?.id}` }, mutationFn: async (input: SaveProgressInput) => {
    const userId = requireUser(user?.id);
    // Only update explicit fields: opening at zero preserves completion; restart explicitly clears it.
    await checked(rcDb("reading_center_progress").upsert(progressPayload(userId, input), { onConflict: "user_id,passage_id" }).select("passage_id,word_index,completed_at").single());
    if (input.word_index > 0 || input.completed) {
      // A finished passage is part of ongoing reading practice, not the whole assignment.
      await checked(supabase.from("classroom_items").update({ status: "in_progress" })
        .eq("student_id", userId).eq("source_table", "reading_center").eq("source_id", "library")
        .eq("visible_to_student", true).eq("status", "assigned").select("id"));
    }
  }, onError: report, onSuccess: () => client.invalidateQueries({ queryKey: readingCenterKey(user?.id, "progress") }) });
}
export function useBookmarks(passageId?: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "bookmarks", passageId), enabled: !!user && !!passageId, queryFn: () => checked<Bookmark[]>(rcDb("reading_center_bookmarks").select("*").eq("user_id", requireUser(user?.id)).eq("passage_id", passageId).order("created_at", { ascending: false })) });
}
function useScopedMutation<T, R>(mutationFn: (input: T, userId: string) => Promise<R>, scope?: string) {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ scope: { id: `rc-${scope ?? "write"}-${user?.id}` }, mutationFn: (input: T) => mutationFn(input, requireUser(user?.id)), onError: report, onSuccess: () => client.invalidateQueries({ queryKey: readingCenterKey(user?.id, ...(scope ? [scope] : [])) }) });
}
export function useAddBookmark() {
  return useScopedMutation((input: { passage_id: string; word_index: number; note?: string | null }, userId) => checked<Bookmark>(rcDb("reading_center_bookmarks").insert({ ...input, user_id: userId }).select().single()), "bookmarks");
}
export function useUpdateBookmark() {
  return useScopedMutation((input: { id: string; note: string | null }, userId) => checked(rcDb("reading_center_bookmarks").update({ note: input.note }).eq("id", input.id).eq("user_id", userId).select("id").single()), "bookmarks");
}
export function useDeleteBookmark() {
  return useScopedMutation((input: { id: string; passage_id?: string }, userId) => checked(rcDb("reading_center_bookmarks").delete().eq("id", input.id).eq("user_id", userId).select("id").single()), "bookmarks");
}
export function useSessions(sinceIso?: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "sessions", sinceIso), enabled: !!user, queryFn: () => {
    let query = rcDb("reading_center_sessions").select("*").eq("user_id", requireUser(user?.id));
    if (sinceIso) query = query.gte("started_at", sinceIso);
    return checked<ReadingSession[]>(query.order("started_at", { ascending: true }));
  } });
}
export function useRecordSession() {
  return useScopedMutation(async (session: ReadingSession, userId) => {
    if (!session.id) throw new Error("This reading visit needs a stable save ID.");
    let result: { data: Record<string, unknown> | null; error: { message: string } | null };
    try {
      result = await rcDb("reading_center_sessions")
        .upsert({ ...session, user_id: userId }, { onConflict: "id", ignoreDuplicates: true }).select("*").maybeSingle();
    } catch (error) {
      result = { data: null, error: { message: error instanceof Error ? error.message : "Your reading visit could not save." } };
    }
    // Duplicate retries return no inserted row. An interrupted response may also hide a committed write.
    const row = result.data ?? await checked<Record<string, unknown> | null>(rcDb("reading_center_sessions")
      .select("*").eq("id", session.id).eq("user_id", userId).maybeSingle());
    if (!matchesRecordedSession(row, session, userId)) throw new Error(result.error?.message || "Your reading visit could not be confirmed. Try again.");
  }, "sessions");
}

export function useUpsertPassage() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ mutationFn: async (input: Partial<Passage> & { title: string; body: string }): Promise<Passage> => {
    const userId = requireUser(user?.id);
    const existing = input.id ? await checked<Passage>(rcDb("reading_center_passages").select("*").eq("id", input.id).single()) : null;
    // The teacher manager passes owner_id:null explicitly to edit original shared texts.
    const manageShared = Object.prototype.hasOwnProperty.call(input, "owner_id") && input.owner_id === null;
    let row = existing;
    if (!existing || existing.owner_id === userId || manageShared) {
      const { tags, ...fields } = input;
      row = await checked<Passage>(rcDb("reading_center_passages").upsert({
        ...fields,
        owner_id: existing?.owner_id ?? (manageShared ? null : userId),
        slug: existing?.slug ?? input.slug ?? `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`,
        word_count: countWords(input.body), updated_at: new Date().toISOString(),
      }).select().single());
    }
    let metadata: Partial<PassageMetadata> | null = input.tags ? { tags: input.tags } : null;
    if (existing && !manageShared && existing.owner_id !== userId) {
      const edits = metadataForEdit(input);
      // Required title/body fields accompany tag/cover saves; do not freeze unchanged shared text.
      if (input.title === existing.title) delete edits.title_override;
      if (input.body === existing.body) delete edits.body_override;
      metadata = edits;
    }
    if (metadata) await checked(rcDb("reading_center_passage_metadata").upsert({ ...metadata, user_id: userId, passage_id: row!.id }, { onConflict: "user_id,passage_id" }).select("passage_id").single());
    return mergePassageMetadata(row!, metadata ? { passage_id: row!.id, ...metadata } : undefined)!;
  }, onError: report, onSuccess: () => client.invalidateQueries({ queryKey: readingCenterKey(user?.id) }) });
}
export function useDeletePassage(permanent = false) {
  return useScopedMutation(async (id: string, userId) => {
    const row = await checked<Passage>(rcDb("reading_center_passages").select("*").eq("id", id).single());
    if (permanent) await checked(rcDb("reading_center_passages").delete().eq("id", id).select("id").single());
    else if (row.owner_id === userId) await checked(rcDb("reading_center_passages").delete().eq("id", id).eq("owner_id", userId).select("id").single());
    else await checked(rcDb("reading_center_passage_metadata").upsert({ user_id: userId, passage_id: id, hidden: true }, { onConflict: "user_id,passage_id" }).select("passage_id").single());
  });
}
export function useReorderPassages() {
  return useScopedMutation(async (items: { id: string; sort_order: number }[]) => {
    for (const item of items) await checked(rcDb("reading_center_passages").update({ sort_order: item.sort_order }).eq("id", item.id).select("id").single());
  });
}
export function useTags() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "tags"), enabled: !!user, queryFn: () => checked<UserTag[]>(rcDb("reading_center_tags").select("name,color").eq("user_id", requireUser(user?.id)).order("name")) });
}
export function useSaveTag() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ oldName, name, color }: { oldName?: string; name: string; color?: number }): Promise<UserTag> => {
    const userId = requireUser(user?.id);
    const clean = name.trim();
    if (!clean) throw new Error("Enter a tag name.");
    const existing = client.getQueryData<UserTag[]>(readingCenterKey(userId, "tags"))?.find((tag) => tag.name === oldName);
    const saved = { name: clean, color: color ?? existing?.color ?? 0 };
    if (client.getQueryData<UserTag[]>(readingCenterKey(userId, "tags"))?.some((tag) => tag.name === clean && tag.name !== oldName)) throw new Error(`A tag named "${clean}" already exists.`);
    if (oldName) await checked((supabase as any).rpc("reading_center_rename_tag", { p_old_name: oldName, p_new_name: clean, p_color: saved.color }));
    else await checked(rcDb("reading_center_tags").insert({ ...saved, user_id: userId }).select("name").single());
    return saved;
  }, onError: report, onSuccess: () => client.invalidateQueries({ queryKey: readingCenterKey(user?.id) }) });
}
export function useDeleteTag() {
  return useScopedMutation((name: string) => checked((supabase as any).rpc("reading_center_delete_tag", { p_name: name })));
}
export function useReadingProfile() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "profile"), enabled: !!user, staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true, queryFn: async () => {
    const row = await checked<{ display_name: string | null } | null>(supabase.from("profiles").select("display_name").eq("class_id", requireUser(user?.id)).maybeSingle());
    return row?.display_name?.trim() || user?.user_metadata?.display_name?.trim() || user?.email || "Reader";
  } });
}
