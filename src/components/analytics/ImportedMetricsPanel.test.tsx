import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({loading:false,error:false}));
vi.mock('@/hooks/useStudentExternalMetrics',()=>({useStudentExternalMetrics:()=>({isLoading:state.loading,isError:state.error,refetch:vi.fn(),grouped:{hasAny:true,sources:['7Sage'],overallAccuracy:{id:'report',source_platform:'7Sage',period_label:'October 2026',sample_size:20,first_accuracy:75},ptScores:[],accuracyByType:[],timingByType:[],sectionScores:[]}})}));
import ImportedMetricsPanel from './ImportedMetricsPanel';
afterEach(()=>{cleanup();state.loading=false;state.error=false;});
describe('Imported report appearance and evidence',()=>{
 it('honors the legacy light plane with scoped tokens and source/sample metadata',()=>{
  render(<div className="dark"><ImportedMetricsPanel variant="light" /></div>);
  const panel=screen.getByRole('region',{name:'Imported reports'});
  expect(panel.style.getPropertyValue('--card')).toBe('0 0% 100%');
  expect(panel.style.getPropertyValue('--foreground')).toBe('222.2 84% 4.9%');
  expect(screen.getByText('7Sage · October 2026 · 20 questions')).toBeInTheDocument();
 });
 it('inherits the host tokens in the default utility view',()=>{
  render(<ImportedMetricsPanel />);
  expect(screen.getByRole('region',{name:'Imported reports'}).style.getPropertyValue('--card')).toBe('');
 });
 it.each(['loading','error'] as const)('keeps light appearance during %s',mode=>{
  state[mode]=true;render(<ImportedMetricsPanel variant="light" showStates />);
  const panel=screen.getByRole(mode==='loading'?'status':'alert');
  expect(panel.style.getPropertyValue('--foreground')).toBe('222.2 84% 4.9%');
 });
});
