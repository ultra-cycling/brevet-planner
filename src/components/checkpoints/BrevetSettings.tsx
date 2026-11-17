import type { Dispatch } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { CheckpointAction, CheckpointState } from '../../domain/checkpoints';
import type { ControlRules } from '../../domain/controls/ControlRules';
import { formatElapsed, parseElapsed } from '../../domain/time/duration';
import { CommitInput } from './CommitInput';

export interface BrevetSettingsProps {
  /** Length of the track – proposed as the distance of a custom brevet */
  trackKm: number;
  state: Pick<CheckpointState, 'brevetKm' | 'customLimitMin'>;
  rules: ControlRules;
  dispatch: Dispatch<CheckpointAction>;
}

/** Value of the "custom distance" option of the brevet select */
const CUSTOM = 'custom';
const MAX_BREVET_KM = 5000;

const parseNumber = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
};

/**
 * Brevet distance for the control rules: a standard distance, a custom distance and time limit (US16) or no fixed time
 * limit. Part of the plan settings (US15).
 */
export function BrevetSettings({ trackKm, state, rules, dispatch }: BrevetSettingsProps) {
  const { t } = useTranslation();
  const rulesName = t(`controls.rules.${rules.id}`);
  // custom brevet (US16): the organiser's distance and time limit
  const custom = state.customLimitMin !== null && state.brevetKm !== null;

  return (
    <>
      <Form.Group controlId="brevet-km">
        <Form.Label className="small text-body-secondary mb-1">{t('controls.brevetDistance', { rules: rulesName })}</Form.Label>
        <Form.Select
          size="sm"
          value={custom ? CUSTOM : (state.brevetKm ?? '')}
          onChange={(e) => {
            if (e.target.value === CUSTOM) {
              // proposal: the track's distance and the limit of the rules' formula for it (US16)
              const km = Math.max(1, Math.round(trackKm));
              dispatch({ type: 'setCustomBrevet', brevetKm: km, limitMin: rules.defaultTimeLimitMin(km) });
            } else {
              dispatch({ type: 'setBrevetKm', brevetKm: e.target.value === '' ? null : Number(e.target.value) });
            }
          }}
        >
          {rules.brevetDistancesKm.map((km) => (
            <option key={km} value={km}>
              {t('controls.brevetOption', { km, limit: formatElapsed(rules.timeLimitMin(km)!) })}
            </option>
          ))}
          <option value={CUSTOM}>{t('controls.custom')}</option>
          <option value="">{t('controls.noBrevet')}</option>
        </Form.Select>
      </Form.Group>
      {custom && (
        <>
          <Form.Group controlId="custom-brevet-km" className="custom-brevet-field">
            <Form.Label className="small text-body-secondary mb-1">{t('controls.customDistance')}</Form.Label>
            <CommitInput
              size="sm"
              inputMode="decimal"
              className="text-end tabular-nums"
              value={String(state.brevetKm)}
              onCommit={(text) => {
                const km = parseNumber(text);
                if (km === null || km <= 0 || km > MAX_BREVET_KM) return t('controls.invalidDistance', { max: MAX_BREVET_KM });
                dispatch({ type: 'setCustomBrevet', brevetKm: km, limitMin: state.customLimitMin! });
                return null;
              }}
            />
          </Form.Group>
          <Form.Group controlId="custom-brevet-limit" className="custom-brevet-field">
            <Form.Label className="small text-body-secondary mb-1">{t('controls.customLimit')}</Form.Label>
            <CommitInput
              size="sm"
              inputMode="numeric"
              className="text-end tabular-nums"
              value={formatElapsed(state.customLimitMin!)}
              onCommit={(text) => {
                const minutes = parseElapsed(text);
                if (minutes === null || minutes <= 0) return t('controls.invalidLimit');
                dispatch({ type: 'setCustomBrevet', brevetKm: state.brevetKm!, limitMin: minutes });
                return null;
              }}
            />
          </Form.Group>
        </>
      )}
    </>
  );
}
