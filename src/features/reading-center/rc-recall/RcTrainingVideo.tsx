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
        poster="/media/rc-training-demo-poster.jpg?v=continuous-v2"
        onError={() => setUnavailable(true)}
        style={{ display: "block", width: "100%", aspectRatio: "16 / 9", borderRadius: 12, background: "#f4f3f8" }}
      >
        <source src="/media/rc-training-demo.mp4?v=continuous-v2" type="video/mp4" />
        <track kind="captions" src="/media/rc-training-demo.vtt?v=continuous-v2" srcLang="en" label="On-screen steps" />
        Your browser cannot play this video. Follow the written steps instead.
      </video>}
    <figcaption id={descriptionId} className="mt-3 text-sm" style={{ color: "var(--rc-text-2)" }}>
      A one-minute video with no sound. It shows continuous recording through reading, recall and checking, with recall grades at the end. This video does not use your microphone. Pause whenever you need. Its pace is not a practice time limit.{" "}
      <Link to="/reading-center/rc-recall/instructions#rc-instructions-steps" className="underline">Read the written steps</Link>.
    </figcaption>
  </figure>;
}
