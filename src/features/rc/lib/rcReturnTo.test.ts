import { describe, expect, it } from 'vitest';
import { safeRcReturnTo } from './rcReturnTo';
describe('RC internal return destination', () => {
  it('preserves internal queries and hashes', () => expect(safeRcReturnTo('/practice/drills?section=rc#history')).toBe('/practice/drills?section=rc#history'));
  it.each(['https://outside.test', '//outside.test', '/\\outside.test', '/\n/evil', '', undefined])('rejects unsafe destination %s', (value) => expect(safeRcReturnTo(value)).toBeUndefined());
});
