export const supabase = new Proxy({}, { get(_target, key) {
  throw new Error(`Backend access is disabled in the RC acceptance fixture: ${String(key)}`);
} });
