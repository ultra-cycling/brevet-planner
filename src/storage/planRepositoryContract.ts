import { beforeEach, describe, expect, it } from 'vitest';
import { createPlan } from '../domain/plan';
import type { PlanRepository } from './PlanRepository';

/**
 * Behaviour every PlanRepository implementation must fulfil.
 * Run it for each backend so implementations stay interchangeable.
 */
export function describePlanRepositoryContract(name: string, create: () => PlanRepository) {
  describe(`${name} – PlanRepository contract`, () => {
    let repo: PlanRepository;

    beforeEach(() => {
      repo = create();
    });

    it('is empty initially', async () => {
      expect(await repo.list()).toEqual([]);
      expect(await repo.get('missing')).toBeUndefined();
    });

    it('saves and loads a plan', async () => {
      const plan = createPlan('Sample 300 km', new Date('2026-01-01T00:00:00Z'), 'p1');
      const saved = await repo.save(plan);
      expect(saved.id).toBe('p1');
      expect(await repo.get('p1')).toEqual(saved);
      expect(await repo.list()).toEqual([{ id: 'p1', name: 'Sample 300 km', updatedAt: saved.updatedAt }]);
    });

    it('replaces a plan with the same id', async () => {
      await repo.save(createPlan('Old name', new Date(), 'p1'));
      await repo.save({ ...createPlan('New name', new Date(), 'p1') });
      const list = await repo.list();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('New name');
    });

    it('returns copies, not live references', async () => {
      const saved = await repo.save(createPlan('A', new Date(), 'p1'));
      saved.name = 'mutated';
      expect((await repo.get('p1'))?.name).toBe('A');
    });

    it('deletes plans and ignores unknown ids', async () => {
      await repo.save(createPlan('A', new Date(), 'p1'));
      await repo.delete('p1');
      await repo.delete('unknown');
      expect(await repo.list()).toEqual([]);
      expect(await repo.get('p1')).toBeUndefined();
    });
  });
}
