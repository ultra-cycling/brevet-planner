// Generates the synthetic GPX fixture used by the browser tests (deterministic, no real route data).
// Usage: node tooling/generate-sample-gpx.ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../e2e/fixtures/sample-loop.gpx', import.meta.url));
const POINTS = 1200;
const CENTER = { lat: 48.1, lon: 11.3 };
const RADIUS_KM = 16;
const KM_PER_DEG_LAT = 111.2;
const KM_PER_DEG_LON = KM_PER_DEG_LAT * Math.cos((CENTER.lat * Math.PI) / 180);

const round = (v: number, digits: number) => Number(v.toFixed(digits));

const points = Array.from({ length: POINTS + 1 }, (_, i) => {
  const theta = (i / POINTS) * 2 * Math.PI;
  // slightly wobbly loop so the line isn't a perfect circle
  const r = RADIUS_KM * (1 + 0.08 * Math.sin(5 * theta));
  return {
    lat: round(CENTER.lat + (r * Math.sin(theta)) / KM_PER_DEG_LAT, 6),
    lon: round(CENTER.lon + (r * Math.cos(theta)) / KM_PER_DEG_LON, 6),
    ele: round(600 + 180 * Math.sin(3 * theta) + 60 * Math.sin(11 * theta), 1),
  };
});

const waypoints = [
  { name: 'Riverside Café', index: 300 },
  { name: 'Mountain Pass', index: 600 },
  { name: 'Lakeside Station', index: 900 },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="brevet-planner test fixture" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Sample loop</name></metadata>
${waypoints.map((w) => `  <wpt lat="${points[w.index].lat}" lon="${points[w.index].lon}"><name>${w.name}</name></wpt>`).join('\n')}
  <trk>
    <name>Sample loop</name>
    <trkseg>
${points.map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele></trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>
`;

writeFileSync(OUT, xml);
console.log(`Wrote ${OUT} (${points.length} points)`);
