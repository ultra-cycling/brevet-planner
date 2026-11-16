import { useMemo, useReducer } from 'react';
import { planFingerprint } from '../../domain/planFile';
import { planReducer, type PlanAction, type PlanState } from '../../domain/planState';

/** The open plan with what's needed to save it (US5) */
export interface PlanSession {
  plan: PlanState;
  /** Content of the GPX track – downloaded together with a new plan */
  gpx: string;
  /** The track is in the plans folder already (plan or track without plan opened from there), not uploaded */
  trackInRepo: boolean;
  /** Fingerprint of the plan as last loaded or downloaded; `null` = never saved */
  savedFingerprint: string | null;
}

export type SessionAction =
  | { type: 'open'; plan: PlanState; gpx: string; trackInRepo: boolean; saved: boolean }
  | { type: 'close' }
  | { type: 'saved' }
  | { type: 'plan'; action: PlanAction };

export function sessionReducer(session: PlanSession | null, action: SessionAction): PlanSession | null {
  switch (action.type) {
    case 'open':
      return {
        plan: action.plan,
        gpx: action.gpx,
        trackInRepo: action.trackInRepo,
        savedFingerprint: action.saved ? planFingerprint(action.plan) : null,
      };
    case 'close':
      return null;
    case 'saved':
      return session && { ...session, savedFingerprint: planFingerprint(session.plan) };
    case 'plan':
      return session && { ...session, plan: planReducer(session.plan, action.action) };
  }
}

/** The open plan, its changes and whether they are saved */
export function usePlanSession() {
  const [session, dispatch] = useReducer(sessionReducer, null);
  const dirty = useMemo(
    () => session !== null && session.savedFingerprint !== planFingerprint(session.plan),
    [session],
  );
  return { session, dispatch, dirty };
}
