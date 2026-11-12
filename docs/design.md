# Brevet Planner

The application allows to create a time table for long-distance bicycle rides. It provides a frontend where you can
upload a GPX track and divide it into multiple sections for which you can calculate riding times based on estimated
speed and vertical climb.

## Personas

### Long-distance Cyclist

The main persona is a cyclist riding long-distance races. They want to prepare a timetable for a race that divides a
longer track into shorter sections. Often these sections are defined by checkpoints along the route that the cyclist
has to pass.

## User Stories

### User Story 1 - Show a track on a map

As a long-distance cyclist
I want to upload a track to the application
So that I can see it on a map in the browser

### User Story 2 - Mark Checkpoints along the track

As a long-distance cyclist
I want to select POIs along the route
So that I can identify the checkpoints along the track

### User Story 3 - Create segments from Checkpoints

As a long-distance cyclist
I want to create segments of the route from the checkpoints marked along the route
So that I can divide the route into multiple segments

### User Story 4 - Provide estimated ride times and rest times for segments

As a long-distance cyclist
I want to provide an estimated average speed and vertical climb per segment
So that I can calculate estimated riding time per segment

### User Story 5 - Allow storing multiple route plans

As a long distance cyclist
I want to store multiple route plans in the app
So that I can manage more than 1 track and switch between them

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
