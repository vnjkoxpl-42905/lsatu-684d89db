export function safeRcMediaSource(source: string): boolean {
  if (!source || [...source].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || /[\s\\]/.test(source)) return false;
  try {
    if (source.startsWith('/')) return new URL(source, 'https://rc-media.invalid').origin === 'https://rc-media.invalid';
    const url = new URL(source);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}
