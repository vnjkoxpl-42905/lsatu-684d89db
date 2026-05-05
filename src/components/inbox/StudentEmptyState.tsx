import { MessagesSquare } from 'lucide-react';

export function StudentEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-sm text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MessagesSquare className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold">Message Joshua</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ask a question, send context, or attach a PDF. Joshua will see your
          thread once he opens one with you — check back here for replies.
        </p>
      </div>
    </div>
  );
}
