import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '../../app/AppServices';
import { formatElapsed } from '../../domain/time/duration';
import type { EstimatorParams, TimeEstimator } from '../../domain/time/TimeEstimator';
import type { TimetableTotals } from '../../domain/timetable';
import { CommitInput } from '../checkpoints/CommitInput';

export interface PlanSettingsBarProps {
  estimator: TimeEstimator;
  params: EstimatorParams;
  onModelChange: (id: string) => void;
  onParamChange: (key: string, value: number) => void;
  totals: TimetableTotals;
  /** Label of the control with the smallest buffer, e.g. "CP2" */
  tightestLabel: string | null;
}

/** Plan-wide pace settings and the resulting totals (docs/plan.md → UI design, plan settings bar). */
export function PlanSettingsBar({ estimator, params, onModelChange, onParamChange, totals, tightestLabel }: PlanSettingsBarProps) {
  const { t, i18n } = useTranslation();
  const { estimators } = useAppServices();
  const speed = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });

  const stats = [
    { key: 'ride', value: formatElapsed(totals.rideMin) },
    { key: 'stops', value: formatElapsed(totals.stopMin) },
    { key: 'finish', value: formatElapsed(totals.finishMin) },
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
    <section className="plan-settings bg-white border-bottom px-3 py-3" aria-label={t('timetable.settings.label')}>
      <div className="d-flex flex-wrap align-items-end gap-3 column-gap-4">
        <Form.Group controlId="time-model">
          <Form.Label className="small text-body-secondary mb-1">{t('timetable.settings.model')}</Form.Label>
          <Form.Select size="sm" value={estimator.id} onChange={(e) => onModelChange(e.target.value)}>
            {estimators.list().map((e) => (
              <option key={e.id} value={e.id}>
                {t(e.labelKey)}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        {estimator.params.map((def) => (
          <Form.Group key={def.key} controlId={`plan-param-${def.key}`} className="plan-param">
            <Form.Label className="small text-body-secondary mb-1">
              {t('timetable.settings.paramLabel', { param: t(def.labelKey), unit: def.unit })}
            </Form.Label>
            <CommitInput
              id={`plan-param-${def.key}`}
              size="sm"
              inputMode="decimal"
              className="tabular-nums"
              value={String(params[def.key])}
              onCommit={(text) => {
                const value = Number(text.trim().replace(',', '.'));
                if (text.trim() === '' || !Number.isFinite(value) || value < def.min || value > def.max) {
                  return t('timetable.paramRange', { min: def.min, max: def.max, unit: def.unit });
                }
                onParamChange(def.key, value);
                return null;
              }}
            />
          </Form.Group>
        ))}
        <dl className="plan-totals d-flex flex-wrap gap-2 column-gap-4 mb-0 tabular-nums">
          {stats.map(({ key, value }) => (
            <div key={key}>
              <dt className="small fw-normal text-body-secondary">{t(`timetable.totals.${key}`)}</dt>
              <dd className="mb-0 fw-semibold" data-testid={`total-${key}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
