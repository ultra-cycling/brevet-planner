import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { ArrivalStatus } from '../../domain/status';
import { EarlyIcon, LateIcon, OkIcon, TightIcon } from '../icons';

const ICONS: Record<ArrivalStatus, ComponentType<SVGProps<SVGSVGElement>>> = {
  ok: OkIcon,
  tight: TightIcon,
  early: EarlyIcon,
  late: LateIcon,
};

/** Status of an arrival: icon, text and colour – never colour alone (docs/plan.md → Status of an arrival). */
export function StatusBadge({ status }: { status: ArrivalStatus }) {
  const { t } = useTranslation();
  const Icon = ICONS[status];
  return (
    <span className={`arrival-status is-${status}`} data-testid="status" title={t(`timetable.status.${status}Hint`)}>
      <Icon width={14} height={14} />
      {t(`timetable.status.${status}`)}
    </span>
  );
}
