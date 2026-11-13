import { describe, expect, it } from 'vitest';
import type { ControlRow } from './checkpoints';
import { arrivalStatus } from './status';
import type { TimetableRow } from './timetable';

const row = (kind: 'start' | 'control' | 'finish', arrivalMin: number, openMin = 120, closeMin = 300): TimetableRow =>
  ({
    control: { checkpoint: { kind }, window: { openMin, closeMin } } as ControlRow,
    arrivalMin,
    bufferMin: kind === 'start' ? null : closeMin - arrivalMin,
  }) as TimetableRow;

describe('arrivalStatus', () => {
  it.each([
    [200, 'ok'], // 100 min left
    [225, 'ok'], // exactly the threshold
    [226, 'tight'],
    [300, 'tight'], // arriving at closing time is still in time
    [300.4, 'tight'], // rounded like the displayed time
    [301, 'late'],
    [119, 'early'],
    [120, 'ok'],
  ])('arrival at %d min → %s (window 2:00–5:00, tight below 75 min)', (arrival, status) => {
    expect(arrivalStatus(row('control', arrival), 75)).toBe(status);
  });

  it('has no status for the start', () => {
    expect(arrivalStatus(row('start', 0, 0, 60), 75)).toBeNull();
  });

  it('applies to the finish', () => {
    expect(arrivalStatus(row('finish', 790, 353, 810), 75)).toBe('tight');
  });
});
