import { useTranslation } from 'react-i18next';
import { arrivalStatus } from '../../domain/status';
import { formatElapsed } from '../../domain/time/duration';
import type { Timetable } from '../../domain/timetable';
import { useFormat } from '../../i18n/useFormat';
import { useControlLabel } from '../checkpoints/useControlLabel';
import { StatusBadge } from './StatusBadge';
import type { TimeFormat } from './useTimeFormat';

export interface TimetableCardsProps {
  timetable: Timetable;
  times: TimeFormat;
  tightBufferMin: number;
}

/**
 * Read-only timetable for phones: one card per control with arrival, status, control window and buffer
 * (docs/plan.md → Responsive behaviour). Shown instead of the editable table when the plan column is narrow.
 */
export function TimetableCards({ timetable, times, tightBufferMin }: TimetableCardsProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const controlLabel = useControlLabel();

  return (
    <ol className="timetable-cards list-unstyled mb-0" aria-label={t('timetable.cards.label')}>
      {timetable.rows.map((entry) => {
        const { control, segment } = entry;
        const cp = control.checkpoint;
        const status = arrivalStatus(entry, tightBufferMin);
        const isStart = cp.kind === 'start';
        const facts: [string, string][] = [
          [t('checkpoints.columns.window'), `${times.format(control.window.openMin)} – ${times.format(control.window.closeMin)}`],
        ];
        if (entry.restMin > 0) facts.push([t('timetable.columns.rest'), t('timetable.cards.minutes', { count: entry.restMin })]);
        if (entry.departureMin !== null && !isStart) facts.push([t('timetable.columns.depart'), times.format(entry.departureMin)]);
        if (segment) {
          facts.push([
            t('checkpoints.columns.segment'),
            `${format.km(segment.distanceKm)} · ↑${format.int(segment.climbM)} ↓${format.int(segment.descentM)} m · ${formatElapsed(entry.rideMin!)}`,
          ]);
        }

        return (
          <li key={cp.id} className={`timetable-card${status === 'late' ? ' is-late' : ''}`} data-testid="timetable-card">
            <div className="d-flex align-items-baseline gap-2">
              {control.number !== null && (
                <span className="checkpoint-badge" aria-hidden="true">
                  {control.number}
                </span>
              )}
              <h3 className="h6 mb-0 me-auto text-truncate">{controlLabel(control)}</h3>
              <span className="small text-body-secondary tabular-nums text-nowrap">{format.km(cp.distanceKm)}</span>
            </div>
            <div className="d-flex align-items-baseline flex-wrap column-gap-3 mt-1">
              <span className="small text-body-secondary">
                {isStart ? t('timetable.cards.start') : t('timetable.columns.arrive')}
              </span>
              <span className="card-time tabular-nums fw-semibold" data-testid="card-arrival">
                {times.format(isStart ? (entry.departureMin ?? 0) : entry.arrivalMin)}
              </span>
              {status && (
                <span className="ms-auto d-inline-flex align-items-baseline gap-2">
                  <StatusBadge status={status} />
                  <span className="small tabular-nums" data-testid="card-buffer">
                    {t('timetable.cards.buffer', { time: formatElapsed(entry.bufferMin!) })}
                  </span>
                </span>
              )}
            </div>
            <dl className="card-facts small mb-0 mt-1">
              {facts.map(([term, value]) => (
                <div key={term} className="d-flex gap-2">
                  <dt className="fw-normal text-body-secondary">{term}</dt>
                  <dd className="mb-0 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
