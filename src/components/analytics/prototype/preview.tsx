import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BarChart3, BookOpen, ChevronDown, ClipboardList, Home, Library, Menu, MessageCircle, NotebookPen, X } from 'lucide-react';
import ProgressPrototype from './ProgressPrototype';
import { DEMO_AS_OF, getDemoData } from './fixture';
import '@/index.css';

function Preview() {
  const [state, setState] = useState<'populated' | 'empty' | 'sparse' | 'partial' | 'loading' | 'error'>('populated');
  const [menu, setMenu] = useState(false);
  const data = getDemoData(state);
  return <div className="pp-preview-shell"><aside className={`pp-preview-sidebar ${menu ? 'is-open' : ''}`}><div className="pp-brand"><span>LS</span>LSAT U<button type="button" aria-label="Close navigation" onClick={() => setMenu(false)}><X size={18} /></button></div><p>Your classroom</p><nav aria-label="Preview classroom context">{[{ label: 'Home', icon: Home }, { label: 'My Work', icon: ClipboardList }, { label: 'Practice', icon: NotebookPen }, { label: 'Review', icon: BookOpen }, { label: 'Progress', icon: BarChart3 }, { label: 'Library', icon: Library }].map(({ label, icon: Icon }) => <span key={label} className={label === 'Progress' ? 'is-active' : ''} aria-current={label === 'Progress' ? 'page' : undefined}><Icon size={18} />{label}</span>)}</nav><div className="pp-sidebar-bottom"><MessageCircle size={18} /><span>Demonstration workspace<small>Preview navigation is contextual</small></span></div></aside><main className="pp-preview-main"><header className="pp-preview-header"><div><button type="button" className="pp-menu" aria-label="Open navigation" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={20} /></button><h1>Progress</h1><p>Your practice, with the questions behind it.</p></div><label className="pp-demo-state">Demo state<select aria-label="Demonstration state" value={state} onChange={(event) => setState(event.target.value as typeof state)}><option value="populated">Populated</option><option value="empty">Empty</option><option value="sparse">Small sample</option><option value="partial">Partial sources</option><option value="loading">Loading</option><option value="error">Error</option></select><ChevronDown size={14} aria-hidden="true" /></label></header><ProgressPrototype answers={data.answers} coverage={data.coverage} asOf={DEMO_AS_OF} demo loading={state === 'loading'} error={state === 'error' ? 'Demonstration: saved answer sources could not be loaded.' : null} onRetry={() => setState('populated')} /></main></div>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview /></BrowserRouter>);
else document.getElementById('root')!.textContent = 'Development preview unavailable.';
