import { Textarea } from '@/bootcamps/main-conclusion/components/primitives/Input';

export function FreeResponsePanel({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2"
      />
    </label>
  );
}
