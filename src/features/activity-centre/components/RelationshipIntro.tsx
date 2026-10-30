import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ActivityIntroProps } from "./ActivityEditorialIntro";
import "../relationship-intro.css";

/** Keep the launch instructions current even for an older assignment snapshot. */
export function RelationshipIntro({ title, resumeAt = 1, preview, canSaveProgress = false, onStart, onExit }: ActivityIntroProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<Animation>();
  const closingRef = useRef(false);
  const expandedRef = useRef(false);
  const mountedRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const focusFrameRef = useRef<number>();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      animationRef.current?.cancel();
      if (focusFrameRef.current !== undefined) cancelAnimationFrame(focusFrameRef.current);
    };
  }, []);

  const animateBetween = (from: DOMRect, to: DOMRect, reverse = false) => {
    const shell = dialogRef.current!;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !shell.animate || !to.width || !to.height) return;
    const small = { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` };
    return shell.animate(reverse ? [{ transform: "none" }, small] : [small, { transform: "none" }], {
      duration: 450, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both",
    });
  };
  const expandVideo = () => {
    const shell = dialogRef.current!;
    if (expandedRef.current || closingRef.current) return;
    if (focusFrameRef.current !== undefined) cancelAnimationFrame(focusFrameRef.current);
    const from = shell.getBoundingClientRect();
    shell.close();
    shell.dataset.expanded = "true";
    shell.showModal();
    expandedRef.current = true;
    setExpanded(true);
    animationRef.current = animateBetween(from, shell.getBoundingClientRect());
    const opening = animationRef.current;
    opening?.finished.then(() => opening.cancel()).catch(() => {});
  };
  const restoreInline = () => {
    const shell = dialogRef.current;
    if (!mountedRef.current || !shell) return;
    // Clear the lifecycle guard before close(), which may dispatch a close event.
    expandedRef.current = false;
    closingRef.current = false;
    videoRef.current?.pause();
    animationRef.current?.cancel();
    animationRef.current = undefined;
    if (shell.open) shell.close();
    delete shell.dataset.expanded;
    shell.setAttribute("open", "");
    setExpanded(false);
    expandRef.current?.focus();
    if (focusFrameRef.current !== undefined) cancelAnimationFrame(focusFrameRef.current);
    // Native teardown can restore focus after close() returns.
    focusFrameRef.current = requestAnimationFrame(() => {
      if (mountedRef.current) expandRef.current?.focus();
      focusFrameRef.current = undefined;
    });
  };
  const closeVideo = async () => {
    const shell = dialogRef.current!;
    if (!expandedRef.current || closingRef.current) return;
    closingRef.current = true;
    videoRef.current?.pause();
    animationRef.current?.cancel();
    const animation = animateBetween(slotRef.current!.getBoundingClientRect(), shell.getBoundingClientRect(), true);
    animationRef.current = animation;
    if (animation) await animation.finished.catch(() => {});
    // A native close or unmount may have superseded this animation.
    if (!mountedRef.current || animationRef.current !== animation) return;
    restoreInline();
  };
  return (
    <div className="relationship-intro" data-testid="relationship-intro">
      {onExit && <button type="button" className="relationship-exit" onClick={onExit}><ArrowLeft size={16} aria-hidden="true" />Exit</button>}
      <header className="relationship-heading">
        <h1>{title}</h1>
        <p>Decide whether each sentence contains a conditional, causal, or comparative relationship.</p>
      </header>

      <div className="relationship-launch-grid">
        <div className="relationship-written">
          <section className="relationship-instructions" aria-labelledby="relationship-instructions-title">
            <h2 id="relationship-instructions-title">Instructions</h2>
            <ol>
              <li><strong>Read the whole sentence.</strong></li>
              <li><strong>Give the type and a quotation.</strong> Quote the word or phrase that tells you the type, rather than the whole sentence. If you find more than one type, give a separate quotation for each. One quotation per type is enough.</li>
            </ol>
          </section>

          <section className="relationship-example" aria-labelledby="relationship-example-title">
            <h2 id="relationship-example-title">Example</h2>
            <p className="relationship-example-label">Sentence</p>
            <p className="relationship-example-sentence">A lantern can be lit <strong>only if</strong> its wick is dry.</p>
            <p className="relationship-example-label">Answer</p>
            <p className="relationship-example-answer">Conditional, “only if”</p>
            <p className="relationship-example-reason">The wick has to be dry for the lantern to be lit. “Only if” tells us that. A dry wick alone does not guarantee that the lantern can be lit.</p>
          </section>

          <details className="relationship-guide">
            <summary>Review the three relationship types</summary>
            <dl>
              <div><dt>Conditional</dt><dd>A rule: if one thing is true, something else must be true too. The words may tell you what is enough or what is required.</dd></div>
              <div><dt>Causal</dt><dd>One thing produces or changes another. Look for causal verbs as well as words such as “because.”</dd></div>
              <div><dt>Comparative</dt><dd>One thing is compared with another thing, a number, or an earlier state. The comparison does not always use “than.”</dd></div>
            </dl>
          </details>

          <footer className="relationship-launch">
            <div className="relationship-run-notes">
              <p>{preview ? "Preview only. Student progress is unchanged." : canSaveProgress ? "Your submitted answers save as you go. You can leave and return to continue." : "This run does not save answers or change assignment progress."}</p>
            </div>
            <button type="button" className="relationship-start" onClick={onStart}>
              {resumeAt > 1 ? `Back to question ${resumeAt}` : "Start"}<ArrowRight size={18} aria-hidden="true" />
            </button>
          </footer>
        </div>

        <aside className="relationship-video" aria-labelledby="relationship-video-title">
          <h2 id="relationship-video-title">Video instructions</h2>
          <div className="relationship-video-slot" ref={slotRef}>
          <dialog open ref={dialogRef} className="relationship-video-shell" role={expanded ? undefined : "group"} aria-label={expanded ? "Video instructions" : undefined}
            onClose={(event) => {
              // Ignore queued close events from the inline-to-modal transition.
              if (!event.currentTarget.open) restoreInline();
            }}
            onCancel={(event) => {
              if (!event.cancelable || closingRef.current) {
                if (event.cancelable) event.preventDefault();
                restoreInline();
              } else {
                event.preventDefault();
                void closeVideo();
              }
            }}
            onClick={(event) => {
              if (event.target !== event.currentTarget || !expanded) return;
              const rect = event.currentTarget.getBoundingClientRect();
              if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) void closeVideo();
            }}>
          {expanded && <button type="button" className="relationship-video-close" autoFocus onClick={() => void closeVideo()}>Close video</button>}
          <video
            ref={videoRef}
            controls={expanded}
            preload="none"
            playsInline
            poster="/media/spot-the-relationship/how-to-play-v1.webp"
            src="/media/spot-the-relationship/how-to-play-v1.mp4"
            aria-label="How to play Spot the Relationship"
            onClick={() => { if (!expanded) expandVideo(); }}
            onLoadedData={() => setVideoFailed(false)}
            onError={() => setVideoFailed(true)}
          >
            <track kind="captions" src="/media/spot-the-relationship/how-to-play-v1.vtt" srcLang="en" label="English" default />
            Your browser cannot play this video. Read the written instructions on this page.
          </video>
          {videoFailed && expanded && <p className="relationship-video-fallback relationship-video-fallback-expanded" role="status">The video could not load. You can use the written instructions on this page.</p>}
          </dialog>
          </div>
          <button ref={expandRef} type="button" className="relationship-video-expand" aria-haspopup="dialog" aria-expanded={expanded} onClick={expandVideo}>Expand video</button>
          {videoFailed && !expanded && <p className="relationship-video-fallback" role="status">The video could not load. You can use the written instructions on this page.</p>}
        </aside>
      </div>
    </div>
  );
}
