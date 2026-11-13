import type { TimetableRow } from './timetable';

/**
 * Status of a planned arrival at a control (docs/plan.md → Status of an arrival):
 * - `late`: after the control closes
 * - `early`: before the control opens – the rider has to wait
 * - `tight`: less than `tightMin` minutes left until the control closes
 * - `ok`: otherwise
 */
export type ArrivalStatus = 'ok' | 'tight' | 'early' | 'late';

/** Status of a timetable row; `null` for the start. Uses whole minutes, like the displayed times. */
export function arrivalStatus(row: TimetableRow, tightMin: number): ArrivalStatus | null {
  if (row.control.checkpoint.kind === 'start') return null;
  const arrival = Math.round(row.arrivalMin);
  const { openMin, closeMin } = row.control.window;
  if (arrival > closeMin) return 'late';
  if (arrival < openMin) return 'early';
  return closeMin - arrival < tightMin ? 'tight' : 'ok';
}
