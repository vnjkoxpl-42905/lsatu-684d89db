import * as React from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * Decorative "coming soon" hint panel matching the source prototype's
 * TutorChat visual style. No AI backend exists for Causation Station yet,
 * so this is explicitly disabled rather than a clickable dead end — the
 * Get Hint control is inert and labeled, not a fake working feature.
 */
const CSTutorChat: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-punk-sub hover:text-punk-text transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Causal Coach
      </button>
    );
  }

  return (
    <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-punk-cyan drop-shadow-neon-cyan flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Causal Coach
        </h3>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="text-sm border border-punk-sub/30 text-punk-sub/50 rounded-full px-4 py-1.5 cursor-not-allowed"
            title="Coming soon"
          >
            Get Hint
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-punk-sub hover:text-punk-text transition-colors"
            aria-label="Close Causal Coach"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 bg-punk-base/50 rounded-lg min-h-[80px] flex items-center justify-center">
        <p className="text-sm text-punk-sub text-center">
          AI hints are coming soon. For now, work through the model answer and explanation after you submit.
        </p>
      </div>
    </div>
  );
};

export default CSTutorChat;
