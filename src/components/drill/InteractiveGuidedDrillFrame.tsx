import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { markCardRead, markCompleted, markStarted } from '@/lib/guidedDrills';
import { createInteractiveLifecycle } from '@/lib/interactiveGuidedDrill';

interface Props {
  src: string;
  title: string;
  assignmentId?: string | null;
  assignmentStatus?: string | null;
  onReturn: () => void;
}

/**
 * Hosts a self-contained interactive guided drill. The HTML is the whole drill;
 * the parent only records assignment lifecycle from its postMessage events.
 */
export function InteractiveGuidedDrillFrame({ src, title, assignmentId, assignmentStatus, onReturn }: Props) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    const handle = createInteractiveLifecycle({
      assignmentId,
      initialStatus: assignmentStatus,
      markCardRead,
      markStarted,
      markCompleted,
      onCompleted: () => toast.success('Drill complete — saved to your assigned work.'),
    });
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      handle(event.data).catch((e: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[interactive-guided-drill] lifecycle update failed', e);
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [assignmentId, assignmentStatus]);

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="flex shrink-0 items-center border-b border-border bg-background px-3 py-1.5">
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="block min-h-0 w-full flex-1 border-0 bg-background"
      />
    </div>
  );
}
