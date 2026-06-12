/**
 * JournalWorkspace — the full Journal surface: header chrome + resizable
 * sidebar (pinned Wrong Answers + page tree) + main pane (doc / database /
 * smart view). This is the body of the /journal route.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookMarked } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';
import { useJournalPages, useCreatePage, useCreateDatabase, useArchivePage } from '@/hooks/useJournal';
import type { JournalColumn } from '@/lib/journalService';
import { PageTree } from './sidebar/PageTree';
import { NewPageButton } from './sidebar/NewPageButton';
import { DocPage } from './page/DocPage';
import { DatabasePage } from './page/DatabasePage';
import { WrongAnswersSmartView } from './wrong-answers/WrongAnswersSmartView';

const WRONG_ANSWERS = '__wrong_answers__';

const DEFAULT_DB_COLUMNS: JournalColumn[] = [
  { id: 'status', name: 'Status', type: 'select', options: ['To do', 'In progress', 'Done'] },
  { id: 'tags', name: 'Tags', type: 'multi_select', options: [] },
  { id: 'notes', name: 'Notes', type: 'text' },
];

function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="select-none text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
}

export function JournalWorkspace() {
  const navigate = useNavigate();
  const { data: pages = [], isLoading } = useJournalPages();
  const createPage = useCreatePage();
  const createDatabase = useCreateDatabase();
  const archivePage = useArchivePage();

  const [selectedId, setSelectedId] = React.useState<string>(WRONG_ANSWERS);

  const selectedPage = React.useMemo(
    () => pages.find((p) => p.id === selectedId) ?? null,
    [pages, selectedId],
  );

  const handleNewDoc = async (parentId: string | null = null) => {
    const page = await createPage.mutateAsync({ parent_page_id: parentId, title: 'Untitled' });
    setSelectedId(page.id);
  };

  const handleNewDatabase = async () => {
    const page = await createDatabase.mutateAsync({
      title: 'Untitled database',
      columns: DEFAULT_DB_COLUMNS,
    });
    setSelectedId(page.id);
  };

  const handleDelete = (id: string) => {
    archivePage.mutate(id);
    if (selectedId === id) setSelectedId(WRONG_ANSWERS);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header chrome (matches the platform pattern). */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 gap-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => navigate('/mainhub')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Main Hub
          </Button>
          <IL>Journal</IL>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={22} minSize={15} maxSize={34}>
          <aside className="flex h-full flex-col border-r border-border">
            <div className="px-2 pt-3">
              <NewPageButton onNewDoc={() => handleNewDoc(null)} onNewDatabase={handleNewDatabase} />
              <button
                type="button"
                onClick={() => setSelectedId(WRONG_ANSWERS)}
                className={cn(
                  'mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                  selectedId === WRONG_ANSWERS
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <BookMarked className="h-4 w-4 text-accent-bronze" />
                Wrong Answers
              </button>
            </div>

            <div className="mt-2 px-3 pb-1">
              <IL>Pages</IL>
            </div>

            <PageTree
              pages={pages}
              selectedId={selectedId === WRONG_ANSWERS ? null : selectedId}
              onSelect={setSelectedId}
              onAddChild={(parentId) => handleNewDoc(parentId)}
              onDelete={handleDelete}
            />
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={78}>
          <main className="h-full overflow-y-auto">
            {selectedId === WRONG_ANSWERS ? (
              <WrongAnswersSmartView />
            ) : selectedPage ? (
              selectedPage.type === 'database' ? (
                <DatabasePage page={selectedPage} allPages={pages} onOpenRow={setSelectedId} />
              ) : (
                <DocPage page={selectedPage} />
              )
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border border-border border-t-foreground/30" />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-[15px] font-medium text-foreground/80">Nothing selected</p>
                <p className="text-[13px] text-muted-foreground">
                  Pick a page from the sidebar, or create a new one.
                </p>
              </div>
            )}
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
