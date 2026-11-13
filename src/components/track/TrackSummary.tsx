import { useTranslation } from 'react-i18next';
import type { Track } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';

export function TrackSummary({ track }: { track: Track }) {
  const { t } = useTranslation();
  const format = useFormat();

  const stats = [
    { key: 'distance', value: format.km(track.distanceKm) },
    { key: 'climb', value: format.m(track.climbM) },
    { key: 'descent', value: format.m(track.descentM) },
    { key: 'maxElevation', value: track.maxEleM === null ? '–' : format.m(track.maxEleM) },
  ];

  return (
    <section className="plan-bar bg-white border-bottom px-4 py-3" aria-labelledby="track-name">
      <div className="d-flex flex-wrap align-items-end gap-3 column-gap-5">
        <h1 id="track-name" className="h4 mb-0 me-auto text-break">
          {track.name}
        </h1>
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
