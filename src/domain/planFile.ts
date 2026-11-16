import { checkpointReducer, initialCheckpointState, type Checkpoint, type CheckpointSource } from './checkpoints';
import type { ControlKind } from './controls/ControlRules';
import type { PlanState } from './planState';
import { isValidDate, normalizeTimeOfDay } from './time/clock';
import type { EstimatorRegistry } from './time/registry';
import { resolveParams } from './time/TimeEstimator';
import { isValidTimeZone } from './time/timeZone';
import { positionAtDistance } from './track/snap';
import type { Track } from './track/track';

/**
 * Plan file (`<name>.plan.json`, US5): the planning decisions of a route plan, stored next to its GPX track.
 * Everything derived (positions, segments, windows, timetable) is recalculated from the track when the plan is opened.
 * Bump PLAN_FILE_VERSION on incompatible changes and add a migration step to `migratePlanFile`.
 */
export const PLAN_FILE_FORMAT = 'brevet-planner-plan';
export const PLAN_FILE_VERSION = 1;

export interface PlanFileCheckpoint {
  id: string;
  kind: ControlKind;
  name: string;
  source: CheckpointSource;
  /** Distance along the track; for start and finish informational only (they sit at the ends of the track) */
  distanceKm: number;
  restMin: number;
  openOverrideMin: number | null;
  closeOverrideMin: number | null;
  segmentParams: Record<string, number>;
}

export interface PlanFile {
  format: typeof PLAN_FILE_FORMAT;
  version: number;
  name: string;
  /** GPX file name, in the same folder */
  track: string;
  createdAt: string;
  updatedAt: string;
  /** Key figures for the plan list – informational, recalculated when the plan is opened */
  summary: { distanceKm: number; climbM: number; checkpoints: number };
  brevetKm: number | null;
  start: { date: string; time: string };
  timeZone: string;
  tightBufferMin: number;
  timeModel: { id: string; params: Record<string, number> };
  /** All controls along the track, start and finish included */
  checkpoints: PlanFileCheckpoint[];
}

export type PlanFileErrorCode = 'notJson' | 'notAPlan' | 'newerVersion' | 'invalid';

