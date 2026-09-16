import { Fragment } from "react";

/** Keep the visual slash independent of the font's combining-glyph support. */
export function ConditionalNotation({ text }: { text: string }) {
  return <>{text.split(/([A-Za-z]\u0338)/u).map((part, index) =>
    /^[A-Za-z]\u0338$/u.test(part)
      ? <span key={index} className="conditional-negation" aria-label={`not ${part[0]}`}><span aria-hidden="true">{part[0]}</span></span>
      : <Fragment key={index}>{part}</Fragment>)}</>;
}
