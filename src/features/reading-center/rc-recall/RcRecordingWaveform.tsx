import "./RcRecordingWaveform.css";

const BAR_WEIGHTS = [.16, .22, .3, .42, .52, .4, .66, .8, .6, .9, 1, .72, .88, .62, .96, .76, .56, .82, .68, .44, .6, .46, .32, .24, .16];

/** Heights follow the real microphone level. Silence stays still. */
export default function RcRecordingWaveform({ active, level, available }: { active: boolean; level: number; available: boolean }) {
  if (!active) return null;
  const safeLevel = available && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  return <div className="rct-recording-waveform">
    {available ? <div className="rct-recording-bars" role="img" aria-label="Live microphone input level">
      {BAR_WEIGHTS.map((weight, index) => <i aria-hidden="true" key={index} style={{ height: `${3 + safeLevel * weight * 85}px` }} />)}
    </div> : <p className="rct-recording-meter-unavailable" role="status">Recording · input level unavailable</p>}
  </div>;
}
