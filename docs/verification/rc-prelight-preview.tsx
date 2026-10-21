import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RcHubSurface } from '../../src/features/rc/components/RcHubSurface';
import '../../src/index.css';
import '../../src/components/classroom/classroom.css';
document.documentElement.classList.add('dark');
const manual = new URLSearchParams(location.search).get('mode') !== 'automatic';
createRoot(document.getElementById('root')!).render(<><p style={{margin:0,padding:'8px 20px',font:'12px system-ui',background:'#eee',color:'#333'}}>Historical source 5014ce91 · 2026-10-15 before the theme change. Local visual reference; no production backend.</p><div className="classroom-root classroom-root-drill" style={{minHeight:'100vh',padding:24}}><div className="drill-observatory-root" style={{display:"block",width:"100%",minWidth:0}}><div className="drill-observatory-canvas" style={{display:"block",width:"100%",minWidth:0,maxWidth:1140,margin:'0 auto'}}><div className="drill-observatory-launcher" style={{display:"block",width:"100%",minWidth:0}}><div className="drill-observatory-launcher-panel" style={{display:"block",width:"100%",minWidth:0}}><MemoryRouter initialEntries={['/classroom/drill?section=rc&stage=type-drill'+(manual?'&passages=15':'')]}><div style={{display:"block",width:"100%",minWidth:0}}><RcHubSurface embedded showHistory={false}/></div></MemoryRouter></div></div></div></div></div></>);
