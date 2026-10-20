import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';
import { ConversationView } from '@/components/inbox/ConversationView';
import { NewConversationDialog } from '@/components/inbox/NewConversationDialog';
import { GmailReadingPane } from '@/features/admin-inbox/gmail/components/GmailReadingPane';
import {
  useGmailLabels,
  useGmailModify,
  useGmailProfile,
  useGmailPull,
  useGmailThread,
  useGmailThreads,
} from '@/features/admin-inbox/gmail/hooks';
import type { ModifyAction } from '@/features/admin-inbox/gmail/hooks';
import { folderToLabelIds } from '@/features/admin-inbox/gmail/hooks/useGmailUrlState';
import { SYSTEM_LABELS, type GmailFolder } from '@/features/admin-inbox/gmail/api';
import {
  EMPTY_LABEL,
  itemKey,
  mergeInboxItems,
  parseItemKey,
  type InboxFilter,
  type InboxItem,
  type InboxSourceFilter,
} from './inboxItems';

/**
 * The Inbox room (spec D5/D11, plan T3.3): one triage list over both platform
 * threads and Gmail, with sync as an explicit Pull rather than background
 * polling. Replaces the dark Messages command center that was embedded here and
 * the separate Gmail workspace it hid behind a pane toggle.
 */

const SOURCE_CHIPS: { id: InboxSourceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'platform', label: 'Platform' },
  { id: 'email', label: 'Email' },
];

const FILTER_CHIPS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'needs_reply', label: 'Needs reply' },
  { id: 'attachments', label: 'Attachments' },
];

const GMAIL_THREAD_URL = 'https://mail.google.com/mail/u/0/#all';

const MAIL_FOLDERS: { id: GmailFolder; label: string }[] = [
  { id: 'INBOX', label: 'Inbox' },
  { id: 'STARRED', label: 'Starred' },
  { id: 'SENT', label: 'Sent' },
  { id: 'ALL', label: 'All mail' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'TRASH', label: 'Trash' },
];

/**
 * Which slice of the mailbox the Email half is showing. A folder and a user label
 * are alternatives, never both — the old pane kept them in two independent
 * useState slots, so picking Sent while a label was active listed the label's
 * threads under a highlighted Sent. One value can only hold one of them.
 */
type Mailbox = { kind: 'folder'; id: GmailFolder } | { kind: 'label'; id: string };

const DEFAULT_MAILBOX: Mailbox = { kind: 'folder', id: 'INBOX' };

function mailboxValue(mailbox: Mailbox) {
  return `${mailbox.kind}:${mailbox.id}`;
}

