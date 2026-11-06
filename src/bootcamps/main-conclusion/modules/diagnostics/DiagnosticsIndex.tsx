import { DiagnosticsAnalyticsSurface } from '@/bootcamps/main-conclusion/modules/diagnostics/DiagnosticsAnalyticsSurface';

export const DIAG_SECTIONS = [
  { id: 'MC-DIA-6.2', title: 'Diagnostic Profile', route: '/diagnostics' },
  { id: 'MC-DIA-6.1', title: 'Diagnostic Philosophy', route: '/diagnostics/philosophy' },
] as const;

export function DiagnosticsIndex() {
  return <DiagnosticsAnalyticsSurface />;
}
