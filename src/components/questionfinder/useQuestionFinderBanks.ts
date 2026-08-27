import * as React from "react";
import { questionBank } from "@/lib/questionLoader";
import { loadRcIndex, loadRcQuestionIndex } from "@/features/rc/lib/rcBank";
import type {
  FinderLrSource,
  FinderRcPassageSource,
  FinderRcQuestionSource,
} from "./questionFinderSearch";

interface FinderBanks {
  lr: FinderLrSource[];
  rcPassages: FinderRcPassageSource[];
  rcQuestions: FinderRcQuestionSource[];
}

export interface FinderBanksState extends FinderBanks {
  loading: boolean;
  /** Set only when BOTH banks failed; one bank down still gives real results. */
  error: string | null;
  /** Named so a partial outage can be said out loud rather than silently halving results. */
  lrFailed: boolean;
  rcFailed: boolean;
}

const EMPTY: FinderBanks = { lr: [], rcPassages: [], rcQuestions: [] };

/**
 * Loads what the Question finder searches, and not one byte before it is asked.
 *
 * `enabled` is the whole point. The RC index is ~646 KB across two files that
 * Classroom Home does not otherwise fetch, and Home is the page a student opens
 * most. Nothing here runs until the finder is actually opened, and once loaded
 * it stays for the life of the page — both loaders cache their own promises.
 *
 * The two banks are awaited independently: RC being unreachable must not cost
 * the student their LR results, and the reverse.
 */
export function useQuestionFinderBanks(enabled: boolean): FinderBanksState {
  const [banks, setBanks] = React.useState<FinderBanks>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [lrFailed, setLrFailed] = React.useState(false);
  const [rcFailed, setRcFailed] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;

    /* No "have I started?" ref here, deliberately. A ref survives StrictMode's
       double-mount but the `cancelled` flag does not: the first effect would
       claim the work and then be cancelled, the second would see the ref and
       return early, and nothing would ever clear `loading`. The panel hung on
       "Loading questions…" forever. Both loaders cache their own promises —
       `questionBank` is a singleton, `loadRcIndex`/`loadRcQuestionIndex` hold
       theirs — so simply re-running the effect costs a map, not a fetch. */
    let cancelled = false;
    setLoading(true);

    const lrLoad = (async (): Promise<FinderLrSource[]> => {
      if (!questionBank.isReady()) await questionBank.load();
      return questionBank.getAllQuestions().map((question) => ({
        qid: question.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
        stimulus: question.stimulus,
        questionStem: question.questionStem,
      }));
    })();

    const rcLoad = (async () => {
      const [index, questionIndex] = await Promise.all([
        loadRcIndex(),
        loadRcQuestionIndex(),
      ]);
      const passages: FinderRcPassageSource[] = [];
      for (const preptest of index.preptests) {
        for (const passage of preptest.passages) {
          // A passage with nothing drillable on it is not a result: opening it
          // would ask the student nothing.
          if (passage.questionCount === 0) continue;
          passages.push({
            passageId: passage.passageId,
            preptest: preptest.preptest,
            section: passage.section,
            setNumber: passage.setNumber,
            title: passage.title,
            topic: passage.topic,
            questionCount: passage.questionCount,
            firstWords: passage.firstWords,
          });
        }
      }
      const questions: FinderRcQuestionSource[] = questionIndex.questions.map((entry) => ({
        questionId: entry.questionId,
        passageId: entry.passageId,
        preptest: entry.preptest,
        section: entry.section,
        qnum: entry.position,
        position: entry.position,
        prompt: entry.prompt,
      }));
      return { passages, questions };
    })();

    void Promise.allSettled([lrLoad, rcLoad]).then(([lrResult, rcResult]) => {
      if (cancelled) return;
      const next: FinderBanks = { ...EMPTY };

      if (lrResult.status === "fulfilled") next.lr = lrResult.value;
      else setLrFailed(true);

      if (rcResult.status === "fulfilled") {
        next.rcPassages = rcResult.value.passages;
        next.rcQuestions = rcResult.value.questions;
      } else setRcFailed(true);

      setBanks(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    ...banks,
    loading,
    lrFailed,
    rcFailed,
    error: lrFailed && rcFailed ? "Questions could not be loaded." : null,
  };
}
