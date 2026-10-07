import { useEffect, useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  /** Path inside the `teaching-assets` bucket. */
  filePath: string | null;
  /** Transcript, if one was stored alongside the recording. */
  transcript?: string | null;
  /** Compact variant for table rows; the default suits a detail view. */
  dense?: boolean;
}

/**
 * Plays a recording out of the private `teaching-assets` bucket.
 *
 * The bucket is not public, so the source has to be a signed URL minted on
 * demand. Signed URLs expire, so this asks for a fresh one each time the player
 * mounts rather than caching a link that will be dead by the time someone
 * presses play.
 */
export default function AssetAudioPlayer({ filePath, transcript, dense }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!filePath) {
      setError("No file attached.");
      return;
    }
    setUrl(null);
    setError(null);
    supabase.storage
      .from("teaching-assets")
      .createSignedUrl(filePath, 60 * 60)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data?.signedUrl) {
          setError(err?.message ?? "Could not load the recording.");
          return;
        }
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (error) {
    return <div className="text-xs text-red-400">{error}</div>;
  }
  if (!url) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading audio…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <audio
        controls
        preload="none"
        src={url}
        className={dense ? "h-8 w-full max-w-md" : "w-full"}
      />
      {transcript && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-100"
            onClick={() => setShowTranscript((v) => !v)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            {showTranscript ? "Hide transcript" : "Transcript"}
          </Button>
          {showTranscript && (
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-relaxed text-zinc-300">
              {transcript}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
