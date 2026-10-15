import { DiagnosticsAnalyticsSurface } from '@/bootcamps/main-conclusion/modules/diagnostics/DiagnosticsAnalyticsSurface';

export const DIAG_SECTIONS = [
  { id: 'MC-DIA-6.1', title: 'Philosophy', route: '/diagnostics/philosophy' },
  { id: 'MC-DIA-6.2', title: 'Dashboard', route: '/diagnostics/dashboard' },
  { id: 'MC-DIA-6.3', title: 'Recommendations', route: '/diagnostics/recommendations' },
  { id: 'MC-DIA-6.4', title: 'R&R Review', route: '/diagnostics/rr-review' },
  { id: 'MC-DIA-6.5', title: 'Trait Diagnostic', route: '/diagnostics/trait-profile' },
  { id: 'MC-DIA-6.6', title: 'Mistake Profile', route: '/diagnostics/mistake-profile' },
  { id: 'MC-DIA-6.7', title: 'SRS Queue', route: '/diagnostics/srs' },
] as const;

export function DiagnosticsIndex() {
  return <DiagnosticsAnalyticsSurface />;
}
