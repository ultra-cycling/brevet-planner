import { useCallback, useEffect, useState } from 'react';
import { useAppServices } from '../../app/AppServices';
import type { PlanListing } from '../../storage/PlanRepository';

/** Saved plans and tracks without plan from the plan repository; `reload` after files may have changed */
export function usePlanListing() {
  const { planRepository } = useAppServices();
  const [listing, setListing] = useState<PlanListing | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      setListing(await planRepository.list());
      setError(false);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }, [planRepository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { listing, error, reload };
}
