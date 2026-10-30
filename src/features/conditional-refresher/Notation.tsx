/** Shared notation: slash-through negation, vertical AND (+) and OR stacks. */

export function Tok({ text }: { text: string }) {
  const negated = text.startsWith("/");
  const label = negated ? text.slice(1) : text;
  return negated ? <span><span className="cir-sr-only">not </span><span className="cir-neg">{label}</span></span> : <span>{label}</span>;
}

export function Side({ text }: { text: string }) {
  const join = text.includes(" + ") ? "+" : text.includes(" or ") ? "or" : null;
  if (!join) return <Tok text={text.trim()} />;
  const parts = text.split(join === "+" ? " + " : " or ").map(p => p.trim());
  return (
    <span className="cir-stack">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 && <span className="cir-stack-join">{join}</span>}
          <span style={{ display: "block" }}><Tok text={part} /></span>
        </span>
      ))}
    </span>
  );
}

export function Diagram({ left, right }: { left: string; right: string }) {
  return (
    <span className="cir-diagram" role="img" aria-label={`If ${spokenSide(left)}, then ${spokenSide(right)}`}>
      <span aria-hidden="true"><Side text={left} /></span>
      <span className="cir-arrow" aria-hidden="true">&rarr;</span>
      <span aria-hidden="true"><Side text={right} /></span>
    </span>
  );
}

function spokenSide(text: string) {
  return text.split(/ (\+|or) /).map(part => part === '+' ? 'and' : part.startsWith('/') ? `not ${part.slice(1)}` : part).join(' ');
}
