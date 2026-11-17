import { parsePlanFile, PLAN_FILE_SUFFIX } from '../domain/planFile.ts';
import type { PlansIndex } from './plansIndexFormat.ts';

export interface FolderFile {
  name: string;
  content: string;
}

export const GPX_SUFFIX = '.gpx';

/**
 * Name of a GPX track without parsing the whole file – the same order as `parseGpx`: metadata name, else the name of
 * the first track or route.
 */
function gpxName(content: string): string | null {
  const match =
    /<metadata>[\s\S]*?<name>([^<]*)<\/name>/.exec(content) ?? /<(?:trk|rte)\b[^>]*>[\s\S]*?<name>([^<]*)<\/name>/.exec(content);
  return match ? match[1].trim() || null : null;
}

/**
 * Index of a plans folder (US5): plans (`<id>.plan.json`) with their key figures, GPX tracks that no plan uses, and
 * plans that can't be opened (invalid file, missing track) with the reason.
 */
export function buildPlansIndex(files: readonly FolderFile[]): PlansIndex {
  const gpx = new Map(files.filter((f) => f.name.toLowerCase().endsWith(GPX_SUFFIX)).map((f) => [f.name, f]));
  const used = new Set<string>();
  const index: PlansIndex = { plans: [], tracks: [] };

  for (const file of files.filter((f) => f.name.endsWith(PLAN_FILE_SUFFIX))) {
    const id = file.name.slice(0, -PLAN_FILE_SUFFIX.length);
    try {
      const plan = parsePlanFile(file.content);
      used.add(plan.track);
      index.plans.push({
        id,
        file: file.name,
        name: plan.name,
        track: plan.track,
        summary: plan.summary,
        brevetKm: plan.brevetKm,
        ...(plan.customTimeLimitMin !== null ? { customTimeLimitMin: plan.customTimeLimitMin } : {}),
        start: plan.start,
        updatedAt: plan.updatedAt,
        ...(gpx.has(plan.track) ? {} : { error: `The track ${plan.track} is missing in the plans folder.` }),
      });
    } catch (error) {
      index.plans.push({ id, file: file.name, name: id, error: (error as Error).message });
    }
  }

  for (const [name, file] of gpx) {
    if (!used.has(name)) index.tracks.push({ file: name, name: gpxName(file.content) ?? name.slice(0, -GPX_SUFFIX.length) });
  }
  index.plans.sort((a, b) => a.id.localeCompare(b.id));
  index.tracks.sort((a, b) => a.file.localeCompare(b.file));
  return index;
}
