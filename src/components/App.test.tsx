import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithServices } from '../test/renderWithServices';
import { App } from './App';
import { StartupError } from './StartupError';

// Leaflet needs a real layout engine – the map is covered by the browser tests.
vi.mock('./track/TrackMap', () => ({
  TrackMap: ({ track }: { track: { name: string } }) => <div data-testid="track-map">{track.name}</div>,
}));

const gpx = `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Morning loop</name><trkseg>
    <trkpt lat="48.0" lon="11.0"><ele>500</ele></trkpt>
    <trkpt lat="48.1" lon="11.0"><ele>620</ele></trkpt>
    <trkpt lat="48.2" lon="11.0"><ele>540</ele></trkpt>
  </trkseg></trk></gpx>`;

const gpxFile = (content = gpx, name = 'loop.gpx') => new File([content], name, { type: 'application/gpx+xml' });

describe('App', () => {
  it('shows the brand, language selector and empty state', async () => {
    await renderWithServices(<App />);
    expect(screen.getByRole('link', { name: /brevet planner/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveDisplayValue('English');
    expect(screen.getByRole('heading', { level: 1, name: 'No track yet' })).toBeInTheDocument();
  });

  it('shows the track after uploading a GPX file', async () => {
    await renderWithServices(<App />);
    await userEvent.upload(screen.getByLabelText('Choose GPX file'), gpxFile());

    expect(await screen.findByRole('heading', { level: 1, name: 'Morning loop' })).toBeInTheDocument();
    expect(screen.getByTestId('track-distance')).toHaveTextContent('22.2 km');
    expect(screen.getByTestId('track-climb')).toHaveTextContent('120 m');
    expect(screen.getByTestId('track-descent')).toHaveTextContent('80 m');
    expect(screen.getByTestId('track-maxElevation')).toHaveTextContent('620 m');
    expect(screen.getByTestId('track-map')).toHaveTextContent('Morning loop');
    expect(screen.getByRole('slider', { name: 'Elevation profile' })).toBeInTheDocument();
    expect(screen.queryByText('No track yet')).not.toBeInTheDocument();
  });

  it('replaces the track when another file is uploaded from the header', async () => {
    await renderWithServices(<App />);
    await userEvent.upload(screen.getByLabelText('Choose GPX file'), gpxFile());
    await screen.findByRole('heading', { name: 'Morning loop' });

    await userEvent.upload(screen.getByLabelText('Upload GPX'), gpxFile(gpx.replace('Morning loop', 'Evening loop')));
    expect(await screen.findByRole('heading', { level: 1, name: 'Evening loop' })).toBeInTheDocument();
  });

  it('accepts a file dropped on the empty state', async () => {
    await renderWithServices(<App />);
    fireEvent.drop(screen.getByTestId('gpx-drop-zone'), { dataTransfer: { files: [gpxFile()] } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Morning loop' })).toBeInTheDocument();
  });

  it.each([
    ['a file without .gpx extension', gpxFile(gpx, 'loop.txt'), 'extension .gpx'],
    ['an invalid GPX file', gpxFile('<html></html>'), 'not a GPX file'],
    ['a GPX without track', gpxFile('<gpx></gpx>'), 'no track or route'],
  ])('shows an error for %s', async (_, file, message) => {
    await renderWithServices(<App />);
    await userEvent.upload(screen.getByLabelText('Choose GPX file'), file, { applyAccept: false });
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByText('No track yet')).toBeInTheDocument();
  });
});

describe('StartupError', () => {
  it('shows the reason why the app could not start', () => {
    render(<StartupError error={new Error('"site.url" must be an http(s) URL')} />);
    expect(screen.getByRole('heading', { name: /could not start/ })).toBeInTheDocument();
    expect(screen.getByText('"site.url" must be an http(s) URL')).toBeInTheDocument();
  });
});
