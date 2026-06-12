/** Shared shapes for the database view components (reused by the smart view). */
import type { JournalColumn, JournalView } from '@/lib/journalService';

/** A generic database row. JournalPage satisfies this; so do mapped smart rows. */
export interface DatabaseRow {
  id: string;
  title: string;
  icon: string | null;
  properties: Record<string, unknown>;
}

export interface DatabaseViewHandlers {
  readOnly?: boolean;
  onCellChange?: (rowId: string, columnId: string, value: unknown) => void;
  onTitleChange?: (rowId: string, title: string) => void;
  onOpenRow?: (rowId: string) => void;
  onAddRow?: () => void;
}

export interface DatabaseRenderProps extends DatabaseViewHandlers {
  columns: JournalColumn[];
  rows: DatabaseRow[];
  view: JournalView;
}
