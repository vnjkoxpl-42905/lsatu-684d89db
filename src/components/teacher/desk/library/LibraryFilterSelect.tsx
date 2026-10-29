/**
 * The Library filter control. Shared so a drill filter and a homework filter are
 * the same control rather than two lookalikes that drift (spec D4: one card
 * system, one set of filters across the tabs).
 */
export function LibraryFilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  const current = options.find((o) => o.value === value)?.label ?? 'Filter';
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={current}
      aria-label={ariaLabel ?? current}
      className="h-8 border border-black/15 bg-white/40 px-2 text-sm text-black focus-visible:border-black/35 focus-visible:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default LibraryFilterSelect;
