import { describe, expect, it, vi } from 'vitest';
import { samplePlanFiles } from '../test/planFixtures';
import { InMemoryPlanRepository } from './InMemoryPlanRepository';
import { describePlanRepositoryContract } from './planRepositoryContract';
import { buildPlansIndex } from './plansIndex';
import { StaticFilePlanRepository } from './StaticFilePlanRepository';

/** A fetch that serves a plans folder like the static host does (index.json generated like in the build) */
function folderFetch(files: Record<string, string>, base = '/brevet-planner/plans/') {
  const served: Record<string, string> = { ...files };
  if (Object.keys(files).length > 0) {
    served['index.json'] = JSON.stringify(buildPlansIndex(Object.entries(files).map(([name, content]) => ({ name, content }))));
  }
  return vi.fn(async (url: string | URL | Request) => {
    const path = decodeURIComponent(String(url));
    const file = path.startsWith(base) ? path.slice(base.length) : null;
    return file !== null && file in served ? new Response(served[file]) : new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

describePlanRepositoryContract('InMemoryPlanRepository', (files) => new InMemoryPlanRepository(files));
describePlanRepositoryContract(
  'StaticFilePlanRepository',
  (files) => new StaticFilePlanRepository('/brevet-planner/plans/', folderFetch(files)),
);

describe('StaticFilePlanRepository', () => {
  it('reads from the plans folder below the base path and revalidates the files', async () => {
    const fetchFn = folderFetch(samplePlanFiles());
    await new StaticFilePlanRepository('/brevet-planner/plans/', fetchFn).load('line-200');
    expect(fetchFn).toHaveBeenCalledWith('/brevet-planner/plans/line-200.plan.json', { cache: 'no-cache' });
    expect(fetchFn).toHaveBeenCalledWith('/brevet-planner/plans/line-200.gpx', { cache: 'no-cache' });
  });

  it('treats an HTML page answered for a plan file as not found (single-page-app fallback)', async () => {
    const fallback = vi.fn(
      async () => new Response('<!doctype html><title>Brevet Planner</title>', { headers: { 'Content-Type': 'text/html' } }),
    ) as unknown as typeof fetch;
    await expect(new StaticFilePlanRepository('/plans/', fallback).load('missing')).rejects.toMatchObject({ code: 'notFound' });
    expect(await new StaticFilePlanRepository('/plans/', fallback).list()).toEqual({ plans: [], tracks: [] });
  });

  it('reports an unreachable folder as unavailable', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(new StaticFilePlanRepository('/plans/', offline).list()).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('reports a damaged index as unavailable', async () => {
    const damaged = vi.fn(async () => new Response('{oops')) as unknown as typeof fetch;
    await expect(new StaticFilePlanRepository('/plans/', damaged).list()).rejects.toMatchObject({ code: 'unavailable' });
  });
});
