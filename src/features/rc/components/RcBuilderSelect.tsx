import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface RcBuilderOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface RcBuilderSelectProps<T extends string> {
  id?: string;
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: RcBuilderOption<T>[];
  placeholder?: string;
  resetLabel?: string;
  disabled?: boolean;
  tone?: 'paper' | 'dark';
}

// Radix reserves the empty string for its placeholder. Keep the native lookup's
// per-field reset without passing an empty value to SelectItem.
const RESET_VALUE = '__rc_clear_field__';

export function RcBuilderSelect<T extends string>({
  id, label, value, onValueChange, options, placeholder = 'Select',
  resetLabel, disabled = false, tone = 'dark',
}: RcBuilderSelectProps<T>) {
  const displayValue = options.some(option => option.value === value) ? value : '';
  return (
    <Select value={displayValue} disabled={disabled} onValueChange={next => onValueChange((next === RESET_VALUE ? '' : next) as T)}>
      <SelectTrigger id={id} aria-label={label} className={`rc-builder-select rc-builder-select-${tone}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={`rc-builder-select-menu rc-builder-select-menu-${tone}`} position="popper" sideOffset={5} collisionPadding={12}>
        {resetLabel && <SelectItem value={RESET_VALUE} data-value="" className="rc-builder-select-option rc-builder-select-reset">{resetLabel}</SelectItem>}
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} data-value={option.value} disabled={option.disabled} className="rc-builder-select-option">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
