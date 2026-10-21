import { RefreshCw } from "lucide-react";

// A failed query is not zero data. Anywhere a metric would otherwise fall back
// to 0 / "nothing recorded", this card says the truth instead: we could not
// read it, and here is how to try again.
export function QueryErrorCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/12 bg-white/30 px-3 py-3">
      <p className="text-sm text-black/60">Couldn't load this data.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-black/20 px-2.5 py-1 text-xs text-black/60 hover:bg-white/50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
