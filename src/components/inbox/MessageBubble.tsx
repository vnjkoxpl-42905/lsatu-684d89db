import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import type { MessageAttachment } from '@/hooks/useInbox';
import type { MessageCluster } from './messageClusters';

interface Props {
  cluster: MessageCluster;
  onPreviewAttachment?: (attachment: MessageAttachment) => void;
}

function shortTime(date: Date) {
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d, h:mm a');
}

export function MessageBubble({ cluster, onPreviewAttachment }: Props) {
  const headerTime = shortTime(new Date(cluster.createdAt));
  const isInstructor = cluster.isInstructor;

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
              style={{ backgroundColor: isInstructor ? '#7A4E2D' : '#2F6A4F' }}
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
            {cluster.messages.map((message, index) => {
              const firstBubble = index === 0;
              const hasBody = !!message.body;
              const hasAttachments = message.attachments.length > 0;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex min-w-0 flex-col gap-3',
                    isInstructor ? 'items-end' : 'items-start',
                  )}
                >
                  {hasBody ? (
                    <div
                      className={cn(
                        'relative break-words rounded-[14px] px-[18px] py-[14px] text-[15px] leading-[1.6]',
                        isInstructor
                          ? 'max-w-[520px] bg-[#111827] text-[#FFFDF9]'
                          : 'max-w-[620px] border border-[#E6DDD2] bg-white text-[#1F1B16]',
                      )}
                    >
                      {!isInstructor && firstBubble ? (
                        <span
                          className="absolute bottom-[10px] left-0 top-[10px] w-[3px] rounded-r-full"
                          style={{ backgroundColor: '#2F6A4F' }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {message.body}
                    </div>
                  ) : null}

                  {hasAttachments ? (
                    <div
                      className={cn(
                        'flex w-full max-w-full flex-col gap-3',
                        isInstructor ? 'items-end' : 'items-start',
                      )}
                    >
                      {message.attachments.map((attachment) => (
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
    </div>
  );
}
