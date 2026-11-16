import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPlansIndex } from '../src/storage/plansIndex';
import { readPlansFolder } from './plansIndex';

const plan = (name: string, track: string, extra: object = {}) =>
  JSON.stringify({
    format: 'brevet-planner-plan',
    version: 1,
    name,
    track,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
    summary: { distanceKm: 309.3, climbM: 727, checkpoints: 2 },
    brevetKm: 300,
    start: { date: '2027-05-01', time: '06:00' },
    timeZone: 'Europe/Berlin',
    tightBufferMin: 75,
    timeModel: { id: 'speed-climb', params: { speedKmh: 28, climbRateMh: 700 } },
    checkpoints: [],
    ...extra,
  });

// the metadata name wins over the track name, like in parseGpx
const gpx = (name: string) => `<gpx><metadata><name>${name}</name></metadata><trk><name>Track</name><trkseg/></trk></gpx>`;

describe('plans index (US5)', () => {
  it('lists plans with their key figures and the tracks no plan uses', () => {
    const index = buildPlansIndex([
      { name: 'bodensee.plan.json', content: plan('G – Bodensee – G', '300km-sample-route.gpx') },
      { name: '300km-sample-route.gpx', content: gpx('G - Bodensee - G') },
      { name: 'new-route.gpx', content: gpx('New route') },
      { name: 'unnamed.GPX', content: '<gpx><trk><trkseg/></trk></gpx>' },
    ]);
    expect(index.plans).toEqual([
      {
        id: 'bodensee',
        file: 'bodensee.plan.json',
        name: 'G – Bodensee – G',
        track: '300km-sample-route.gpx',
        summary: { distanceKm: 309.3, climbM: 727, checkpoints: 2 },
        brevetKm: 300,
        start: { date: '2027-05-01', time: '06:00' },
        updatedAt: '2026-11-02T10:00:00.000Z',
      },
    ]);
    expect(index.tracks).toEqual([
      { file: 'new-route.gpx', name: 'New route' },
      { file: 'unnamed.GPX', name: 'unnamed' }, // no track name: file name
    ]);
  });

  it('reports plans that can not be opened instead of leaving them out', () => {
    const index = buildPlansIndex([
      { name: 'broken.plan.json', content: '{oops' },
      { name: 'future.plan.json', content: plan('Future', 'a.gpx', { version: 99 }) },
      { name: 'lost.plan.json', content: plan('Lost', 'missing.gpx') },
      { name: 'a.gpx', content: gpx('A') },
    ]);
    expect(index.plans.map((p) => [p.id, p.error])).toEqual([
      ['broken', 'The file is not valid JSON.'],
      ['future', expect.stringMatching(/newer version of the app/)],
      ['lost', 'The track missing.gpx is missing in the plans folder.'],
    ]);
    // the unreadable plan's track can't be known – it shows up as a track without plan
    expect(index.tracks).toEqual([{ file: 'a.gpx', name: 'A' }]);
  });

  it('reads the plan and GPX files of a folder, ignoring other files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plans-'));
    try {
      writeFileSync(join(dir, 'x.plan.json'), plan('X', 'x.gpx'));
      writeFileSync(join(dir, 'x.gpx'), gpx('X'));
      writeFileSync(join(dir, 'notes.txt'), 'ignore me');
      expect(readPlansFolder(dir).map((f) => f.name).sort()).toEqual(['x.gpx', 'x.plan.json']);
      expect(readPlansFolder(join(dir, 'missing'))).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
