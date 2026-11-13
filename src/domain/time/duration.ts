/** Elapsed time since the start as "H:MM" (hours may exceed 24, e.g. "75:00"). */
export function formatElapsed(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

const ELAPSED_PATTERN = /^(\d{1,3})(?:[:h.](\d{1,2}))?$/;

/** Parses "13:30", "13h30", "13.30" or "13" (whole hours) into minutes; `null` if invalid. */
export function parseElapsed(text: string): number | null {
  const match = ELAPSED_PATTERN.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = match[2] === undefined ? 0 : Number(match[2]);
  if (mins >= 60 || (match[2] !== undefined && match[2].length !== 2)) return null;
  return hours * 60 + mins;
}
