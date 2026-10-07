export interface ComposerToken {
  start: number;
  end: number;
  text: string;
}

export function getCurrentComposerToken(value: string, caret: number): ComposerToken {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  let start = safeCaret;
  while (start > 0 && !/\s/.test(value[start - 1])) start -= 1;
  let end = safeCaret;
  while (end < value.length && !/\s/.test(value[end])) end += 1;
  return { start, end, text: value.slice(start, end) };
}

export function replaceComposerToken(
  value: string,
  token: ComposerToken,
  replacement: string,
): { value: string; caret: number } {
  const needsSpace = token.end >= value.length || !/\s/.test(value[token.end]);
  const inserted = replacement + (needsSpace ? " " : "");
  const next = value.slice(0, token.start) + inserted + value.slice(token.end);
  return { value: next, caret: token.start + inserted.length };
}
