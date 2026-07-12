import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileUp,
  GraduationCap,
  Megaphone,
  NotebookTabs,
  PenLine,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';
import type { ClassroomSectionId } from './ClassroomLessonList';

interface Props {
  selectedSection: ClassroomSectionId;
  onSelectSection: (section: ClassroomSectionId) => void;
  onNavigate?: () => void;
}

const GROUPS: {
  label: string;
  items: {
    id?: ClassroomSectionId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    route?: string;
  }[];
}[] = [
  {
    label: 'Curriculum',
    items: [
      { id: 'curriculum', label: 'This Week', icon: CalendarDays },
      { id: 'bootcamps', label: 'Bootcamps', icon: BookOpen },
      { id: 'recaps', label: 'Recaps', icon: NotebookTabs },
    ],
  },
  {
    label: 'Work',
    items: [
      { id: 'assigned-work', label: 'Assigned Work', icon: ClipboardList },
      { id: 'upload-work', label: 'Upload Work', icon: FileUp },
      { label: 'Wrong Answer Journal', icon: PenLine, route: '/waj' },
    ],
  },
  {
    label: 'Updates',
    items: [{ id: 'announcements', label: 'Announcements', icon: Megaphone }],
  },
];

export function ClassroomNavRail({ selectedSection, onSelectSection, onNavigate }: Props) {
  const navigate = useNavigate();

  const openRoute = (route: string) => {
    navigate(route);
    onNavigate?.();
  };

  return (
    <aside className="flex h-full min-h-screen w-full flex-col bg-background px-4 py-5 lg:w-[260px]">
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/70">
            <GraduationCap className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight tracking-tight">Classroom</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              LSAT U
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => openRoute('/mainhub')}
          className="w-full justify-start rounded-xl px-3 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Main Hub
        </Button>
      </div>

      <nav className="mt-7 flex-1 space-y-7 overflow-y-auto pr-1">
        {GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.id === selectedSection;
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.route) {
                        openRoute(item.route);
                        return;
                      }
                      if (item.id) {
                        onSelectSection(item.id);
                        onNavigate?.();
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ease-out active:scale-[0.98]',
                      active
                        ? 'border border-border bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between rounded-full border border-border bg-card/40 px-2 py-1">
          <span className="px-2 text-[11px] font-medium text-muted-foreground">Theme</span>
          <ThemeToggle className="h-8 w-8" />
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
