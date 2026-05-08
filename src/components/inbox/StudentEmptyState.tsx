import { MessagesSquare, Loader2 } from 'lucide-react';
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
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
          <MessagesSquare className="w-5 h-5 text-emerald-500/70" strokeWidth={1.75} />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Message Joshua</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ask a question, send context, or attach a PDF.
          </p>
        </div>
        <Button onClick={onStart} disabled={isStarting} className="w-full sm:w-auto">
          {isStarting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting…
            </>
          ) : (
            'Start message'
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Your messages stay inside LSAT U.
        </p>
      </div>
    </div>
  );
}
