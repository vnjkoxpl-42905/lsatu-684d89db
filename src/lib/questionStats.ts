/**
 * What the LSAT Lab cohort actually did on a question, keyed by the same qid
 * the question bank uses.
 *
 * The 1-5 `difficulty` label on a bank question is a human judgment about why a
 * question is hard. This is the other half: how many people got it right, and
 * which wrong answer caught them. The two disagree usefully — a question can be
 * easy to guess and hard to justify.
 *
 * Source: public/data/question-stats.json, built by
 * scripts/knowledge/build-question-stats.mjs from the markdown explanation
 * corpus. Supabase (`lr_answer_choices`) remains the source of truth for
 * *display*, one question at a time, via useLrExplanation; this is a derived
 * index for *selection*, which is a different job and cannot afford a
 * round-trip — countInBand runs during render.
 *
 * Coverage is partial and permanently so: ~193 bank questions have no data
 * (video-only questions LSAT Lab never wrote up, plus a handful of
 * transcription faults recorded as skips). Every consumer must treat a missing
 * stat as *no data* and degrade to the label, never as zero.
 */

export interface QuestionStat {
  /** The credited answer, from the corpus's authored line — never a tag. */
  correctChoice: string;
  /** Share of the cohort that picked it. Lower means harder. */
  correctPct: number;
  /** correctPct mapped back onto the bank's 1-5 scale, so it is comparable. */
  empiricalDifficulty: number;
  /** The wrong answer that caught the most people. */
  topTrapLetter: string | null;
  /** Its base taxonomy tag ("Too Strong"), or null when the choice was untagged. */
  topTrapTag: string | null;
  /** The full authored tag ("Too Strong: must / ensure"), for display. */
  topTrapTagRaw: string | null;
  topTrapPct: number;
  /**
   * The top trap's share of the WRONG mass, 0-1. A question where nearly all
   * the wrong answers land on one choice teaches that trap; one where they
   * scatter teaches carelessness. Same correctPct, different lesson.
   */
  trapSpread: number;
  choicePcts: Readonly<Record<string, number>>;
}

interface RawStat {
  c: string;
  cp: number;
  ed: number;
  tl: string | null;
  tt: string | null;
  ttr: string | null;
  tp: number;
  ts: number;
  p: Record<string, number>;
}

interface RawPayload {
  calibration: Record<string, number>;
  coverage: {
    statsQuestions: number;
    bankQuestions: number;
    statsAndBank: number;
    bankWithoutStats: number;
  };
  q: Record<string, RawStat>;
}

export interface QuestionStatsCoverage {
  statsQuestions: number;
  bankQuestions: number;
  statsAndBank: number;
  bankWithoutStats: number;
}

const hydrate = (raw: RawStat): QuestionStat => ({
  correctChoice: raw.c,
  correctPct: raw.cp,
  empiricalDifficulty: raw.ed,
  topTrapLetter: raw.tl,
  topTrapTag: raw.tt,
  topTrapTagRaw: raw.ttr,
  topTrapPct: raw.tp,
  trapSpread: raw.ts,
  choicePcts: raw.p,
});

/**
 * Lazy singleton, mirroring `questionBank` in questionLoader.ts: one fetch per
 * session, callers await `load()` and then read synchronously. Selection code
 * is synchronous by design and must never fetch — it receives the map.
 */
class QuestionStats {
  private map: Map<string, QuestionStat> | null = null;
  private coverageInfo: QuestionStatsCoverage | null = null;
  private loadPromise: Promise<void> | null = null;

  isReady(): boolean {
    return this.map !== null;
  }

  async load(): Promise<void> {
    if (this.isReady()) return;
    if (!this.loadPromise) {
      this.loadPromise = this.doLoad().finally(() => {
        if (!this.isReady()) this.loadPromise = null;
      });
    }
    return this.loadPromise;
  }

  private async doLoad(): Promise<void> {
    try {
      const res = await fetch('/data/question-stats.json');
      if (!res.ok) throw new Error(`question-stats.json: HTTP ${res.status}`);
      const payload = (await res.json()) as RawPayload;
      const map = new Map<string, QuestionStat>();
      for (const [qid, raw] of Object.entries(payload.q ?? {})) map.set(qid, hydrate(raw));
      this.map = map;
      this.coverageInfo = payload.coverage ?? null;
    } catch (e) {
      // Stats are an enhancement, never a gate. A drill must assign and run
      // with no percentages at all, exactly as it did before they existed.
      console.warn('[questionStats] unavailable, falling back to labels only:', e);
      this.map = new Map();
      this.coverageInfo = null;
    }
  }

  get(qid: string): QuestionStat | undefined {
    return this.map?.get(qid);
  }

  asMap(): ReadonlyMap<string, QuestionStat> {
    return this.map ?? new Map();
  }

  coverage(): QuestionStatsCoverage | null {
    return this.coverageInfo;
  }
}

export const questionStats = new QuestionStats();
