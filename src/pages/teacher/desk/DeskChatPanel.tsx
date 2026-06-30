import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Bell, Clock, Flame, GraduationCap, Loader2, MessageSquare, Sparkles, UserPlus } from 'lucide-react';
import { useOperatorChatContext } from '@/components/teacher/ai-ta/OperatorChatProvider';
import { cn } from '@/lib/utils';
import { AssistantComposer } from './AssistantComposer';
import { ImageLightbox } from './ImageLightbox';
import { DraftReplyCard, type DraftReplyData } from './DraftReplyCard';
import { DeskCanvasPanel } from './DeskCanvasPanel';
import { DeskResourcePreviewPanel, type DeskResourcePreview } from './DeskResourcePreviewPanel';
import { LinkCard, linksFromToolResults, type LinkResult } from './LinkCard';
import { AssignmentOfferCard, type AssignmentOfferData } from './AssignmentOfferCard';
import type { OperatorImage, OperatorToolResult } from '@/hooks/useOperatorChat';
import { useNotifications, type Notification, type NotificationType } from '@/hooks/useNotifications';
import { formatRelativeShort } from '@/lib/time';

const STARTER_CANVAS = `# Collaborative Workspace

Welcome to your clean canvas! We can use this space to collaborate on whatever you are working on today.

## 🌟 What are we working on?

- **Drafting:** Paste your essay, story, email, or article here.
- **Brainstorming:** Drop your rough notes, outlines, or ideas.
- **Coding:** Paste your code or describe the application you want to build.

## 👇 Paste your work here

_Replace this line with your work, or reply in the chat with your goals._`;

type DeskSidePanel =
  | { type: 'canvas' }
  | { type: 'resource'; resource: DeskResourcePreview };

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'assignment':
      return <GraduationCap className="h-3.5 w-3.5" aria-hidden />;
    case 'message':
      return <MessageSquare className="h-3.5 w-3.5" aria-hidden />;
    case 'reminder':
      return <Clock className="h-3.5 w-3.5" aria-hidden />;
    case 'streak':
      return <Flame className="h-3.5 w-3.5" aria-hidden />;
    case 'signup':
      return <UserPlus className="h-3.5 w-3.5" aria-hidden />;
  }
}

/** Pull the renderable draft cards out of an assistant turn's tool results. */
function draftsFromToolResults(toolResults?: OperatorToolResult[]): DraftReplyData[] {
  if (!toolResults?.length) return [];
  return toolResults
    .filter((tr) => tr.name === 'create_draft' && tr.result?.ok)
    .map((tr) => (tr.result?.data as { draft?: DraftReplyData })?.draft)
    .filter((d): d is DraftReplyData => !!d && typeof d.draft_markdown === 'string');
}

function assignmentOffersFromToolResults(toolResults?: OperatorToolResult[]): AssignmentOfferData[] {
  if (!toolResults?.length) return [];
  return toolResults
    .filter((tr) => tr.name === 'create_assignment_offer' && tr.result?.ok)
    .map((tr) => (tr.result?.data as { assignment_offer?: AssignmentOfferData })?.assignment_offer)
    .filter((o): o is AssignmentOfferData => !!o && !!o.student_id && !!o.resource?.title);
}

/**
 * Center chat surface for the Teacher Desk. Light "instrument-panel" transcript
 * (not the dark AI TA page) plus the existing AssistantComposer. Reads the
 * shared OperatorChat session, so opening a saved chat from the left rail loads
 * its transcript here.
 */
