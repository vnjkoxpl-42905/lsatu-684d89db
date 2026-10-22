/**
 * One owner for the signed-in actor's inbox summaries.
 *
 * Every badge and preview (classroom rail, Home, floating messenger, mainhub
 * chat, admin hubs, the roster's unread dot) reads this store, so they count
 * the same thing: unread CONVERSATIONS. Before 2026-10-22 the rail counted
 * messages and Home counted threads, so one student's three replies read as
 * "3" in the rail and "1" on Home at the same moment.
 *
 * Ownership rules:
 * - Entries are keyed by user id. A different account never sees another
 *   account's entry, and subscribing as a new account drops every other entry.
 * - One fetch at a time per actor wins: a response that started before a newer
 *   one is discarded, so a slow early read can never overwrite a fresh one.
 * - One realtime channel and one set of window listeners per actor, opened by
 *   the first subscriber and closed by the last, however many hooks mount.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from './useInbox';

export interface InboxSnapshot {
  userId: string | null;
  conversations: Conversation[];
  /** True until the first read for this actor settles. */
  loading: boolean;
  error: string | null;
  /** Set once a read has succeeded for this actor. */
  loaded: boolean;
}

type Listener = () => void;

interface Entry {
  snapshot: InboxSnapshot;
  listeners: Set<Listener>;
  seq: number;
  teardown: (() => void) | null;
}

const EMPTY_SNAPSHOT: InboxSnapshot = {
  userId: null,
  conversations: [],
  loading: false,
  error: null,
  loaded: false,
};

const entries = new Map<string, Entry>();

/* ── timestamps ───────────────────────────────────────────────────────── */

/**
 * Microsecond sort key for a Postgres timestamp. `Date` keeps milliseconds
 * only, and a watermark truncated to milliseconds sits just BEFORE the message
 * it is meant to cover, which would leave that message unread forever.
 */
export function timestampKey(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 0;
  const fraction = /\.(\d+)/.exec(iso)?.[1] ?? '';
  const extraMicros = Number((fraction.slice(3, 6) || '').padEnd(3, '0')) || 0;
  return ms * 1000 + extraMicros;
}

/* ── fetching ─────────────────────────────────────────────────────────── */

/** Rows asked for per page. The server may cap lower; paging ends on an empty page, not a short one. */
export const MESSAGE_PAGE_SIZE = 1000;
const ID_CHUNK = 100;

