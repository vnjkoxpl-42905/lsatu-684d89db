import { useState } from "react";
import { CAPTION_NOTICE, mediaBase, mediaUrls, type ExampleClip } from "./lib/media";

/**
 * One captioned clip. Renders nothing when no media server is configured. If the
 * video cannot play, it says so and points to the audio and the transcript, which
 * carry the same lesson, instead of leaving a silent black box.
 */
export default function ExamplePlayer({ clip, base = mediaBase(), heading = clip.title }: { clip: ExampleClip; base?: string | null; heading?: string }) {
  const [failed, setFailed] = useState(false);
  const urls = mediaUrls(clip.stem, base);
  if (!urls) return null;
  return <figure className="min-w-0">
    <figcaption className="text-sm font-semibold">{heading}</figcaption>
    <video className="mt-2 w-full rounded-lg bg-black" controls preload="none" playsInline src={urls.video} aria-label={heading} onError={() => setFailed(true)}>
      <track kind="captions" src={urls.captions} srcLang="en" label="English (auto-generated)" default />
    </video>
    {failed && <p role="alert" className="mt-2 text-sm">This video could not be played. You can listen to the audio or read the transcript instead. They cover the same lesson.</p>}
    <a className="mt-2 inline-block text-sm underline" href={urls.audio} download={`${clip.stem.split("/").pop()}.mp3`}>
      Download MP3 audio
    </a>
    <a className="ml-4 inline-block text-sm underline" href={urls.transcript} download={`${clip.stem.split("/").pop()}.txt`}>
      Read transcript
    </a>
    <p className="mt-1 text-xs" style={{ color: "var(--rc-text-2)" }}>
      Source lesson: “{clip.sourceTitle}”. {CAPTION_NOTICE}
    </p>
  </figure>;
}
