import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { isValidDate, type RideStart } from '../../domain/time/clock';
import type { Track } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';
import { CommitInput } from '../checkpoints/CommitInput';
import { EditIcon } from '../icons';

export interface TrackSummaryProps {
  track: Track;
  /** Name of the plan (default: the track's name) */
  name: string;
  onRename: (name: string) => void;
  start: RideStart;
  /** Expected finish as clock time, e.g. "Sat 19:05" */
  finish: string;
}

/** Title row of the plan (US15): name, distance, climb, start → finish – one line, wrapping only when narrow. */
export function TrackSummary({ track, name, onRename, start, finish }: TrackSummaryProps) {
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const [renaming, setRenaming] = useState(false);

  const startDay = isValidDate(start.date)
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
        new Date(`${start.date}T00:00:00Z`),
      )
    : start.date;

  return (
    <section className="plan-bar bg-white px-3 pt-3 pb-2" aria-labelledby="track-name">
      <div className="d-flex flex-wrap align-items-baseline gap-2 column-gap-3">
        <div className="d-flex align-items-center gap-1 min-w-0">
          {renaming ? (
            // closes on Escape and when the field loses focus (after committing the name)
            <div
              className="plan-name-input"
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
              onBlur={() => setRenaming(false)}
            >
              <CommitInput
                id="plan-name"
                aria-label={t('plans.nameLabel')}
                autoFocus
                value={name}
                onCommit={(text) => {
                  if (text.trim() === '') return t('plans.nameRequired');
                  onRename(text.trim());
                  setRenaming(false);
                  return null;
                }}
              />
            </div>
          ) : (
            <>
              <h1 id="track-name" className="h4 mb-0 text-break" tabIndex={-1}>
                {name}
              </h1>
              <Button
                variant="link"
                size="sm"
                className="p-1"
                title={t('plans.rename')}
                aria-label={t('plans.rename')}
                onClick={() => setRenaming(true)}
              >
                <EditIcon />
              </Button>
            </>
          )}
        </div>
        <p className="mb-0 text-body-secondary tabular-nums" data-testid="track-figures">
          <span className="text-nowrap">
            <span className="visually-hidden">{t('track.distance')} </span>
            <span data-testid="track-distance">{format.km(track.distanceKm)}</span>
            {' · '}
            <span className="visually-hidden">{t('track.climb')} </span>
            <span aria-hidden="true">↑ </span>
            <span data-testid="track-climb">{format.m(track.climbM)}</span>
          </span>
          {' · '}
          <span className="text-nowrap" data-testid="plan-schedule">
            {t('track.schedule', { start: `${startDay} ${start.time}`, finish })}
          </span>
        </p>
      </div>
    </section>
  );
}
