import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import HubSnapshot from "./HubSnapshot";
import LibraryBrowser from "./LibraryBrowser";
import TAChatView from "@/components/ta/TAChatView";

export type HubTab = "snapshot" | "ai" | "library";

interface Props {
  studentId: string | null;
  studentName?: string | null;
  className?: string;
  tab: HubTab;
  onTabChange: (tab: HubTab) => void;
}

/**
 * Right-panel "Intelligence" shell.
 *
 *   Snapshot     — admin-readable real metrics for the student.
 *   AI Assistant — TAChatView, the admin's AI workbench. Outputs here
 *                  are NOT human messages and never go to the student
 *                  unless the admin explicitly approves a draft.
 *   Library      — the asset library (not student-scoped).
 *
 * The active tab is lifted so StudentHub can sync it to the URL.
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
          "justify-start gap-0 shrink-0",
        )}
      >
        <UnderlineTrigger value="snapshot">Snapshot</UnderlineTrigger>
        <UnderlineTrigger value="ai">AI Assistant</UnderlineTrigger>
        <UnderlineTrigger value="library">Library</UnderlineTrigger>
      </TabsList>

      <TabsContent
        value="snapshot"
        className="flex-1 min-h-0 overflow-y-auto mt-0"
      >
        <HubSnapshot studentId={studentId} />
      </TabsContent>

      <TabsContent
        value="ai"
        className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col"
      >
        {studentId ? (
          <TAChatView studentId={studentId} studentName={studentName} />
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Select a student to ask the AI assistant.
          </div>
        )}
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
        "bg-transparent data-[state=active]:bg-transparent",
        "data-[state=active]:shadow-none",
        "text-zinc-500 data-[state=active]:text-zinc-100 hover:text-zinc-300",
        "after:absolute after:left-2 after:right-2 after:bottom-0 after:h-0.5",
        "after:bg-transparent data-[state=active]:after:bg-amber-400",
        "after:transition-colors",
      )}
    >
      {children}
    </TabsTrigger>
  );
}
