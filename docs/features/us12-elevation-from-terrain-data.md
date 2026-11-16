# US12 – Realistic climb from terrain data

| Status  | Iteration               | Persona               |
|---------|-------------------------|-----------------------|
| Backlog | [–](../plan.md#backlog) | Long-distance cyclist |

As a long distance cyclist
I want the elevation and the climb of my route to be calculated from terrain data of the map (a digital elevation
model) instead of only the elevations stored in the GPX file
So that climb, riding times and the elevation profile are realistic and comparable to other route planners

## Current behaviour

- Elevations come only from the `<ele>` values of the GPX file; points without `<ele>` are skipped.
- The climb is summed with a 5 m hysteresis (`cumulativeAscentDescent` in `src/domain/track/geo.ts`): a change only
  counts once it is at least 5 m away from the last counted elevation. This suppresses GPS noise in *recorded*
  tracks, but on *planned* tracks with smooth elevations it also drops every real roller smaller than 5 m.
- Observation: a 300 km sample track shows 740 m climb in the app, other route planners show about 1400 m.
  Possible causes, to be confirmed with that file: elevations in the GPX are missing, sparse or coarse (e.g. only
  every few hundred metres or rounded), and/or the hysteresis removes many small climbs.

The climb feeds the riding time (time model: climb / climb rate), the segment climb, the gradient overlay and the
position tooltip – so the error propagates into the whole timetable.

## Acceptance criteria

Proposed – refined at the start of the iteration (see open questions).

| #    | Criterion                                                                                                                                                                                       | Verified by |
|------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| 12.1 | After uploading a track, elevations are looked up from a digital elevation model along the track at a regular spacing (e.g. every 25 m), in the browser, without a server of our own.           | *proposed*  |
| 12.2 | The total climb of the reference track(s) is within ±10 % of the value of the reference route planner (300 km sample: ~1400 m).                                                                 | *proposed*  |
| 12.3 | The climb calculation is tuned for the elevation source (smoothing/threshold suited to terrain data); climb, descent, segments, riding times, profile and overlays all use the same elevations. | *proposed*  |
| 12.4 | The summary shows which elevation source is used (terrain data or GPX); the rider can switch to the GPX elevations, e.g. for a track recorded with a barometric altimeter.                      | *proposed*  |
| 12.5 | If the terrain data can't be loaded (offline, service down), the app falls back to the GPX elevations and says so; planning remains possible.                                                   | *proposed*  |
| 12.6 | The elevation source (tile URL / service) and the climb threshold are configurable in `config.yaml`.                                                                                            | *proposed*  |

## Open questions

- **Reference values:** please add the 300 km sample GPX to the repository as a test fixture (if it may be
  published) and name the planner(s) that show ~1400 m – planners differ among themselves by 10–15 %.
- **Data source:** terrain tiles (e.g. the free "Terrarium"/Terrain-RGB elevation tiles, loaded like map tiles,
  ~30 m resolution) or an elevation API (e.g. OpenTopoData)? Tiles need no API key and reveal no more than the map
  tiles do; an API receives the whole track and has rate limits.
- Should the GPX elevations stay the default for recorded tracks (detected e.g. by `<time>` elements)?

## Implementation notes (proposal)

- New domain step between parsing and `buildTrack`: resample the track at a fixed spacing, look up the elevation
  per sample (bilinear interpolation in the DEM tile), then compute climb with a source-specific threshold.
- Keep the lookup behind an interface (`ElevationSource`) like time models and overlays, so sources can be swapped
  and tests can use a fake source.
