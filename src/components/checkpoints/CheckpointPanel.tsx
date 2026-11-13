import { useState, type Dispatch, type FormEvent } from 'react';
import { Alert, Button, Form, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { importWaypoints, type CheckpointAction, type CheckpointState } from '../../domain/checkpoints';
import type { ControlRules } from '../../domain/controls/ControlRules';
import { arrivalStatus } from '../../domain/status';
import { formatElapsed } from '../../domain/time/duration';
import type { EstimatorParamDef, EstimatorParams, TimeEstimator } from '../../domain/time/TimeEstimator';
import type { Timetable, TimetableRow } from '../../domain/timetable';
import type { Track } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';
import { RemoveIcon, ResetIcon } from '../icons';
import { StatusBadge } from '../timetable/StatusBadge';
import type { TimeFormat } from '../timetable/useTimeFormat';
import { CommitInput } from './CommitInput';
import { useControlLabel } from './useControlLabel';

export interface CheckpointPanelProps {
  track: Track;
  state: CheckpointState;
  rules: ControlRules;
  dispatch: Dispatch<CheckpointAction>;
  /** Adds an intermediate control; returns false if there already is one at that distance */
  onAdd: (distanceKm: number) => boolean;
  /** Moves an intermediate control; returns an error message if it can't be placed there */
  onMove: (id: string, distanceKm: number) => string | null;
  /** Timetable of the controls; each row also shows the segment that ends at its control */
  timetable: Timetable;
  estimator: TimeEstimator;
  /** Plan-wide time model parameters (resolved) – shown as placeholder where a segment has no override */
  planParams: EstimatorParams;
  /** Rest pre-filled for new checkpoints (waypoint import) */
  defaultRestMin: number;
  activeSegment: number | null;
  onActiveSegmentChange: (index: number | null) => void;
  /** Shows and parses arrival, departure and control windows (clock time or since the start) */
  times: TimeFormat;
  /** Arrivals with less time left until the control closes are "tight" */
  tightBufferMin: number;
}

const parseNumber = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
};

