import { validateHubOriginOrOrdinary } from '@/lib/reviewHubReturn';
/** Ordinary RC returns retain their contract; hub origins use the shared bounded parser. */
export function safeRcReturnTo(value: string | null | undefined): string | undefined {
  return validateHubOriginOrOrdinary(value);
}
