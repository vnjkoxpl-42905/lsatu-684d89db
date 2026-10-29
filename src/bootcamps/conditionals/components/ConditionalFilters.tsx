import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import './conditional-filters.css';

export function ConditionalFilters({ summary, defaultOpen = false, children, className = '' }: {
  summary?: string; defaultOpen?: boolean; children: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  return <div className={`conditional-filters ${className}`}>
    <button type="button" className="conditional-filters-toggle" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen(value => !value)}>
      <SlidersHorizontal size={16} aria-hidden="true"/><span>Filters</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {summary && <span className="conditional-filters-summary">{summary}</span>}
    <div id={regionId} className="conditional-filters-content" hidden={!open}>{children}</div>
  </div>;
}

export function activityFiltersDefaultOpen() {
  return typeof window !== 'undefined' && (typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 600px)').matches);
}
