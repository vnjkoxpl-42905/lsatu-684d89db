import { createContext } from 'react';

/** Persistence identities come from the authenticated host, never from storage-key strings. */
export const ConditionalActivityIdentity = createContext<{ userId?: string; localOnly: boolean }>({ localOnly: true });
