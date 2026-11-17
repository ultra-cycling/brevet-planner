import { readFileSync } from 'node:fs';

/**
 * The committed 300 km sample plan (public/plans/) – real planning data that changes over time, so the browser tests
 * take their expectations from the file instead of fixed values.
 */
export const samplePlan = JSON.parse(readFileSync('public/plans/300km-sample-route.plan.json', 'utf8')) as {
  name: string;
  brevetKm: number | null;
  start: { date: string; time: string };
  summary: { distanceKm: number; climbM: number; checkpoints: number };
  checkpoints: { kind: string; name: string; distanceKm: number }[];
  updatedAt: string;
  [field: string]: unknown;
};

export const SAMPLE_PLAN_ID = '300km-sample-route';

/** Intermediate controls of the sample plan with the labels the app gives them ("CP2 Riverside" or "CP2") */
export const sampleControls = samplePlan.checkpoints
  .filter((cp) => cp.kind === 'control')
  .map((cp, i) => ({ ...cp, label: cp.name ? `CP${i + 1} ${cp.name}` : `CP${i + 1}` }));

/** Regular expression matching a text literally */
export const literally = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
