import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearCloseoutProgress,
  closeoutKey,
  outstandingWajQids,
  readCloseoutProgress,
  recordCloseoutProgress,
  writeCloseoutProgress,
} from './practiceTestCloseout';

const KEY = closeoutKey('user-1', 'run-9', 2);

beforeEach(() => {
  localStorage.clear();
});

describe('closeoutKey', () => {
  it('keys by user, run and leg, so two legs never share progress', () => {
    expect(KEY).toBe('lsatu:pt-closeout:user-1:run-9:2');
    expect(closeoutKey('user-1', 'run-9', 3)).not.toBe(KEY);
    expect(closeoutKey('user-2', 'run-9', 2)).not.toBe(KEY);
  });
});

describe('readCloseoutProgress', () => {
  it('reports no progress when nothing is stored', () => {
    expect(readCloseoutProgress(KEY)).toEqual({
      savedQids: [],
      wajQids: [],
      historySaved: false,
    });
  });

  it('treats unparseable stored progress as no progress', () => {
    localStorage.setItem(KEY, 'not json');
    expect(readCloseoutProgress(KEY)).toEqual({
      savedQids: [],
      wajQids: [],
      historySaved: false,
    });
  });

  it('ignores fields of the wrong shape rather than trusting them', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ savedQids: 'q1', wajQids: null, historySaved: 'yes' }),
    );
    expect(readCloseoutProgress(KEY)).toEqual({
      savedQids: [],
      wajQids: [],
      historySaved: false,
    });
  });
});

describe('recordCloseoutProgress', () => {
  it('accumulates across retries without duplicating', () => {
    recordCloseoutProgress(KEY, { savedQids: ['q1', 'q2'] });
    const after = recordCloseoutProgress(KEY, { savedQids: ['q2', 'q3'] });

    expect(after.savedQids).toEqual(['q1', 'q2', 'q3']);
  });

  it('keeps historySaved once set, when a later delta omits it', () => {
    recordCloseoutProgress(KEY, { historySaved: true });
    const after = recordCloseoutProgress(KEY, { wajQids: ['q1'] });

    expect(after.historySaved).toBe(true);
  });

  it('persists, so a fresh read after a reload sees the same progress', () => {
    recordCloseoutProgress(KEY, { wajQids: ['q1'], historySaved: true });

    expect(readCloseoutProgress(KEY)).toEqual({
      savedQids: [],
      wajQids: ['q1'],
      historySaved: true,
    });
  });
});

describe('outstandingWajQids', () => {
  const expected = ['q2', 'q5', 'q7'];

  it('is empty when every expected entry has been journaled', () => {
    writeCloseoutProgress(KEY, {
      savedQids: [],
      wajQids: ['q7', 'q2', 'q5'],
      historySaved: false,
    });

    expect(outstandingWajQids(expected, readCloseoutProgress(KEY))).toEqual([]);
  });

  it('names only what is still owed, so a retry redoes nothing extra', () => {
    writeCloseoutProgress(KEY, {
      savedQids: [],
      wajQids: ['q2'],
      historySaved: false,
    });

    expect(outstandingWajQids(expected, readCloseoutProgress(KEY))).toEqual([
      'q5',
      'q7',
    ]);
  });

  it('is everything when nothing has been journaled', () => {
    expect(outstandingWajQids(expected, readCloseoutProgress(KEY))).toEqual(
      expected,
    );
  });
});

describe('clearCloseoutProgress', () => {
  it('removes the key once the whole closeout has succeeded', () => {
    recordCloseoutProgress(KEY, { historySaved: true });
    clearCloseoutProgress(KEY);

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(readCloseoutProgress(KEY).historySaved).toBe(false);
  });
});
