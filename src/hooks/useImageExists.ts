import { useQuery } from '@tanstack/react-query';

/**
 * Lightweight HEAD-fetch probe to confirm an image asset is actually
 * served. Used by the marketing landing on /auth so we don't render
 * empty colored rectangles when /public/marketing/*.png hasn't been
 * uploaded yet. Cached aggressively — assets don't appear/disappear at
 * runtime.
 *
 * Returns:
 *   - undefined while checking
 *   - true if HEAD returned 2xx
 *   - false if HEAD returned non-2xx or threw
 */
export function useImageExists(src: string | null | undefined): boolean | undefined {
  const { data } = useQuery<boolean>({
    queryKey: ['image-exists', src],
    enabled: !!src,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      if (!src) return false;
      try {
        const r = await fetch(src, { method: 'HEAD' });
        return r.ok;
      } catch {
        return false;
      }
    },
  });
  return data;
}
