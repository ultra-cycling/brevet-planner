# Brevet Planner

The application allows to create a time table for long-distance bicycle rides. It provides a frontend where you can
upload a GPX track and divide it into multiple sections for which you can calculate riding times based on estimated
speed and vertical climb.

## Personas

### Long-distance Cyclist

The main persona is a cyclist riding long-distance races. They want to prepare a timetable for a race that divides a
longer track into shorter sections. Often these sections are defined by checkpoints along the route that the cyclist
has to pass.

### App Provider

The App Provider is the operator of the application. Their requirements are around configuration,
deployment and operation of the app.

## User Stories

Each user story is described in its own file in [features/](features), with acceptance criteria and the tests that
verify them. Iterations and architecture: [plan.md](plan.md).

| #   | User story                                                                                       | As a long-distance cyclist I want to …                        | Status    |
|-----|--------------------------------------------------------------------------------------------------|---------------------------------------------------------------|-----------|
| US1 | [Show a track on a map](features/us01-show-track-on-map.md)                                      | upload a track and see it on a map                            | ✅ Done    |
| US2 | [Mark checkpoints along the track](features/us02-mark-checkpoints.md)                            | select POIs along the route to identify the checkpoints       | ✅ Done    |
| US3 | [Create segments from checkpoints](features/us03-segments.md)                                    | divide the route into segments between the checkpoints        | ✅ Done    |
| US4 | [Provide estimated ride times and rest times for segments](features/us04-ride-and-rest-times.md) | provide speed and climb per segment to calculate riding times | ✅ Done    |
| US6 | [Provide start time for each event](features/us06-start-time.md)                                 | calculate the timetable from a start time                     | ✅ Done    |
| US7 | [Overlay for route in map](features/us07-route-overlays.md)                                      | colour the route by e.g. road gradient or daylight            | ✅ Done    |
| US8 | [Show trackpoint tooltip](features/us08-trackpoint-tooltip.md)                                   | see distance and expected times when hovering the route       | Planned   |
| US9 | [Move existing checkpoints](features/us09-move-checkpoints.md)                                   | drag checkpoints along the track on the map and the profile   | ✅ Done  |
| US5 | [Allow storing multiple route plans](features/us05-multiple-route-plans.md)                      | store several plans and switch between them                   | Postponed |

## Cross-functional Requirements

- The UI should provide localization. We start with English, further languages should be added later
- The design should be responsive. Primary device should be desktop browser and tablet. A simple timetable should be
  renderable on a smartphone

## Technology

### Frontend

- Use reactJS for the frontend
- Use Bootstrap for CSS

### Maps

- Use OpenStreet map cycling cards for the rendering of the maps

### In-browser local storage

- use the in-browser local storage to store route planning
- prepare for storing data in a server backend later on
- abstract storage so that storage backend is replaceable

### Deployment

- Application should be deployed as a GitHub page
- Create GitHub workflows to build and test the application and to deploy it as a GitHub page

## Testing

- All features should be testable with browser tests and unit tests

## Terminology

| Term            | Meaning                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Track           | A GPX track that defines the route for the race                              |
| Checkpoint (CP) | A mandatory intermediate stop along the route that a cyclist has to pass     |
| Segment         | A part of the track that describes the route from one checkpoint to the next |
| POI             | Point of interest - a GPS point along the route                              |
