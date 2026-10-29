import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { AndOrDiagram } from './AndOrVisuals';
import { libraryExample } from '../content/andOrItems';
import { contrapositive, group, lit } from '../content/andOrLogic';
afterEach(cleanup);
it.each([libraryExample.both, libraryExample.either, contrapositive(libraryExample.both), contrapositive(libraryExample.either)])('anchors the horizontal arrow and connector to the same explicit row on either side', rule => {
 const { container } = render(<AndOrDiagram atoms={libraryExample.atoms} rule={rule}/>);
 const arrow = container.querySelector('.ao-arrow')!;
 expect(arrow.querySelector('svg')).not.toBeNull();
 expect(container.querySelectorAll('.ao-connector')).toHaveLength(1);
 const connector = container.querySelector('.ao-connector') as HTMLElement;
 expect(connector.style.gridRow).toBe('3');
 expect(connector.textContent).toBe(connector.dataset.op === 'and' ? '+AND' : 'orOR');
 const single = [...container.querySelectorAll('.ao-side')].find(side => side.querySelectorAll('.ao-member').length === 1)!;
 expect((single.querySelector('.ao-member') as HTMLElement).style.gridRow).toBe('3');
 expect(screen.getByText('Left side · sufficient')).toBeVisible();
 expect(screen.getByText('Right side · necessary')).toBeVisible();
});

it('aligns a three-condition side at its lower middle connector and shifts the opposite side to match', () => {
 const rule = { sufficient: group('and', lit('id'), lit('address'), lit('card')), necessary: group('or', lit('id'), lit('address')) };
 const { container } = render(<AndOrDiagram atoms={libraryExample.atoms} rule={rule}/>);
 const arrow = container.querySelector('.ao-arrow') as HTMLElement;
 expect(arrow.style.gridRow).toBe('5');
 const anchors = container.querySelectorAll('[data-arrow-anchor=true]');
 expect(anchors).toHaveLength(2);
 for (const anchor of anchors) expect((anchor as HTMLElement).style.gridRow).toBe(arrow.style.gridRow);
 expect(container.querySelector('.ao-diagram-frame > .ao-diagram')).not.toBeNull();
});
