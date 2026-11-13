import { buildTrack, type RawPoint, type Track, type Waypoint } from './track';

export const MAX_GPX_BYTES = 50 * 1024 * 1024;

export type GpxErrorCode = 'tooLarge' | 'notXml' | 'notGpx' | 'noTrack' | 'invalidCoordinates';

/** Parsing error with a code that the UI translates. */
export class GpxError extends Error {
  constructor(
    readonly code: GpxErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'GpxError';
  }
}

// GPX 1.0 and 1.1 use different namespaces – match on local names only.
const all = (parent: Document | Element, name: string) => Array.from(parent.getElementsByTagNameNS('*', name));

function childText(element: Element, name: string): string | null {
  for (const child of Array.from(element.children)) {
    if (child.localName === name) return child.textContent?.trim() || null;
  }
  return null;
}

function parsePoint(element: Element): RawPoint {
  const lat = Number(element.getAttribute('lat'));
  const lon = Number(element.getAttribute('lon'));
  if (
    element.getAttribute('lat') === null ||
    element.getAttribute('lon') === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    throw new GpxError('invalidCoordinates', `Invalid coordinates: lat="${element.getAttribute('lat')}" lon="${element.getAttribute('lon')}"`);
  }
  const eleText = childText(element, 'ele');
  const ele = eleText === null ? null : Number(eleText);
  return { lat, lon, ele: ele !== null && Number.isFinite(ele) ? ele : null };
}

/**
 * Parses a GPX document into a Track.
 * Uses all track points (`<trkpt>`, all tracks and segments in order); falls back to route points (`<rtept>`).
 * Waypoints (`<wpt>`) are kept as checkpoint candidates.
 */
export function parseGpx(xml: string, fallbackName = 'Track'): Track {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new GpxError('notXml');
  if (doc.documentElement.localName !== 'gpx') throw new GpxError('notGpx');

  let pointElements = all(doc, 'trkpt');
  if (pointElements.length === 0) pointElements = all(doc, 'rtept');
  if (pointElements.length < 2) throw new GpxError('noTrack');

  const raw = pointElements.map(parsePoint);

  const waypoints: Waypoint[] = all(doc, 'wpt').map((element, i) => {
    const { lat, lon } = parsePoint(element);
    return { name: childText(element, 'name') ?? `Waypoint ${i + 1}`, lat, lon };
  });

  const metadata = all(doc, 'metadata')[0];
  const firstTrack = all(doc, 'trk')[0] ?? all(doc, 'rte')[0];
  const name =
    (metadata && childText(metadata, 'name')) ?? (firstTrack && childText(firstTrack, 'name')) ?? fallbackName;

  return buildTrack(name, raw, waypoints);
}

/** Reads and parses a GPX file chosen by the user. */
export async function parseGpxFile(file: File): Promise<Track> {
  if (file.size > MAX_GPX_BYTES) throw new GpxError('tooLarge');
  const fallbackName = file.name.replace(/\.gpx$/i, '') || 'Track';
  return parseGpx(await file.text(), fallbackName);
}
