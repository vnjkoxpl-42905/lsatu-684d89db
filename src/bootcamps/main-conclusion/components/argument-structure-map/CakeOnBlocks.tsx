import { useState, useEffect } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

/**
 * CakeOnBlocks — the Lesson 1.1 marquee visual.
 * Lifted in spirit from logicalreasoningfoundation prototype's Gap Simulator.
 * Three states: stable (cake atop blocks) · unstable (one block sliding out) · collapsed (cake fallen).
 * Tap a block → it slides out → cake falls. Tap again to restore.
 *
 * Conclusion = the cake (--role-conclusion green; "squishy and fragile").
 * Premises  = the blocks (--role-premise blue; "solid").
 *
 * Respects prefers-reduced-motion (motion handled via CSS transitions on transform/opacity).
 */

type State = 'stable' | 'unstable' | 'collapsed';

const SPRING_DURATION_MS = 220;

export function CakeOnBlocks({
  className,
  ariaLabel = 'Cake on blocks: tap a premise block to remove it and watch the conclusion fall.',
}: {
  className?: string;
  ariaLabel?: string;
}): JSX.Element {
  const [state, setState] = useState<State>('stable');
  const [removedBlock, setRemovedBlock] = useState<'left' | 'right' | null>(null);

  // Auto-cycle from unstable to collapsed after the spring completes.
  useEffect(() => {
    if (state !== 'unstable') return;
    const t = setTimeout(() => setState('collapsed'), SPRING_DURATION_MS);
    return () => clearTimeout(t);
  }, [state]);

  function handleBlockClick(side: 'left' | 'right') {
    if (state === 'stable') {
      setRemovedBlock(side);
      setState('unstable');
    } else {
      setRemovedBlock(null);
      setState('stable');
    }
  }

  // SVG geometry — 320×220 viewBox.
  // Blocks at y=130-180 (50px tall); cake on top y≈80-130.
  const cakeY = state === 'collapsed' ? 180 : 80;
  const cakeOpacity = state === 'collapsed' ? 0.55 : 1;
  const cakeRotate = state === 'collapsed' ? -8 : 0;
  const leftOut = removedBlock === 'left' && state !== 'stable';
  const rightOut = removedBlock === 'right' && state !== 'stable';

  return (
    <figure
      className={cn(
        'relative isolate w-full max-w-[420px] mx-auto',
        'rounded-5 p-5 overflow-hidden',
        'bg-[image:var(--grad-surface-soft)]',
        'border border-[rgb(var(--border)/0.10)]',
        'shadow-[var(--shadow-2)]',
        className,
      )}
      aria-label={ariaLabel}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.18), transparent 70%)' }}
      />
      <svg
        viewBox="0 0 320 220"
        role="img"
        aria-labelledby="cake-blocks-title cake-blocks-desc"
        className="w-full h-auto"
      >
        <title id="cake-blocks-title">Cake-on-Blocks: argument structure visualizer</title>
        <desc id="cake-blocks-desc">
          The conclusion (a cake) sits atop two premises (blocks). Removing a block makes the conclusion fall.
        </desc>

        {/* Floor */}
        <line x1="20" y1="200" x2="300" y2="200" stroke="rgb(var(--border))" strokeWidth="1" strokeDasharray="2 4" />

        {/* Left premise block */}
        <g
          transform={`translate(${leftOut ? -120 : 0}, ${leftOut ? 8 : 0}) rotate(${leftOut ? -12 : 0} 90 155)`}
          style={{ transition: `transform ${SPRING_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` }}
        >
          <rect
            x="60" y="130" width="60" height="50"
            rx="3"
            fill="rgb(var(--role-premise) / 0.18)"
            stroke="rgb(var(--role-premise))"
            strokeWidth="1.5"
          />
          <text x="90" y="160" textAnchor="middle" fill="rgb(var(--role-premise))" fontFamily="JetBrains Mono, ui-monospace" fontSize="9" fontWeight="600">
            PREMISE
          </text>
        </g>

        {/* Right premise block */}
        <g
          transform={`translate(${rightOut ? 120 : 0}, ${rightOut ? 8 : 0}) rotate(${rightOut ? 12 : 0} 230 155)`}
          style={{ transition: `transform ${SPRING_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` }}
        >
          <rect
            x="200" y="130" width="60" height="50"
            rx="3"
            fill="rgb(var(--role-premise) / 0.18)"
            stroke="rgb(var(--role-premise))"
            strokeWidth="1.5"
          />
          <text x="230" y="160" textAnchor="middle" fill="rgb(var(--role-premise))" fontFamily="JetBrains Mono, ui-monospace" fontSize="9" fontWeight="600">
            PREMISE
          </text>
        </g>

        {/* Cake (conclusion) — 3 layers, sits on top */}
        <g
          transform={`translate(0 ${cakeY - 80}) rotate(${cakeRotate} 160 100)`}
          style={{
            transition: `transform ${SPRING_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${SPRING_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            opacity: cakeOpacity,
          }}
        >
          {/* base */}
          <rect x="100" y="105" width="120" height="22" rx="4" fill="rgb(var(--role-conclusion) / 0.22)" stroke="rgb(var(--role-conclusion))" strokeWidth="1.5" />
          {/* middle */}
          <rect x="110" y="88" width="100" height="18" rx="3" fill="rgb(var(--role-conclusion) / 0.32)" stroke="rgb(var(--role-conclusion))" strokeWidth="1.5" />
          {/* top */}
          <rect x="120" y="74" width="80" height="14" rx="3" fill="rgb(var(--role-conclusion) / 0.44)" stroke="rgb(var(--role-conclusion))" strokeWidth="1.5" />
          {/* candle */}
          <line x1="160" y1="62" x2="160" y2="72" stroke="rgb(var(--accent))" strokeWidth="2" strokeLinecap="round" />
          <circle cx="160" cy="60" r="2.5" fill="rgb(var(--accent))" />
          {/* label */}
          <text x="160" y="120" textAnchor="middle" fill="rgb(var(--role-conclusion))" fontFamily="JetBrains Mono, ui-monospace" fontSize="9" fontWeight="700">
            CONCLUSION
          </text>
        </g>

        {/* Click targets — overlay buttons for keyboard + tap */}
        <foreignObject x="0" y="0" width="320" height="220" style={{ pointerEvents: 'none' }}>
          {/* foreignObject for button targets that align with the block geometry */}
        </foreignObject>
      </svg>

      {/* Click targets layered over the SVG so they catch keyboard + pointer */}
      <div className="absolute inset-4 pointer-events-none">
        <button
          type="button"
          aria-label={`Left premise block — ${state === 'stable' ? 'remove it' : 'restore'}`}
          aria-pressed={leftOut}
          onClick={() => handleBlockClick('left')}
          className={cn(
            'absolute pointer-events-auto rounded-2',
            'focus-visible:outline-2 focus-visible:outline-mc-accent',
            'transition-colors duration-150 ease-eased',
            'hover:bg-[rgb(var(--role-premise)/0.06)]',
          )}
          style={{ left: '18%', top: '58%', width: '20%', height: '24%' }}
        />
        <button
          type="button"
          aria-label={`Right premise block — ${state === 'stable' ? 'remove it' : 'restore'}`}
          aria-pressed={rightOut}
          onClick={() => handleBlockClick('right')}
          className={cn(
            'absolute pointer-events-auto rounded-2',
            'focus-visible:outline-2 focus-visible:outline-mc-accent',
            'transition-colors duration-150 ease-eased',
            'hover:bg-[rgb(var(--role-premise)/0.06)]',
          )}
          style={{ left: '62%', top: '58%', width: '20%', height: '24%' }}
        />
      </div>

      <figcaption className="mt-3 text-center font-mc-mono text-mono text-ink-faint">
        {state === 'stable'
          ? 'Tap a block to remove it →'
          : state === 'unstable'
            ? 'Block sliding out…'
            : 'Cake fell. The conclusion can\'t hold itself up.'}
      </figcaption>
    </figure>
  );
}
