import { Mic } from "lucide-react";
import "./RcRecordingWaveform.css";

/** A live input meter, never an animation that pretends speech was detected. */
export default function RcRecordingWaveform({ active, level, available }: { active: boolean; level: number; available: boolean }) {
  if (!active) return null;
  const safeLevel = available && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  return <div className="rct-recording-waveform" role="status">
    <span className="rct-recording-mic" aria-hidden="true"><Mic size={19} /></span>
    <div className="rct-recording-copy"><strong>Recall paragraph</strong><span>{available ? "Microphone active" : "Recording · level meter unavailable"}</span></div>
    {available && <span className="rct-recording-bars" aria-hidden="true">{[.35, .6, .85, 1, .75, .5, .9, .65, .4].map((weight, index) => <i key={index} style={{ height: `${3 + safeLevel * weight * 29}px` }} />)}</span>}
  </div>;
}
