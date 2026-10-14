import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import './lesson-pages.css';

export type LessonPage = { title: string; content: ReactNode };

// Unwrap authoring fragments, never render a component by calling its function.
export function flattenLessonPages(children: ReactNode): LessonPage[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode; title?: string; 'data-toc-title'?: string }>(child)) return [];
    if (child.type === Fragment) return flattenLessonPages(child.props.children);
    return [{ title: child.props.title || child.props['data-toc-title'] || 'Keep the meaning', content: child }];
  });
}

export function LessonPages({ pages, children }: { pages: LessonPage[]; children: ReactNode }) {
  const [page, setPage] = useState(0);
  const [contents, setContents] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(() => window.matchMedia?.('(max-width: 900px)').matches ?? false);
  const focusAfterClose = useRef<number | null>(null);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const update = () => {
      const width = root.current?.getBoundingClientRect().width || window.innerWidth;
      setCompact(width <= 900);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (root.current) observer?.observe(root.current);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  useEffect(() => {
    if (!compact) setContents(false);
    const selected = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const rail = list.current?.closest<HTMLElement>('.co-page-sidebar-scroll');
    if (!selected || !rail || compact) return;
    const row = selected.getBoundingClientRect();
    const viewport = rail.getBoundingClientRect();
    if (row.top < viewport.top) rail.scrollTop -= viewport.top - row.top + 12;
    else if (row.bottom > viewport.bottom) rail.scrollTop += row.bottom - viewport.bottom + 12;
  }, [page, compact]);
  function focusPage(index: number) {
    requestAnimationFrame(() => {
      const heading = root.current?.querySelector<HTMLElement>(`[data-lesson-page="${index}"] h2`);
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      heading.closest('section')?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    });
  }
  function go(index: number) {
    setPage(index);
    if (compact && contents) focusAfterClose.current = index;
    else focusPage(index);
    setContents(false);
  }
  const pageLinks = (desktop: boolean) => <ol ref={desktop ? list : undefined} className="co-page-list">
    {pages.map((item, index) => <li key={index}><button type="button" aria-current={page === index ? 'page' : undefined} onClick={() => go(index)}><span className="co-page-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="co-page-link-title">{item.title}</span></button></li>)}
  </ol>;
  return <div ref={root} className="co-pages cr-sequence" data-compact={compact}>
    <aside className="co-page-sidebar" hidden={compact}>
      <div className="co-page-sidebar-scroll">
        <div className="co-page-sidebar-heading"><p className="co-kicker">Conditional logic</p><h2>In this lesson</h2><p>Page {page + 1} of {pages.length}</p></div>
        <nav aria-label="Lesson pages">{pageLinks(true)}</nav>
      </div>
    </aside>
    <div className="co-reading-canvas">
      <div className="co-page-bar">
        <div><span className="co-kicker">Page {page + 1} of {pages.length}</span><p aria-live="polite">{pages[page].title}</p>{compact && page < pages.length - 1 && <small>Next: {pages[page + 1].title}</small>}</div>
        {compact && <Sheet open={contents} onOpenChange={setContents}><SheetTrigger asChild><button type="button">Lesson pages <span aria-hidden="true">☰</span></button></SheetTrigger><SheetContent side="left" className="co-mobile-page-drawer" onCloseAutoFocus={event => {
          if (focusAfterClose.current !== null) {
            event.preventDefault();
            focusPage(focusAfterClose.current);
            focusAfterClose.current = null;
          }
        }}><SheetTitle>In this lesson</SheetTitle><SheetDescription>Page {page + 1} of {pages.length}. Choose a page to read.</SheetDescription><nav aria-label="Lesson pages">{pageLinks(false)}</nav></SheetContent></Sheet>}
        <div className="co-page-track" aria-hidden="true"><span style={{ transform: `scaleX(${(page + 1) / pages.length})` }}/></div>
      </div>
    {pages.map((item, index) => <div className="co-page" data-lesson-page={index} key={index} hidden={index !== page}>{item.content}</div>)}
    <nav className="co-page-turn" aria-label="Reading navigation">
      <button type="button" disabled={page === 0} onClick={() => go(page - 1)}><span aria-hidden="true">←</span><span>Back<small>{page > 0 ? pages[page - 1].title : 'First page'}</small></span></button>
      {page < pages.length - 1 ? <button type="button" className="co-next-page" onClick={() => go(page + 1)}><span>Next<small>{pages[page + 1].title}</small></span><span aria-hidden="true">→</span></button> : <p>You've reached the end of the reading.</p>}
    </nav>
    {page === pages.length - 1 && children}
    </div>
  </div>;
}
