import { useEffect } from 'react';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

type ReferenceSource = 'structuredrill' | 'introconclusiondrill' | 'maincfirst' | 'first-sentence-vs-rebuttal';

interface Props {
  drillId: string;
  title: string;
  /** Which reference HTML app to embed. Defaults to structuredrill for back-compat. */
  source?: ReferenceSource;
  /** Optional URL hash to deep-link into a section of the reference app (e.g. "drills-view"). */
  hash?: string;
}

/**
 * Renders a canonical drill reference HTML verbatim in an iframe.
 * Sources live under public/reference-drills/<source>/index.html
 */
export function ReferenceDrillFrame({ drillId, title, source = 'structuredrill', hash }: Props) {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  // Mark visited so progression isn't blocked by the embedded app.
  useEffect(() => {
    markDrillComplete?.(drillId);
  }, [drillId, markDrillComplete]);

  const src = `/reference-drills/${source}/index.html${hash ? `#${hash}` : ''}`;

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
