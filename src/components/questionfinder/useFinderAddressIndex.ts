import * as React from "react";

export interface FinderAddressRcPassage {
  id: number;
  /** The passage's position in its section — RC's Position, not a Set. */
  position: number;
  title: string | null;
  questions: Array<{
    /** Internal question id used to deep-link the RC player. */
    id: number;
    /** Official question number across the full section. */
    number: number;
  }>;
}

export interface FinderAddressSection {
  section: number;
  /** LR question numbers, ascending. Empty on an RC section. */
  lr: number[];
  /** RC passages, by position. Empty on an LR section. */
  rc: FinderAddressRcPassage[];
}

export interface FinderAddressTest {
  pt: number;
  sections: FinderAddressSection[];
}

export interface FinderAddressIndex {
  tests: FinderAddressTest[];
}

/**
 * The addresses, and only the addresses.
 *
 * Built by scripts/build-finder-address-index.mjs. This exists so the three
 * dropdowns can be populated and usable the instant Home paints: the real banks
 * are ~700 KB and `useQuestionFinderBanks` refuses to touch them until the
 * search panel is actually opened, which is a rule worth keeping. Picking an
 * address here routes into the bank, and the bank loads then.
 */
let cached: Promise<FinderAddressIndex> | null = null;

function load(): Promise<FinderAddressIndex> {
  if (!cached) {
    /* Promise.resolve().then, not a bare fetch(): under jsdom and any SSR pass
       `fetch` can be missing entirely, and a synchronous throw here would
       escape the caller's effect instead of landing in the catch below. */
    cached = Promise.resolve()
      .then(() => fetch("/data/finder-address-index.json"))
      .then((res) => {
        if (!res.ok) throw new Error(`finder address index ${res.status}`);
        return res.json() as Promise<FinderAddressIndex>;
      })
      .catch((err) => {
        cached = null; // let a later mount retry rather than caching the failure
        throw err;
      });
  }
  return cached;
}

export function useFinderAddressIndex(enabled = true) {
  const [tests, setTests] = React.useState<FinderAddressTest[]>([]);
  const [loading, setLoading] = React.useState(enabled);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    load()
      .then((index) => {
        if (cancelled) return;
        setTests(index.tests ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  return { tests, loading, failed, retry: () => setAttempt((value) => value + 1) };
}
