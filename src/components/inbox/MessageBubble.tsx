import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import { ScreenshotContextCard } from './ScreenshotContextCard';
import {
  isVisibleHelpAttachment,
  findHelpContextAttachment,
  findHelpScreenshotAttachment,
  stripHelpContextFromBody,
} from '@/lib/inboxAttachments';
import type { Message, MessageAttachment } from '@/hooks/useInbox';
import type { MessageCluster } from './messageClusters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  cluster: MessageCluster;
  onPreviewAttachment?: (attachment: MessageAttachment) => void;
  canDeleteMessage?: (message: Message) => boolean;
  onDeleteMessage?: (messageId: string) => void;
  /** Id of the caller's own most-recent message the other participant has
   *  opened past. When it matches a message in this cluster, we render a
   *  "Seen · <time>" indicator underneath. */
  lastSeenOwnMessageId?: string | null;
  otherLastReadAt?: string | null;
}

function shortTime(date: Date) {
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d, h:mm a');
}

function extractRouteAction(body: string) {
  const match = body.match(/(^|\s)(\/[A-Za-z0-9_/?#=&.%:-]+)/);
  const route = match?.[2];
  if (!route) return { displayBody: body, route: null };

  const displayBody = body
    .replace(route, '')
    .trim()
    .replace(/[ \t]+([.,!?;:])/g, '$1');

  return { displayBody, route };
}

const LINK_PATTERN =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s]+|mailto:[^\s]+)/g;

const JOSHUA_ROBOT_AVATAR_SRC = '/mainhub/joshua-robot-avatar.png';

function renderBody(text: string, isInstructor: boolean) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const linkClass = cn(
    'underline underline-offset-2 break-all transition-colors',
    isInstructor
      ? 'text-[#ffd9ad] hover:text-white'
      : 'text-[var(--msg-accent)] hover:opacity-80',
  );

  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const label = match[1] ?? match[3];
    let href = match[2] ?? match[3];
    // Trim trailing punctuation that commonly follows a bare URL in prose.
    const trailing = !match[1] ? (href.match(/[).,!?;:]+$/)?.[0] ?? '') : '';
    if (trailing) href = href.slice(0, href.length - trailing.length);
    const display = !match[1] && trailing ? label.slice(0, label.length - trailing.length) : label;

    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {display}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : text;
}

/** iMessage-style cluster shaping: bubbles inside a run tighten the corners
 *  that face their neighbours on the sender's side, so a burst reads as one
 *  connected shape with a tail on the final bubble. */
function bubbleCorners(isInstructor: boolean, index: number, count: number) {
  const first = index === 0;
  const last = index === count - 1;
  if (count === 1) return isInstructor ? 'rounded-[18px] rounded-br-[5px]' : 'rounded-[18px] rounded-bl-[5px]';
  if (isInstructor) {
    if (first) return 'rounded-[18px] rounded-br-[5px]';
    if (last) return 'rounded-[18px] rounded-tr-[5px] rounded-br-[5px]';
    return 'rounded-[18px] rounded-tr-[5px] rounded-br-[5px]';
  }
  if (first) return 'rounded-[18px] rounded-bl-[5px]';
  if (last) return 'rounded-[18px] rounded-tl-[5px] rounded-bl-[5px]';
  return 'rounded-[18px] rounded-tl-[5px] rounded-bl-[5px]';
}

