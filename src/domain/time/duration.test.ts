import { describe, expect, it } from 'vitest';
import { formatElapsed, parseElapsed } from './duration';

describe('elapsed time', () => {
  it('formats minutes as H:MM', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65)).toBe('1:05');
    expect(formatElapsed(4500)).toBe('75:00');
    expect(formatElapsed(-30)).toBe('-0:30');
  });

  it.each([
    ['13:30', 810],
    ['13h30', 810],
    ['13.30', 810],
    [' 7 ', 420],
    ['0:05', 5],
    ['90:00', 5400],
  ])('parses %j', (text, minutes) => {
    expect(parseElapsed(text)).toBe(minutes);
  });

  it.each(['', 'abc', '1:60', '1:5', '-1:00', '1:00:00'])('rejects %j', (text) => {
    expect(parseElapsed(text)).toBeNull();
  });
});