export function CheckpointPanel({
  track,
  state,
  rules,
  dispatch,
  onAdd,
  onMove,
  timetable,
  estimator,
  planParams,
  defaultRestMin,
  activeSegment,
  onActiveSegmentChange,
  times,
  tightBufferMin,
}: CheckpointPanelProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const controlLabel = useControlLabel();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [newKm, setNewKm] = useState('');
  const [newKmError, setNewKmError] = useState<string | null>(null);
  const rulesName = t(`controls.rules.${rules.id}`);

  const kmError = (km: number | null) =>
    km === null || km <= 0 || km >= track.distanceKm ? t('checkpoints.kmOutOfRange', { max: format.km(track.distanceKm) }) : null;

  const onAddAtKm = (e: FormEvent) => {
    e.preventDefault();
    const km = parseNumber(newKm);
    const error = kmError(km) ?? (onAdd(km!) ? null : t('checkpoints.duplicate'));
    setNewKmError(error);
    if (error === null) setNewKm('');
  };

  const onImport = () => {
    const result = importWaypoints(track, state.checkpoints);
    dispatch({
      type: 'addMany',
      items: result.items.map((item) => ({ ...item, id: crypto.randomUUID(), source: 'waypoint' })),
      restMin: defaultRestMin,
    });
    const parts = [t('checkpoints.import.added', { count: result.items.length })];
    if (result.duplicates > 0) parts.push(t('checkpoints.import.duplicates', { count: result.duplicates }));
    if (result.tooFar.length > 0) {
      parts.push(t('checkpoints.import.tooFar', { count: result.tooFar.length, names: result.tooFar.join(', ') }));
    }
    setImportMessage(parts.join(' '));
  };

  const timeCell = (row: TimetableRow['control'], which: 'open' | 'close', label: string) => {
    const cp = row.checkpoint;
    const key = which === 'open' ? 'openOverrideMin' : 'closeOverrideMin';
    const ruleValue = which === 'open' ? row.ruleWindow.openMin : row.ruleWindow.closeMin;
    const value = which === 'open' ? row.window.openMin : row.window.closeMin;
    return (
      <div className={cp[key] !== null ? 'is-overridden' : undefined}>
        <CommitInput
          id={`cp-${cp.id}-${which}`}
          size="sm"
          className={`time-input tabular-nums${times.withDay ? ' with-day' : ''}`}
          inputMode={times.withDay ? 'text' : 'numeric'}
          aria-label={t(`checkpoints.${which}Label.${times.mode}`, { control: label })}
          value={times.format(value)}
          onCommit={(text) => {
            const minutes = times.parse(text, value);
            if (minutes === null) return t(`checkpoints.invalidTime.${times.mode}`);
            dispatch({ type: 'setWindow', id: cp.id, [key]: minutes === ruleValue ? null : minutes });
            return null;
          }}
        />
      </div>
    );
  };

  const paramCell = ({ control }: TimetableRow, def: EstimatorParamDef, label: string) => {
    const cp = control.checkpoint;
    if (cp.kind === 'start') return null;
    const override = cp.segmentParams[def.key];
    return (
      <div key={def.key} className={override !== undefined ? 'is-overridden' : undefined}>
        <CommitInput
          id={`cp-${cp.id}-${def.key}`}
          size="sm"
          className="param-input text-end tabular-nums"
          inputMode="decimal"
          aria-label={t('timetable.paramLabel', { param: t(def.labelKey), unit: def.unit, control: label })}
          value={override !== undefined ? String(override) : ''}
          placeholder={String(planParams[def.key])}
          onCommit={(text) => {
            if (text.trim() === '') {
              dispatch({ type: 'setSegmentParam', id: cp.id, key: def.key, value: null });
              return null;
            }
            const value = parseNumber(text);
            if (value === null || value < def.min || value > def.max) {
              return t('timetable.paramRange', { min: def.min, max: def.max, unit: def.unit });
            }
            dispatch({
              type: 'setSegmentParam',
              id: cp.id,
              key: def.key,
              value: value === planParams[def.key] ? null : value,
            });
            return null;
          }}
        />
      </div>
    );
  };

  const restCell = ({ control }: TimetableRow, label: string) => {
    const cp = control.checkpoint;
    if (cp.kind !== 'control') return <td />;
    return (
      <td>
        <CommitInput
          id={`cp-${cp.id}-rest`}
          size="sm"
          className="rest-input text-end tabular-nums"
          inputMode="numeric"
          aria-label={t('timetable.restLabel', { control: label })}
          value={String(cp.restMin)}
          onCommit={(text) => {
            const minutes = parseNumber(text);
            if (minutes === null || minutes < 0 || !Number.isInteger(minutes)) return t('timetable.invalidRest');
            dispatch({ type: 'setRest', id: cp.id, restMin: minutes });
            return null;
          }}
        />
      </td>
    );
  };

  const duration = (minutes: number | null) => (minutes === null ? '' : formatElapsed(minutes));
  const time = (minutes: number | null) => (minutes === null ? '' : times.format(minutes));

  return (
    <section className="checkpoint-panel bg-white" aria-labelledby="checkpoints-heading">
      <div className="px-3 py-3 d-flex flex-column gap-3">
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div className="me-auto">
            <h2 id="checkpoints-heading" className="h5 mb-1">
              {t('timetable.title')}
            </h2>
            <p className="small text-body-secondary mb-0">{t('checkpoints.hint')}</p>
          </div>
          <Form.Group controlId="brevet-km">
            <Form.Label className="small mb-1">{t('controls.brevetDistance', { rules: rulesName })}</Form.Label>
            <Form.Select
              size="sm"
              value={state.brevetKm ?? ''}
              onChange={(e) =>
                dispatch({ type: 'setBrevetKm', brevetKm: e.target.value === '' ? null : Number(e.target.value) })
              }
            >
              {rules.brevetDistancesKm.map((km) => (
                <option key={km} value={km}>
                  {t('controls.brevetOption', { km, limit: formatElapsed(rules.timeLimitMin(km)!) })}
                </option>
              ))}
              <option value="">{t('controls.noBrevet')}</option>
            </Form.Select>
          </Form.Group>
          {track.waypoints.length > 0 && (
            <Button variant="outline-primary" size="sm" onClick={onImport}>
              {t('checkpoints.import.button', { count: track.waypoints.length })}
            </Button>
          )}
        </div>

        {importMessage && (
          <Alert variant="info" dismissible onClose={() => setImportMessage(null)} className="mb-0 py-2" role="status">
            {importMessage}
          </Alert>
        )}

        <div className="table-responsive">
          <Table
            size="sm"
            className={`checkpoint-table align-middle mb-0${times.withDay ? ' with-day' : ''}`}
            aria-describedby="timetable-note"
          >
            <thead>
              <tr>
                <th scope="col">{t('checkpoints.columns.control')}</th>
                <th scope="col" className="text-end">
                  {t('checkpoints.columns.km')}
                </th>
                <th scope="col" className="segment-col text-end">
                  {t('checkpoints.columns.segment')}
                </th>
                <th scope="col" className="text-end">
                  {/* one column for all parameters of the time model: side by side or stacked like the inputs */}
                  <div className="pace-cell">
                    {estimator.params.map((def) => (
                      <span key={def.key}>
                        {t(def.labelKey)} <span className="fw-normal text-body-secondary">{def.unit}</span>
                      </span>
                    ))}
                  </div>
                </th>
                <th scope="col" className="ride-col text-end">
                  {t('timetable.columns.ride')}
                </th>
                <th scope="col" className="text-end">
                  {t('timetable.columns.arrive')}
                </th>
                <th scope="col">{t('checkpoints.columns.window')}</th>
                <th scope="col" className="text-end">
                  {t('timetable.columns.rest')} <span className="fw-normal text-body-secondary">min</span>
                </th>
                <th scope="col" className="depart-col text-end">
                  {t('timetable.columns.depart')}
                </th>
                <th scope="col" className="text-end">
                  {t('timetable.columns.buffer')}
                </th>
                <th scope="col">
                  <span className="visually-hidden">{t('checkpoints.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {timetable.rows.map((entry) => {
                const row = entry.control;
                const cp = row.checkpoint;
                const label = controlLabel(row);
                const overridden = cp.openOverrideMin !== null || cp.closeOverrideMin !== null;
                const segment = entry.segment;
                const status = arrivalStatus(entry, tightBufferMin);
                const rowClass = [
                  row.invalid ? 'table-warning' : '',
                  status === 'late' ? 'is-late' : '',
                  segment && segment.index === activeSegment ? 'is-active-segment' : '',
                ].join(' ').trim();
                return (
                  <tr
                    key={cp.id}
                    data-testid="checkpoint-row"
                    className={rowClass || undefined}
                    onMouseEnter={segment ? () => onActiveSegmentChange(segment.index) : undefined}
                    onMouseLeave={segment ? () => onActiveSegmentChange(null) : undefined}
                  >
                    <th scope="row" className="name-cell">
                      {cp.kind === 'control' ? (
                        <div className="d-flex align-items-center gap-2">
                          <span className="checkpoint-badge" aria-hidden="true">
                            {row.number}
                          </span>
                          <span className="control-label visually-hidden">{t('checkpoints.cp', { number: row.number })}</span>
                          <CommitInput
                            id={`cp-${cp.id}-name`}
                            size="sm"
                            aria-label={t('checkpoints.nameLabel', { control: label })}
                            placeholder={t('checkpoints.namePlaceholder')}
                            title={cp.name || undefined}
                            value={cp.name}
                            onCommit={(text) => {
                              dispatch({ type: 'rename', id: cp.id, name: text.trim() });
                              return null;
                            }}
                          />
                        </div>
                      ) : (
                        <span className="control-label">{t(`checkpoints.${cp.kind}`)}</span>
                      )}
                    </th>
                    <td className="text-end tabular-nums">
                      {cp.kind === 'control' ? (
                        <CommitInput
                          id={`cp-${cp.id}-km`}
                          size="sm"
                          className="km-input text-end tabular-nums"
                          inputMode="decimal"
                          aria-label={t('checkpoints.kmLabel', { control: label })}
                          value={cp.distanceKm.toFixed(1)}
                          onCommit={(text) => {
                            const km = parseNumber(text);
                            const error = kmError(km);
                            if (error) return error;
                            return onMove(cp.id, km!);
                          }}
                        />
                      ) : (
                        format.km(cp.distanceKm).replace(/\s*km$/, '')
                      )}
                    </td>
                    <td className="segment-col text-end tabular-nums text-nowrap">
                      {segment && (
                        <>
                          <div data-testid="segment-distance">{format.km(segment.distanceKm)}</div>
                          <div
                            className="segment-elevation small text-body-secondary"
                            data-testid="segment-climb"
                            title={t('checkpoints.segmentElevation', {
                              climb: format.m(segment.climbM),
                              descent: format.m(segment.descentM),
                            })}
                          >
                            <span className="visually-hidden">
                              {t('checkpoints.segmentElevation', {
                                climb: format.m(segment.climbM),
                                descent: format.m(segment.descentM),
                              })}
                            </span>
                            <span aria-hidden="true">
                              ↑{format.int(segment.climbM)} ↓{format.int(segment.descentM)} m
                            </span>
                          </div>
                        </>
                      )}
                    </td>
                    <td>
                      <div className="pace-cell">{estimator.params.map((def) => paramCell(entry, def, label))}</div>
                    </td>
                    <td className="ride-col text-end tabular-nums" data-testid="ride-time">
                      {duration(entry.rideMin)}
                    </td>
                    <td className="text-end tabular-nums fw-semibold text-nowrap" data-testid="arrival">
                      {cp.kind === 'start' ? '' : time(entry.arrivalMin)}
                    </td>
                    <td>
                      <div className="window-cell">
                        {timeCell(row, 'open', label)}
                        {timeCell(row, 'close', label)}
                      </div>
                    </td>
                    {restCell(entry, label)}
                    <td className="depart-col text-end tabular-nums text-nowrap" data-testid="departure">
                      {time(entry.departureMin)}
                      {entry.waitMin >= 0.5 && (
                        <div className="small text-body-secondary text-nowrap" data-testid="wait">
                          {t('timetable.wait', { time: formatElapsed(entry.waitMin) })}
                        </div>
                      )}
                    </td>
                    <td className="text-end tabular-nums text-nowrap">
                      <div data-testid="buffer">{duration(entry.bufferMin)}</div>
                      {status && <StatusBadge status={status} />}
                    </td>
                    <td className="text-end text-nowrap">
                      {row.invalid && <span className="small me-2">{t('checkpoints.invalidWindow')}</span>}
                      {overridden && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1"
                          title={t('checkpoints.resetWindow', { control: label, rules: rulesName })}
                          aria-label={t('checkpoints.resetWindow', { control: label, rules: rulesName })}
                          onClick={() =>
                            dispatch({ type: 'setWindow', id: cp.id, openOverrideMin: null, closeOverrideMin: null })
                          }
                        >
                          <ResetIcon />
                        </Button>
                      )}
                      {cp.kind === 'control' && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-1 text-danger"
                          title={t('checkpoints.remove', { control: label })}
                          aria-label={t('checkpoints.remove', { control: label })}
                          onClick={() => dispatch({ type: 'remove', id: cp.id })}
                        >
                          <RemoveIcon />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        <p id="timetable-note" className="small text-body-secondary mb-0">
          {t(`checkpoints.windowsNote.${times.mode}`, { rules: rulesName })} {t('timetable.note', { tight: tightBufferMin })}
        </p>

        <Form className="d-flex flex-wrap align-items-start gap-2" onSubmit={onAddAtKm} noValidate>
          <Form.Label htmlFor="new-checkpoint-km" className="small mb-0 align-self-center">
            {t('checkpoints.addAtKm')}
          </Form.Label>
          <div className="add-km">
            <Form.Control
              id="new-checkpoint-km"
              size="sm"
              inputMode="decimal"
              className="tabular-nums"
              value={newKm}
              isInvalid={newKmError !== null}
              aria-describedby={newKmError !== null ? 'new-checkpoint-km-error' : undefined}
              onChange={(e) => {
                setNewKm(e.target.value);
                setNewKmError(null);
              }}
            />
            {newKmError !== null && (
              <Form.Control.Feedback type="invalid" id="new-checkpoint-km-error">
                {newKmError}
              </Form.Control.Feedback>
            )}
          </div>
          <Button type="submit" size="sm" variant="primary">
            {t('checkpoints.add')}
          </Button>
        </Form>
      </div>
    </section>
  );
}
