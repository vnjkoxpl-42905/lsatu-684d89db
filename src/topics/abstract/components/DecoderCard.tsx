import { useEffect, useRef, useState } from "react";
import type { DecoderCard as DecoderCardData } from "../types";

export interface DecoderCardProps {
  card: DecoderCardData;
}

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
    <article className="codex-card decoder-card" data-card-id={card.id}>
      <header className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="codex-eyebrow">Abstract phrase</p>
          <p
            className="codex-prose italic motion-safe:transition-[opacity,transform] motion-safe:duration-500"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(6px)",
            }}
          >
            {card.abstract_phrase}
          </p>
        </div>
        <div className="space-y-2">
          <p className="codex-eyebrow">Plain English</p>
          <p
            className="codex-prose motion-safe:transition-[opacity,transform] motion-safe:duration-500"
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
        className="my-5 w-full text-border"
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
        <blockquote className="codex-prose italic">
          {card.example_stimulus}
        </blockquote>
        <div className="flex flex-wrap gap-2">
          <span className="codex-chip">
            <span className="codex-mono font-semibold">X:</span>
            <span className="ml-1">{card.x_concrete}</span>
          </span>
          <span className="codex-chip">
            <span className="codex-mono font-semibold">Y:</span>
            <span className="ml-1">{card.y_concrete}</span>
          </span>
        </div>
      </section>
    </article>
  );
}
