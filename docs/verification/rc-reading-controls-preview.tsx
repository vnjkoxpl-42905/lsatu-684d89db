import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/features/rc/player.css';
import { RcLineSpacingMenu, RcTextSettings } from '../../src/features/rc/components/RcModals';
import { RcPassagePane } from '../../src/features/rc/components/RcPassagePane';
import { rcTypeStyles } from '../../src/features/rc/components/RcExamPane';
import { useRcA11y } from '../../src/features/rc/hooks/useRcA11y';

function Preview() {
  const a11y = useRcA11y();
  return <main className="p-4 text-slate-900"><h1 className="mb-4 text-xl font-semibold">RC reading controls verification</h1>
    <div className="flex items-start gap-4"><div className="w-64 shrink-0 rounded border bg-white"><RcTextSettings settings={a11y.settings} onChange={a11y.update} /></div>
    <section className="min-w-0 flex-1"><div className="flex justify-end border bg-slate-100 p-2"><RcLineSpacingMenu settings={a11y.settings} onChange={a11y.update} /></div>
    <div className={`rc-exam ${a11y.className}`}><RcPassagePane passage={{ passageId: 'verification', title: 'Reading focus example', text: 'A small town planted trees along its busiest street. Researchers compared summer temperatures before and after the planting. The shaded pavement stayed cooler during the afternoon.\n\nThe result suggested that shade could reduce local heat. However, rainfall and traffic also changed during the study. A second comparison would help determine how much of the difference the trees caused.', frameworks: [] } as any}
      highlights={[]} color="yellow" onColorChange={() => {}} onAddHighlight={() => {}} onRemoveHighlight={() => {}} onRemoveRange={() => {}} highlightMode="none" findQuery="" findIndex={0} onFindCount={() => {}} scrollTop={0} onScroll={() => {}} textStyle={rcTypeStyles(a11y.fontScale, a11y.extraLeading).passage} paragraphFocus={a11y.settings.paragraphFocus} />
    </div></section></div></main>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />);
