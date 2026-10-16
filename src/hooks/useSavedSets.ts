import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  listSavedSets,
  saveSet,
  deleteSavedSet,
  duplicateSavedSet,
  renameSavedSet,
  type SavedSetRow,
  type SaveSetInput,
} from "@/lib/savedSets";

const EMPTY: SavedSetRow[] = [];

export function useSavedSets() {
  const { user, authReady } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["user_saved_sets", user?.id ?? null];

  const list = useQuery<SavedSetRow[]>({
    queryKey,
    enabled: authReady && !!user,
    queryFn: () => listSavedSets(user!.id),
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: (input: SaveSetInput) => saveSet(user!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: (setId: string) => deleteSavedSet(setId),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const duplicate = useMutation({
    mutationFn: (setId: string) => duplicateSavedSet(setId),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const rename = useMutation({
    mutationFn: ({ setId, newName }: { setId: string; newName: string }) =>
      renameSavedSet(setId, newName),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    sets: list.data ?? EMPTY,
    isLoading: list.isLoading,
    error: list.error,
    save,
    remove,
    duplicate,
    rename,
  };
}
