import type { ControlKind, ControlRules, ControlWindow } from './controls/ControlRules';
import type { EstimatorParams } from './time/TimeEstimator';
import { snapToTrack, type TrackPosition } from './track/snap';
import type { Track } from './track/track';

/** How a checkpoint was placed */
export type CheckpointSource = 'track' | 'map' | 'profile' | 'km' | 'waypoint';

/**
 * A control along the track. Start and finish are always present; intermediate controls are added by the rider.
 * The control window is taken from the control rules unless the rider overrides opening or closing time
 * (e.g. with the times from the official route sheet).
 */
export interface Checkpoint extends TrackPosition {
  id: string;
  kind: ControlKind;
  /** Free name, e.g. "Bakery Lindau"; may be empty */
  name: string;
  source: CheckpointSource;
  /** Minutes after the start; `null` = use the control rules */
  openOverrideMin: number | null;
  closeOverrideMin: number | null;
  /** Planned rest at this control in minutes (always 0 for start and finish) */
  restMin: number;
  /**
   * Time model parameters for the segment that *ends* at this control, overriding the plan's defaults
   * (e.g. a lower speed for a headwind stretch). Keys unknown to the selected model are ignored.
   */
  segmentParams: Partial<EstimatorParams>;
}

export interface CheckpointState {
  checkpoints: Checkpoint[];
  /** Nominal brevet distance for the control rules; `null` = no fixed time limit */
  brevetKm: number | null;
}

export type CheckpointAction =
  | { type: 'reset'; track: Track; brevetKm: number | null }
  | { type: 'add'; id: string; position: TrackPosition; name?: string; source: CheckpointSource; restMin?: number }
  | {
      type: 'addMany';
      items: { id: string; position: TrackPosition; name: string; source: CheckpointSource }[];
      restMin?: number;
    }
  | { type: 'move'; id: string; position: TrackPosition }
  | { type: 'rename'; id: string; name: string }
  | { type: 'setWindow'; id: string; openOverrideMin?: number | null; closeOverrideMin?: number | null }
  | { type: 'setRest'; id: string; restMin: number }
  | { type: 'setSegmentParam'; id: string; key: string; value: number | null }
  | { type: 'remove'; id: string }
  | { type: 'setBrevetKm'; brevetKm: number | null };

const KIND_ORDER: Record<ControlKind, number> = { start: 0, control: 1, finish: 2 };

function sorted(checkpoints: Checkpoint[]): Checkpoint[] {
  return [...checkpoints].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.distanceKm - b.distanceKm);
}

function control(id: string, position: TrackPosition, name: string, source: CheckpointSource, restMin = 0): Checkpoint {
  return {
    id,
    kind: 'control',
    name,
    source,
    ...position,
    openOverrideMin: null,
    closeOverrideMin: null,
    restMin,
    segmentParams: {},
  };
}

export function initialCheckpointState(track: Track, brevetKm: number | null): CheckpointState {
  const start = track.points[0];
  const finish = track.points.at(-1)!;
  const endpoint = (kind: 'start' | 'finish', p: typeof start): Checkpoint => ({
    id: kind,
    kind,
    name: '',
    source: 'track',
    distanceKm: p.distanceKm,
    lat: p.lat,
    lon: p.lon,
    openOverrideMin: null,
    closeOverrideMin: null,
    restMin: 0,
    segmentParams: {},
  });
  return { checkpoints: [endpoint('start', start), endpoint('finish', finish)], brevetKm };
}

export const emptyCheckpointState: CheckpointState = { checkpoints: [], brevetKm: null };

