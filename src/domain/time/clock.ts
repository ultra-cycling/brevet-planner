/**
 * Clock times of a ride. The start is a wall-clock date and time at the start location ("floating" local time):
 * all times are computed as start + minutes, so the browser's time zone and daylight saving changes during the
 * ride don't shift them. Internally the wall clock is represented as a UTC instant.
 */
export interface RideStart {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM", 24 h */
  time: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const MS_PER_MIN = 60_000;
const MIN_PER_DAY = 24 * 60;

export function isValidDate(date: string): boolean {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number);
  const value = new Date(Date.UTC(y, m - 1, d));
  return value.getUTCFullYear() === y && value.getUTCMonth() === m - 1 && value.getUTCDate() === d;
}

/** Parses "6:00", "06:00", "6.00" or "6h00" into "06:00"; `null` if it isn't a time of day. */
export function normalizeTimeOfDay(text: string): string | null {
  const match = TIME_PATTERN.exec(text.trim().replace(/[.h]/, ':'));
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

/** Today's date in the browser's time zone as "YYYY-MM-DD" */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Minutes of the start after midnight of the start day */
export function startMinuteOfDay(start: RideStart): number {
  const [h, m] = start.time.split(':').map(Number);
  return h * 60 + m;
}

function startInstant(start: RideStart): number {
  const [y, mo, d] = start.date.split('-').map(Number);
  return Date.UTC(y, mo - 1, d) + startMinuteOfDay(start) * MS_PER_MIN;
}

/** Wall-clock time `minutes` after the start, as a Date whose UTC fields are the local date and time */
export function clockAt(start: RideStart, minutes: number): Date {
  return new Date(startInstant(start) + Math.round(minutes) * MS_PER_MIN);
}

/** Day of the ride (0 = start day) at `minutes` after the start */
export function dayOffset(start: RideStart, minutes: number): number {
  return Math.floor((startMinuteOfDay(start) + Math.round(minutes)) / MIN_PER_DAY);
}

export interface ClockFormat {
  /** "14:05", or "Sat 14:05" when the ride spans several days */
  format(minutes: number): string;
  /**
   * Parses a clock time entered by the rider into minutes after the start. Accepts "14:05" – taken on the day
   * that brings it closest to `referenceMin` (e.g. the current value) – or "Sat 14:05". `null` if invalid or before
   * the start.
   */
  parse(text: string, referenceMin: number): number | null;
}

/**
 * @param showDay prefix times with the weekday, for rides that span midnight
 */
export function createClockFormat(start: RideStart, locale: string | undefined, showDay: boolean): ClockFormat {
  const time = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const weekday = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' });
  const startTod = startMinuteOfDay(start);
  const normalizeDay = (text: string) => text.toLocaleLowerCase(locale).replace(/\.$/, '');

  return {
    format(minutes) {
      const date = clockAt(start, minutes);
      return showDay ? `${weekday.format(date)} ${time.format(date)}` : time.format(date);
    },
    parse(text, referenceMin) {
      const match = /^(?:(\p{L}+)\.?,?\s*)?(\d{1,2}[:.h]\d{2})$/u.exec(text.trim());
      const tod = match && normalizeTimeOfDay(match[2]);
      if (!match || !tod) return null;
      const [h, m] = tod.split(':').map(Number);
      const day = match[1] ? normalizeDay(match[1]) : null;

      // candidates: that time of day on each day around the reference (a ride rarely lasts longer than a week)
      const lastDay = Math.max(dayOffset(start, referenceMin), 0) + 7;
      let best: number | null = null;
      for (let d = 0; d <= lastDay; d++) {
        const minutes = d * MIN_PER_DAY + h * 60 + m - startTod;
        if (minutes < 0) continue;
        if (day !== null && normalizeDay(weekday.format(clockAt(start, minutes))) !== day) continue;
        if (best === null || Math.abs(minutes - referenceMin) < Math.abs(best - referenceMin)) best = minutes;
      }
      return best;
    },
  };
}
