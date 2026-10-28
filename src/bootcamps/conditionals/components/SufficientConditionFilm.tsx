import { useId, useState } from 'react';
import { sufficientConditionFilms } from '../content/sufficientConditionFilms';

export type SufficientConditionFilmAsset = { id: string; title: string; src: string; poster?: string; captions: string; caption: string; transcript: string };

/** Render only an actual generated asset; the written lesson remains available without video. */
export function SufficientConditionFilm({ assets = sufficientConditionFilms, title = 'What the rule gives us', ariaLabel = 'Short explanations of sufficiency' }: { assets?: SufficientConditionFilmAsset[]; title?: string; ariaLabel?: string }) {
  const [selected, setSelected] = useState(0);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const videoId = useId();
  const asset = assets[selected];
  if (!asset) return null;
  const failed = failedId === asset.id;
  return <section className="sc-film" aria-label={ariaLabel}>
    <header><p className="sc-eyebrow">Watch the explanation</p><h3>{title}</h3></header>
    {assets.length > 1 && <div className="sc-film-selector" role="group" aria-label="Choose an explanation">
      {assets.map((clip, index) => <button type="button" key={clip.id}
        aria-pressed={index === selected} aria-controls={videoId}
        onClick={() => { setSelected(index); setFailedId(null); }}>{clip.title}</button>)}
    </div>}
    <figure>
      <video id={videoId} key={`${asset.id}-${attempt}`} controls preload="metadata" playsInline
        poster={asset.poster} aria-label={asset.caption} onError={() => setFailedId(asset.id)}>
        <source src={asset.src} type="video/mp4" onError={() => setFailedId(asset.id)}/>
        <track kind="captions" src={asset.captions} srcLang="en" label="English" default/>
        Your browser cannot play this clip. The explanation is available below.
      </video>
      <figcaption>{asset.caption}</figcaption>
    </figure>
    {failed && <div className="sc-film-error">
      <p role="alert">The video couldn't load. You can read the explanation below or try again.</p>
      <button type="button" onClick={() => { setFailedId(null); setAttempt(value => value + 1); }}>Try loading the video again</button>
    </div>}
    <details key={`transcript-${asset.id}-${failed}`} open={failed || undefined}>
      <summary>Read the video explanation</summary><p>{asset.transcript}</p>
    </details>
  </section>;
}
