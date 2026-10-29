import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { BundlePart, PartKey, SessionBundle } from './sessionBundle';

const {
  mockMaterializePart,
  mockNotifyClassroomItem,
  mockNotifySessionRecap,
  mockUpdate,
  mockEq,
} = vi.hoisted(() => ({
  mockMaterializePart: vi.fn(),
  mockNotifyClassroomItem: vi.fn(),
  mockNotifySessionRecap: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock('@/lib/classroomNotify', () => ({
  notifyStudentOfClassroomItem: (args: unknown) => mockNotifyClassroomItem(args),
  summarizeNotifyResult: () => 'Posted and notified',
}));

vi.mock('@/lib/sessionBundleNotify', () => ({
  notifyStudentOfSessionRecap: (args: unknown) => mockNotifySessionRecap(args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: (p: unknown) => mockUpdate(p) }), rpc: (name: string, args: unknown) => name === 'materialize_session_bundle_part' ? mockMaterializePart(args) : Promise.resolve({ data: {}, error: null }) },
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
  mockMaterializePart.mockImplementation(async (args) => ({ data: { item: { id: 'item-uuid', student_id: 'student-uuid', source_id: 'draft-uuid', title: args.p_title, notification_group_id: args.p_part === 'session_note' ? 'recap-group' : args.p_notification_group_id }, created: true }, error: null }));
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
    expect(mockMaterializePart).not.toHaveBeenCalled();
  });

  it('never posts an unapproved part', async () => {
    const result = await publish(bundle({ session_note: part({ approved: false }) }));
    expect(result.nothing_to_publish).toBe(true);
    expect(mockMaterializePart).not.toHaveBeenCalled();
  });

  it('ignores an `only` request for a part that is not approved', async () => {
    const result = await publish(
      bundle({ session_note: part({ approved: true }), homework: part({ approved: false }) }),
      ['homework'],
    );
    expect(result.nothing_to_publish).toBe(true);
    expect(mockMaterializePart).not.toHaveBeenCalled();
  });

  it('posts a session note as a session_recap and uses the recap notifier', async () => {
    const result = await publish(bundle({ session_note: part() }));
    expect(mockMaterializePart).toHaveBeenCalledWith(
      expect.objectContaining({ p_part: 'session_note', p_student_id: 'student-uuid', p_draft_id: 'draft-uuid' }),
    );
    expect(mockNotifySessionRecap).toHaveBeenCalled();
    expect(mockNotifyClassroomItem).not.toHaveBeenCalled();
    expect(result.bundle.parts.session_note?.posted).toBe(true);
    expect(result.bundle.parts.session_note?.classroom_item_id).toBe('item-uuid');
  });

  it('posts homework as homework and uses the assignment notifier', async () => {
    await publish(bundle({ homework: part({ body_markdown: undefined, items: ['PT 90 LR1'] }) }));
    expect(mockMaterializePart).toHaveBeenCalledWith(
      expect.objectContaining({ p_part: 'homework', p_content_markdown: '- [ ] PT 90 LR1' }),
    );
    expect(mockNotifyClassroomItem).toHaveBeenCalled();
    expect(mockNotifySessionRecap).not.toHaveBeenCalled();
  });
});

describe('publishSessionBundle — empty parts are fail-closed', () => {
  it('refuses to post a part that renders to nothing, and does not notify', async () => {
    const result = await publish(bundle({ session_note: part({ body_markdown: '   ' }) }));
    expect(mockMaterializePart).not.toHaveBeenCalled();
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
    expect(mockMaterializePart).toHaveBeenCalledTimes(1);
    expect(mockMaterializePart).toHaveBeenCalledWith(expect.objectContaining({ p_part: 'homework' }));
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
    expect(mockMaterializePart).toHaveBeenCalledTimes(1);
    expect(mockMaterializePart).toHaveBeenCalledWith(expect.objectContaining({ p_part: 'homework' }));
    expect(result.published.map((o) => o.part)).toEqual(['homework']);
  });

  it('leaves a failed part unposted so a retry can pick it up', async () => {
    mockMaterializePart.mockRejectedValueOnce(new Error('RLS denied'));
    const result = await publish(bundle({ session_note: part() }));
    expect(result.ok).toBe(false);
    expect(result.published[0]).toMatchObject({ part: 'session_note', ok: false, error: 'RLS denied' });
    expect(result.bundle.parts.session_note?.posted).toBe(false);
  });

  it('does not touch the draft row when every part failed', async () => {
    mockMaterializePart.mockRejectedValue(new Error('boom'));
    await publish(bundle({ session_note: part() }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('leaves draft flag persistence to the atomic RPC without overwriting draft_json from a stale client', async () => {
    const result = await publish(bundle({ session_note: part() }));
    expect(result.ok).toBe(true); expect(result.bundle.parts.session_note?.posted).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('advances only the advisory ledger after materialization', async () => {
    const input = bundle({ homework: part() }); input.source = { ledger_id: 'ledger' };
    await publish(input); expect(mockUpdate).toHaveBeenCalledExactlyOnceWith({ status: 'published' });
  });
});


describe('atomic session-part retry', () => {
  it('reuses a part after its committed RPC response is lost without repeating optional messages', async () => {
    let saved: unknown;
    mockMaterializePart.mockImplementation(async (args) => {
      if (saved) return { data: { item: saved, created: false }, error: null };
      saved = { id: 'persisted-homework', student_id: args.p_student_id, source_id: args.p_draft_id, title: args.p_title, notification_group_id: args.p_notification_group_id };
      throw new Error('response lost after commit');
    });
    const staleInput = bundle({ homework: part() });
    const first = await publish(staleInput); const retried = await publish(staleInput);
    expect(first.ok).toBe(false); expect(retried.ok).toBe(true);
    expect(mockMaterializePart).toHaveBeenCalledTimes(2);
    expect(retried.bundle.parts.homework?.classroom_item_id).toBe('persisted-homework');
    expect(mockNotifyClassroomItem).not.toHaveBeenCalled(); expect(mockNotifySessionRecap).not.toHaveBeenCalled();
    expect(retried.published[0].notify_summary).toBe('Already posted');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it('reuses historical parts without manufacturing a new notification identity', async () => {
    mockMaterializePart.mockResolvedValue({ data: { item: { id: 'historical-homework', student_id: 'student-uuid', source_id: 'draft-uuid', title: 'Original work', notification_group_id: null }, created: false }, error: null });
    const result = await publish(bundle({ homework: part() }));
    expect(result.ok).toBe(true); expect(result.bundle.parts.homework?.classroom_item_id).toBe('historical-homework');
    expect(mockNotifyClassroomItem).not.toHaveBeenCalled();
  });
});
