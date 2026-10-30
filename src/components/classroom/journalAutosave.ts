import type { JournalDraft } from "@/components/journal/entry/ReviewForm";
import type { AnnotationStroke } from "@/lib/wajNotesService";

export type JournalSavePayload = {
  classId: string;
  qid: string;
  draft: JournalDraft;
  annotations: AnnotationStroke[];
};

export function mergeJournalDraft(
  latest: JournalDraft,
  patch: Partial<JournalDraft>,
): JournalDraft {
  return { ...latest, ...patch };
}

export function createJournalAutosaveQueue(
  save: (payload: JournalSavePayload) => Promise<void>,
  delay = 800,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: JournalSavePayload | null = null;
  let saveChain = Promise.resolve();

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const payload = pending;
    pending = null;
    if (!payload) return saveChain;

    saveChain = saveChain.then(() => save(payload));
    return saveChain;
  };

  const schedule = (payload: JournalSavePayload) => {
    if (timer) clearTimeout(timer);
    pending = payload;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delay);
  };

  return {
    schedule,
    flush,
  };
}
