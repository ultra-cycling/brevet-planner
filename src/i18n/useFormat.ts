import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Locale-aware number formatting for the active language. */
export function useFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return useMemo(() => {
    const km = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const int = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return {
      /** "78.2 km" */
      km: (value: number) => `${km.format(value)} km`,
      /** "1,480 m" */
      m: (value: number) => `${int.format(value)} m`,
      int: (value: number) => int.format(value),
    };
  }, [locale]);
}
