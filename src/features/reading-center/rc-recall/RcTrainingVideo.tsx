import { useId, useState } from "react";
import { Link } from "react-router-dom";

export default function RcTrainingVideo({ compact = false }: { compact?: boolean }) {
  const descriptionId = useId();
  const [unavailable, setUnavailable] = useState(false);
  return <figure className="rct-training-video" data-compact={compact || undefined} style={{ margin: 0 }}>
    {unavailable
      ? <p role="status">The video could not be loaded. You can follow the written steps instead.</p>
      : <video
        aria-label="RC Training demonstration"
        aria-describedby={descriptionId}
        controls
        playsInline
        preload="metadata"
        poster="/media/rc-training-demo-poster.jpg"
        onError={() => setUnavailable(true)}
        style={{ display: "block", width: "100%", aspectRatio: "16 / 9", borderRadius: 12, background: "#f4f3f8" }}
      >
        <source src="/media/rc-training-demo.mp4" type="video/mp4" />
        <track kind="captions" src="/media/rc-training-demo.vtt" srcLang="en" label="On-screen steps" />
        Your browser cannot play this video. Follow the written steps instead.
      </video>}
    <figcaption id={descriptionId} className="mt-3 text-sm" style={{ color: "var(--rc-text-2)" }}>
      A one-minute silent demonstration. Pause whenever you need. Its pace is not a practice time limit.{" "}
      <Link to="/reading-center/rc-recall/instructions#rc-instructions-steps" className="underline">Read the written steps</Link>.
    </figcaption>
  </figure>;
}
