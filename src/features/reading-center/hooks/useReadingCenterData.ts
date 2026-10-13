import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { rcDb } from "../lib/db";
import { DEFAULT_PREFERENCES } from "../lib/constants";
import { countWords } from "../lib/tokenize";
import type {
  Passage,
  Preferences,
  Progress,
  Bookmark,
  ReadingSession,
} from "../lib/types";

export function usePassages(): UseQueryResult<Passage[], Error> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["reading-center", "passages"],
    queryFn: async (): Promise<Passage[]> => {
      const { data, error } = await rcDb("reading_center_passages")
        .select("*")
        .order("sort_order")
        .order("title");
      if (error) throw error;
      return (data ?? []) as Passage[];
    },
    enabled: !!userId,
  });
}

export function usePassageBySlug(slug: string | undefined): UseQueryResult<Passage | null, Error> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["reading-center", "passage", slug],
    queryFn: async (): Promise<Passage | null> => {
      if (!slug) return null;
      const { data, error } = await rcDb("reading_center_passages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Passage | null;
    },
    enabled: !!userId && !!slug,
  });
}

export function usePreferences(): UseQueryResult<Preferences, Error> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["reading-center", "prefs", userId],
    queryFn: async (): Promise<Preferences> => {
      if (!userId) return DEFAULT_PREFERENCES;
      const { data, error } = await rcDb("reading_center_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_PREFERENCES;
      return {
        ...DEFAULT_PREFERENCES,
        ...data,
        line_spacing: Number(data.line_spacing),
      };
    },
    enabled: !!userId,
  });
}

export function useSavePreferences(): UseMutationResult<Preferences, Error, Partial<Preferences>> {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Preferences>): Promise<Preferences> => {
      if (!userId) throw new Error("Not authenticated");
      const current =
        queryClient.getQueryData<Preferences>(["reading-center", "prefs", userId]) ?? DEFAULT_PREFERENCES;
      const merged: Preferences = { ...current, ...input };
      const payload = {
        user_id: userId,
        ...merged,
        updated_at: new Date().toISOString(),
      };
      const { error } = await rcDb("reading_center_preferences").upsert(payload, {
        onConflict: "user_id",
      });
      if (error) throw error;
      return merged;
    },
    onMutate: async (input: Partial<Preferences>) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ["reading-center", "prefs", userId] });
      const previous =
        queryClient.getQueryData<Preferences>(["reading-center", "prefs", userId]) ?? DEFAULT_PREFERENCES;
      const merged: Preferences = { ...previous, ...input };
      queryClient.setQueryData(["reading-center", "prefs", userId], merged);
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous && userId) {
        queryClient.setQueryData(["reading-center", "prefs", userId], context.previous);
      }
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["reading-center", "prefs", userId] });
      }
    },
  });
}

export function useProgressList(): UseQueryResult<Progress[], Error> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["reading-center", "progress", userId],
    queryFn: async (): Promise<Progress[]> => {
      if (!userId) return [];
      const { data, error } = await rcDb("reading_center_progress")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as Progress[];
    },
    enabled: !!userId,
  });
}

export interface SaveProgressInput {
  passage_id: string;
  word_index: number;
  completed?: boolean;
  hidden_from_recent?: boolean;
}

export function useSaveProgress(): UseMutationResult<void, Error, SaveProgressInput> {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveProgressInput): Promise<void> => {
      if (!userId) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const payload: {
        user_id: string;
        passage_id: string;
        word_index: number;
        last_opened_at: string;
        completed_at?: string;
        hidden_from_recent?: boolean;
      } = {
        user_id: userId,
        passage_id: input.passage_id,
        word_index: input.word_index,
        last_opened_at: now,
      };

      if (input.completed === true) {
        payload.completed_at = now;
      }
      if (typeof input.hidden_from_recent === "boolean") {
        payload.hidden_from_recent = input.hidden_from_recent;
      }

      const { error } = await rcDb("reading_center_progress").upsert(payload, {
        onConflict: "user_id,passage_id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["reading-center", "progress", userId] });
      }
    },
  });
}

export function useBookmarks(passageId: string | undefined): UseQueryResult<Bookmark[], Error> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["reading-center", "bookmarks", userId, passageId],
    queryFn: async (): Promise<Bookmark[]> => {
      if (!userId || !passageId) return [];
      const { data, error } = await rcDb("reading_center_bookmarks")
        .select("*")
        .eq("user_id", userId)
        .eq("passage_id", passageId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
    enabled: !!userId && !!passageId,
  });
}

export function useAddBookmark(): UseMutationResult<Bookmark, Error, { passage_id: string; word_index: number }> {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { passage_id: string; word_index: number }): Promise<Bookmark> => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await rcDb("reading_center_bookmarks")
        .insert({
          user_id: userId,
          passage_id: input.passage_id,
          word_index: input.word_index,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Bookmark;
    },
    onSuccess: (_data, vars) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["reading-center", "bookmarks", userId, vars.passage_id] });
      }
    },
  });
}

export function useDeleteBookmark(): UseMutationResult<void, Error, { id: string; passage_id?: string }> {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; passage_id?: string }): Promise<void> => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await rcDb("reading_center_bookmarks")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      if (userId) {
        if (vars.passage_id) {
          queryClient.invalidateQueries({ queryKey: ["reading-center", "bookmarks", userId, vars.passage_id] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["reading-center", "bookmarks", userId] });
        }
      }
    },
  });
}

export function useSessions(sinceIso?: string): UseQueryResult<ReadingSession[], Error> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["reading-center", "sessions", userId, sinceIso],
    queryFn: async (): Promise<ReadingSession[]> => {
      if (!userId) return [];
      let query = rcDb("reading_center_sessions")
        .select("*")
        .eq("user_id", userId);
      if (sinceIso) {
        query = query.gte("started_at", sinceIso);
      }
      query = query.order("started_at", { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ReadingSession[];
    },
    enabled: !!userId,
  });
}

export function useRecordSession(): UseMutationResult<void, Error, Omit<ReadingSession, "id">> {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: Omit<ReadingSession, "id">): Promise<void> => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await rcDb("reading_center_sessions").insert({
        user_id: userId,
        passage_id: session.passage_id,
        reading_mode: session.reading_mode,
        wpm: session.wpm,
        words_read: session.words_read,
        active_ms: session.active_ms,
        paused_ms: session.paused_ms,
        started_at: session.started_at,
        ended_at: session.ended_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["reading-center", "sessions", userId] });
      }
    },
  });
}

export function useUpsertPassage(): UseMutationResult<
  Passage,
  Error,
  Partial<Passage> & { title: string; body: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      passage: Partial<Passage> & { title: string; body: string },
    ): Promise<Passage> => {
      const word_count = countWords(passage.body);
      const now = new Date().toISOString();
      const payload = {
        ...passage,
        word_count,
        updated_at: now,
      };
      const { data, error } = await rcDb("reading_center_passages")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Passage;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reading-center", "passages"] });
      if (vars.slug) {
        queryClient.invalidateQueries({ queryKey: ["reading-center", "passage", vars.slug] });
      }
    },
  });
}

export function useDeletePassage(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await rcDb("reading_center_passages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-center", "passages"] });
    },
  });
}

export function useReorderPassages(): UseMutationResult<void, Error, { id: string; sort_order: number }[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]): Promise<void> => {
      for (const item of items) {
        const { error } = await rcDb("reading_center_passages")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-center", "passages"] });
    },
  });
}
