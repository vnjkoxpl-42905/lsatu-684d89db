import { Megaphone, Tag, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GmailCategory } from "../api";

const TABS: { id: GmailCategory; label: string; Icon: typeof User }[] = [
  { id: "primary", label: "Primary", Icon: User },
  { id: "social", label: "Social", Icon: Users },
  { id: "promotions", label: "Promotions", Icon: Tag },
  { id: "updates", label: "Updates", Icon: Megaphone },
];

interface GmailCategoryTabsProps {
  value: GmailCategory;
  onChange: (next: GmailCategory) => void;
}

export function GmailCategoryTabs({ value, onChange }: GmailCategoryTabsProps) {
  return (
    <div role="tablist" aria-label="Inbox categories" className="flex border-b border-border bg-background">
      {TABS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors relative",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {active ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-sm" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
