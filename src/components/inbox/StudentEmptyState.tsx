import { ArrowRight, Loader2, MessageCircle, Paperclip, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onStart: () => void;
  isStarting?: boolean;
  compact?: boolean;
}

export function StudentEmptyState({ onStart, isStarting = false, compact = false }: Props) {
  return (
    <div
      className={
        compact
          ? 'flex-1 flex items-center justify-center px-6 py-10'
          : 'flex-1 flex items-center justify-center px-6 py-16'
      }
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 text-left shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-primary" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold leading-tight">Ask Joshua</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Send a question, attach context, or keep a running thread from your study session.
              </p>
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary/80" />
                One coaching thread, not a ticket queue
              </div>
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-primary/80" />
                PDFs and screenshots stay with the conversation
              </div>
            </div>
            <Button onClick={onStart} disabled={isStarting} className="w-full sm:w-auto">
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting
                </>
              ) : (
                <>
                  Start thread
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
