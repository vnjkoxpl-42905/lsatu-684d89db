import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DrillProgress } from './DrillProgress';
afterEach(cleanup);
it('separates current position from completed questions and marks the actual segments', () => {
 render(<DrillProgress completed={2} total={4} current={3} completedIndices={[0,2]}/>);
 expect(screen.getByText('Question 4 of 4')).toBeVisible();
 expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','2');
 expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext','50% complete. 2 of 4 questions completed.');
 const segments = document.querySelectorAll('.cd-progress-track>span');
 expect(segments[1]).toHaveAttribute('data-complete','false');
 expect(segments[2]).toHaveAttribute('data-complete','true');
 expect(segments[3]).toHaveAttribute('data-current','true');
});
it.each([[0,0,'0%'],[199,200,'99%'],[200,200,'100%']])('handles %s completed out of %s honestly', (completed,total,percentage) => {
 render(<DrillProgress completed={completed as number} total={total as number}/>);
 expect(screen.getByText((_,node)=>node?.tagName==='STRONG' && node.textContent===`${percentage} complete`)).toBeVisible();
});
it('uses a continuous rail for large banks and supports a named follow-up position', () => {
 render(<DrillProgress completed={20} total={50} positionLabel="Fresh check 2 of 4"/>);
 expect(screen.getByText('Fresh check 2 of 4')).toBeVisible();
 expect(screen.getByRole('progressbar')).toHaveClass('cd-progress-continuous');
});
