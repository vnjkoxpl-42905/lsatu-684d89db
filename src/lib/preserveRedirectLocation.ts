/** Keep legacy deep-link context while letting explicit target parameters win. */
export function preserveRedirectLocation(to: string, search: string, hash: string): string {
  const [target, targetHash] = to.split("#", 2);
  const [path, targetSearch] = target.split("?", 2);
  const merged = new URLSearchParams(targetSearch ?? "");
  const explicitKeys = new Set(merged.keys());
  new URLSearchParams(search).forEach((value, key) => {
    if (!explicitKeys.has(key)) merged.append(key, value);
  });
  const query = merged.toString();
  return `${path}${query ? `?${query}` : ""}${targetHash === undefined ? hash : `#${targetHash}`}`;
}
