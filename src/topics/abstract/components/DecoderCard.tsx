import { useEffect, useRef, useState } from "react";
import type { DecoderCard as DecoderCardData } from "../types";

export interface DecoderCardProps {
  card: DecoderCardData;
}

// DecoderCard: single side-by-side abstract/plain card with an SVG morph
// animation on enter (audit-compliant: SVG, not Canvas; pure CSS transforms).

export function DecoderCard({ card }: DecoderCardProps) {
  const [entered, setEntered] = useState(false);
  const idRef = useRef(card.id);

  useEffect(() => {
    if (idRef.current !== card.id) {
      idRef.current = card.id;
      setEntered(false);
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [card.id]);

  return (
    <article
      className="decoder-card rounded-2xl border border-border bg-card/60 p-5 shadow-sm"
      data-card-id={card.id}
    >
      <header className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Abstract phrase
          </p>
          <p
            className="italic leading-relaxed motion-safe:transition-[opacity,transform] motion-safe:duration-500"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(6px)",
            }}
          >
            {card.abstract_phrase}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Plain English
          </p>
          <p
            className="leading-relaxed motion-safe:transition-[opacity,transform] motion-safe:duration-500"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(6px)",
              transitionDelay: "120ms",
            }}
          >
            {card.plain_english}
          </p>
        </div>
      </header>

      <svg
        viewBox="0 0 200 8"
        aria-hidden
        className="my-4 w-full text-border"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="4"
          x2="200"
          y2="4"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray={entered ? "0 0" : "2 4"}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
        <circle
          cx={entered ? 100 : 0}
          cy="4"
          r="2"
          fill="currentColor"
          style={{ transition: "cx 600ms ease-out" }}
        />
      </svg>

      <section className="space-y-3">
        <blockquote className="italic border-l-2 border-border pl-3 text-sm leading-relaxed text-foreground/90">
          {card.example_stimulus}
        </blockquote>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <span className="font-mono font-semibold">X:</span>
            <span>{card.x_concrete}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <span className="font-mono font-semibold">Y:</span>
            <span>{card.y_concrete}</span>
          </span>
        </div>
      </section>
    </article>
  );
}
