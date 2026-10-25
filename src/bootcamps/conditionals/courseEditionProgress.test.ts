import { describe, expect, it, vi } from 'vitest';
import { createEditionCourseStore, editionStorageScope } from './courseProgress';
import { emptyProgress, parseConditionalProgress, recordCourseStep } from './progress';
import { FULL_CONDITIONAL_EDITION as edition } from '@/lib/conditionalCourseEdition';
describe('read-only completion compatibility', () => {
  it('projects only compatible course completion and performs zero writes until explicit resume', () => {
    const raw = { meaning: { status: 'done' as const, updatedAt: '2026-10-18', state: { answer: 'kept' } } };
    const bytes = JSON.stringify(raw); const save = vi.fn();
    const store = createEditionCourseStore(raw, save, [{ id: 'meaning', contentRevision: 'r1', compatibleLegacyRevision: 'r1' }], edition);
    expect(store.steps.meaning).toMatchObject({ status: 'done' });
    expect(store.steps.meaning.state).toBeUndefined();
    store.save('meaning', { status: 'done' }); expect(save).not.toHaveBeenCalled();
    store.resume!('meaning'); expect(save).toHaveBeenCalledWith(`${edition}:meaning`, expect.objectContaining({ status: 'done', sourceCompletion: expect.objectContaining({ sourceKey: 'meaning' }), state: { answer: 'kept' } }));
    expect(save.mock.calls.at(-1)?.[1]).not.toHaveProperty('reopen');
    expect(JSON.stringify(raw)).toBe(bytes);
  });
  it('prefers a prefixed reopened state and preserves flat keys through persisted parsing', () => {
    let progress = emptyProgress();
    progress = recordCourseStep(progress, 'meaning', { status: 'done' });
    progress = recordCourseStep(progress, `${edition}:meaning`, { status: 'started', state: { draft: 'new' }, contentRevision: 'r1' });
    const restored = parseConditionalProgress(JSON.parse(JSON.stringify(progress)));
    const store = createEditionCourseStore(restored.course!, vi.fn(), [{ id: 'meaning', contentRevision: 'r1', compatibleLegacyRevision: 'r1' }], edition);
    expect(store.steps.meaning.status).toBe('started'); expect(store.priorCompletion).toEqual({});
    expect(restored.course!.meaning.status).toBe('done');
    expect(editionStorageScope('a', edition)).not.toBe(editionStorageScope('b', edition));
    expect(editionStorageScope('a', edition)).not.toBe(editionStorageScope('a'));
  });
  it('does not credit absent or changed revisions', () => {
    const raw = { meaning: { status: 'done' as const, updatedAt: 'date', contentRevision: 'r0' } };
    expect(createEditionCourseStore(raw, vi.fn(), [{ id: 'meaning', contentRevision: 'r1', compatibleLegacyRevision: 'r1' }], edition).steps).toEqual({});
    expect(createEditionCourseStore({}, vi.fn(), [{ id: 'meaning', contentRevision: 'r1' }], edition).steps).toEqual({});
  });
});

it('keeps compatible completed credit and counts visible after resume persistence', () => {
  let progress = recordCourseStep(emptyProgress(), 'meaning', { status: 'done', done: 4, total: 4, contentRevision: 'r1', state: { answer: 'saved' } });
  const steps = [{ id: 'meaning', contentRevision: 'r1', compatibleLegacyRevision: 'r1' }];
  const store = createEditionCourseStore(progress.course!, (id, patch) => { progress = recordCourseStep(progress, id, patch); }, steps, edition);
  store.resume!('meaning');
  const reopened = createEditionCourseStore(progress.course!, vi.fn(), steps, edition);
  expect(reopened.steps.meaning).toMatchObject({ status: 'done', done: 4, total: 4, state: { answer: 'saved' }, sourceCompletion: { sourceKey: 'meaning', contentRevision: 'r1' } });
  expect(Object.values(reopened.steps).filter(step => step.status === 'done')).toHaveLength(1);
  expect(reopened.priorCompletion).toEqual({});
});
it('exposes all edition-prefixed account tools without importing unprefixed drafts', () => {
  const saved = { status: 'started' as const, updatedAt: '2026-10-25', state: { index: 3 } };
  const raw = { [`${edition}:flashcards-indicators-group-1`]: saved, 'flashcards-indicators-group-2': saved };
  const store = createEditionCourseStore(raw, vi.fn(), [{ id: 'meaning' }], edition);
  expect(store.steps['flashcards-indicators-group-1']).toBe(saved);
  expect(store.steps['flashcards-indicators-group-2']).toBeUndefined();
});
