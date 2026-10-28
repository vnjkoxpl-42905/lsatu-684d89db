import { useCallback, useId, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotesSelectMotion } from '@/hooks/useNotesSelectMotion';

export function WorkFilterSelect({ label, allLabel, value, options, onChange }: {
  label: string; allLabel: string; value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string, focusedWithin: boolean, modality: 'keyboard' | 'pointer') => void;
}) {
  const labelId = useId();
  const valueId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [modality, setModality] = useState<'keyboard' | 'pointer'>('keyboard');
  const modalityRef = useRef(modality);
  function recordModality(next: 'keyboard' | 'pointer') { modalityRef.current = next; setModality(next); }
  const motionRef = useNotesSelectMotion(open, modality);
  const setContentRef = useCallback((element: HTMLDivElement | null) => {
    contentRef.current = element;
    motionRef(element);
  }, [motionRef]);
  return <div className="my-work-filter-select">
    <span id={labelId} className="sr-only">{label}</span>
    <Select open={open} onOpenChange={setOpen} value={value || 'all'} onValueChange={(next) => {
      const active = document.activeElement;
      const focusedWithin = !!active && (triggerRef.current?.contains(active) || contentRef.current?.contains(active));
      onChange(next === 'all' ? '' : next, Boolean(focusedWithin), modalityRef.current);
    }}>
      <SelectTrigger ref={triggerRef} aria-labelledby={`${labelId} ${valueId}`} className="notes-select-trigger" onPointerDown={() => recordModality('pointer')} onKeyDown={() => recordModality('keyboard')}><SelectValue id={valueId} /></SelectTrigger>
      <SelectContent onPointerDownCapture={() => recordModality('pointer')} onKeyDownCapture={() => recordModality('keyboard')} ref={setContentRef} className="notes-select-content" data-input-modality={modality}>
        <SelectItem className="notes-select-option" value="all">{allLabel}</SelectItem>
        {options.map((option) => <SelectItem key={option.value} className="notes-select-option" value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
