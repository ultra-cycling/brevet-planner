import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createClockFormat, dayOffset, type RideStart } from '../../domain/time/clock';
import { formatElapsed, parseElapsed } from '../../domain/time/duration';

/** How the timetable shows points in time: clock time (default) or hours:minutes since the start */
export type TimeDisplay = 'clock' | 'elapsed';

export interface TimeFormat {
  mode: TimeDisplay;
  /** Point in time `minutes` after the start */
  format(minutes: number): string;
  /** Parses an entered point in time; `referenceMin` resolves the day of a clock time without weekday */
  parse(text: string, referenceMin: number): number | null;
  /** Times carry a weekday (the ride spans midnight) – inputs need more room */
  withDay: boolean;
}

/**
 * Formats and parses the times of the timetable for the selected display.
 * @param lastMin latest time shown (e.g. the finish's closing time) – decides whether weekdays are needed
 */
export function useTimeFormat(start: RideStart, mode: TimeDisplay, lastMin: number): TimeFormat {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const withDay = mode === 'clock' && dayOffset(start, lastMin) > 0;

  return useMemo(() => {
    if (mode === 'elapsed') return { mode, format: formatElapsed, parse: (text: string) => parseElapsed(text), withDay };
    const clock = createClockFormat(start, locale, withDay);
    return { mode, format: clock.format, parse: clock.parse, withDay };
  }, [start, locale, mode, withDay]);
}