export class PlanFileError extends Error {
  constructor(
    readonly code: PlanFileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PlanFileError';
  }
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

function fileCheckpoint(cp: Checkpoint): PlanFileCheckpoint {
  return {
    id: cp.id,
    kind: cp.kind,
    name: cp.name,
    source: cp.source,
    distanceKm: round(cp.distanceKm, 4),
    restMin: cp.restMin,
    openOverrideMin: cp.openOverrideMin,
    closeOverrideMin: cp.closeOverrideMin,
    segmentParams: { ...cp.segmentParams } as Record<string, number>,
  };
}

/** The plan file for a plan state */
export function toPlanFile(state: PlanState, now = new Date()): PlanFile {
  const controls = state.checkpoints.checkpoints;
  return {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    name: state.name,
    track: state.trackFile,
    createdAt: state.createdAt,
    updatedAt: now.toISOString(),
    summary: {
      distanceKm: round(state.track.distanceKm, 1),
      climbM: Math.round(state.track.climbM),
      checkpoints: controls.filter((cp) => cp.kind === 'control').length,
    },
    brevetKm: state.checkpoints.brevetKm,
    start: { ...state.start },
    timeZone: state.timeZone,
    tightBufferMin: state.tightBufferMin,
    timeModel: { id: state.timeModel.id, params: { ...state.timeModel.params } },
    checkpoints: controls.map(fileCheckpoint),
  };
}

/** Compares the planning content of two plan states, ignoring timestamps – for the unsaved-changes indicator */
export function planFingerprint(state: PlanState): string {
  const { updatedAt: _updated, ...content } = toPlanFile(state, new Date(0));
  return JSON.stringify(content);
}

/** Brings an older plan file to the current version; rejects files of a newer app version */
export function migratePlanFile(raw: Record<string, unknown>): Record<string, unknown> {
  const version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new PlanFileError('invalid', '"version" must be a positive whole number');
  }
  if (version > PLAN_FILE_VERSION) {
    throw new PlanFileError(
      'newerVersion',
      `The plan was saved by a newer version of the app (format version ${version}, this app reads up to ${PLAN_FILE_VERSION}).`,
    );
  }
  // version 1 is the current format – future migrations go here: if (version === 1) raw = { ...raw, …, version: 2 }
  return raw;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(path: string, expectation: string): never {
  throw new PlanFileError('invalid', `"${path}" ${expectation}`);
}

function str(raw: Record<string, unknown>, key: string, path = key): string {
  const value = raw[key];
  if (typeof value !== 'string') fail(path, 'must be a text');
  return value;
}

function num(raw: Record<string, unknown>, key: string, path = key, min = -Infinity): number {
  const value = raw[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    fail(path, min === -Infinity ? 'must be a number' : `must be a number ≥ ${min}`);
  }
  return value;
}

function nullableNum(raw: Record<string, unknown>, key: string, path: string): number | null {
  return raw[key] === null || raw[key] === undefined ? null : num(raw, key, path, 0);
}

function numberRecord(value: unknown, path: string): Record<string, number> {
  if (value === undefined) return {};
  if (!isObject(value)) fail(path, 'must be an object');
  for (const [key, v] of Object.entries(value)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${path}.${key}`, 'must be a number');
  }
  return value as Record<string, number>;
}

const KINDS: readonly ControlKind[] = ['start', 'control', 'finish'];
const SOURCES: readonly CheckpointSource[] = ['track', 'map', 'profile', 'km', 'waypoint'];

/** Parses and validates the text of a plan file (format, version, all fields) */
export function parsePlanFile(text: string): PlanFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new PlanFileError('notJson', 'The file is not valid JSON.');
  }
  if (!isObject(raw) || raw.format !== PLAN_FILE_FORMAT) {
    throw new PlanFileError('notAPlan', `The file is not a Brevet Planner plan ("format" must be "${PLAN_FILE_FORMAT}").`);
  }
  const plan = migratePlanFile(raw);

  const start = isObject(plan.start) ? plan.start : fail('start', 'must be an object with date and time');
  const date = str(start, 'date', 'start.date');
  if (!isValidDate(date)) fail('start.date', 'must be a date as YYYY-MM-DD');
  const time = normalizeTimeOfDay(str(start, 'time', 'start.time')) ?? fail('start.time', 'must be a time as HH:MM');
  const timeZone = str(plan, 'timeZone');
  if (!isValidTimeZone(timeZone)) fail('timeZone', 'must be an IANA time zone, e.g. Europe/Berlin');
  const timeModel = isObject(plan.timeModel) ? plan.timeModel : fail('timeModel', 'must be an object with id and params');
  const summary = isObject(plan.summary) ? plan.summary : {};
  if (!Array.isArray(plan.checkpoints)) fail('checkpoints', 'must be a list');

  const checkpoints = plan.checkpoints.map((value, i): PlanFileCheckpoint => {
    const path = `checkpoints[${i}]`;
    if (!isObject(value)) fail(path, 'must be an object');
    const kind = str(value, 'kind', `${path}.kind`) as ControlKind;
    if (!KINDS.includes(kind)) fail(`${path}.kind`, `must be one of ${KINDS.join(', ')}`);
    const source = (value.source ?? 'km') as CheckpointSource;
    if (!SOURCES.includes(source)) fail(`${path}.source`, `must be one of ${SOURCES.join(', ')}`);
    return {
      id: str(value, 'id', `${path}.id`),
      kind,
      name: typeof value.name === 'string' ? value.name : '',
      source,
      distanceKm: num(value, 'distanceKm', `${path}.distanceKm`, 0),
      restMin: value.restMin === undefined ? 0 : num(value, 'restMin', `${path}.restMin`, 0),
      openOverrideMin: nullableNum(value, 'openOverrideMin', `${path}.openOverrideMin`),
      closeOverrideMin: nullableNum(value, 'closeOverrideMin', `${path}.closeOverrideMin`),
      segmentParams: numberRecord(value.segmentParams, `${path}.segmentParams`),
    };
  });

  return {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    name: str(plan, 'name'),
    track: str(plan, 'track'),
    createdAt: typeof plan.createdAt === 'string' ? plan.createdAt : new Date(0).toISOString(),
    updatedAt: typeof plan.updatedAt === 'string' ? plan.updatedAt : new Date(0).toISOString(),
    summary: {
      distanceKm: typeof summary.distanceKm === 'number' ? summary.distanceKm : 0,
      climbM: typeof summary.climbM === 'number' ? summary.climbM : 0,
      checkpoints: typeof summary.checkpoints === 'number' ? summary.checkpoints : 0,
    },
    brevetKm: plan.brevetKm === null || plan.brevetKm === undefined ? null : num(plan, 'brevetKm', 'brevetKm', 0),
    start: { date, time },
    timeZone,
    tightBufferMin: num(plan, 'tightBufferMin', 'tightBufferMin', 0),
    timeModel: { id: str(timeModel, 'id', 'timeModel.id'), params: numberRecord(timeModel.params, 'timeModel.params') },
    checkpoints,
  };
}

/**
 * The plan state for a plan file and its track. Checkpoints are placed by their distance along the track; start and
 * finish keep their overrides. Unknown time models or out-of-range parameters are rejected.
 */
export function planStateFromFile(file: PlanFile, track: Track, id: string, estimators: EstimatorRegistry): PlanState {
  if (!estimators.has(file.timeModel.id)) {
    throw new PlanFileError('invalid', `"timeModel.id" is unknown: ${file.timeModel.id} (available: ${estimators.ids().join(', ')})`);
  }
  let params;
  try {
    params = resolveParams(estimators.get(file.timeModel.id), file.timeModel.params);
  } catch (error) {
    throw new PlanFileError('invalid', `"timeModel.params": ${(error as Error).message}`);
  }

  let state = initialCheckpointState(track, file.brevetKm);
  for (const cp of file.checkpoints) {
    if (cp.kind === 'control') {
      if (cp.distanceKm <= 0 || cp.distanceKm >= track.distanceKm) {
        throw new PlanFileError('invalid', `Checkpoint "${cp.name || cp.id}" at km ${cp.distanceKm} lies outside the track.`);
      }
      state = checkpointReducer(state, {
        type: 'add',
        id: cp.id,
        position: positionAtDistance(track, cp.distanceKm),
        name: cp.name,
        source: cp.source,
        restMin: cp.restMin,
      });
    }
    const target = cp.kind === 'control' ? cp.id : cp.kind; // start and finish have fixed ids
    state = checkpointReducer(state, {
      type: 'setWindow',
      id: target,
      openOverrideMin: cp.openOverrideMin,
      closeOverrideMin: cp.closeOverrideMin,
    });
    for (const [key, value] of Object.entries(cp.segmentParams)) {
      state = checkpointReducer(state, { type: 'setSegmentParam', id: target, key, value });
    }
  }

  return {
    id,
    name: file.name,
    trackFile: file.track,
    track,
    checkpoints: state,
    start: file.start,
    timeZone: file.timeZone,
    tightBufferMin: file.tightBufferMin,
    timeModel: { id: file.timeModel.id, params },
    createdAt: file.createdAt,
  };
}

/** File base name for a plan name: "PBP 2027 – Paris" → "pbp-2027-paris" */
export function planFileId(name: string): string {
  const id = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return id || 'plan';
}

/** Id of a plan file: "pbp-2027.plan.json" → "pbp-2027" */
export const PLAN_FILE_SUFFIX = '.plan.json';
