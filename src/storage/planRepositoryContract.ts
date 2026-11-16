import { describe, expect, it } from 'vitest';
import { planFileFor, lineGpx, samplePlanFiles } from '../test/planFixtures';
import type { PlanRepository } from './PlanRepository';

/**
 * Behaviour every PlanRepository implementation must fulfil, so backends stay interchangeable (US5).
 * @param create a repository containing the given files (file name → content, layout of the plans folder)
 */
export function describePlanRepositoryContract(name: string, create: (files: Record<string, string>) => PlanRepository) {
  describe(`${name} – PlanRepository contract`, () => {
    it('lists the plans with their key figures and the tracks without plan', async () => {
      const listing = await create(samplePlanFiles()).list();
      expect(listing.plans).toEqual([
        expect.objectContaining({
          id: 'line-200',
          name: 'Line 200 – spring',
          track: 'line-200.gpx',
          summary: { distanceKm: expect.closeTo(210, 0), climbM: expect.any(Number), checkpoints: 1 },
          start: { date: '2027-05-01', time: '06:00' },
        }),
      ]);
      expect(listing.tracks).toEqual([{ file: 'unplanned.gpx', name: 'Unplanned route' }]);
    });

    it('is empty without files', async () => {
      expect(await create({}).list()).toEqual({ plans: [], tracks: [] });
    });

    it('loads a plan with the content of its track', async () => {
      const files = samplePlanFiles();
      const { plan, gpx } = await create(files).load('line-200');
      expect(plan.name).toBe('Line 200 – spring');
      expect(plan.checkpoints.map((cp) => cp.name)).toEqual(['', 'Café', '']);
      expect(gpx).toBe(files['line-200.gpx']);
    });

    it('loads a track without plan', async () => {
      expect(await create(samplePlanFiles()).loadTrack('unplanned.gpx')).toContain('Unplanned route');
    });

    it('reports unknown plans and tracks as not found', async () => {
      const repo = create(samplePlanFiles());
      await expect(repo.load('missing')).rejects.toMatchObject({ code: 'notFound' });
      await expect(repo.loadTrack('missing.gpx')).rejects.toMatchObject({ code: 'notFound' });
    });

    it('rejects invalid plan files with the reason', async () => {
      const repo = create({ ...samplePlanFiles(), 'broken.plan.json': '{oops' });
      expect((await repo.list()).plans.find((p) => p.id === 'broken')?.error).toBe('The file is not valid JSON.');
      await expect(repo.load('broken')).rejects.toMatchObject({ code: 'notJson' });
    });

    it('saves plans when it can, otherwise refuses', async () => {
      const repo = create({});
      const gpx = lineGpx('New', 100);
      const plan = planFileFor(gpx, 'new.gpx', { name: 'New plan' });
      if (repo.capabilities.save) {
        await repo.save('new-plan', plan, gpx);
        expect((await repo.load('new-plan')).plan).toEqual(plan);
        expect((await repo.list()).plans.map((p) => p.id)).toEqual(['new-plan']);
      } else {
        await expect(repo.save('new-plan', plan, gpx)).rejects.toMatchObject({ code: 'readOnly' });
      }
    });
  });
}
