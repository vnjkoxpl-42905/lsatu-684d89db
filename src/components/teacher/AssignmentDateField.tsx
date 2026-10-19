import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Shared date-picker trigger used by AssignmentBuilder (Unlocks/Due) and
// TeacherBootcamps (START/END). Renders a small outline button that opens a
// Popover-hosted Calendar. The display label sits before the formatted date
// inline (e.g. "START · May 1") to keep the trigger compact.

export interface AssignmentDateFieldProps {
  label: string;
  value: Date | undefined;
  onChange: (d: Date) => void;
  minDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function AssignmentDateField({
  label,
  value,
  onChange,
  minDate,
  disabled,
  className,
}: AssignmentDateFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            'h-8 px-2.5 gap-1.5 text-xs font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] uppercase tracking-wider opacity-60">{label}</span>
          <span>{value ? format(value, 'MMM d') : '—'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => d && onChange(d)}
          disabled={minDate ? (d) => d < minDate : undefined}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
