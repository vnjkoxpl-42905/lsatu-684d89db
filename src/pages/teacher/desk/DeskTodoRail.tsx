import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronRight, ExternalLink, Loader2, Mail, MessageSquarePlus, Send, X } from 'lucide-react';
import { useGmailSend, useGmailThread } from '@/features/admin-inbox/gmail/hooks';
import { cn } from '@/lib/utils';
import { useDismissTeacherTodo } from './teacherTodoDismissals';
import type { CalendarTodoItem, GmailTodoItem, TeacherTodoItem } from './teacherTodoTypes';

export function DeskTodoRail({
  items,
  loading,
  onOpen,
  onInsertInChat,
}: {
  items: TeacherTodoItem[];
  loading: boolean;
  onOpen: (path: string) => void;
  onInsertInChat?: (text: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dismiss = useDismissTeacherTodo();

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">To-do</span>
        {!loading && items.length > 0 ? <span className="text-[11px] tabular-nums text-black/40">{items.length}</span> : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 border border-black/12 bg-white/20 px-3 py-3 text-sm text-black/50">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading tasks
        </div>
      ) : items.length === 0 ? (
        <p className="border border-dashed border-black/18 bg-white/15 px-3 py-3 text-xs leading-5 text-black/48">
          Nothing waiting. Replies, reviews, and assignments will land here.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="group border border-black/12 bg-white/15 px-3 py-2.5 text-left text-black transition hover:border-black/25 hover:bg-white/30"
              >
                <button
                  type="button"
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.title}`}
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">
                      {item.sourceKind === 'gmail' ? <Mail className="h-3 w-3" strokeWidth={1.6} /> : null}
                      {item.sourceKind === 'calendar' ? <CalendarDays className="h-3 w-3" strokeWidth={1.6} /> : null}
                      {item.label}
                    </span>
                    <span className="text-[11px] tabular-nums text-black/42">{item.timing}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{item.subject}</span>
                    <ChevronRight
                      className={cn('h-3.5 w-3.5 shrink-0 text-black/30 transition', expanded ? 'rotate-90 text-black/55' : 'group-hover:text-black/60')}
                      strokeWidth={1.6}
                    />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-black/48">{item.preview}</div>
                </button>

                <div className="mt-2 flex items-center justify-between">
                  {item.openPath ? (
                    <button
                      type="button"
                      onClick={() => onOpen(item.openPath!)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-black/48 transition hover:text-black"
                    >
                      Open source
                      <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    aria-label={`Dismiss ${item.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      dismiss.mutate({
                        sourceKind: item.sourceKind,
                        sourceId: item.sourceId,
                        expiresAt: item.dismissExpiresAt ?? null,
                      });
                    }}
                    className="inline-flex h-6 w-6 items-center justify-center text-black/35 hover:text-black"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </button>
                </div>

                {expanded ? (
                  item.sourceKind === 'gmail' ? (
                    <GmailTodoExpansion
                      item={item}
                      onOpen={() => onOpen(item.openPath ?? `/inbox?pane=gmail&t=${item.threadId}`)}
                      onInsertInChat={onInsertInChat}
                      onDone={() => setExpandedId(null)}
                    />
                  ) : item.sourceKind === 'calendar' ? (
                    <CalendarTodoExpansion item={item} onOpen={() => onOpen(item.openPath ?? '/teacher/schedule')} />
                  ) : (
                    <div className="mt-2 border-t border-black/10 pt-2 text-xs text-black/60">
                      <button type="button" onClick={() => item.openPath && onOpen(item.openPath)} className="font-semibold text-black/70 hover:text-black">
                        Open {item.label.toLowerCase()}
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GmailTodoExpansion({
  item,
  onOpen,
  onInsertInChat,
  onDone,
}: {
  item: GmailTodoItem;
  onOpen: () => void;
  onInsertInChat?: (text: string) => void;
  onDone: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const qc = useQueryClient();
  const threadQuery = useGmailThread(item.threadId, { markRead: false });
  const send = useGmailSend();
  const latestMessage = useMemo(() => {
    const messages = threadQuery.data?.messages ?? [];
    return [...messages].reverse().find((message) => message.from.toLowerCase().includes(item.fromEmail.toLowerCase())) ?? messages.at(-1);
  }, [item.fromEmail, threadQuery.data?.messages]);
  const messageBody = latestMessage?.text || latestMessage?.snippet || item.snippet;
  const messageDate = latestMessage?.date ? formatGmailDate(latestMessage.date) : item.timing;
  const insertText = [
    `Use this Gmail thread as context.`,
    `From: ${item.fromName || item.fromEmail} <${item.fromEmail}>`,
    `Subject: ${item.subjectLine}`,
    `Thread: ${item.threadId}`,
    '',
    messageBody,
  ].join('\n');

  return (
    <div className="mt-2 space-y-2.5 border-t border-black/10 pt-2.5 text-xs text-black/62">
      <section className="overflow-hidden border border-black/10 bg-white/40 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]">
        <div className="border-b border-black/10 bg-white/45 px-2.5 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-black/82">{item.subjectLine}</div>
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-black/48">
                <span className="truncate font-medium text-black/62">{item.fromName || item.fromEmail}</span>
                <span className="text-black/28">&lt;{item.fromEmail}&gt;</span>
              </div>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-black/42">{messageDate}</span>
          </div>
        </div>

        {threadQuery.isLoading ? (
          <div className="flex items-center gap-2 px-2.5 py-4 text-black/45">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            Loading email
          </div>
        ) : (
          <div className="max-h-48 overflow-auto bg-white/55 px-2.5 py-2.5">
            <p className="whitespace-pre-wrap text-[12px] leading-5 text-black/72">{messageBody}</p>
          </div>
        )}
      </section>
      <label className="block">
        <span className="sr-only">Reply to {item.fromName || item.fromEmail}</span>
        <textarea
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          rows={3}
          placeholder={`Reply to ${item.fromName || item.fromEmail}`}
          className="w-full resize-none border border-black/12 bg-white/45 px-2.5 py-2 text-xs leading-5 outline-none transition placeholder:text-black/35 focus:border-black/35"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onOpen} className="text-[11px] font-semibold text-black/50 hover:text-black">
            Open Gmail thread
          </button>
          {onInsertInChat ? (
            <button
              type="button"
              onClick={() => onInsertInChat(insertText)}
              disabled={threadQuery.isLoading}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-black/58 hover:text-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              <MessageSquarePlus className="h-3 w-3" strokeWidth={1.7} />
              Insert in chat
            </button>
          ) : null}
        </div>
        <button
          type="button"
          disabled={send.isPending || replyText.trim().length === 0}
          onClick={() => {
            send.mutate(
              {
                to: item.fromEmail,
                subject: item.subjectLine,
                text: replyText.trim(),
                threadId: item.threadId,
                inReplyTo: latestMessage?.messageIdHeader,
                references: latestMessage?.references || latestMessage?.messageIdHeader,
              },
              {
                onSuccess: () => {
                  setReplyText('');
                  onDone();
                  // The queue is a useMemo over the source queries, not a query
                  // of its own — there has never been a ['teacher-todo-queue']
                  // key to invalidate. Refreshing the source is what refreshes
                  // the queue.
                  qc.invalidateQueries({ queryKey: ['gmail', 'threads'] });
                },
              },
            );
          }}
          className="inline-flex items-center gap-1 border border-black/14 bg-black px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send className="h-3 w-3" strokeWidth={1.7} />
          Send reply
        </button>
      </div>
    </div>
  );
}

function formatGmailDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'MMM d, h:mm a');
}

function CalendarTodoExpansion({ item, onOpen }: { item: CalendarTodoItem; onOpen: () => void }) {
  return (
    <div className="mt-2 space-y-2 border-t border-black/10 pt-2 text-xs text-black/62">
      <div>
        {format(parseISO(item.startAt), 'EEE, MMM d · h:mm a')} - {format(parseISO(item.endAt), 'h:mm a')}
      </div>
      {item.location ? <div>{item.location}</div> : null}
      {item.description ? <div className="whitespace-pre-wrap">{item.description}</div> : null}
      <button type="button" onClick={onOpen} className="font-semibold text-black/70 hover:text-black">
        Open schedule
      </button>
    </div>
  );
}
