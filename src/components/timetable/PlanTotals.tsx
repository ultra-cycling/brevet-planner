import { useTranslation } from 'react-i18next';
import { formatElapsed } from '../../domain/time/duration';
import type { TimetableTotals } from '../../domain/timetable';

export interface PlanTotalsProps {
  totals: TimetableTotals;
  /** Formats the finish as clock time */
  formatClock: (minutes: number) => string;
  /** Label of the control with the smallest buffer, e.g. "CP2" */
  tightestLabel: string | null;
}

/** Results of the plan, shown right above the timetable (US15): riding, stops, finish, average speeds, smallest buffer. */
export function PlanTotals({ totals, formatClock, tightestLabel }: PlanTotalsProps) {
  const { t, i18n } = useTranslation();
  const speed = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });

  const stats = [
    { key: 'ride', value: formatElapsed(totals.rideMin) },
    { key: 'stops', value: formatElapsed(totals.stopMin) },
    { key: 'finish', value: formatElapsed(totals.finishMin) },
    { key: 'finishAt', value: formatClock(totals.finishMin) },
    { key: 'movingSpeed', value: `${speed.format(totals.movingKmh)} km/h` },
    { key: 'overallSpeed', value: `${speed.format(totals.overallKmh)} km/h` },
    {
      key: 'tightest',
      value:
        totals.tightest && tightestLabel
          ? t('timetable.totals.tightestAt', { time: formatElapsed(totals.tightest.bufferMin!), control: tightestLabel })
          : '–',
    },
  ];

  return (
    <dl className="plan-totals d-flex flex-wrap gap-2 column-gap-4 mb-0 tabular-nums" aria-label={t('timetable.totals.label')}>
      {stats.map(({ key, value }) => (
        <div key={key}>
          <dt className="small fw-normal text-body-secondary">{t(`timetable.totals.${key}`)}</dt>
          <dd className="mb-0 fw-semibold" data-testid={`total-${key}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
