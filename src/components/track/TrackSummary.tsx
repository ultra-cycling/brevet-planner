import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { Track } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';
import { CommitInput } from '../checkpoints/CommitInput';
import { EditIcon } from '../icons';

export interface TrackSummaryProps {
  track: Track;
  /** Name of the plan (default: the track's name) */
  name: string;
  onRename: (name: string) => void;
}

export function TrackSummary({ track, name, onRename }: TrackSummaryProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [renaming, setRenaming] = useState(false);

  const stats = [
    { key: 'distance', value: format.km(track.distanceKm) },
    { key: 'climb', value: format.m(track.climbM) },
    { key: 'descent', value: format.m(track.descentM) },
    { key: 'maxElevation', value: track.maxEleM === null ? '–' : format.m(track.maxEleM) },
  ];

  return (
    <section className="plan-bar bg-white border-bottom px-3 py-3" aria-labelledby="track-name">
      <div className="d-flex flex-wrap align-items-end gap-2 column-gap-4">
        <div className="me-auto d-flex align-items-center gap-2 min-w-0">
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
        <dl className="d-flex flex-wrap gap-3 column-gap-4 mb-0 tabular-nums">
          {stats.map(({ key, value }) => (
            <div key={key}>
              <dt className="small fw-normal text-body-secondary">{t(`track.${key}`)}</dt>
              <dd className="mb-0 fs-5 fw-semibold" data-testid={`track-${key}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
