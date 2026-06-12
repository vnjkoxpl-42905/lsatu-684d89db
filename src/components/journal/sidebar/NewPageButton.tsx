/**
 * NewPageButton — creates a top-level doc or database from the sidebar.
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, Database } from 'lucide-react';

export function NewPageButton({
  onNewDoc,
  onNewDatabase,
}: {
  onNewDoc: () => void;
  onNewDatabase: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={onNewDoc}>
          <FileText className="mr-2 h-3.5 w-3.5" />
          Blank page
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewDatabase}>
          <Database className="mr-2 h-3.5 w-3.5" />
          Database
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
