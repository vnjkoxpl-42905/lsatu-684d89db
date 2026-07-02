import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import { isVisibleHelpAttachment } from '@/lib/inboxAttachments';
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
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\s+([.,!?;:])/g, '$1');

  return { displayBody, route };
}

const LINK_PATTERN =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s]+|mailto:[^\s]+)/g;

function renderBody(text: string, isInstructor: boolean) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const linkClass = cn(
    'underline underline-offset-2 break-all transition-colors',
    isInstructor ? 'text-[#BFE3FF] hover:text-white' : 'text-[#2F6A8D] hover:text-[#1f4c66]',
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

export function MessageBubble({ cluster, onPreviewAttachment, canDeleteMessage, onDeleteMessage }: Props) {
  const navigate = useNavigate();
  const headerTime = shortTime(new Date(cluster.createdAt));
  const isInstructor = cluster.isInstructor;
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

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
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7F2EC] text-[12px] font-bold text-[#2F6A4F]">
              {cluster.speakerInitials}
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
              className="text-[12px] font-[650] leading-none"
              style={{ color: isInstructor ? '#111827' : '#2F6A4F' }}
            >
              {cluster.speakerName}
            </span>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: isInstructor ? '#18181b' : '#2F6A4F' }}
              aria-hidden="true"
            />
            <span
              className="text-[11px] font-medium leading-none"
              style={{ color: '#978B7D' }}
            >
              {cluster.speakerRoleLabel} · {headerTime}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {cluster.messages.map((message) => {
              const hasBody = !!message.body;
              const visibleAttachments = message.attachments.filter(isVisibleHelpAttachment);
              const hasAttachments = visibleAttachments.length > 0;
              const routeAction = hasBody ? extractRouteAction(message.body) : null;
              const canDelete = canDeleteMessage?.(message) ?? false;

              return (
                <div
                  key={message.id}
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
                      {canDelete && onDeleteMessage ? (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(message.id)}
                          className="shrink-0 rounded-full p-1.5 text-zinc-300 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-600 focus:opacity-100 group-hover/msg:opacity-100"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <div
                        className={cn(
                          'relative break-words rounded-[14px] px-[18px] py-[14px] text-[15px] leading-[1.6]',
                          isInstructor
                            ? 'max-w-[520px] bg-[#111827] text-[#FFFDF9]'
                            : 'max-w-[620px] border border-[#e4e4e7] bg-white text-[#1F1B16]',
                        )}
                      >
                        {renderBody(routeAction?.displayBody || message.body, isInstructor)}
                        {routeAction?.route ? (
                          <button
                            type="button"
                            onClick={() => navigate(routeAction.route)}
                            className={cn(
                              'mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-bold transition',
                              isInstructor
                                ? 'bg-white text-[#111827] hover:bg-[#f4f4f5]'
                                : 'bg-[#18181b] text-white hover:bg-[#27272a]',
                            )}
                          >
                            Open assignment
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {hasAttachments ? (
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
                </div>
              );
            })}
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
