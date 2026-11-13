import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ControlRow } from '../../domain/checkpoints';

/** Short name of a control for labels and announcements: "Start", "Finish", "CP2" or "CP2 Riverside Café". */
export function useControlLabel() {
  const { t } = useTranslation();
  return useCallback(
    ({ checkpoint, number }: Pick<ControlRow, 'checkpoint' | 'number'>) => {
      if (checkpoint.kind !== 'control') return t(`checkpoints.${checkpoint.kind}`);
      const cp = t('checkpoints.cp', { number });
      return checkpoint.name ? `${cp} ${checkpoint.name}` : cp;
    },
    [t],
  );
}
