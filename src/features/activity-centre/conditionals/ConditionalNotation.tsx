import { Fragment } from "react";
import { NegatedCondition } from "./NegatedCondition";

/** Keep the visual slash independent of the font's combining-glyph support. */
export function ConditionalNotation({ text }: { text: string }) {
  return <>{text.split(/([A-Za-z]\u0338)/u).map((part, index) =>
    /^[A-Za-z]\u0338$/u.test(part)
      ? <NegatedCondition key={index} text={part[0]} />
      : <Fragment key={index}>{part}</Fragment>)}</>;
}
