import * as React from 'react';
import type { RcExplanationMedia as Media } from '../lib/rcTypes';
import { RcMarkdown } from './RcMarkdown';
import { safeRcMediaSource } from '../lib/rcMedia';

export function RcExplanationMedia({ media }: { media: Media[] }) {
  return <>{media.map((item, index) => <MediaItem key={`${item.src}-${index}`} item={item} />)}</>;
}

function MediaItem({ item }: { item: Media }) {
  const ref = React.useRef<HTMLMediaElement | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [speed, setSpeed] = React.useState('1');
  const id = React.useId();
  React.useEffect(() => { setFailed(false); setSpeed('1'); }, [item.src]);
  const available = (item.kind === 'video' || item.kind === 'audio') && Boolean(item.title?.trim())
    && safeRcMediaSource(item.src) && Boolean(item.transcript?.trim())
    && (item.kind === 'audio' || Boolean(item.captions?.language?.trim() && item.captions?.label?.trim() && safeRcMediaSource(item.captions.src)));
  if (!available) return <div><p>Media explanation unavailable: a valid source, transcript{item.kind === 'video' ? ' and captions' : ''} are required.</p>
    {item.transcript?.trim() && <details><summary>Read transcript</summary><RcMarkdown>{item.transcript}</RcMarkdown></details>}
  </div>;
  return <section aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{item.title}</h3>
    {failed ? <p role="status">The media could not be loaded. The transcript is available below.</p> : <>
      {item.kind === 'video' ? <video ref={element => { ref.current = element; }} controls preload="none" playsInline aria-label={item.title} onError={() => setFailed(true)} style={{ maxWidth: '100%' }} src={item.src}>
        <track kind="captions" src={item.captions!.src} srcLang={item.captions!.language} label={item.captions!.label} default />
      </video> : <audio ref={element => { ref.current = element; }} controls preload="none" aria-label={item.title} onError={() => setFailed(true)} src={item.src} />}
      <label htmlFor={`${id}-speed`}>Playback speed</label>
      <select id={`${id}-speed`} value={speed} onChange={event => { setSpeed(event.target.value); if (ref.current) ref.current.playbackRate = Number(event.target.value); }}>
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
      </select>
    </>}
    <details><summary>Read transcript</summary><RcMarkdown>{item.transcript}</RcMarkdown></details>
  </section>;
}
