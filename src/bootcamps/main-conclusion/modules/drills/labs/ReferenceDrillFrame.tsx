import { useEffect } from 'react';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

interface Props {
  drillId: string;
  title: string;
  /** Optional URL hash to deep-link into a section of the reference app (e.g. "drills-view"). */
  hash?: string;
}

/**
 * Renders the canonical structuredrill reference HTML verbatim in an iframe.
 * Source: public/reference-drills/structuredrill/index.html
 */
export function ReferenceDrillFrame({ drillId, title, hash }: Props) {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  // Mark visited so progression isn't blocked by the embedded app.
  useEffect(() => {
    markDrillComplete?.(drillId);
  }, [drillId, markDrillComplete]);

  const src = `/reference-drills/structuredrill/index.html${hash ? `#${hash}` : ''}`;

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full flex-col bg-white">
      <iframe
        src={src}
        title={title}
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
