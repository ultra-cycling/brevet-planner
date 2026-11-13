import { describe, expect, it } from 'vitest';
import { GpxError, MAX_GPX_BYTES, parseGpx, parseGpxFile } from './gpx';

const gpx11 = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Sample 300</name></metadata>
  <wpt lat="48.05" lon="11.0"><name>Riverside Café</name></wpt>
  <wpt lat="48.10" lon="11.1"></wpt>
  <trk>
    <name>Track name</name>
    <trkseg>
      <trkpt lat="48.0" lon="11.0"><ele>500</ele></trkpt>
      <trkpt lat="48.1" lon="11.0"><ele>560.5</ele></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="48.1" lon="11.2"><ele>520</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const expectCode = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GpxError);
    expect((e as GpxError).code).toBe(code);
    return;
  }
  throw new Error(`expected GpxError ${code}`);
};

describe('parseGpx', () => {
  it('reads all track segments in order, with elevation', () => {
    const track = parseGpx(gpx11);
    expect(track.points.map((p) => [p.lat, p.lon, p.ele])).toEqual([
      [48.0, 11.0, 500],
      [48.1, 11.0, 560.5],
      [48.1, 11.2, 520],
    ]);
    expect(track.distanceKm).toBeGreaterThan(25);
  });

  it('prefers the metadata name, then the track name, then the fallback', () => {
    expect(parseGpx(gpx11).name).toBe('Sample 300');
    expect(parseGpx(gpx11.replace('<metadata><name>Sample 300</name></metadata>', '')).name).toBe('Track name');
    const unnamed = gpx11.replace('<metadata><name>Sample 300</name></metadata>', '').replace('<name>Track name</name>', '');
    expect(parseGpx(unnamed, 'my-file').name).toBe('my-file');
  });

  it('keeps waypoints as checkpoint candidates', () => {
    expect(parseGpx(gpx11).waypoints).toEqual([
      { name: 'Riverside Café', lat: 48.05, lon: 11.0 },
      { name: 'Waypoint 2', lat: 48.1, lon: 11.1 },
    ]);
  });

  it('supports GPX 1.0 routes and points without elevation', () => {
    const gpx10 = `<gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0">
      <rte><name>Route</name><rtept lat="45" lon="7"/><rtept lat="45.1" lon="7"/></rte></gpx>`;
    const track = parseGpx(gpx10);
    expect(track.name).toBe('Route');
    expect(track.points).toHaveLength(2);
    expect(track.points[0].ele).toBeNull();
    expect(track.maxEleM).toBeNull();
  });

  it('rejects files that are not GPX tracks', () => {
    expectCode(() => parseGpx('not xml at all <'), 'notXml');
    expectCode(() => parseGpx('<kml><Placemark/></kml>'), 'notGpx');
    expectCode(() => parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="1"/></trkseg></trk></gpx>'), 'noTrack');
    expectCode(() => parseGpx('<gpx><trk><trkseg><trkpt lat="91" lon="1"/><trkpt lat="1" lon="1"/></trkseg></trk></gpx>'), 'invalidCoordinates');
    expectCode(() => parseGpx('<gpx><trk><trkseg><trkpt lon="1"/><trkpt lat="1" lon="1"/></trkseg></trk></gpx>'), 'invalidCoordinates');
  });
});

describe('parseGpxFile', () => {
  it('uses the file name as fallback name', async () => {
    const xml = '<gpx><trk><trkseg><trkpt lat="1" lon="1"/><trkpt lat="1.1" lon="1"/></trkseg></trk></gpx>';
    const track = await parseGpxFile(new File([xml], 'Paris-Brest.gpx'));
    expect(track.name).toBe('Paris-Brest');
  });

  it('rejects files above the size limit before reading them', async () => {
    const file = new File(['x'], 'huge.gpx');
    Object.defineProperty(file, 'size', { value: MAX_GPX_BYTES + 1 });
    await expect(parseGpxFile(file)).rejects.toMatchObject({ code: 'tooLarge' });
  });
});
