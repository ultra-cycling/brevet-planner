import { checkpointReducer, initialCheckpointState, type CheckpointAction, type CheckpointState } from './checkpoints';
import type { RideStart } from './time/clock';
import type { EstimatorParams } from './time/TimeEstimator';
import type { Track } from './track/track';

export interface TimeModelChoice {
  id: string;
  params: EstimatorParams;
}

/**
 * Everything that belongs to a route plan and is saved with it (US5): the track and all planning decisions.
 * UI preferences (time display, overlay, highlighted segment) are not part of it.
 */
export interface PlanState {
  /** Id in the plan repository (file base name); `null` for a new plan that has never been saved */
  id: string | null;
  name: string;
  /** File name of the GPX track the plan is based on, e.g. "300km-sample-route.gpx" */
  trackFile: string;
  track: Track;
  checkpoints: CheckpointState;
  start: RideStart;
  /** IANA time zone of the start (daylight overlay) */
  timeZone: string;
  tightBufferMin: number;
  timeModel: TimeModelChoice;
  /** ISO 8601 */
  createdAt: string;
}

/** Defaults for a new plan – from config.yaml and the browser */
export interface PlanDefaults {
  start: RideStart;
  timeZone: string;
  tightBufferMin: number;
  timeModel: TimeModelChoice;
  /** Nominal brevet distance for the track (control rules), `null` = no fixed time limit */
  brevetKm: number | null;
}

/** A new plan for a track: start and finish only, named after the track */
export function newPlanState(track: Track, trackFile: string, defaults: PlanDefaults, now = new Date()): PlanState {
  return {
    id: null,
    name: track.name,
    trackFile,
    track,
    checkpoints: initialCheckpointState(track, defaults.brevetKm),
    start: defaults.start,
    timeZone: defaults.timeZone,
    tightBufferMin: defaults.tightBufferMin,
    timeModel: defaults.timeModel,
    createdAt: now.toISOString(),
  };
}

export type PlanAction =
  | { type: 'checkpoints'; action: CheckpointAction }
  | { type: 'rename'; name: string }
  | { type: 'setStart'; start: RideStart }
  | { type: 'setTimeZone'; timeZone: string }
  | { type: 'setTightBuffer'; minutes: number }
  | { type: 'setTimeModel'; timeModel: TimeModelChoice }
  | { type: 'setTimeModelParam'; key: string; value: number };

export function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (action.type) {
    case 'checkpoints':
      return { ...state, checkpoints: checkpointReducer(state.checkpoints, action.action) };
    case 'rename':
      return { ...state, name: action.name };
    case 'setStart':
      return { ...state, start: action.start };
    case 'setTimeZone':
      return { ...state, timeZone: action.timeZone };
    case 'setTightBuffer':
      return { ...state, tightBufferMin: action.minutes };
    case 'setTimeModel':
      return { ...state, timeModel: action.timeModel };
    case 'setTimeModelParam':
      return { ...state, timeModel: { ...state.timeModel, params: { ...state.timeModel.params, [action.key]: action.value } } };
  }
}
