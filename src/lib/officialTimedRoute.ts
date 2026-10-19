/** Only the full-screen official child players own this route shape. */
export function isOfficialTimedChildPath(pathname: string): boolean {
  return /^\/testing\/test\/[^/]+\/(?:lr|rc)\/[^/]+\/?$/.test(pathname);
}
