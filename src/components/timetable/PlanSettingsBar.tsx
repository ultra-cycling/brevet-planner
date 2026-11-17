import { useId, useState, type ReactNode } from 'react';
import { Collapse, Form, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '../../app/AppServices';
import { isValidDate, normalizeTimeOfDay, type RideStart } from '../../domain/time/clock';
import { availableTimeZones } from '../../domain/time/timeZone';
import type { EstimatorParams, TimeEstimator } from '../../domain/time/TimeEstimator';
import { CommitInput } from '../checkpoints/CommitInput';
import { ChevronIcon } from '../icons';
import type { TimeDisplay, TimeFormat } from './useTimeFormat';

export interface PlanSettingsBarProps {
  start: RideStart;
  onStartChange: (start: RideStart) => void;
  /** IANA time zone of the start – needed to compare the times with sunrise and sunset (US7) */
  timeZone: string;
  onTimeZoneChange: (zone: string) => void;
  times: TimeFormat;
  onTimeDisplayChange: (mode: TimeDisplay) => void;
  /** Arrivals with less time left until the control closes are "tight" */
  tightBufferMin: number;
  onTightBufferChange: (minutes: number) => void;
  estimator: TimeEstimator;
  params: EstimatorParams;
  onModelChange: (id: string) => void;
  onParamChange: (key: string, value: number) => void;
  /** Brevet distance and time limit (rendered by the caller, it belongs to the control rules) */
  brevet: ReactNode;
}

const MAX_TIGHT_BUFFER_MIN = 24 * 60;

/**
 * Plan settings – start, brevet, time display and pace (docs/plan.md → UI design, plan column) – behind a toggle,
 * collapsed whenever a plan is opened (US15): they are set once, the timetable is what matters.
 */
export function PlanSettingsBar({
  start,
  onStartChange,
  timeZone,
  onTimeZoneChange,
  times,
  onTimeDisplayChange,
  tightBufferMin,
  onTightBufferChange,
  estimator,
  params,
  onModelChange,
  onParamChange,
  brevet,
}: PlanSettingsBarProps) {
  const { t } = useTranslation();
  const { estimators } = useAppServices();
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <section className="plan-settings bg-white border-bottom" aria-label={t('timetable.settings.label')}>
      <button
        type="button"
        className="plan-settings-toggle px-3 pb-2"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronIcon className="plan-settings-chevron" aria-hidden="true" />
        <span className="fw-semibold">{t('timetable.settings.toggle')}</span>
      </button>
      <Collapse in={open}>
        <div id={bodyId}>
          <div className="px-3 pb-3 d-flex flex-column gap-3">
            <div className="d-flex flex-wrap align-items-end gap-3 column-gap-4">
              <Form.Group controlId="start-date" className="plan-date">
                <Form.Label className="small text-body-secondary mb-1">{t('timetable.settings.startDate')}</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  required
                  value={start.date}
                  onChange={(e) => {
                    if (isValidDate(e.target.value)) onStartChange({ ...start, date: e.target.value });
                  }}
                />
              </Form.Group>
              <Form.Group controlId="start-time" className="plan-time">
                <Form.Label className="small text-body-secondary mb-1">{t('timetable.settings.startTime')}</Form.Label>
                <CommitInput
                  size="sm"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={start.time}
                  onCommit={(text) => {
                    const time = normalizeTimeOfDay(text);
                    if (time === null) return t('timetable.settings.invalidStartTime');
                    onStartChange({ ...start, time });
                    return null;
                  }}
                />
              </Form.Group>
              <Form.Group controlId="time-zone" className="plan-zone">
                <Form.Label className="small text-body-secondary mb-1">{t('timetable.settings.timeZone')}</Form.Label>
                <Form.Select size="sm" value={timeZone} onChange={(e) => onTimeZoneChange(e.target.value)}>
                  {availableTimeZones(timeZone).map((zone) => (
                    <option key={zone} value={zone}>
                      {zone.replaceAll('_', ' ')}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <div>
                <div id="time-display-label" className="form-label small text-body-secondary mb-1">
                  {t('timetable.settings.timeDisplay')}
                </div>
                <ToggleButtonGroup
                  type="radio"
                  name="time-display"
                  size="sm"
                  value={times.mode}
                  onChange={onTimeDisplayChange}
                  aria-labelledby="time-display-label"
                >
                  {(['clock', 'elapsed'] as const).map((mode) => (
                    <ToggleButton key={mode} id={`time-display-${mode}`} value={mode} variant="outline-secondary">
                      {t(`timetable.settings.display.${mode}`)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
              <Form.Group controlId="tight-buffer" className="plan-param">
                <Form.Label className="small text-body-secondary mb-1">{t('timetable.settings.tightBuffer')}</Form.Label>
                <CommitInput
                  size="sm"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={String(tightBufferMin)}
                  onCommit={(text) => {
                    const value = Number(text.trim());
                    if (text.trim() === '' || !Number.isInteger(value) || value < 0 || value > MAX_TIGHT_BUFFER_MIN) {
                      return t('timetable.settings.invalidTightBuffer', { max: MAX_TIGHT_BUFFER_MIN });
                    }
                    onTightBufferChange(value);
                    return null;
                  }}
                />
              </Form.Group>
            </div>
            <div className="d-flex flex-wrap align-items-end gap-3 column-gap-4">{brevet}</div>
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
            </div>
          </div>
        </div>
      </Collapse>
    </section>
  );
}
