import { useRef } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { PlanListing } from '../../storage/PlanRepository';
import { useFormat } from '../../i18n/useFormat';

export interface PlanMenuProps {
  /** Name of the open plan */
  name: string;
  /** Repository id of the open plan (`null` for a new plan) – marked in the list */
  currentId: string | null;
  listing: PlanListing | null;
  onOpenPlan: (id: string) => void;
  onNewPlan: (file: File) => void;
  onAllPlans: () => void;
}

/** Switch between plans from the header (US5): saved plans, a new plan from a GPX file, the start screen. */
export function PlanMenu({ name, currentId, listing, onOpenPlan, onNewPlan, onAllPlans }: PlanMenuProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const fileInput = useRef<HTMLInputElement>(null);
  const plans = (listing?.plans ?? []).filter((p) => !p.error);

  return (
    <>
      <Dropdown>
        <Dropdown.Toggle variant="outline-secondary" className="plan-menu-toggle text-truncate" aria-label={t('plans.menu', { name })}>
          {name}
        </Dropdown.Toggle>
        <Dropdown.Menu className="plan-menu">
          <Dropdown.Header>{t('start.savedPlans')}</Dropdown.Header>
          {plans.map((plan) => (
            <Dropdown.Item
              key={plan.id}
              as="button"
              active={plan.id === currentId}
              aria-current={plan.id === currentId ? 'true' : undefined}
              onClick={() => onOpenPlan(plan.id)}
              className="d-flex gap-3"
            >
              <span className="me-auto text-truncate">{plan.name}</span>
              {plan.summary && <span className="small tabular-nums opacity-75">{format.km(plan.summary.distanceKm)}</span>}
            </Dropdown.Item>
          ))}
          {plans.length === 0 && <Dropdown.ItemText className="small text-body-secondary">{t('start.noPlans')}</Dropdown.ItemText>}
          <Dropdown.Divider />
          <Dropdown.Item as="button" onClick={() => fileInput.current?.click()}>
            {t('plans.newFromGpx')}
          </Dropdown.Item>
          <Dropdown.Item as="button" onClick={onAllPlans}>
            {t('plans.allPlans')}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <input
        ref={fileInput}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="d-none"
        aria-label={t('plans.newFromGpx')}
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onNewPlan(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
