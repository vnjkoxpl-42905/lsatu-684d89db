import * as React from 'react';

interface CSKpiCardProps {
  label: string;
  value: string;
}

/** Punk-themed stat tile, matching the source prototype's KpiCard. */
const CSKpiCard: React.FC<CSKpiCardProps> = ({ label, value }) => (
  <div className="relative overflow-hidden bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-4">
    <div className="absolute -top-4 -right-4 w-20 h-20 bg-punk-cyan/10 rounded-full blur-2xl" aria-hidden="true" />
    <p className="text-[10px] uppercase tracking-[0.2em] text-punk-sub relative">{label}</p>
    <p className="text-2xl font-semibold text-punk-cyan drop-shadow-neon-cyan mt-1 relative">{value}</p>
  </div>
);

export default CSKpiCard;
