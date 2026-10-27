import { useId, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotesSelectMotion } from '@/hooks/useNotesSelectMotion';

export function WorkFilterSelect({ label, allLabel, value, options, onChange }: {
  label: string; allLabel: string; value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [modality, setModality] = useState<'keyboard' | 'pointer'>('keyboard');
  const motionRef = useNotesSelectMotion(open, modality);
  return <div className="my-work-filter-select">
    <span id={labelId} className="sr-only">{label}</span>
    <Select open={open} onOpenChange={setOpen} value={value || 'all'} onValueChange={(next) => onChange(next === 'all' ? '' : next)}>
      <SelectTrigger aria-labelledby={labelId} className="notes-select-trigger" onPointerDown={() => setModality('pointer')} onKeyDown={() => setModality('keyboard')}><SelectValue /></SelectTrigger>
      <SelectContent ref={motionRef} className="notes-select-content" data-input-modality={modality}>
        <SelectItem className="notes-select-option" value="all">{allLabel}</SelectItem>
        {options.map((option) => <SelectItem key={option.value} className="notes-select-option" value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