/**
 * Read every row a message query matches, oldest first, in stable pages keyed
 * on (created_at, id). Keyset rather than offset paging, so a row inserted or
 * deleted mid-scan cannot shift a page boundary and skip or repeat a message.
 * Stops only on an empty page, so a server cap below the requested page size
 * still cannot truncate the result silently.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllAscending<T extends { id: string; created_at: string }>(build: () => any): Promise<T[]> {
  const rows: T[] = [];
  let cursor: { id: string; created_at: string } | null = null;
  for (;;) {
    let query = build()
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(MESSAGE_PAGE_SIZE);
    if (cursor) {
      query = query.or(
        `created_at.gt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.gt.${cursor.id})`,
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as T[];
    if (page.length === 0) return rows;
    rows.push(...page);
    cursor = page[page.length - 1];
  }
}

export async function fetchInboxSummaries(userId: string): Promise<Conversation[]> {
  // Every failure throws. A swallowed error used to render as an empty inbox,
  // which told a student they had no messages when the read had failed.
  const { data: myParts, error: partsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at, home_cleared_at')
    .eq('user_id', userId);
  if (partsError) throw partsError;

  const convIds = (myParts ?? []).map((p) => p.conversation_id);
  if (convIds.length === 0) return [];

  const lastReadMap = new Map<string, string | null>(
    (myParts ?? []).map((p) => [p.conversation_id, p.last_read_at ?? null]),
  );
  const homeClearedMap = new Map<string, string | null>(
    (myParts ?? []).map((p) => [p.conversation_id, p.home_cleared_at ?? null]),
  );

  const { data: convs, error: convsError } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('last_message_at', { ascending: false });
  if (convsError) throw convsError;

  const { data: allParts, error: allPartsError } = await supabase
    .from('conversation_participants')
    .select('id, conversation_id, user_id, last_read_at')
    .in('conversation_id', convIds);
  if (allPartsError) throw allPartsError;

  // Names come through a SECURITY DEFINER RPC because RLS on profiles hides
  // other users from students. Non-fatal: a thread without names still works.
  const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id)));
  const { data: nameRows, error: namesError } = await supabase
    .rpc('get_conversation_participant_names', { _user_ids: userIds });
  if (namesError) console.warn('[inbox] participant names RPC failed:', namesError.message);
  const rows = (nameRows ?? []) as Array<{
    user_id: string;
    display_name: string | null;
    is_admin: boolean;
    last_seen_at: string | null;
  }>;
  const nameMap = new Map(rows.map((r) => [r.user_id, r.display_name]));
  const lastSeenMap = new Map(rows.map((r) => [r.user_id, r.last_seen_at]));
  const adminSet = new Set(rows.filter((r) => r.is_admin).map((r) => r.user_id));

  const { data: msgs, error: msgsError } = await supabase
    .rpc('get_latest_messages', { conv_ids: convIds });
  if (msgsError) throw msgsError;
  const lastMsgMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const m of msgs ?? []) {
    lastMsgMap.set(m.conversation_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
  }

  // A conversation is unread when it holds any incoming message newer than the
  // viewer's receipt, even if the viewer wrote something later.
  // A never-opened thread (null receipt) means every incoming message counts,
  // so the read is unbounded; otherwise it starts at the oldest receipt.
  const receipts = Array.from(lastReadMap.values());
  const oldestRead = receipts.some((value) => !value)
    ? null
    : receipts.reduce((oldest, value) => (timestampKey(value) < timestampKey(oldest) ? value : oldest));
  // Paged to the end: the backend caps each response, and an unpaged scan used
  // to drop whatever sat past the cap, newest unread included.
  const unreadMessages = await fetchAllAscending<{ id: string; conversation_id: string; created_at: string }>(() => {
    let query = supabase
      .from('messages')
      .select('id, conversation_id, created_at')
      .in('conversation_id', convIds)
      .neq('sender_id', userId);
    if (oldestRead) query = query.gt('created_at', oldestRead);
    return query;
  });

  const latestUnread = new Map<string, { id: string; created_at: string }>();
  for (const m of unreadMessages) {
    if (timestampKey(m.created_at) <= timestampKey(lastReadMap.get(m.conversation_id))) continue;
    // Ascending order, so the last qualifying row per thread is its newest.
    latestUnread.set(m.conversation_id, { id: m.id, created_at: m.created_at });
  }

  // The newest unread INCOMING line, for attention previews. The ordinary
  // last_message (which may be the viewer's own reply) stays for the inbox list.
  const unreadBodies = new Map<string, { body: string; created_at: string; sender_id: string }>();
  const latestIds = Array.from(latestUnread.values()).map((m) => m.id);
  for (let i = 0; i < latestIds.length; i += ID_CHUNK) {
    const { data: bodies, error: bodiesError } = await supabase
      .from('messages')
      .select('id, conversation_id, body, created_at, sender_id')
      .in('id', latestIds.slice(i, i + ID_CHUNK));
    if (bodiesError) throw bodiesError;
    for (const m of bodies ?? []) {
      unreadBodies.set(m.conversation_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
    }
  }

  const attachmentConvIds = new Set<string>();
  const { data: attConvs, error: attsError } = await supabase
    .rpc('get_conversations_with_attachments', { conv_ids: convIds });
  if (attsError) console.warn('[inbox] attachment presence read failed:', attsError.message);
  for (const row of attConvs ?? []) attachmentConvIds.add(row.conversation_id);

  return (convs ?? []).map((c) => ({
    ...c,
    participants: (allParts ?? [])
      .filter((p) => p.conversation_id === c.id)
      .map((p) => ({
        id: p.id,
        conversation_id: p.conversation_id,
        user_id: p.user_id,
        last_read_at: p.last_read_at,
        display_name: nameMap.get(p.user_id) ?? null,
        is_admin: adminSet.has(p.user_id),
        last_seen_at: lastSeenMap.get(p.user_id) ?? null,
      })),
    last_message: lastMsgMap.get(c.id) ?? null,
    unread: latestUnread.has(c.id),
    latest_unread_at: latestUnread.get(c.id)?.created_at ?? null,
    latest_unread_message: unreadBodies.get(c.id) ?? null,
    home_cleared_at: homeClearedMap.get(c.id) ?? null,
    hasAttachments: attachmentConvIds.has(c.id),
  }));
}

/* ── the store ────────────────────────────────────────────────────────── */

function emit(entry: Entry) {
  entry.listeners.forEach((listener) => listener());
}

function setSnapshot(entry: Entry, patch: Partial<InboxSnapshot>) {
  entry.snapshot = { ...entry.snapshot, ...patch };
  emit(entry);
}

function entryFor(userId: string): Entry {
  let entry = entries.get(userId);
  if (!entry) {
    entry = {
      snapshot: { userId, conversations: [], loading: true, error: null, loaded: false },
      listeners: new Set(),
      seq: 0,
      teardown: null,
    };
    entries.set(userId, entry);
  }
  return entry;
}

/** Re-read the actor's summaries. Older in-flight reads lose to this one. */
export async function refreshInbox(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  const entry = entryFor(userId);
  const mySeq = ++entry.seq;
  try {
    const conversations = await fetchInboxSummaries(userId);
    if (entry.seq !== mySeq || entries.get(userId) !== entry) return;
    setSnapshot(entry, { conversations, loading: false, error: null, loaded: true });
  } catch (error) {
    if (entry.seq !== mySeq || entries.get(userId) !== entry) return;
    console.error('[inbox] load failed:', error);
    // Keep whatever was last known; say the read failed rather than blank it.
    setSnapshot(entry, { loading: false, error: 'Could not load your messages' });
  }
}

const crossTab: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lsatu-inbox') : null;

