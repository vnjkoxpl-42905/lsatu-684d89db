import { indicatorWordCards, type IndicatorGroup, type IndicatorWordCard } from './content/indicatorWordCards';

export type Outcome = 'right' | 'wrong';
export interface QueueEntry { id: string; retry: boolean }
/** Everything the deck needs to resume exactly where the student stopped. */
export interface DeckState {
  v: 1;
  round: number;
  queue: QueueEntry[];
  index: number;
  /** The group the student chose on the current card, until they move on. */
  picked: IndicatorGroup | null;
  results: Record<string, { first?: Outcome; second?: Outcome }>;
  earlier: { right: number; total: number }[];
}

const byId = new Map(indicatorWordCards.map(card => [card.id, card]));
export const cardById = (id: string): IndicatorWordCard | undefined => byId.get(id);

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function longestRun(cards: IndicatorWordCard[]): number {
  let best = 0; let run = 0;
  cards.forEach((card, i) => { run = i && cards[i - 1].group === card.group ? run + 1 : 1; best = Math.max(best, run); });
  return best;
}
const triples = (cards: IndicatorWordCard[]) => cards.reduce((n, card, i) => n + (i >= 2 && cards[i - 1].group === card.group && cards[i - 2].group === card.group ? 1 : 0), 0);
/** A true shuffle, then random swaps until no group repeats more than twice in a row. Some back-to-backs stay; long streaks do not. */
export function shuffleSpread(cards: IndicatorWordCard[], rng: () => number = Math.random): IndicatorWordCard[] {
  const order = shuffled(cards, rng);
  let bad = triples(order);
  for (let step = 0; step < 4000 && bad > 0; step += 1) {
    const i = Math.floor(rng() * order.length);
    const j = Math.floor(rng() * order.length);
    if (i === j || order[i].group === order[j].group) continue;
    [order[i], order[j]] = [order[j], order[i]];
    const now = triples(order);
    if (now <= bad) bad = now; else [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function newRound(previous?: DeckState, rng: () => number = Math.random, cards = indicatorWordCards): DeckState {
  return {
    v: 1, round: previous ? previous.round + 1 : 1,
    queue: shuffleSpread(cards, rng).map(card => ({ id: card.id, retry: false })),
    index: 0, picked: null, results: {},
    earlier: previous ? [...previous.earlier, { right: summarize(previous).right, total: cards.length }] : [],
  };
}

export const isFinished = (state: DeckState) => state.index >= state.queue.length;

/** Record the student's choice. A first-pass miss queues that card once, at the very end of the round. */
export function pick(state: DeckState, choice: IndicatorGroup): DeckState {
  const entry = state.queue[state.index];
  const card = entry && cardById(entry.id);
  if (!card || state.picked !== null) return state;
  const outcome: Outcome = choice === card.group ? 'right' : 'wrong';
  const prior = state.results[card.id] ?? {};
  const results = { ...state.results, [card.id]: entry.retry ? { ...prior, second: outcome } : { ...prior, first: outcome } };
  const queue = outcome === 'wrong' && !entry.retry ? [...state.queue, { id: card.id, retry: true }] : state.queue;
  return { ...state, picked: choice, results, queue };
}
export function advance(state: DeckState): DeckState {
  return state.picked === null ? state : { ...state, index: state.index + 1, picked: null };
}

export function summarize(state: DeckState) {
  const firstTotal = state.queue.filter(entry => !entry.retry).length;
  const entries = Object.entries(state.results);
  const right = entries.filter(([, r]) => r.first === 'right').length;
  const missed = entries.filter(([, r]) => r.first === 'wrong').length;
  const stillMissing = entries.filter(([, r]) => r.first === 'wrong' && r.second === 'wrong').map(([id]) => cardById(id)!.word);
  return { right, missed, firstTotal, stillMissing };
}

/** Accepts only a state that still matches the deck; anything else starts a fresh round rather than resuming into a broken one. */
export function readDeckState(raw: unknown, cards = indicatorWordCards): DeckState | null {
  const value = raw as Partial<DeckState> | null;
  if (!value || typeof value !== 'object' || value.v !== 1 || !Number.isInteger(value.round) || !Number.isInteger(value.index)) return null;
  if (!Array.isArray(value.queue) || !value.queue.every(entry => entry && typeof entry.id === 'string' && byId.has(entry.id) && typeof entry.retry === 'boolean')) return null;
  const firstPass = value.queue.filter(entry => !entry.retry);
  if (firstPass.length !== cards.length || new Set(firstPass.map(entry => entry.id)).size !== cards.length || !value.queue.every(entry => cards.some(card => card.id === entry.id))) return null;
  if (value.index! < 0 || value.index! > value.queue.length) return null;
  if (value.picked !== null && value.picked !== 1 && value.picked !== 2) return null;
  if (value.picked !== null && value.index === value.queue.length) return null;
  if (!value.results || typeof value.results !== 'object') return null;
  const outcome = (v: unknown) => v === undefined || v === 'right' || v === 'wrong';
  if (!Object.entries(value.results).every(([id, r]) => byId.has(id) && !!r && outcome(r.first) && outcome(r.second))) return null;
  const earlier = Array.isArray(value.earlier) ? value.earlier.filter(r => r && Number.isInteger(r.right) && Number.isInteger(r.total)) : [];
  return { v: 1, round: value.round!, queue: value.queue, index: value.index!, picked: value.picked ?? null, results: value.results, earlier };
}
