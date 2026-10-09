export type SufficientConditionFilmAsset = { src: string; poster?: string; caption: string; transcript: string };

/** Render only an actual generated asset; the written lesson remains available without video. */
export function SufficientConditionFilm({ asset }: { asset?: SufficientConditionFilmAsset }) {
  if (!asset) return null;
  return <figure className="sc-film"><video controls preload="metadata" playsInline poster={asset.poster} aria-label={asset.caption}><source src={asset.src} type="video/mp4"/>Your browser cannot play this clip. The explanation is available below.</video><figcaption>{asset.caption}</figcaption><details><summary>Read the video explanation</summary><p>{asset.transcript}</p></details></figure>;
}
