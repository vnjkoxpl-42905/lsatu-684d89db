import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from 'lucide-react';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DoThisNextCard } from '@/components/classroom/DoThisNextCard';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';
import type { ClassroomListItem } from './ClassroomLessonList';

interface FallbackNext {
  title: string;
  description: string;
  route: string;
}

interface Props {
  item: ClassroomListItem | null;
  nextItem: ClassroomItem | null;
  fallbackNext: FallbackNext | null;
  onBack?: () => void;
}

const CONTENT_TYPES = new Set<ClassroomItem['type']>([
  'session_recap',
  'smartboard_recap',
  'announcement',
  'note',
]);

export function ClassroomReader({ item, nextItem, fallbackNext, onBack }: Props) {
  const navigate = useNavigate();

  if (!item) {
    return (
      <ReaderShell onBack={onBack}>
        <div className="space-y-8">
          {nextItem ? (
            <DoThisNextCard item={nextItem} />
          ) : fallbackNext ? (
            <FallbackNextCard item={fallbackNext} />
          ) : (
            <DoThisNextCard item={null} />
          )}

          <article className="space-y-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Welcome
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Your LSAT U reading room
            </h2>
            <p className="max-w-2xl text-base leading-8 text-foreground/82">
              Start with the next assigned step, or use the left sections to move through
              this week&apos;s curriculum, bootcamps, recaps, assigned work, and updates from
              Joshua.
            </p>
          </article>
        </div>
      </ReaderShell>
    );
  }

  if ('classroomItem' in item && item.classroomItem) {
    const classroomItem = item.classroomItem;
    if (CONTENT_TYPES.has(classroomItem.type)) {
      return (
        <ReaderShell onBack={onBack}>
          <ContentItem item={classroomItem} />
        </ReaderShell>
      );
    }

    return (
      <ReaderShell onBack={onBack}>
        <ActionItem
          title={classroomItem.title}
          description={classroomItem.description}
          kind={item.kind}
          date={classroomItem.due_at ?? classroomItem.unlock_at ?? classroomItem.created_at}
          route={resolveItemRoute(classroomItem)}
          onOpen={(route) => navigate(route)}
        />
      </ReaderShell>
    );
  }

  return (
    <ReaderShell onBack={onBack}>
      <ActionItem
        title={item.title}
        description={item.description}
        kind={item.kind}
        date={item.date}
        route={item.route ?? null}
        onOpen={(route) => navigate(route)}
      />
    </ReaderShell>
  );
}

function ReaderShell({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  return (
    <section className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-[760px] px-5 py-6 sm:px-8 lg:px-10 lg:py-12">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-5 -ml-2 text-muted-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {children}
      </div>
    </section>
  );
}

function ContentItem({ item }: { item: ClassroomItem }) {
  const safeHtml = useMemo(
    () => (item.content_html ? DOMPurify.sanitize(item.content_html) : ''),
    [item.content_html],
  );

  return (
    <article className="space-y-7">
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {item.type.replace(/_/g, ' ')}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {item.title}
        </h1>
        <div className="text-sm text-muted-foreground">
          {format(new Date(item.created_at), 'MMMM d, yyyy')}
        </div>
      </div>

      {item.description && (
        <p className="text-lg leading-8 text-foreground/86">{item.description}</p>
      )}

      {item.content_markdown && (
        <article className="classroom-prose prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert prose-a:text-primary prose-a:underline prose-a:underline-offset-4">
          {item.content_markdown}
        </article>
      )}

      {safeHtml && (
        <article
          className="classroom-prose prose prose-sm max-w-none dark:prose-invert prose-a:text-primary prose-a:underline prose-a:underline-offset-4"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )}
    </article>
  );
}

function ActionItem({
  title,
  description,
  kind,
  date,
  route,
  onOpen,
}: {
  title: string;
  description?: string | null;
  kind: string;
  date?: string | null;
  route: string | null;
  onOpen: (route: string) => void;
}) {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {kind}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {date && (
          <div className="text-sm text-muted-foreground">
            {format(new Date(date), 'MMMM d, yyyy')}
          </div>
        )}
      </div>

      {description && <p className="text-lg leading-8 text-foreground/86">{description}</p>}

      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Open the activity</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This item continues in its dedicated LSAT U workspace.
            </p>
          </div>
          {route && (
            <Button type="button" onClick={() => onOpen(route)} className="shrink-0">
              Open
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function FallbackNextCard({ item }: { item: FallbackNext }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Do this next
          </div>
          <h3 className="text-lg font-bold leading-snug text-foreground">{item.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        </div>
        <Button type="button" onClick={() => navigate(item.route)} size="sm" className="shrink-0">
          Open
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