export function MessageBubble({ cluster, onPreviewAttachment, canDeleteMessage, onDeleteMessage, lastSeenOwnMessageId, otherLastReadAt }: Props) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const headerTime = shortTime(new Date(cluster.createdAt));
  const isInstructor = cluster.isInstructor;
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Tap-to-reveal timestamp for touch devices; hover covers pointer-fine.
  const [revealedTimeId, setRevealedTimeId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        'flex w-full',
        isInstructor ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'flex max-w-full gap-3',
          isInstructor ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        {cluster.showAvatar ? (
          <div className="pt-[22px] shrink-0">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-[var(--msg-shadow)]',
                isInstructor
                  ? 'bg-[#070b11] ring-1 ring-black/10'
                  : 'bg-[var(--msg-accent-soft)] text-[12px] font-bold text-[var(--msg-ink)] ring-1 ring-[var(--msg-line)]',
              )}
            >
              {isInstructor ? (
                <img
                  src={JOSHUA_ROBOT_AVATAR_SRC}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                cluster.speakerInitials
              )}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'flex min-w-0 flex-col',
            isInstructor ? 'items-end' : 'items-start',
          )}
        >
          <div
            className={cn(
              'mb-[6px] flex items-center gap-1.5',
              isInstructor ? 'justify-end' : 'justify-start',
            )}
          >
            <span
              className={cn(
                'text-[12px] font-[650] leading-none',
                isInstructor ? 'text-[var(--msg-ink)]' : 'text-[var(--msg-accent)] brightness-90',
              )}
            >
              {cluster.speakerName}
            </span>
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                'bg-[var(--msg-meta-soft)]',
              )}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium leading-none text-[var(--msg-meta)]">
              {cluster.speakerRoleLabel} · {headerTime}
            </span>
          </div>

          <div className={cn('flex flex-col gap-[3px]', isInstructor ? 'items-end' : 'items-start')}>
            {cluster.messages.map((message, messageIndex) => {
              // Help-flow screenshot messages carry a matched image + hidden
              // context.json pair. Render them as a single polished card and
              // strip the (legacy) leaked context out of the body — the route
              // comes from the structured snapshot, not scraped body text.
              const helpContext = findHelpContextAttachment(message.attachments);
              const helpScreenshot = findHelpScreenshotAttachment(message.attachments);
              const isHelpScreenshot = !!helpContext && !!helpScreenshot;

              const displayBodyText = isHelpScreenshot
                ? stripHelpContextFromBody(message.body)
                : message.body;
              const hasBody = !!displayBodyText;
              const visibleAttachments = message.attachments.filter(isVisibleHelpAttachment);
              const hasAttachments = visibleAttachments.length > 0;
              const routeAction =
                hasBody && !isHelpScreenshot ? extractRouteAction(displayBodyText) : null;
              const canDelete = canDeleteMessage?.(message) ?? false;
              const timeRevealed = revealedTimeId === message.id;

              return (
                <motion.div
                  key={message.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className={cn(
                    'group/msg flex min-w-0 flex-col gap-3',
                    isInstructor ? 'items-end' : 'items-start',
                  )}
                >
                  {hasBody ? (
                    <div
                      className={cn(
                        'flex items-center gap-1.5',
                        isInstructor ? 'flex-row' : 'flex-row-reverse',
                      )}
                    >
                      <span
                        className={cn(
                          'shrink-0 text-[10px] font-semibold tabular-nums text-[var(--msg-meta)] transition-opacity duration-150',
                          timeRevealed ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100',
                        )}
                        aria-hidden={!timeRevealed}
                      >
                        {format(new Date(message.created_at), 'h:mm a')}
                      </span>
                      {canDelete && onDeleteMessage ? (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(message.id)}
                          className="shrink-0 rounded-full p-1.5 text-[var(--msg-meta-soft)] opacity-0 transition hover:bg-[var(--msg-hover)] hover:text-[var(--msg-ink)] focus:opacity-100 group-hover/msg:opacity-100 [@media(pointer:coarse)]:opacity-50"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <div
                        onClick={() => setRevealedTimeId(timeRevealed ? null : message.id)}
                        className={cn(
                          'relative break-words whitespace-pre-wrap px-[18px] py-[13px] text-[15px] leading-[1.6] transition-shadow',
                          bubbleCorners(isInstructor, messageIndex, cluster.messages.length),
                          isInstructor
                            ? 'max-w-[520px] bg-[var(--msg-bubble-ink)] text-[var(--msg-bubble-ink-text)] shadow-[var(--msg-shadow)]'
                            : 'max-w-[620px] border border-[var(--msg-line)] bg-[var(--msg-bubble-paper)] text-[var(--msg-bubble-paper-text)] shadow-[var(--msg-shadow)]',
                        )}
                      >
                        {renderBody(routeAction?.displayBody || displayBodyText, isInstructor)}
                        {routeAction?.route ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(routeAction.route);
                            }}
                            className={cn(
                              'mt-3 inline-flex items-center rounded-full px-3.5 py-1.5 text-[12px] font-bold transition',
                              isInstructor
                                ? 'bg-[var(--msg-accent)] text-white hover:brightness-110'
                                : 'bg-[var(--msg-accent)] text-white hover:brightness-110',
                            )}
                          >
                            Open assignment
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {isHelpScreenshot ? (
                    <div
                      className={cn(
                        'flex w-full max-w-full flex-col gap-3',
                        isInstructor ? 'items-end' : 'items-start',
                      )}
                    >
                      <ScreenshotContextCard
                        image={helpScreenshot}
                        context={helpContext}
                      />
                    </div>
                  ) : hasAttachments ? (
                    <div
                      className={cn(
                        'flex w-full max-w-full flex-col gap-3',
                        isInstructor ? 'items-end' : 'items-start',
                      )}
                    >
                      {visibleAttachments.map((attachment) => (
                        <AttachmentCard
                          key={attachment.id}
                          attachment={attachment}
                          onPreview={onPreviewAttachment}
                        />
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
            {cluster.isOwn && lastSeenOwnMessageId && cluster.messages.some((m) => m.id === lastSeenOwnMessageId) ? (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1.5 flex items-center justify-end gap-1 pr-1 text-[10px] font-semibold text-[var(--msg-meta)]"
              >
                <CheckCheck className="h-3 w-3 text-[var(--msg-accent)]" aria-hidden="true" />
                Seen{otherLastReadAt ? ` · ${shortTime(new Date(otherLastReadAt))}` : ''}
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the message and any attachments for everyone in the thread. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (pendingDelete) onDeleteMessage?.(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
