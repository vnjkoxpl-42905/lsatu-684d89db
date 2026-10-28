import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const state=vi.hoisted(()=>({loading:false,error:null as string|null,analytics:null as null|{hasData:boolean}}));
vi.mock('@/hooks/useStudentAnalytics',()=>({useStudentAnalytics:()=>({...state,streak:null,refetch:vi.fn()})}));
vi.mock('@/components/analytics/ImportedMetricsPanel',()=>({default:()=> <section aria-label="Existing imported reports">Outside report</section>}));
import AnalyticsStage from './AnalyticsStage';
afterEach(cleanup);
describe('Imported reports are independent of native analytics',()=>{
 it.each(['loading','failure','empty'] as const)('keeps imports reachable during native %s',mode=>{
  state.loading=mode==='loading';state.error=mode==='failure'?'native failure':null;state.analytics=mode==='empty'?{hasData:false}:null;
  render(<MemoryRouter><AnalyticsStage tab="overview" onTabChange={()=>{}} /></MemoryRouter>);
  expect(screen.getByRole('region',{name:'Existing imported reports'})).toBeInTheDocument();
 });
});
