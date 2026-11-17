/** Opening and closing time of a control in minutes after the start. */
export interface ControlWindow {
  openMin: number;
  closeMin: number;
}

export type ControlKind = 'start' | 'control' | 'finish';

/**
 * Rules that pre-fill the control windows of a brevet (ACP today; RUSA, PBP or custom rules can follow).
 * All times are relative to the start, so they don't depend on the start date and time.
 */
export interface ControlRules {
  id: string;
  /** Nominal brevet distances the rules define a fixed time limit for */
  readonly brevetDistancesKm: readonly number[];
  /** Fixed overall time limit in minutes for a nominal brevet distance */
  timeLimitMin(brevetKm: number): number | null;
  /** Nominal brevet distance that matches a track length, `null` if none fits */
  inferBrevetKm(trackKm: number): number | null;
  /** Time limit the rules give for any distance – proposal for a custom brevet (US16) */
  defaultTimeLimitMin(distanceKm: number): number;
  /**
   * Control window for a control at `distanceKm`.
   * @param brevetKm nominal distance; `null` = no fixed time limit, the finish is computed like any control
   * @param customLimitMin time limit of a custom brevet (US16): the finish closes then, the closing times of the other
   *   controls are scaled accordingly; `null` = the rules' limit of `brevetKm`
   */
  window(distanceKm: number, kind: ControlKind, brevetKm: number | null, customLimitMin?: number | null): ControlWindow;
}