function formatTimestamp(ms: number): string {
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function TeacherInboxRoom() {
  const navigate = useNavigate();
  // One splat route, not /inbox + /inbox/:threadKey — two sibling routes would
  // remount this component on every list↔thread move, re-running the whole load
  // and (worse, now) re-fetching Gmail outside a Pull. Same reason the student
  // Inbox is mounted on a splat.
  const threadKey = useParams()['*'] || undefined;
  const { user } = useAuth();

  const [sourceFilter, setSourceFilter] = useState<InboxSourceFilter>('all');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [query, setQuery] = useState('');

  const { conversations, loading: platformLoading, error: platformError, refresh } = useInbox();

  const profileQuery = useGmailProfile();
  const adminEmail = profileQuery.data?.emailAddress ?? null;
  const labelsQuery = useGmailLabels();
  const labelsList = useMemo(() => labelsQuery.data ?? [], [labelsQuery.data]);

  const [mailbox, setMailbox] = useState<Mailbox>(DEFAULT_MAILBOX);
  const userLabels = useMemo(
    () => labelsList.filter((l) => l.type === 'user'),
    [labelsList],
  );

  // Searching escapes the mailbox constraint so in-platform search covers
  // everything (spec D11); with no search we list the selected folder or label.
  const trimmedQuery = query.trim();
  const mailboxLabelIds = useMemo(
    () => (mailbox.kind === 'label' ? [mailbox.id] : folderToLabelIds(mailbox.id)),
    [mailbox],
  );
  const threadsQuery = useGmailThreads({
    labelIds: trimmedQuery ? [] : mailboxLabelIds,
    q: trimmedQuery || undefined,
    maxResults: 50,
  });
  const threads = useMemo(() => threadsQuery.data?.threads ?? [], [threadsQuery.data]);

  const pull = useGmailPull(user?.id ?? null);

  const selected = useMemo(() => parseItemKey(threadKey), [threadKey]);

  const items = useMemo(
    () =>
      mergeInboxItems({
        conversations,
        ownId: user?.id ?? null,
        threads,
        adminEmail,
        sourceFilter,
        filter,
        query,
      }),
    [adminEmail, conversations, filter, query, sourceFilter, threads, user?.id],
  );

  const openItem = useCallback(
    (item: InboxItem) => navigate(`/teacher/inbox/${item.key}`),
    [navigate],
  );
  const closeItem = useCallback(() => navigate('/teacher/inbox'), [navigate]);

  const activeConversation = useMemo(
    () =>
      selected?.source === 'platform'
        ? conversations.find((c) => c.id === selected.id) ?? null
        : null,
    [conversations, selected],
  );

  const emailThreadId = selected?.source === 'email' ? selected.id : null;
  const emailThreadQuery = useGmailThread(emailThreadId, { markRead: true });
  const emailMessages = useMemo(
    () => emailThreadQuery.data?.messages ?? [],
    [emailThreadQuery.data],
  );
  const emailThreadLabelIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of emailMessages) for (const lid of m.labelIds) set.add(lid);
    return Array.from(set);
  }, [emailMessages]);

  const modify = useGmailModify();
  const fireModify = useCallback(
    (action: ModifyAction) => modify.mutate(action),
    [modify],
  );

  const listLoading =
    (sourceFilter !== 'email' && platformLoading) ||
    (sourceFilter !== 'platform' && threadsQuery.isLoading);

  const emptyLabel = trimmedQuery ? 'Nothing matches your search.' : EMPTY_LABEL[filter];

  const lastPulledLabel = pull.lastPulledAt
    ? `Last pulled ${new Date(pull.lastPulledAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : 'Not pulled yet';

  return (
    <section className="flex h-full w-full flex-col" aria-label="Inbox">
      <header className="shrink-0 border-b border-black/10 px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold tracking-tight text-black">Inbox</h1>
            <p className="mt-1 text-xs text-black/45">
              Platform messages and email in one queue.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex flex-col items-end">
              <button
                type="button"
                onClick={() => void pull.pull()}
                disabled={pull.isPulling}
                className="inline-flex items-center gap-1.5 bg-teacher-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-teacher-accent-hover disabled:opacity-60"
              >
                {pull.isPulling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {pull.isPulling ? 'Pulling…' : 'Pull'}
                {pull.newCount !== null && pull.newCount > 0 && !pull.isPulling ? (
                  <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-semibold">
                    {pull.newCount} new
                  </span>
                ) : null}
              </button>
              <span className="mt-1 text-xs text-black/40">
                {pull.error ? 'Pull failed' : lastPulledLabel}
              </span>
            </div>
            <NewConversationDialog
              showTrigger
              onCreated={(id) => navigate(`/teacher/inbox/${itemKey('platform', id)}`)}
              triggerLabel="New message"
              triggerClassName="border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/[0.04]"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ChipGroup<InboxSourceFilter>
            ariaLabel="Filter by source"
            options={SOURCE_CHIPS}
            value={sourceFilter}
            onChange={setSourceFilter}
          />
          <span className="h-4 w-px bg-black/10" aria-hidden />
          <ChipGroup<InboxFilter>
            ariaLabel="Filter threads"
            options={FILTER_CHIPS}
            value={filter}
            onChange={setFilter}
          />
          {sourceFilter !== 'platform' ? (
            <select
              aria-label="Mail folder"
              value={mailboxValue(mailbox)}
              onChange={(e) => {
                const [kind, ...rest] = e.target.value.split(':');
                const id = rest.join(':');
                setMailbox(kind === 'label' ? { kind: 'label', id } : { kind: 'folder', id: id as GmailFolder });
              }}
              className="h-8 border border-black/15 bg-white px-2 text-[13px] font-medium text-black/70 focus:border-black/35 focus:outline-none"
            >
              {MAIL_FOLDERS.map((f) => (
                <option key={f.id} value={`folder:${f.id}`}>
                  {f.label}
                </option>
              ))}
              {userLabels.length ? (
                <optgroup label="Labels">
                  {userLabels.map((l) => (
                    <option key={l.id} value={`label:${l.id}`}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          ) : null}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[280px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35"
              strokeWidth={1.5}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages and mail"
              aria-label="Search the inbox"
              className="h-9 w-full border border-black/15 bg-white pl-8 pr-2 text-[13px] text-black placeholder:text-black/35 focus:border-black/35 focus:outline-none"
            />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside
          className={cn(
            'min-h-0 flex-col overflow-y-auto border-r border-black/10 md:flex',
            selected ? 'hidden md:flex' : 'flex',
          )}
        >
          {platformError && sourceFilter !== 'email' ? (
            <p className="border-b border-black/10 px-4 py-2 text-xs text-[#8a3b2f]">
              {platformError}
            </p>
          ) : null}
          {threadsQuery.isError && sourceFilter !== 'platform' ? (
            <p className="border-b border-black/10 px-4 py-2 text-xs text-[#8a3b2f]">
              Couldn't load email. Press Pull to try again.
            </p>
          ) : null}

          {listLoading && items.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-black/45">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-black/45">{emptyLabel}</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.key} className="group relative">
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    aria-current={selected?.id === item.id ? 'true' : undefined}
                    className={cn(
                      'w-full border-b border-black/[0.06] px-4 py-3 text-left transition hover:bg-black/[0.03]',
                      selected?.id === item.id && 'bg-black/[0.05]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {item.source === 'email' ? (
                        <Mail className="h-3.5 w-3.5 shrink-0 text-black/35" strokeWidth={1.5} />
                      ) : (
                        <MessageSquare
                          className="h-3.5 w-3.5 shrink-0 text-black/35"
                          strokeWidth={1.5}
                        />
                      )}
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-[13px] text-black',
                          item.unread ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {item.who}
                      </span>
                      {item.hasAttachments ? (
                        <Paperclip className="h-3 w-3 shrink-0 text-black/35" strokeWidth={1.5} />
                      ) : null}
                      <span className="shrink-0 text-xs text-black/40">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    {item.subject ? (
                      <p className="mt-1 truncate text-[13px] text-black/70">{item.subject}</p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-black/45">{item.preview}</p>
                    {item.needsReply ? (
                      <span className="mt-1.5 inline-block bg-black/[0.06] px-1.5 py-0.5 text-xs font-medium text-black/60">
                        Needs reply
                      </span>
                    ) : null}
                  </button>
                  {/* The row-level escape hatch (spec 5.3). A sibling of the row
                      button, not a child — an anchor inside a button is invalid
                      and swallows the click on some browsers. */}
                  {item.source === 'email' ? (
                    <a
                      href={`${GMAIL_THREAD_URL}/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open "${item.subject || item.who}" in Gmail`}
                      className="absolute bottom-2.5 right-2 border border-black/15 bg-white p-1 text-black/55 opacity-0 transition hover:text-black focus:opacity-100 group-hover:opacity-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className={cn('min-h-0 flex-col', selected ? 'flex' : 'hidden md:flex')}>
          {selected?.source === 'platform' && activeConversation ? (
            <ConversationView
              conversation={activeConversation}
              onBack={closeItem}
              onMessageSent={refresh}
            />
          ) : selected?.source === 'email' && emailThreadId ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-4 py-2">
                <button
                  type="button"
                  onClick={closeItem}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-black/45 transition hover:text-black md:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Inbox
                </button>
                {/* The escape hatch (spec 5.3): anything the in-platform reader
                    can't do — printing, delegation, Gmail's own search — is one
                    click away. Reply itself stays in-platform, below. */}
                <a
                  href={`${GMAIL_THREAD_URL}/${emailThreadId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 border border-black/15 bg-white px-2.5 py-1.5 text-xs font-medium text-black transition hover:bg-black/[0.04]"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Open in Gmail
                </a>
              </div>
              <div className="min-h-0 flex-1">
                <GmailReadingPane
                  threadId={emailThreadId}
                  messages={emailMessages}
                  isLoading={emailThreadQuery.isLoading}
                  isError={emailThreadQuery.isError}
                  errorMessage={
                    emailThreadQuery.error instanceof Error
                      ? emailThreadQuery.error.message
                      : undefined
                  }
                  adminEmail={adminEmail}
                  labels={labelsList}
                  threadLabelIds={emailThreadLabelIds}
                  onBack={closeItem}
                  onArchive={() => {
                    fireModify({ kind: 'archive', ids: [emailThreadId] });
                    closeItem();
                  }}
                  onTrash={() => {
                    fireModify({ kind: 'trash', ids: [emailThreadId] });
                    closeItem();
                  }}
                  onMarkUnreadAndClose={() => {
                    fireModify({ kind: 'markUnread', ids: [emailThreadId] });
                    closeItem();
                  }}
                  onStarToggle={() =>
                    fireModify({
                      kind: emailThreadLabelIds.includes(SYSTEM_LABELS.STARRED)
                        ? 'unstar'
                        : 'star',
                      ids: [emailThreadId],
                    })
                  }
                  onAddLabel={(labelId) =>
                    fireModify({ kind: 'addLabel', ids: [emailThreadId], labelId })
                  }
                  onRemoveLabel={(labelId) =>
                    fireModify({ kind: 'removeLabel', ids: [emailThreadId], labelId })
                  }
                />
              </div>
            </div>
          ) : selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-black/45">
              That thread isn't in the current list. Clear the filters or press Pull.
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center gap-2 text-[13px] text-black/40 md:flex">
              <Reply className="h-4 w-4" strokeWidth={1.5} />
              Pick a thread to read and reply
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

function ChipGroup<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex items-center gap-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'whitespace-nowrap border px-2.5 py-1 text-[13px] transition',
            value === option.id
              ? 'border-black bg-black font-medium text-white'
              : 'border-black/15 bg-white font-medium text-black/55 hover:text-black',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
