import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { assignWorkBundle, describeAssignResult, type AssignableItem } from '@/lib/assignWork';
import { useHubStudents } from '@/hooks/useHubStudents';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * The one assign flow (spec D4/§7.1). Every surface that hands work to a student
 * opens this sheet, and the sheet is the only caller of the bundle pipeline, so
 * a drill and a homework set picked together ship as one assignment event rather
 * than as two separate pings.
 */

export interface AssignWorkSheetItem {
  /** What actually gets assigned. */
  item: AssignableItem;
  /** What the teacher sees in the bundle list. */
  title: string;
  /** "Guided drill", "Homework set", … — so a mixed bundle is readable. */
  kindLabel: string;
}

export function AssignWorkSheet({
  open,
  items,
  onClose,
  onAssigned,
  defaultStudentIds,
}: {
  open: boolean;
  items: AssignWorkSheetItem[];
  onClose: () => void;
  onAssigned?: () => void;
  /** Pre-scope to a student — the dossier assigns to exactly one. */
  defaultStudentIds?: string[];
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { rows: students } = useHubStudents();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Reopening the sheet starts clean, except for a caller-supplied scope.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(defaultStudentIds ?? []));
    setScheduledFor('');
    // defaultStudentIds is a fresh array each render at most call sites, so key
    // the reset on its contents rather than its identity.
  }, [open, defaultStudentIds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const bundleTitle = useMemo(() => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].title;
    return `${items.length} pieces of work`;
  }, [items]);

  const handleAssign = async () => {
    if (!user || selected.size === 0 || items.length === 0) return;
    setAssigning(true);
    try {
      const result = await assignWorkBundle({
        teacherId: user.id,
        studentIds: [...selected],
        items: items.map((i) => i.item),
        scheduledForLocalDate: scheduledFor || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['homework-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
      queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

      const { level, message } = describeAssignResult(result, bundleTitle);
      toast[level](message);
      onAssigned?.();
      // Leave the sheet open when nobody got the work, so the teacher can read
      // the reason and retry without reselecting everyone.
      if (result.ok.length > 0) onClose();
    } catch (e) {
      toast.error(`Assign failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {items.length === 1 ? `Assign: ${items[0].title}` : `Assign ${items.length} items`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {items.length > 1 ? (
            <ul className="space-y-1 border border-border p-2">
              {items.map(({ item, title, kindLabel }) => (
                <li key={itemKeyOf(item)} className="flex items-baseline gap-2 text-sm">
                  <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                    {kindLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div>
            <label
              htmlFor="assign-schedule"
              className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Schedule for (optional)
            </label>
            <Input
              id="assign-schedule"
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Students ({selected.size} selected)
            </span>
            {students.length === 0 ? (
              <p className="mt-2 border border-dashed border-border p-3 text-sm text-muted-foreground">
                No students to assign to yet.
              </p>
            ) : (
              <div className="mt-2 max-h-80 space-y-1 overflow-y-auto border border-border p-2">
                {students.map((s) => (
                  <label
                    key={s.class_id}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-muted"
                  >
                    <Checkbox
                      checked={selected.has(s.class_id)}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(s.class_id);
                          else next.delete(s.class_id);
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm">
                      {s.display_name || s.email || s.class_id.slice(0, 8)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={selected.size === 0 || items.length === 0 || assigning}
            onClick={handleAssign}
            className="inline-flex w-full items-center justify-center gap-2 bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Assign to {selected.size} student{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Stable key for a bundle row; the id field differs per kind. */
function itemKeyOf(item: AssignableItem): string {
  switch (item.kind) {
    case 'homework_set':
      return `homework_set:${item.setId}`;
    case 'guided_drill':
      return `guided_drill:${item.drillId}`;
    case 'activity':
      return `activity:${item.activityId}`;
    case 'bootcamp':
      return `bootcamp:${item.topicId}`;
  }
}

/**
 * A bundle tray: the items a teacher has ticked across tabs, plus the controls
 * to clear it or open the sheet. Rendered by Library so a drill picked on one
 * tab and a homework set on another leave together.
 */
export function AssignBundleBar({
  items,
  onRemove,
  onClear,
  onOpen,
}: {
  items: AssignWorkSheetItem[];
  onRemove: (item: AssignableItem) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-black/10 bg-white/60 px-4 py-2">
      <span className="text-xs font-semibold text-black/55">
        Bundle ({items.length})
      </span>
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {items.map(({ item, title }) => (
          <li key={itemKeyOf(item)}>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${title} from the bundle`}
              className="inline-flex max-w-[220px] items-center gap-1 border border-black/15 bg-white px-2 py-1 text-xs text-black/70 transition hover:text-black"
            >
              <span className="truncate">{title}</span>
              <X className="h-3 w-3 shrink-0" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-black/45 transition hover:text-black"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 bg-teacher-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teacher-accent-hover"
        >
          <Send className="h-3 w-3" strokeWidth={2} />
          Assign bundle
        </button>
      </div>
    </div>
  );
}

export { itemKeyOf as assignItemKey };
