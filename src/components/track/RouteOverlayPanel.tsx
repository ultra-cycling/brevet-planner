import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '../../app/AppServices';
import type { RouteOverlay } from '../../domain/overlays/RouteOverlay';
import { useFormat } from '../../i18n/useFormat';

export interface RouteOverlayPanelProps {
  /** Selected overlay; `null` = plain route */
  overlay: RouteOverlay | null;
  onChange: (id: string | null) => void;
  /** Distance per class of the selected overlay; `null` if it can't be computed for this plan */
  distanceByClass: Map<string, number> | null;
  /** Interpolation values for the overlay's note, e.g. the time zone */
  noteValues?: Record<string, string>;
}

/** Overlay selection and legend, shown on top of the map (US7). The legend names every colour – never colour alone. */
export function RouteOverlayPanel({ overlay, onChange, distanceByClass, noteValues }: RouteOverlayPanelProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { overlays } = useAppServices();
  const note = overlay ? t(`overlays.${overlay.id}.note`, { defaultValue: '', ...noteValues }) : '';

  return (
    <div className="route-overlay-panel shadow-sm" data-testid="route-overlay-panel">
      <Form.Group controlId="route-overlay">
        <Form.Label className="small fw-semibold mb-1">{t('overlays.label')}</Form.Label>
        <Form.Select size="sm" value={overlay?.id ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{t('overlays.none')}</option>
          {overlays.list().map((o) => (
            <option key={o.id} value={o.id}>
              {t(`overlays.${o.id}.name`)}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      {overlay &&
        (distanceByClass ? (
          <>
            <ul className="overlay-legend list-unstyled small mb-0 mt-2" aria-label={t('overlays.legend', { name: t(`overlays.${overlay.id}.name`) })}>
              {overlay.classes.map((c) => (
                <li key={c.key} className="d-flex align-items-center gap-2" data-testid="legend-item">
                  <span className="legend-swatch" style={{ backgroundColor: c.color }} aria-hidden="true" />
                  <span className="me-auto">
                    {t(`overlays.${overlay.id}.classes.${c.key}`)}
                    <span className="visually-hidden">: </span>
                  </span>
                  <span className="tabular-nums text-body-secondary text-nowrap">
                    {format.km(distanceByClass.get(c.key) ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
            {note && <p className="small text-body-secondary mb-0 mt-2">{note}</p>}
          </>
        ) : (
          <p className="small text-body-secondary mb-0 mt-2" role="status">
            {t(`overlays.${overlay.id}.unavailable`)}
          </p>
        ))}
    </div>
  );
}