export function DeskChatPanel({ localPreview }: { localPreview: boolean }) {
  const navigate = useNavigate();
  const { messages, isLoading, error, sendMessage } = useOperatorChatContext();
  const { notifications, unreadCount, loading: notificationsLoading, markRead, markAllRead } = useNotifications();
  const [input, setInput] = useState('');
  const [previewImage, setPreviewImage] = useState<OperatorImage | null>(null);
  const [sidePanel, setSidePanel] = useState<DeskSidePanel | null>(null);
  const [canvasBody, setCanvasBody] = useState(STARTER_CANVAS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;
  const panelOpen = sidePanel !== null;
  const canvasOpen = sidePanel?.type === 'canvas';
  const recentNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (text: string, context?: Record<string, unknown>) => {
    if (!text.trim() || localPreview || isLoading) return;
    sendMessage(text, context);
  };

  const submit = (sources?: import('./AssistantComposer').ComposerSubmitSources) => {
    const text = input.trim();
    const images = sources?.images ?? [];
    if (!text && images.length === 0) return;
    if (localPreview || isLoading) return;
    setInput('');
    const parts = text ? [text] : [];
    if (sources?.labels.length) {
      parts.push(`[Attached context: ${sources.labels.join(', ')}]`);
    }
    if (sources?.drive.length) {
      const drive = sources.drive.map((f) => `${f.name} (${f.url})`).join(', ');
      parts.push(`[Google Drive files: ${drive}]`);
    }

    const context: Record<string, unknown> = {};
    if (sources?.driveConnector) context.driveConnector = true;
    if (sources?.gmailConnector) context.gmailConnector = true;
    if (sources?.calendarConnector) context.calendarConnector = true;
    if (sources?.model) context.model = sources.model;
    sendMessage(
      parts.join('\n\n'),
      Object.keys(context).length ? context : undefined,
      images.length ? images : undefined,
    );
  };

  const openResourceBesideChat = (result: LinkResult & { url: string }, kindLabel: string) => {
    setSidePanel({
      type: 'resource',
      resource: {
        title: result.title,
        kindLabel,
        url: result.url,
      },
    });
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.read) void markRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col lg:h-full lg:min-h-0',
        panelOpen ? 'max-w-[1440px] gap-5 xl:flex-row' : 'max-w-[680px]',
      )}
    >
      <ImageLightbox
        src={previewImage?.dataUrl ?? null}
        alt={previewImage?.name ?? ''}
        open={previewImage !== null}
        onOpenChange={(next) => {
          if (!next) setPreviewImage(null);
        }}
      />
      <div className={cn('flex min-h-0 min-w-0 flex-col', panelOpen ? 'xl:w-[430px] xl:shrink-0' : 'flex-1')}>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-5"
        >
          {!localPreview ? (
            <section
              aria-label="Admin notifications"
              className="mb-5 rounded-[28px] border border-black/8 bg-[#fff8ea] p-3 shadow-[0_18px_48px_rgba(31,24,12,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#c8841f]/14 text-[#9b6310]">
                    <Bell className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight text-black/85">Admin notifications</div>
                    <div className="text-[11px] font-medium text-black/45">
                      {unreadCount > 0 ? `${unreadCount} unread in your bell feed` : 'Everything in your bell feed now lands here too'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={unreadCount === 0}
                  className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-black/55 transition hover:border-black/15 hover:bg-white/80 hover:text-black disabled:cursor-default disabled:opacity-40"
                >
                  Mark all read
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {notificationsLoading ? (
                  <div className="rounded-2xl border border-black/8 bg-white/70 px-3 py-2 text-xs text-black/45">
                    Loading notifications…
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 px-3 py-3 text-sm text-black/45">
                    No admin notifications yet.
                  </div>
                ) : (
                  recentNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                        notification.read
                          ? 'border-black/8 bg-white/72 hover:border-black/12 hover:bg-white'
                          : 'border-[#e7b765] bg-white hover:border-[#d59c3b] hover:bg-[#fffdf8]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          notification.read ? 'bg-black/[0.05] text-black/45' : 'bg-[#c8841f]/14 text-[#9b6310]',
                        )}
                      >
                        {notificationIcon(notification.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-black/85">{notification.title}</div>
                            {notification.body ? (
                              <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-black/55">{notification.body}</div>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-[11px] font-medium text-black/38">
                            {formatRelativeShort(notification.created_at)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {empty ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
                <Sparkles className="h-5 w-5 text-[#c8841f]" strokeWidth={1.6} />
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">What can I help you get done?</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-black/52">
                Draft replies, plan a student's next work, or summarize a session. Saved chats stay in the left rail to
                return to.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const drafts = message.role === 'assistant' ? draftsFromToolResults(message.tool_results) : [];
                const assignmentOffers = message.role === 'assistant' ? assignmentOffersFromToolResults(message.tool_results) : [];
                const links = message.role === 'assistant' ? linksFromToolResults(message.tool_results) : [];
                const showBubble = !!message.content || !!message.images?.length || !!message.pending;
                return (
                  <div
                    key={message.id}
                    className={cn('flex flex-col gap-2.5', message.role === 'user' ? 'items-end' : 'items-start')}
                  >
                    {showBubble ? (
                      <div
                        className={cn(
                          'max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed',
                          message.role === 'user'
                            ? 'bg-[#c8841f]/12 text-black/80'
                            : 'bg-white/70 text-black/80',
                        )}
                      >
                        {message.images?.length ? (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.images.map((img, index) => (
                              <button
                                key={`${message.id}-img-${index}`}
                                type="button"
                                onClick={() => setPreviewImage(img)}
                                aria-label={`Preview ${img.name}`}
                                className="block overflow-hidden rounded-md border border-black/15"
                              >
                                <img
                                  src={img.dataUrl}
                                  alt={img.name}
                                  className="h-24 w-24 object-cover transition hover:opacity-90"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {message.pending && !message.content ? (
                          <Loader2 className="h-4 w-4 animate-spin text-black/40" />
                        ) : message.content ? (
                          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {drafts.map((draft, index) => (
                      <DraftReplyCard
                        key={draft.id ?? `${message.id}-draft-${index}`}
                        draft={draft}
                        localPreview={localPreview}
                      />
                    ))}
                    {assignmentOffers.map((offer, index) => (
                      <AssignmentOfferCard
                        key={offer.id ?? `${message.id}-assignment-${index}`}
                        offer={offer}
                        onOpenBesideChat={(resource) => setSidePanel({ type: 'resource', resource })}
                      />
                    ))}
                    {assignmentOffers.length === 0
                      ? links.map((link, index) => (
                          <LinkCard
                            key={`${message.id}-link-${index}-${link.id}`}
                            result={link}
                            onOpenBesideChat={openResourceBesideChat}
                          />
                        ))
                      : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-2 border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700">{error}</div>
        ) : null}

        <AssistantComposer
          value={input}
          onChange={setInput}
          onSubmit={submit}
          loading={isLoading}
          disabled={localPreview}
          onUtilityCommand={send}
          onOpenCanvas={() => setSidePanel({ type: 'canvas' })}
          canvasOpen={canvasOpen}
          onCloseCanvas={() => setSidePanel(null)}
          readOnlyMessage={
            localPreview ? 'Assistant is read-only in local preview. It connects on the live teacher desk.' : undefined
          }
          placeholder="Ask the assistant anything..."
        />
      </div>

      {sidePanel?.type === 'canvas' ? (
        <DeskCanvasPanel
          value={canvasBody}
          onChange={setCanvasBody}
          canUseAi={!localPreview}
          onClose={() => setSidePanel(null)}
        />
      ) : null}
      {sidePanel?.type === 'resource' ? (
        <DeskResourcePreviewPanel resource={sidePanel.resource} onClose={() => setSidePanel(null)} />
      ) : null}
    </div>
  );
}
