/**
 * Loader for the static RC bank in public/data/rc/.
 *
 * The index is small and loads once; per-PrepTest files load on demand and stay
 * cached in memory for the life of the page.
 */
import type {
  RcIndex,
  RcIndexPassage,
  RcPassage,
  RcPreptestFile,
  RcQuestionIndex,
} from './rcTypes';

let indexPromise: Promise<RcIndex> | null = null;
let questionIndexPromise: Promise<RcQuestionIndex> | null = null;
const preptestCache = new Map<number, Promise<RcPreptestFile>>();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return (await res.json()) as T;
}

/** Loads (and caches) the passage index. Safe to call from anywhere. */
export function loadRcIndex(): Promise<RcIndex> {
  if (!indexPromise) {
    indexPromise = fetchJson<RcIndex>('/data/rc/rc-index.json').catch((err) => {
      indexPromise = null; // let a later call retry rather than caching a failure
      throw err;
    });
  }
  return indexPromise;
}

/** Loads (and caches) the flat question search index used by `/rc/search`. */
export function loadRcQuestionIndex(): Promise<RcQuestionIndex> {
  if (!questionIndexPromise) {
    questionIndexPromise = fetchJson<RcQuestionIndex>('/data/rc/rc-question-index.json').catch(
      (err) => {
        questionIndexPromise = null; // let a later call retry rather than caching a failure
        throw err;
      },
    );
  }
  return questionIndexPromise;
}

/** Loads (and caches) one PrepTest's passages and questions. */
export function loadPreptest(preptest: number): Promise<RcPreptestFile> {
  const cached = preptestCache.get(preptest);
  if (cached) return cached;

  const promise = fetchJson<RcPreptestFile>(`/data/rc/RC-PT${preptest}.json`).catch((err) => {
    preptestCache.delete(preptest);
    throw err;
  });
  preptestCache.set(preptest, promise);
  return promise;
}

/** Finds which PrepTest a passage belongs to, then loads that passage in full. */
export async function loadPassage(passageId: number): Promise<RcPassage | null> {
  const index = await loadRcIndex();
  const pt = index.preptests.find((t) => t.passages.some((p) => p.passageId === passageId));
  if (!pt) return null;
  const file = await loadPreptest(pt.preptest);
  return file.passages.find((p) => p.passageId === passageId) ?? null;
}

/** Loads several passages, one PrepTest fetch per distinct test, order preserved. */
export async function loadPassages(passageIds: number[]): Promise<RcPassage[]> {
  const index = await loadRcIndex();
  const ptByPassage = new Map<number, number>();
  for (const pt of index.preptests) {
    for (const p of pt.passages) ptByPassage.set(p.passageId, pt.preptest);
  }
  const needed = [...new Set(passageIds.map((id) => ptByPassage.get(id)).filter(Boolean))];
  const files = await Promise.all(needed.map((n) => loadPreptest(n as number)));
  const byId = new Map<number, RcPassage>();
  for (const f of files) for (const p of f.passages) byId.set(p.passageId, p);
  return passageIds.map((id) => byId.get(id)).filter(Boolean) as RcPassage[];
}

/** Every passage in the index, flattened, with its PrepTest attached. */
export async function loadAllIndexPassages(): Promise<(RcIndexPassage & { preptest: number })[]> {
  const index = await loadRcIndex();
  return index.preptests.flatMap((pt) => pt.passages.map((p) => ({ ...p, preptest: pt.preptest })));
}

export {
  RC_TOPICS,
  RC_FORMATS,
  RC_FRAMEWORKS,
  RC_QUESTION_TYPES,
  RC_QUESTION_TYPE_FAMILIES,
  RC_FEATURES,
} from './rcTypes';
