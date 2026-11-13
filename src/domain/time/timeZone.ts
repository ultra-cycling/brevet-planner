import { clockAt, type RideStart } from './clock';

/** The browser's time zone, e.g. "Europe/Berlin" */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** IANA time zones the browser knows, sorted, always with UTC and `current` */
export function availableTimeZones(current: string): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return [...new Set([...zones, 'UTC', current])].sort();
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of the zone from UTC in minutes at the given instant (e.g. +120 for CEST) */
function offsetMinutes(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)!.value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((wall - utcMs) / 60_000);
}

/**
 * The real instant (UTC milliseconds) of the start, given as wall-clock time in `zone`. Points in time of the ride
 * are this instant plus the minutes after the start.
 */
export function startInstantUtc(start: RideStart, zone: string): number {
  const wall = clockAt(start, 0).getTime(); // wall-clock time written as UTC
  const guess = wall - offsetMinutes(wall, zone) * 60_000;
  return wall - offsetMinutes(guess, zone) * 60_000; // second pass: offset at the actual instant (DST changes)
}
