import { describe, expect, it } from 'vitest';
import { indicatorWordCards, groupSentence } from './content/indicatorWordCards';
import { advance, cardById, isFinished, longestRun, mulberry32, newRound, pick, readDeckState, shuffleSpread, summarize, type DeckState } from './indicatorWordDeck';

const rightGroup = (state: DeckState) => cardById(state.queue[state.index].id)!.group;
const wrongGroup = (state: DeckState) => (rightGroup(state) === 1 ? 2 : 1);

describe('the word list', () => {
  it('has the 20 confirmed words, each once, in the right group', () => {
    expect(indicatorWordCards).toHaveLength(20);
    expect(new Set(indicatorWordCards.map(c => c.word)).size).toBe(20);
    const word = (w: string) => indicatorWordCards.find(c => c.word === w)?.group;
    expect(word('only')).toBe(2);
    expect(word('the only')).toBe(1);
    expect(word('only if')).toBe(2);
    expect(word('anyone')).toBe(1);
    expect(word('who')).toBe(1);
    expect(word('requires')).toBe(2);
    expect(indicatorWordCards.filter(c => c.group === 1)).toHaveLength(13);
    expect(indicatorWordCards.filter(c => c.group === 2)).toHaveLength(7);
  });
  it('says the group in one line', () => {
    expect(groupSentence(2)).toBe('This is a necessary condition indicator word, Group 2.');
    expect(groupSentence(1)).toBe('This is a sufficient condition indicator word, Group 1.');
  });
});

describe('the shuffle', () => {
  it('is a real shuffle that never repeats a group more than twice in a row', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 60; seed += 1) {
      const order = shuffleSpread(indicatorWordCards, mulberry32(seed));
      expect(order).toHaveLength(20);
      expect(new Set(order.map(c => c.id)).size).toBe(20);
      expect(longestRun(order)).toBeLessThanOrEqual(2);
      orders.add(order.map(c => c.id).join());
    }
    expect(orders.size).toBeGreaterThan(55);
  });
  it('still allows some back-to-backs', () => {
    const sawPair = Array.from({ length: 20 }, (_, i) => shuffleSpread(indicatorWordCards, mulberry32(i + 7))).some(order => longestRun(order) === 2);
    expect(sawPair).toBe(true);
  });
});

describe('a round', () => {
  it('queues a missed card once, at the end, after every card has been seen', () => {
    let state = newRound(undefined, mulberry32(3));
    const missedId = state.queue[0].id;
    state = advance(pick(state, wrongGroup(state)));
    expect(state.queue).toHaveLength(21);
    expect(state.queue[20]).toEqual({ id: missedId, retry: true });
    while (state.index < 20) state = advance(pick(state, rightGroup(state)));
    expect(isFinished(state)).toBe(false);
    expect(state.queue[state.index]).toEqual({ id: missedId, retry: true });
    state = advance(pick(state, wrongGroup(state)));
    expect(state.queue).toHaveLength(21);
    expect(isFinished(state)).toBe(true);
    expect(summarize(state)).toMatchObject({ right: 19, missed: 1, stillMissing: [cardById(missedId)!.word] });
  });
  it('ignores a second choice on the same card', () => {
    const state = newRound(undefined, mulberry32(4));
    const once = pick(state, wrongGroup(state));
    expect(pick(once, rightGroup(state))).toBe(once);
    expect(advance(state)).toBe(state);
  });
  it('starts a new round with every card, keeping the earlier score', () => {
    let state = newRound(undefined, mulberry32(5));
    while (!isFinished(state)) state = advance(pick(state, rightGroup(state)));
    const again = newRound(state, mulberry32(6));
    expect(again.round).toBe(2);
    expect(again.queue).toHaveLength(20);
    expect(again.earlier).toEqual([{ right: 20, total: 20 }]);
    expect(again.results).toEqual({});
  });
});

describe('saved progress', () => {
  it('survives a JSON round trip mid-round, mid-card and with a queued miss', () => {
    let state = newRound(undefined, mulberry32(8));
    state = advance(pick(state, wrongGroup(state)));
    state = advance(pick(state, rightGroup(state)));
    state = pick(state, rightGroup(state));
    expect(readDeckState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it('refuses a state that no longer matches the deck instead of resuming into it', () => {
    const state = newRound(undefined, mulberry32(9));
    expect(readDeckState(null)).toBeNull();
    expect(readDeckState({ ...state, v: 2 })).toBeNull();
    expect(readDeckState({ ...state, queue: state.queue.slice(1) })).toBeNull();
    expect(readDeckState({ ...state, queue: [{ id: 'gone', retry: false }, ...state.queue.slice(1)] })).toBeNull();
    expect(readDeckState({ ...state, index: 99 })).toBeNull();
    expect(readDeckState({ ...state, picked: 3 })).toBeNull();
  });
});
