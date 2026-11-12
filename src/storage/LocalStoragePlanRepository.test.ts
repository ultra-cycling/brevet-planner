import { describe, expect, it } from 'vitest';
import { createPlan } from '../domain/plan';
import { LocalStoragePlanRepository } from './LocalStoragePlanRepository';
import { describePlanRepositoryContract } from './planRepositoryContract';

describePlanRepositoryContract('LocalStoragePlanRepository', () => new LocalStoragePlanRepository(localStorage, 'test'));

describe('LocalStoragePlanRepository', () => {
  it('lists the most recently updated plan first', async () => {
    let clock = Date.parse('2026-01-01T00:00:00Z');
    const repo = new LocalStoragePlanRepository(localStorage, 'test', () => new Date((clock += 1000)));
    await repo.save(createPlan('first', new Date(), 'a'));
    await repo.save(createPlan('second', new Date(), 'b'));
    expect((await repo.list()).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('survives a corrupted index', async () => {
    localStorage.setItem('test:index', '{not json');
    expect(await new LocalStoragePlanRepository(localStorage, 'test').list()).toEqual([]);
  });

  it('keeps plans of different prefixes apart', async () => {
    await new LocalStoragePlanRepository(localStorage, 'one').save(createPlan('A', new Date(), 'p1'));
    expect(await new LocalStoragePlanRepository(localStorage, 'two').list()).toEqual([]);
  });
});
