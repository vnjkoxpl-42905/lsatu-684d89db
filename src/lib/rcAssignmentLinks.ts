/** Add provenance only while rendering a known assignment's own RC builder link. */
export function rcAssignmentHref(href: string, origin: string): string {
  if ((!href.startsWith('/') && !/^https?:\/\//i.test(href)) || href.startsWith('//')) return href;
  let url: URL;
  try { url = new URL(href, origin); } catch { return href; }
  if (url.origin !== origin || url.searchParams.has('source')) return href;
  const rcBuilder = url.pathname === '/rc' ||
    ['/practice/drills', '/classroom/drill'].includes(url.pathname) && url.searchParams.get('section') === 'rc';
  if (!rcBuilder) return href;
  url.searchParams.set('source', 'assignment');
  return href.startsWith('/') ? `${url.pathname}${url.search}${url.hash}` : url.href;
}

/** Rewrite hrefs in an inert template. Callers must sanitize the output before rendering. */
export function rcAssignmentHtml(html: string, origin: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  let changed = false;
  template.content.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
    const href = anchor.getAttribute('href')!;
    const next = rcAssignmentHref(href, origin);
    if (next !== href) { anchor.setAttribute('href', next); changed = true; }
  });
  return changed ? template.innerHTML : html;
}
