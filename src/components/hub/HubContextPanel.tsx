import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import StudentOverview from "./StudentOverview";
import StudentNotes from "./StudentNotes";
import LibraryBrowser from "./LibraryBrowser";

export type HubTab = "overview" | "notes" | "library";

interface Props {
  studentId: string | null;
  studentName?: string | null;
  className?: string;
  tab: HubTab;
  onTabChange: (tab: HubTab) => void;
}

/**
 * Right-panel shell. Hosts the three hub tabs with underline-style
 * indicators (overriding the default shadcn pill look). The library tab
 * is intentionally not student-scoped — same content for every selection.
 *
 * Active tab is lifted to the parent so StudentHub can sync it to the URL.
 */
export default function HubContextPanel({
  studentId,
  studentName,
  className,
  tab,
  onTabChange,
}: Props) {

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(v as HubTab)}
      className={cn("flex flex-col h-full min-h-0", className)}
    >
      <TabsList
        className={cn(
          "h-auto rounded-none bg-transparent p-0 border-b border-border/40",
          "justify-start gap-0 shrink-0"
        )}
      >
        <UnderlineTrigger value="overview">Overview</UnderlineTrigger>
        <UnderlineTrigger value="notes">Notes</UnderlineTrigger>
        <UnderlineTrigger value="library">Library</UnderlineTrigger>
      </TabsList>

      <TabsContent
        value="overview"
        className="flex-1 min-h-0 overflow-y-auto mt-0"
      >
        <StudentOverview studentId={studentId} />
      </TabsContent>

      <TabsContent
        value="notes"
        className="flex-1 min-h-0 overflow-y-auto mt-0"
      >
        <StudentNotes studentId={studentId} studentName={studentName} />
      </TabsContent>

      <TabsContent
        value="library"
        className="flex-1 min-h-0 overflow-hidden mt-0"
      >
        <LibraryBrowser />
      </TabsContent>
    </Tabs>
  );
}

/**
 * Underline-style tab trigger that intentionally overrides shadcn's
 * default pill variant. The base TabsTrigger (src/components/ui/tabs.tsx)
 * applies these on data-[state=active]:
 *   - bg-background         — we reset to bg-transparent
 *   - text-foreground       — we reset to text-zinc-100
 *   - shadow-sm             — we reset to shadow-none
 * plus rounded-sm, which we override with rounded-none.
 *
 * If shadcn ever adds NEW active-state classes upstream, they'll bleed
 * through silently. Re-check this list after any shadcn Tabs upgrade.
 */
function UnderlineTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative rounded-none border-0 px-3 py-2.5 text-[12px] font-medium",
        // Reset shadcn pill defaults:
        "bg-transparent data-[state=active]:bg-transparent",
        "data-[state=active]:shadow-none",
        // Our color + underline styling:
        "text-zinc-500 data-[state=active]:text-zinc-100 hover:text-zinc-300",
        "after:absolute after:left-2 after:right-2 after:bottom-0 after:h-0.5",
        "after:bg-transparent data-[state=active]:after:bg-amber-400",
        "after:transition-colors"
      )}
    >
      {children}
    </TabsTrigger>
  );
}