function openOwner(userId: string): () => void {
  const reload = () => void refreshInbox(userId);
  const holds = (conversationId: unknown) =>
    typeof conversationId === 'string' &&
    (entries.get(userId)?.snapshot.conversations.some((c) => c.id === conversationId) ?? false);
  // Participant changes are NOT filtered to the viewer's own row: the other
  // person's receipt is what "Seen" reads, so a student opening the thread has
  // to reach a teacher who is sitting in it. RLS limits the stream to rows in
  // conversations the viewer belongs to.
  const channel = supabase
    .channel(`inbox-summaries-${userId}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, reload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, reload)
    .subscribe();
  // Backward-compatible same-tab signals from older writers.
  window.addEventListener('inbox:read', reload);
  window.addEventListener('inbox:home-cleared', reload);
  const onVisible = () => {
    if (document.visibilityState === 'visible') reload();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', reload);
  // Another tab wrote a receipt or a clear. Our own writes always matter; any
  // other actor's matter when they touch a thread this actor shares.
  const onCrossTab = (event: MessageEvent) => {
    if (event.data?.userId === userId || holds(event.data?.conversationId)) reload();
  };
  crossTab?.addEventListener('message', onCrossTab);
  return () => {
    void supabase.removeChannel(channel);
    window.removeEventListener('inbox:read', reload);
    window.removeEventListener('inbox:home-cleared', reload);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', reload);
    crossTab?.removeEventListener('message', onCrossTab);
  };
}

export function subscribeInbox(userId: string | null | undefined, listener: Listener): () => void {
  if (!userId) return () => {};
  // A different account signed in on this browser: nothing of the previous
  // account's inbox stays in memory to be drawn by mistake.
  for (const [otherId, other] of entries) {
    if (otherId !== userId && other.listeners.size === 0) {
      other.teardown?.();
      entries.delete(otherId);
    }
  }
  const entry = entryFor(userId);
  entry.listeners.add(listener);
  if (!entry.teardown) {
    entry.teardown = openOwner(userId);
    void refreshInbox(userId);
  }
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      entry.teardown?.();
      entry.teardown = null;
    }
  };
}

export function getInboxSnapshot(userId: string | null | undefined): InboxSnapshot {
  if (!userId) return EMPTY_SNAPSHOT;
  return entries.get(userId)?.snapshot ?? entryFor(userId).snapshot;
}

/** Local patch for an acknowledged write; a re-read follows to confirm it. */
export function patchInbox(userId: string, update: (conversations: Conversation[]) => Conversation[]) {
  const entry = entries.get(userId);
  if (!entry) return;
  // Invalidate any read already in flight: it started before this write and
  // would put the old state back.
  entry.seq++;
  setSnapshot(entry, { conversations: update(entry.snapshot.conversations) });
}

export function announceInboxChange(userId: string, kind: 'read' | 'home-cleared', conversationId?: string) {
  window.dispatchEvent(new CustomEvent(kind === 'read' ? 'inbox:read' : 'inbox:home-cleared'));
  crossTab?.postMessage({ userId, kind, conversationId });
}

/* ── read receipts ────────────────────────────────────────────────────── */

export type ReadAcknowledgement = 'acknowledged' | 'missing';

/**
 * Advance the actor's receipt through `watermark`, the created_at of the newest
 * incoming message actually fetched and shown. Never the client clock: a
 * message that lands after the thread rendered stays unread.
 *
 * The update is conditional (`last_read_at IS NULL OR < watermark`), so a newer
 * receipt from another tab or device is never pulled backwards. Zero rows back
 * is ambiguous, so the row is re-read: a receipt already at or past the
 * watermark is success, a missing membership is reported as such, and anything
 * else is an error the caller must surface and let the reader retry.
 */
export async function acknowledgeConversationRead({
  userId,
  conversationId,
  watermark,
}: {
  userId: string;
  conversationId: string;
  watermark: string;
}): Promise<ReadAcknowledgement> {
  const { data: updated, error: updateError } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: watermark })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .or(`last_read_at.is.null,last_read_at.lt."${watermark}"`)
    .select('id, last_read_at');
  if (updateError) throw updateError;

  let result: ReadAcknowledgement = 'acknowledged';
  if (!updated || updated.length === 0) {
    const { data: row, error: readError } = await supabase
      .from('conversation_participants')
      .select('id, last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) {
      result = 'missing';
    } else if (timestampKey(row.last_read_at) < timestampKey(watermark)) {
      throw new Error('The read receipt did not save.');
    }
  }

  patchInbox(userId, (conversations) =>
    result === 'missing'
      ? conversations.filter((c) => c.id !== conversationId)
      : conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const covered = timestampKey(c.latest_unread_at) <= timestampKey(watermark);
          return {
            ...c,
            unread: covered ? false : c.unread,
            latest_unread_at: covered ? null : c.latest_unread_at,
            latest_unread_message: covered ? null : c.latest_unread_message,
          };
        }),
  );
  announceInboxChange(userId, 'read', conversationId);
  void refreshInbox(userId);
  return result;
}

/** Test seam: forget every actor. */
export function __resetInboxStoreForTests() {
  for (const entry of entries.values()) entry.teardown?.();
  entries.clear();
}
