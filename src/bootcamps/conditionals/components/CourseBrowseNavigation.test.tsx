import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { CourseBrowseHeader, CourseBrowseNavigation } from './CourseBrowseNavigation';

afterEach(cleanup);
const url=(view:string)=>`/course/${view}?assignment=owned&edition=full-conditionals-v3`;
it('uses real links with a single current destination and no tab-panel semantics',()=>{
  const {container}=render(<MemoryRouter><CourseBrowseNavigation url={url} chapter={3} active="drills"/></MemoryRouter>);
  expect(screen.getByRole('navigation',{name:'Choose work'})).toBeVisible();
  expect(screen.getByRole('link',{name:'Drills'})).toHaveAttribute('aria-current','page');
  expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  expect(screen.queryByRole('tab')).toBeNull();
  for(const link of screen.getAllByRole('link'))expect(new URL(link.getAttribute('href')!,'https://local.test').searchParams.get('courseChapter')).toBe('3');
});
it('keeps mixed All work honest with no falsely selected destination',()=>{
  const {container}=render(<MemoryRouter><CourseBrowseNavigation url={url} active="all"/></MemoryRouter>);
  expect(container.querySelector('[aria-current]')).toBeNull();
  expect(screen.getAllByRole('link')).toHaveLength(3);
});
it('provides one compact headed region and places controls after it',()=>{
  const {container}=render(<CourseBrowseHeader title="Lessons" eyebrow="Chapter 3" description="Translate the language."><button>Filters</button></CourseBrowseHeader>);
  expect(screen.getByRole('heading',{level:1,name:'Lessons'})).toBeVisible();
  expect(container.querySelector('[data-course-heading] button')).toBeNull();
  expect(screen.getByRole('button',{name:'Filters'})).toBeVisible();
});
