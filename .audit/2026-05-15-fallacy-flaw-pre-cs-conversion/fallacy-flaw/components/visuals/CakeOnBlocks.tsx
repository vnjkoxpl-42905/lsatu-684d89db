

import { useState } from 'react';
import { cn } from '../../lib/utils';

export function CakeOnBlocks() {
  const [phase, setPhase] = useState<'rest' | 'fall'>('rest');
  return (
    <figure className="my-8 border border-rule bg-paper-bright/60 p-6">
      <figcaption className="protocol mb-4 flex items-baseline justify-between text-ink-mute">
        <span>Figure · Cake on Blocks</span>
        <span className={cn(phase === 'fall' ? 'text-strike' : 'text-verdigris-deep')}>
          {phase === 'fall' ? 'Objection sustained — cake floored.' : 'Valid argument'}
        </span>
      </figcaption>
      <div className="flex items-end justify-center gap-8 py-6">
        <svg
          viewBox="0 0 360 220"
          width="100%"
          className={cn('max-w-[480px]', phase === 'fall' && 'cake-anim')}
          aria-label="Cake supported by two blocks. Object to make the blocks slide and the cake fall."
        >
          <defs>
            <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#ECE5D2" />
              <circle cx="2" cy="2" r="0.5" fill="#C8BFA8" />
            </pattern>
          </defs>
          {/* Floor */}
          <line x1="20" y1="200" x2="340" y2="200" stroke="#C8BFA8" strokeWidth="1.5" />
          {/* Premise blocks */}
          <g className="block-left">
            <rect x="60" y="130" width="60" height="60" fill="url(#grain)" stroke="#14110C" strokeWidth="1.5" />
            <text x="90" y="168" textAnchor="middle" className="protocol" fontSize="9" fill="#14110C">
              PREMISE 1
            </text>
          </g>
          <g className="block-right">
            <rect x="240" y="130" width="60" height="60" fill="url(#grain)" stroke="#14110C" strokeWidth="1.5" />
            <text x="270" y="168" textAnchor="middle" className="protocol" fontSize="9" fill="#14110C">
              PREMISE 2
            </text>
          </g>
          {/* Cake */}
          <g className="cake-piece">
            <rect x="130" y="80" width="100" height="48" fill="#F9E1E6" stroke="#B73D5A" strokeWidth="1.5" />
            <rect x="130" y="80" width="100" height="14" fill="#E15F7B" />
            <circle cx="180" cy="73" r="4" fill="#B73D5A" />
            <text x="180" y="115" textAnchor="middle" className="font-display italic" fontSize="14" fill="#B73D5A">
              conclusion
            </text>
          </g>
        </svg>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm italic text-ink-mute">
          Premises are blocks. Conclusion is the cake. Validity lives in whether the blocks hold the cake up.
        </p>
        <div className="flex gap-2">
          {phase === 'rest' ? (
            <button
              type="button"
              onClick={() => setPhase('fall')}
              className="border border-cake-deep bg-cake px-3 py-1.5 protocol text-paper hover:bg-cake-deep"
            >
              Object: “What if…”
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPhase('rest')}
              className="border border-rule bg-paper-bright px-3 py-1.5 protocol text-ink hover:border-ink"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </figure>
  );
}
