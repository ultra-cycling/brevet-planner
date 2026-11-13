import { describe, expect, it } from 'vitest';
import { clockAt, createClockFormat, dayOffset, isValidDate, localDate, normalizeTimeOfDay } from './clock';

const start = { date: '2026-11-14', time: '06:00' }; // a Saturday

describe('clock times', () => {
  it('adds minutes to the start date and time', () => {
    expect(clockAt(start, 0).toISOString()).toBe('2026-11-14T06:00:00.000Z');
    expect(clockAt(start, 7 * 60 + 48).toISOString()).toBe('2026-11-14T13:48:00.000Z');
    expect(clockAt(start, 90 * 60).toISOString()).toBe('2026-11-18T00:00:00.000Z');
  });

  it('ignores daylight saving changes during the ride (wall clock at the start)', () => {
    // night of the change to winter time in Europe
    expect(clockAt({ date: '2026-10-24', time: '20:00' }, 12 * 60).toISOString()).toBe('2026-10-25T08:00:00.000Z');
  });

  it('counts the days of the ride', () => {
    expect(dayOffset(start, 0)).toBe(0);
    expect(dayOffset(start, 17 * 60 + 59)).toBe(0); // 23:59
    expect(dayOffset(start, 18 * 60)).toBe(1); // midnight
    expect(dayOffset(start, 40 * 60)).toBe(1);
  });

  it('formats times in 24 h, with the weekday when the ride spans midnight', () => {
    expect(createClockFormat(start, 'en', false).format(7 * 60 + 48)).toBe('13:48');
    expect(createClockFormat(start, 'en', false).format(18 * 60 + 5)).toBe('00:05');
    const days = createClockFormat(start, 'en', true);
    expect(days.format(0)).toBe('Sat 06:00');
    expect(days.format(27 * 60)).toBe('Sun 09:00');
  });

  it('parses a time of day on the day closest to the reference', () => {
    const clock = createClockFormat(start, 'en', true);
    expect(clock.parse('13:30', 7 * 60)).toBe(7 * 60 + 30); // Sat 13:30
    expect(clock.parse('9:00', 26 * 60)).toBe(27 * 60); // Sun 09:00
    expect(clock.parse('9.00', 0)).toBe(3 * 60); // Sat 09:00
    expect(clock.parse('05:00', 0)).toBe(23 * 60); // not before the start → Sun 05:00
  });

  it('parses a time with a weekday', () => {
    const clock = createClockFormat(start, 'en', true);
    expect(clock.parse('Sun 09:00', 0)).toBe(27 * 60);
    expect(clock.parse('mon. 06:00', 0)).toBe(48 * 60);
    expect(clock.parse('Sat 06:00', 40 * 60)).toBe(0);
  });

  it.each(['', 'abc', '25:00', '12:60', '12', 'Xyz 10:00'])('rejects %j', (text) => {
    expect(createClockFormat(start, 'en', true).parse(text, 0)).toBeNull();
  });

  it('validates dates and normalizes times of day', () => {
    expect(isValidDate('2026-11-14')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('14.11.2026')).toBe(false);
    expect(normalizeTimeOfDay('6:00')).toBe('06:00');
    expect(normalizeTimeOfDay('21h30')).toBe('21:30');
    expect(normalizeTimeOfDay('24:00')).toBeNull();
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
