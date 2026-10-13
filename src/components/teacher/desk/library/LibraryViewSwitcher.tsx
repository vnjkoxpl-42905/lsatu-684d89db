import { Columns3, GalleryHorizontalEnd, LayoutGrid, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LibraryView } from '@/hooks/useDeskLibraryView';

const VIEWS: { value: LibraryView; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'grid', label: 'Grid', Icon: LayoutGrid },
  { value: 'list', label: 'List', Icon: List },
  { value: 'columns', label: 'Columns', Icon: Columns3 },
  { value: 'gallery', label: 'Gallery', Icon: GalleryHorizontalEnd },
];

/** Finder-style segmented control for the Library view mode. */
export function LibraryViewSwitcher({
  value,
  onChange,
}: {
  value: LibraryView;
  onChange: (v: LibraryView) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as LibraryView)}
      className="gap-0.5 border border-black/15 bg-white/40 p-0.5"
    >
      {VIEWS.map(({ value: v, label, Icon }) => (
        <ToggleGroupItem
          key={v}
          value={v}
          aria-label={`${label} view`}
          title={`${label} view`}
          className="h-7 w-7 rounded-none p-0 text-black/45 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black"
        >
          <Icon className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export default LibraryViewSwitcher;
