import { describe, it, expect } from 'vitest';
import {
  type SessionBundle,
  type BundlePart,
  type PartKey,
  ADMIN_PART_KEYS,
  STUDENT_PART_KEYS,
  allIncludedApproved,
  approvedPublishableParts,
  includedParts,
  isSessionBundle,
  partToMarkdown,
  patchPart,
  publishableParts,
  unpublishedApprovedParts,
} from './sessionBundle';

function part(over: Partial<BundlePart> = {}): BundlePart {
  return {
    include: true,
    approved: false,
    posted: false,
    audience: 'student',
    body_markdown: 'body',
    ...over,
  };
}

function bundle(parts: Partial<Record<PartKey, BundlePart>>): SessionBundle {
  return { version: 1, source: {}, parts };
}

describe('audience separation (the leak invariant)', () => {
  it('never treats an admin-only part as publishable', () => {
    const b = bundle({
      session_note: part(),
      weakness_tags: part({ audience: 'admin' }),
      drill_recs: part({ audience: 'admin' }),
      next_agenda: part({ audience: 'admin' }),
      private_note: part({ audience: 'admin' }),
    });
    expect(publishableParts(b)).toEqual(['session_note']);
    for (const key of ADMIN_PART_KEYS) {
      expect(publishableParts(b)).not.toContain(key);
    }
  });

  // The LLM fills `audience`, so it is untrusted input. Publishability must be
  // decided by the hardcoded key list, never by what the model labelled a part.
  it('does not leak a private note even if the model mislabels it audience=student', () => {
    const b = bundle({
      private_note: part({ audience: 'student', approved: true }),
    });
    expect(publishableParts(b)).toEqual([]);
    expect(approvedPublishableParts(b)).toEqual([]);
    expect(unpublishedApprovedParts(b)).toEqual([]);
  });

  it('keeps the student and admin key sets disjoint', () => {
    for (const k of STUDENT_PART_KEYS) expect(ADMIN_PART_KEYS).not.toContain(k);
  });

  it('excludes parts that are not included', () => {
    const b = bundle({ session_note: part({ include: false }), homework: part() });
    expect(publishableParts(b)).toEqual(['homework']);
    expect(includedParts(b)).toEqual(['homework']);
  });
});

describe('approval rollup', () => {
  it('is false until every included part is approved', () => {
    const b = bundle({ session_note: part({ approved: true }), homework: part() });
    expect(allIncludedApproved(b)).toBe(false);
    expect(allIncludedApproved(patchPart(b, 'homework', { approved: true }))).toBe(true);
  });

  it('does not let an unapproved admin part block approval of student parts', () => {
    const b = bundle({
      session_note: part({ approved: true }),
      private_note: part({ audience: 'admin', approved: false }),
    });
    expect(allIncludedApproved(b)).toBe(true);
  });

  it('still requires non-private admin parts to be approved', () => {
    const b = bundle({
      session_note: part({ approved: true }),
      weakness_tags: part({ audience: 'admin', approved: false }),
    });
    expect(allIncludedApproved(b)).toBe(false);
  });

  it('is false for an empty bundle rather than vacuously true', () => {
    expect(allIncludedApproved(bundle({}))).toBe(false);
    expect(allIncludedApproved(bundle({ session_note: part({ include: false }) }))).toBe(false);
  });

  it('only counts approved parts as publishable', () => {
    const b = bundle({ session_note: part({ approved: true }), homework: part() });
    expect(approvedPublishableParts(b)).toEqual(['session_note']);
  });

  it('skips already-posted parts so re-publish is idempotent', () => {
    const b = bundle({
      session_note: part({ approved: true, posted: true }),
      homework: part({ approved: true }),
    });
    expect(unpublishedApprovedParts(b)).toEqual(['homework']);
  });
});

describe('patchPart', () => {
  it('patches immutably and leaves other parts alone', () => {
    const b = bundle({ session_note: part(), homework: part() });
    const next = patchPart(b, 'session_note', { approved: true });
    expect(next.parts.session_note?.approved).toBe(true);
    expect(b.parts.session_note?.approved).toBe(false);
    expect(next.parts.homework).toBe(b.parts.homework);
  });

  it('is a no-op for a part that does not exist', () => {
    const b = bundle({ session_note: part() });
    expect(patchPart(b, 'quiz', { approved: true })).toBe(b);
  });
});

describe('partToMarkdown', () => {
  it('prefers an explicit body and trims it', () => {
    expect(partToMarkdown('session_note', part({ body_markdown: '  hello  ' }))).toBe('hello');
  });

  it('renders homework items as a checklist', () => {
    const p = part({ body_markdown: undefined, items: ['PT 90 LR1', 'Review flaws'] });
    expect(partToMarkdown('homework', p)).toBe('- [ ] PT 90 LR1\n- [ ] Review flaws');
  });

  it('renders quiz items with answers, and why only when present', () => {
    const p = part({
      body_markdown: undefined,
      items: [{ prompt: 'What is the conclusion?', answer: 'The last sentence', why: 'Because.' },
              { prompt: 'Name the flaw', answer: 'Ad hominem' }],
    });
    const out = partToMarkdown('quiz', p);
    expect(out).toContain('**1. What is the conclusion?**');
    expect(out).toContain('_Answer:_ The last sentence');
    expect(out).toContain('Because.');
    expect(out).toContain('**2. Name the flaw**');
  });

  // Guards the publish path: an empty render must be detectable, because
  // posting it would notify the student about a blank recap.
  it('returns an empty string when there is nothing to render', () => {
    expect(partToMarkdown('session_note', part({ body_markdown: undefined }))).toBe('');
    expect(partToMarkdown('session_note', part({ body_markdown: '   ' }))).toBe('');
    expect(partToMarkdown('homework', part({ body_markdown: undefined, items: [] }))).toBe('');
  });
});

describe('isSessionBundle', () => {
  it('accepts a bundle and rejects other draft shapes', () => {
    expect(isSessionBundle(bundle({}))).toBe(true);
    expect(isSessionBundle({ subject: 'a recap draft' })).toBe(false);
    expect(isSessionBundle(null)).toBe(false);
    expect(isSessionBundle('parts')).toBe(false);
  });
});
