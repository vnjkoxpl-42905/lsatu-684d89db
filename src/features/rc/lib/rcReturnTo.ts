/** Accept only an ordinary same-origin route, including its query and hash. */
export function safeRcReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some((char) => char.charCodeAt(0) <= 32)) return undefined;
  try {
    const url = new URL(value, 'https://rc.invalid');
    return url.origin === 'https://rc.invalid' ? value : undefined;
  } catch { return undefined; }
}
