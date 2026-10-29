import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { OpeningCourseUrl } from './OpeningCourse';
import { courseBrowseUrl, type CourseBrowseKind } from '../courseBrowse';
import './conditional-browse.css';

export function CourseBrowseNavigation({ url, chapter, active, from }: { url: OpeningCourseUrl; chapter?: number; from?:string; active: CourseBrowseKind | 'all' }) {
  return <nav className="oc-browse-switch" aria-label="Choose work">{(['lessons', 'drills', 'flashcards'] as const).map(kind => <Link key={kind} to={courseBrowseUrl(url, kind, chapter, from)} aria-current={active === kind ? 'page' : undefined}>{kind === 'lessons' ? 'Lessons' : kind === 'drills' ? 'Drills' : 'Flashcards'}</Link>)}</nav>;
}

export function CourseBrowseHeader({ title, description, eyebrow, children }: { title: string; description?: string; eyebrow?: string; children?: ReactNode }) {
  return <><header className="oc-browse-header" data-course-heading>{eyebrow && <p className="oc-browse-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="oc-browse-description">{description}</p>}</header>{children}</>;
}
