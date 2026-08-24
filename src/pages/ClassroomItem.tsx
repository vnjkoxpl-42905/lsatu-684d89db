import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';
import { sanitizeClassroomHtml } from '@/components/classroom/classroomData';
import { format } from 'date-fns';

/**
 * /classroom/item/:itemId
 *
 * For action-y items (drill / homework / bootcamp) this page is a
 * resolver: it redirects into the underlying flow. For content items
 * (note / announcement / recap) it renders the body directly.
 */
export default function ClassroomItem() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useClassroomItems();

  const item = useMemo(
    () => items.find((i) => i.id === itemId) ?? null,
    [items, itemId],
  );

  // Action items redirect.
  useEffect(() => {
    if (!item) return;
    if (
      item.type === 'drill' ||
      item.type === 'homework' ||
      item.type === 'bootcamp_module' ||
      item.type === 'weekly_plan_task'
    ) {
      const route = resolveItemRoute(item);
      if (route) navigate(route, { replace: true });
    }
  }, [item, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
      </div>
    );
  }
  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <p className="text-sm text-muted-foreground mb-3">
          That item is no longer available.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/classroom')}>
          Back to classroom
        </Button>
      </div>
    );
  }

  const safeHtml = item.content_html ? sanitizeClassroomHtml(item.content_html) : '';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/classroom')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Classroom
          </Button>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {item.type.replace('_', ' ')}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <div className="text-xs text-muted-foreground">
            {format(new Date(item.created_at), 'MMMM d, yyyy')}
          </div>
        </div>

        {item.description && (
          <p className="text-base text-foreground/90 leading-relaxed">
            {item.description}
          </p>
        )}

        {item.content_markdown && (
          <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {item.content_markdown}
          </article>
        )}

        {safeHtml && (
          <article
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
      </main>
    </div>
  );
}
