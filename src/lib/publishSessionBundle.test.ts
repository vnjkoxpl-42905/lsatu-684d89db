import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { BundlePart, PartKey, SessionBundle } from './sessionBundle';

const {
  mockCreateClassroomItem,
  mockNotifyClassroomItem,
  mockNotifySessionRecap,
  mockUpdate,
  mockEq,
} = vi.hoisted(() => ({
  mockCreateClassroomItem: vi.fn(),
  mockNotifyClassroomItem: vi.fn(),
  mockNotifySessionRecap: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock('@/lib/classroomItems', () => ({
  createClassroomItem: (args: unknown) => mockCreateClassroomItem(args),
}));

vi.mock('@/lib/classroomNotify', () => ({
  notifyStudentOfClassroomItem: (args: unknown) => mockNotifyClassroomItem(args),
  summarizeNotifyResult: () => 'Posted and notified',
}));

vi.mock('@/lib/sessionBundleNotify', () => ({
  notifyStudentOfSessionRecap: (args: unknown) => mockNotifySessionRecap(args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: (p: unknown) => mockUpdate(p) }) },
}));

import { publishSessionBundle } from './publishSessionBundle';

const admin = { id: 'admin-uuid' } as User;

function part(over: Partial<BundlePart> = {}): BundlePart {
  return {
    include: true,
    approved: true,
    posted: false,
    audience: 'student',
    body_markdown: 'Real content',
    ...over,
  };
}

function bundle(parts: Partial<Record<PartKey, BundlePart>>): SessionBundle {
  return { version: 1, source: {}, parts };
}

function publish(b: SessionBundle, only?: PartKey[]) {
  return publishSessionBundle({ admin, studentId: 'student-uuid', draftId: 'draft-uuid', bundle: b, only });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: (c: unknown) => mockEq(c) });
  mockCreateClassroomItem.mockImplementation(async () => ({ id: 'item-uuid' }));
  mockNotifyClassroomItem.mockResolvedValue({ inbox_ok: true, bell_ok: true });
  mockNotifySessionRecap.mockResolvedValue({ inbox_ok: true, bell_ok: true });
});

describe('publishSessionBundle — what reaches the student', () => {
  it('never posts an admin-only part, even when approved and mislabelled student', async () => {
    const result = await publish(bundle({
      private_note: part({ audience: 'student' }),
      weakness_tags: part({ audience: 'student' }),
    }));
    expect(result.nothing_to_publish).toBe(true);
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
  });

  it('never posts an unapproved part', async () => {
    const result = await publish(bundle({ session_note: part({ approved: false }) }));
    expect(result.nothing_to_publish).toBe(true);
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
  });

  it('ignores an `only` request for a part that is not approved', async () => {
    const result = await publish(
      bundle({ session_note: part({ approved: true }), homework: part({ approved: false }) }),
      ['homework'],
    );
    expect(result.nothing_to_publish).toBe(true);
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
  });

  it('posts a session note as a session_recap and uses the recap notifier', async () => {
    const result = await publish(bundle({ session_note: part() }));
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session_recap', studentId: 'student-uuid', visibleToStudent: true }),
    );
    expect(mockNotifySessionRecap).toHaveBeenCalled();
    expect(mockNotifyClassroomItem).not.toHaveBeenCalled();
    expect(result.bundle.parts.session_note?.posted).toBe(true);
    expect(result.bundle.parts.session_note?.classroom_item_id).toBe('item-uuid');
  });

  it('posts homework as homework and uses the assignment notifier', async () => {
    await publish(bundle({ homework: part({ body_markdown: undefined, items: ['PT 90 LR1'] }) }));
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'homework', contentMarkdown: '- [ ] PT 90 LR1' }),
    );
    expect(mockNotifyClassroomItem).toHaveBeenCalled();
    expect(mockNotifySessionRecap).not.toHaveBeenCalled();
  });
});

describe('publishSessionBundle — empty parts are fail-closed', () => {
  it('refuses to post a part that renders to nothing, and does not notify', async () => {
    const result = await publish(bundle({ session_note: part({ body_markdown: '   ' }) }));
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
    expect(mockNotifySessionRecap).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.published[0]).toMatchObject({ part: 'session_note', ok: false });
    expect(result.published[0].error).toMatch(/empty/i);
    expect(result.bundle.parts.session_note?.posted).toBe(false);
  });

  it('still publishes the good parts alongside an empty one', async () => {
    const result = await publish(bundle({
      session_note: part({ body_markdown: '' }),
      homework: part({ body_markdown: 'Do PT 90' }),
    }));
    expect(mockCreateClassroomItem).toHaveBeenCalledTimes(1);
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(expect.objectContaining({ type: 'homework' }));
    expect(result.ok).toBe(false);
    expect(result.bundle.parts.homework?.posted).toBe(true);
    expect(result.bundle.parts.session_note?.posted).toBe(false);
  });
});

describe('publishSessionBundle — idempotency and partial failure', () => {
  it('skips a part already marked posted', async () => {
    const result = await publish(bundle({
      session_note: part({ posted: true }),
      homework: part(),
    }));
    expect(mockCreateClassroomItem).toHaveBeenCalledTimes(1);
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(expect.objectContaining({ type: 'homework' }));
    expect(result.published.map((o) => o.part)).toEqual(['homework']);
  });

  it('leaves a failed part unposted so a retry can pick it up', async () => {
    mockCreateClassroomItem.mockRejectedValueOnce(new Error('RLS denied'));
    const result = await publish(bundle({ session_note: part() }));
    expect(result.ok).toBe(false);
    expect(result.published[0]).toMatchObject({ part: 'session_note', ok: false, error: 'RLS denied' });
    expect(result.bundle.parts.session_note?.posted).toBe(false);
  });

  it('does not touch the draft row when every part failed', async () => {
    mockCreateClassroomItem.mockRejectedValue(new Error('boom'));
    await publish(bundle({ session_note: part() }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('persists posted flags and rolls the row to posted once something lands', async () => {
    await publish(bundle({ session_note: part() }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'posted' }));
  });

  it('reports failure when the draft row cannot be persisted', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'write failed' } });
    const result = await publish(bundle({ session_note: part() }));
    expect(result.ok).toBe(false);
  });
});