export function checkpointReducer(state: CheckpointState, action: CheckpointAction): CheckpointState {
  const update = (id: string, fn: (cp: Checkpoint) => Checkpoint) => ({
    ...state,
    checkpoints: sorted(state.checkpoints.map((cp) => (cp.id === id ? fn(cp) : cp))),
  });

  switch (action.type) {
    case 'reset':
      return initialCheckpointState(action.track, action.brevetKm);
    case 'add':
      return {
        ...state,
        checkpoints: sorted([
          ...state.checkpoints,
          control(action.id, action.position, action.name ?? '', action.source, action.restMin),
        ]),
      };
    case 'addMany':
      return {
        ...state,
        checkpoints: sorted([
          ...state.checkpoints,
          ...action.items.map((item) => control(item.id, item.position, item.name, item.source, action.restMin)),
        ]),
      };
    case 'move':
      // start and finish are fixed to the ends of the track
      return update(action.id, (cp) => (cp.kind === 'control' ? { ...cp, ...action.position } : cp));
    case 'rename':
      return update(action.id, (cp) => ({ ...cp, name: action.name }));
    case 'setWindow':
      return update(action.id, (cp) => ({
        ...cp,
        openOverrideMin: action.openOverrideMin !== undefined ? action.openOverrideMin : cp.openOverrideMin,
        closeOverrideMin: action.closeOverrideMin !== undefined ? action.closeOverrideMin : cp.closeOverrideMin,
      }));
    case 'setRest':
      return update(action.id, (cp) => (cp.kind === 'control' ? { ...cp, restMin: Math.max(0, action.restMin) } : cp));
    case 'setSegmentParam':
      return update(action.id, (cp) => {
        if (cp.kind === 'start') return cp; // no segment ends at the start
        const segmentParams = { ...cp.segmentParams };
        if (action.value === null) delete segmentParams[action.key];
        else segmentParams[action.key] = action.value;
        return { ...cp, segmentParams };
      });
    case 'remove':
      return {
        ...state,
        checkpoints: state.checkpoints.filter((cp) => cp.id !== action.id || cp.kind !== 'control'),
      };
    case 'setBrevetKm':
      return { ...state, brevetKm: action.brevetKm };
  }
}

/** A checkpoint with its numbering and resolved control window. */
export interface ControlRow {
  checkpoint: Checkpoint;
  /** 1, 2, … for intermediate controls; `null` for start and finish */
  number: number | null;
  /** Window according to the control rules */
  ruleWindow: ControlWindow;
  /** Window used for planning: rule window with the rider's overrides applied */
  window: ControlWindow;
  /** Closing before opening (only possible through overrides) */
  invalid: boolean;
}

export function controlRows(state: CheckpointState, rules: ControlRules): ControlRow[] {
  let number = 0;
  return state.checkpoints.map((checkpoint) => {
    const ruleWindow = rules.window(checkpoint.distanceKm, checkpoint.kind, state.brevetKm);
    const window = {
      openMin: checkpoint.openOverrideMin ?? ruleWindow.openMin,
      closeMin: checkpoint.closeOverrideMin ?? ruleWindow.closeMin,
    };
    return {
      checkpoint,
      number: checkpoint.kind === 'control' ? ++number : null,
      ruleWindow,
      window,
      invalid: window.closeMin < window.openMin,
    };
  });
}

/** Two checkpoints closer than this along the track are considered the same place */
const SAME_PLACE_KM = 0.1;

/** Checkpoint (including start and finish) within `toleranceKm` of a distance along the track */
export function findCheckpointNear(
  checkpoints: readonly Checkpoint[],
  distanceKm: number,
  toleranceKm = SAME_PLACE_KM,
): Checkpoint | undefined {
  return checkpoints.find((cp) => Math.abs(cp.distanceKm - distanceKm) < toleranceKm);
}

/** Waypoints further away from the track than this are not imported */
export const MAX_WAYPOINT_OFF_TRACK_KM = 1;
/** A waypoint this close to an existing checkpoint counts as already imported */
const DUPLICATE_KM = 0.2;

export interface WaypointImport {
  items: { position: TrackPosition; name: string }[];
  /** Names of waypoints too far away from the track */
  tooFar: string[];
  /** Number of waypoints that already have a checkpoint at their position */
  duplicates: number;
}

/** Snaps the GPX waypoints of a track onto it as checkpoint candidates. */
export function importWaypoints(track: Track, existing: readonly Checkpoint[]): WaypointImport {
  const result: WaypointImport = { items: [], tooFar: [], duplicates: 0 };
  const taken = existing.map((cp) => cp.distanceKm);
  for (const wpt of track.waypoints) {
    const { offTrackKm, ...position } = snapToTrack(track, wpt.lat, wpt.lon);
    if (offTrackKm > MAX_WAYPOINT_OFF_TRACK_KM) {
      result.tooFar.push(wpt.name);
    } else if (taken.some((km) => Math.abs(km - position.distanceKm) < DUPLICATE_KM)) {
      result.duplicates += 1;
    } else {
      result.items.push({ position, name: wpt.name });
      taken.push(position.distanceKm);
    }
  }
  return result;
}
