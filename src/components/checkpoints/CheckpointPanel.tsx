import { useState, type Dispatch, type FormEvent } from 'react';
import { Alert, Button, Form, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { importWaypoints, type CheckpointAction, type CheckpointState, type ControlRow } from '../../domain/checkpoints';
import type { ControlRules } from '../../domain/controls/ControlRules';
import type { Segment } from '../../domain/segments';
import { formatElapsed, parseElapsed } from '../../domain/time/duration';
import { positionAtDistance } from '../../domain/track/snap';
import type { Track } from '../../domain/track/track';
import { useFormat } from '../../i18n/useFormat';
import { RemoveIcon, ResetIcon } from '../icons';
import { CommitInput } from './CommitInput';
import { useControlLabel } from './useControlLabel';

export interface CheckpointPanelProps {
  track: Track;
  state: CheckpointState;
  rows: ControlRow[];
  rules: ControlRules;
  dispatch: Dispatch<CheckpointAction>;
  /** Adds an intermediate control; returns false if there already is one at that distance */
  onAdd: (distanceKm: number) => boolean;
  /** Segments between consecutive controls; each row shows the segment that ends at its control */
  segments: readonly Segment[];
  activeSegment: number | null;
  onActiveSegmentChange: (index: number | null) => void;
}

const parseKm = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
};

export function CheckpointPanel({
  track,
  state,
  rows,
  rules,
  dispatch,
  onAdd,
  segments,
  activeSegment,
  onActiveSegmentChange,
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
    const km = parseKm(newKm);
    const error = kmError(km) ?? (onAdd(km!) ? null : t('checkpoints.duplicate'));
    setNewKmError(error);
    if (error === null) setNewKm('');
  };

  const onImport = () => {
    const result = importWaypoints(track, state.checkpoints);
    dispatch({
      type: 'addMany',
      items: result.items.map((item) => ({ ...item, id: crypto.randomUUID(), source: 'waypoint' })),
    });
    const parts = [t('checkpoints.import.added', { count: result.items.length })];
    if (result.duplicates > 0) parts.push(t('checkpoints.import.duplicates', { count: result.duplicates }));
    if (result.tooFar.length > 0) {
      parts.push(t('checkpoints.import.tooFar', { count: result.tooFar.length, names: result.tooFar.join(', ') }));
    }
    setImportMessage(parts.join(' '));
  };

  const timeCell = (row: ControlRow, which: 'open' | 'close', label: string) => {
    const cp = row.checkpoint;
    const key = which === 'open' ? 'openOverrideMin' : 'closeOverrideMin';
    const ruleValue = which === 'open' ? row.ruleWindow.openMin : row.ruleWindow.closeMin;
    const value = which === 'open' ? row.window.openMin : row.window.closeMin;
    return (
      <td className={cp[key] !== null ? 'is-overridden' : undefined}>
        <CommitInput
          id={`cp-${cp.id}-${which}`}
          size="sm"
          className="time-input tabular-nums"
          inputMode="numeric"
          aria-label={t(`checkpoints.${which}Label`, { control: label })}
          value={formatElapsed(value)}
          onCommit={(text) => {
            const minutes = parseElapsed(text);
            if (minutes === null) return t('checkpoints.invalidTime');
            dispatch({ type: 'setWindow', id: cp.id, [key]: minutes === ruleValue ? null : minutes });
            return null;
          }}
        />
      </td>
    );
  };

  return (
    <section className="card" aria-labelledby="checkpoints-heading">
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div className="me-auto">
            <h2 id="checkpoints-heading" className="h5 mb-1">
              {t('checkpoints.title')}
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
          <Table size="sm" className="checkpoint-table align-middle mb-0">
            <caption className="small text-body-secondary">{t('checkpoints.windowsNote', { rules: rulesName })}</caption>
            <thead>
              <tr>
                <th scope="col">{t('checkpoints.columns.control')}</th>
                <th scope="col">{t('checkpoints.columns.name')}</th>
                <th scope="col" className="text-end">
                  {t('checkpoints.columns.km')}
                </th>
                <th scope="col" className="segment-col text-end">
                  {t('checkpoints.columns.segment')}
                </th>
                <th scope="col" className="segment-col text-end pe-4">
                  {t('checkpoints.columns.climb')}
                </th>
                <th scope="col">{t('checkpoints.columns.opens')}</th>
                <th scope="col">{t('checkpoints.columns.closes')}</th>
                <th scope="col">
                  <span className="visually-hidden">{t('checkpoints.columns.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cp = row.checkpoint;
                const label = controlLabel(row);
                const overridden = cp.openOverrideMin !== null || cp.closeOverrideMin !== null;
                const segment = segments.find((s) => s.to.id === cp.id);
                const rowClass = [
                  row.invalid ? 'table-warning' : '',
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
                    <th scope="row" className="text-nowrap">
                      {cp.kind === 'control' ? <span className="checkpoint-badge">{row.number}</span> : null}{' '}
                      {cp.kind === 'control' ? t('checkpoints.cp', { number: row.number }) : t(`checkpoints.${cp.kind}`)}
                    </th>
                    <td className="name-cell">
                      {cp.kind === 'control' ? (
                        <CommitInput
                          id={`cp-${cp.id}-name`}
                          size="sm"
                          aria-label={t('checkpoints.nameLabel', { control: label })}
                          placeholder={t('checkpoints.namePlaceholder')}
                          value={cp.name}
                          onCommit={(text) => {
                            dispatch({ type: 'rename', id: cp.id, name: text.trim() });
                            return null;
                          }}
                        />
                      ) : null}
                    </td>
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
                            const km = parseKm(text);
                            const error = kmError(km);
                            if (error) return error;
                            dispatch({ type: 'move', id: cp.id, position: positionAtDistance(track, km!) });
                            return null;
                          }}
                        />
                      ) : (
                        format.km(cp.distanceKm).replace(/\s*km$/, '')
                      )}
                    </td>
                    <td className="segment-col text-end tabular-nums" data-testid="segment-distance">
                      {segment ? format.km(segment.distanceKm).replace(/\s*km$/, '') : ''}
                    </td>
                    <td className="segment-col text-end tabular-nums text-nowrap pe-4" data-testid="segment-climb">
                      {segment ? format.m(segment.climbM) : ''}
                    </td>
                    {timeCell(row, 'open', label)}
                    {timeCell(row, 'close', label)}
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
