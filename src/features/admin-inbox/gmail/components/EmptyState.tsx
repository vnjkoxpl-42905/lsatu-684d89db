import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
        {icon ?? <Inbox className="w-5 h-5" />}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      ) : null}
    </div>
  );
}
