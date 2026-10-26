import { describe, expect, it } from 'vitest';
import { sanitizeClassroomHtml } from '@/components/classroom/classroomData';
import { rcAssignmentHref, rcAssignmentHtml } from './rcAssignmentLinks';

const origin = 'https://lsatprep.study';
describe('known assignment RC passage links', () => {
  it.each(['/rc?passages=1188,1201&timing=standard#q3', '/practice/drills?section=rc&passages=1188&reveal=end_of_set', '/classroom/drill?section=rc&stage=type-drill&passages=1188'])('preserves the target and adds a non-ID origin marker: %s', href => {
    const before = new URL(href, origin);
    const after = new URL(rcAssignmentHref(href, origin), origin);
    expect(after.pathname).toBe(before.pathname);
    expect(after.hash).toBe(before.hash);
    for (const [key, value] of before.searchParams) expect(after.searchParams.get(key)).toBe(value);
    expect(after.searchParams.get('source')).toBe('assignment');
    expect(after.searchParams.has('assignmentId')).toBe(false);
  });
  it.each(['/rc', '/rc?count=3#setup', '/practice/drills?section=rc&count=2', '/classroom/drill?section=rc&count=1'])('marks RC builder links without exact passages: %s', href => {
    const before = new URL(href, origin);
    const after = new URL(rcAssignmentHref(href, origin), origin);
    expect(after.searchParams.get('source')).toBe('assignment');
    expect(after.pathname).toBe(before.pathname);
    expect(after.hash).toBe(before.hash);
    for (const [key, value] of before.searchParams) expect(after.searchParams.get(key)).toBe(value);
  });
  it.each(['/rc?source=manual&count=2', '/practice/drills?section=rc&source=other', '/classroom/drill?section=rc&source=adaptive&passages=1188'])('preserves existing conflicting provenance: %s', href => {
    expect(rcAssignmentHref(href, origin)).toBe(href);
  });
  it('preserves a real assignment ID rather than replacing it', () => {
    const url = new URL(rcAssignmentHref('/rc?passages=1188&assignmentId=real-id', origin), origin);
    expect(url.searchParams.get('assignmentId')).toBe('real-id');
    expect(url.searchParams.get('source')).toBe('assignment');
  });
  it.each(['https://external.example/rc?passages=1188', '//external.example/rc?passages=1188', '/drill?section=lr&qids=q1', '/practice/drills?section=lr&passages=1188', '#passages', 'javascript:alert(1)'])('leaves other navigation unchanged: %s', href => {
    expect(rcAssignmentHref(href, origin)).toBe(href);
  });
  it('marks same-origin absolute RC passage links', () => {
    expect(new URL(rcAssignmentHref(`${origin}/rc?passages=1188`, origin)).searchParams.get('source')).toBe('assignment');
  });
  it('sanitizes transformed assignment HTML at the rendering boundary', () => {
    const payload = '<svg><foreignObject><p onmouseover="alert(1)">Foreign</p></foreignObject></svg><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">Unsafe</a><a href="/rc?passages=1188#q3">Read passage</a>';
    const host = document.createElement('div');
    host.innerHTML = sanitizeClassroomHtml(rcAssignmentHtml(payload, origin));
    expect(host.querySelector('script')).toBeNull();
    for (const element of host.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        expect(attribute.name).not.toMatch(/^on/i);
        if (attribute.name === 'href') expect(attribute.value).not.toMatch(/^javascript:/i);
      }
    }
    expect(host.querySelector('a[href*="source=assignment"]')?.getAttribute('href')).toBe('/rc?passages=1188&source=assignment#q3');
  });
  it('changes only eligible hrefs in sanitized HTML and preserves authored style/text', () => {
    const html = '<style>.reading{color:green}</style><p class="reading">Read this <a href="/rc?passages=1188#q3">passage</a> or <a href="https://external.example/rc?passages=1188">reference</a>.</p>';
    const template = document.createElement('template');
    template.innerHTML = rcAssignmentHtml(html, origin);
    expect(template.content.querySelector('style')?.textContent).toBe('.reading{color:green}');
    expect(template.content.querySelector('p')?.textContent).toBe('Read this passage or reference.');
    expect(template.content.querySelector('a')?.getAttribute('href')).toBe('/rc?passages=1188&source=assignment#q3');
    expect(template.content.querySelectorAll('a')[1].getAttribute('href')).toBe('https://external.example/rc?passages=1188');
  });
});
