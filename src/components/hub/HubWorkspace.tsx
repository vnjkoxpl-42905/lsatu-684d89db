import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import HubMessages from './HubMessages';
import HubAssignments from './HubAssignments';
import StudentOverview from './StudentOverview';
import StudentNotes from './StudentNotes';

export type WorkspaceTab = 'messages' | 'overview' | 'assignments' | 'notes';

interface Props {
  studentId: string;
  studentName?: string | null;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

/**
 * Center-panel workspace for a selected student. Four tabs:
 *
 *   Messages    — real Messenger thread (admin↔student). Sending here
 *                 is a real human message.
 *   Overview    — profile, feature flags, basic counts (existing
 *                 StudentOverview, reused).
 *   Assignments — homework_assignments + ta_assignments for this student.
 *   Notes       — student_context (admin-RLS), reused from StudentNotes.
 *
 * Tab state is lifted to StudentHub so it can be URL-synced.
 */
export default function HubWorkspace({ studentId, studentName, tab, onTabChange }: Props) {
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(v as WorkspaceTab)}
      className="flex flex-col h-full min-h-0"
    >
      <div className="px-4 py-2 border-b border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            {studentName?.trim() || 'Student workspace'}
          </div>
        </div>
        <TabsList
          className={cn(
            'ml-auto h-auto rounded-none bg-transparent p-0 gap-0 shrink-0',
          )}
        >
          <UnderlineTrigger value="messages">Messages</UnderlineTrigger>
          <UnderlineTrigger value="overview">Overview</UnderlineTrigger>
          <UnderlineTrigger value="assignments">Assignments</UnderlineTrigger>
          <UnderlineTrigger value="notes">Notes</UnderlineTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="messages"
        className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col"
      >
        <HubMessages studentId={studentId} studentName={studentName} />
      </TabsContent>

      <TabsContent
        value="overview"
        className="flex-1 min-h-0 overflow-y-auto mt-0"
      >
        <StudentOverview studentId={studentId} />
      </TabsContent>

      <TabsContent
        value="assignments"
        className="flex-1 min-h-0 overflow-y-auto mt-0 flex flex-col"
      >
        <HubAssignments studentId={studentId} />
      </TabsContent>

      <TabsContent
        value="notes"
        className="flex-1 min-h-0 overflow-y-auto mt-0"
      >
        <StudentNotes studentId={studentId} studentName={studentName} />
      </TabsContent>
    </Tabs>
  );
}

function UnderlineTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'relative rounded-none border-0 px-3 py-2 text-[12px] font-medium',
        'bg-transparent data-[state=active]:bg-transparent',
        'data-[state=active]:shadow-none',
        'text-zinc-500 data-[state=active]:text-zinc-100 hover:text-zinc-300',
        'after:absolute after:left-2 after:right-2 after:bottom-0 after:h-0.5',
        'after:bg-transparent data-[state=active]:after:bg-amber-400',
        'after:transition-colors',
      )}
    >
      {children}
    </TabsTrigger>
  );
}
