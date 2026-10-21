import { supabase } from "@/integrations/supabase/client";

/**
 * The generated Supabase types do not include reading_center_* tables yet.
 * This helper is the ONLY place that casts. Remove it after types are regenerated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rcDb = (table: string) => (supabase as any).from(table);
