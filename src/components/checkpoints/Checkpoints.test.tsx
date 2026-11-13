import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MapCheckpoint, TrackMapProps } from '../track/TrackMap';
import { renderWithServices } from '../../test/renderWithServices';
import { App } from '../App';

// Leaflet needs a real layout engine – the stub lists the markers and simulates a click on the track.
vi.mock('../track/TrackMap', () => ({
  TrackMap: ({ checkpoints = [], onTrackClick, onCheckpointClick, highlightPath }: TrackMapProps) => (
    <div data-testid="track-map" data-highlight-points={highlightPath?.length}>
      <button type="button" onClick={() => onTrackClick?.(45 + 30 * DEG_PER_KM, 7.001)}>
        click track at km 30
      </button>
      {checkpoints.map((cp: MapCheckpoint) => (
        <button key={cp.id} type="button" data-testid="map-checkpoint" onClick={() => onCheckpointClick?.(cp.id)}>
          {cp.label}
        </button>
      ))}
    </div>
  ),
}));

const DEG_PER_KM = 0.008993;

// 210 km straight north (one point per km) with three waypoints: near km 50, far off the track, near km 150
const gpx = `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="${45 + 150 * DEG_PER_KM}" lon="7.0005"><name>Lakeside</name></wpt>
  <wpt lat="${45 + 50 * DEG_PER_KM}" lon="7.001"><name>Café</name></wpt>
  <wpt lat="${45 + 80 * DEG_PER_KM}" lon="7.2"><name>Hotel</name></wpt>
  <trk><name>Line 200</name><trkseg>
  ${Array.from({ length: 211 }, (_, i) => `<trkpt lat="${45 + i * DEG_PER_KM}" lon="7"><ele>${300 + i}</ele></trkpt>`).join('')}
  </trkseg></trk></gpx>`;

async function renderWithTrack() {
  await renderWithServices(<App />);
  await userEvent.upload(
    screen.getByLabelText('Choose GPX file'),
    new File([gpx], 'line.gpx', { type: 'application/gpx+xml' }),
  );
  await screen.findByRole('heading', { level: 1, name: 'Line 200' });
}

/** Cells of the checkpoint table as text (inputs: their value) */
function table() {
  return screen.getAllByTestId('checkpoint-row').map((row) =>
    [...row.querySelectorAll('th, td:not(.segment-col)')]
      .slice(0, 5)
      .map((cell) => cell.querySelector('input')?.value ?? cell.textContent!.trim()),
  );
}

describe('Checkpoints (US2)', () => {
  it('starts with start and finish and the ACP windows of the detected brevet', async () => {
    await renderWithTrack();
    expect(screen.getByRole('combobox', { name: 'Brevet distance (ACP)' })).toHaveDisplayValue('200 km – limit 13:30');
    expect(table()).toEqual([
      ['Start', '', '0.0', '0:00', '1:00'],
      ['Finish', '', '210.0', '5:53', '13:30'],
    ]);
  });

  it('adds a checkpoint at an entered distance', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '120{Enter}');

    expect(table()[1]).toEqual(['1 CP1', '', '120.0', '3:32', '8:00']);
    expect(screen.getByTestId('announcement')).toHaveTextContent('CP1 added at 120.0 km');
    expect(screen.getByTestId('map-checkpoint')).toHaveTextContent('CP1 · 120.0 km');
    expect(screen.getByTestId('profile-checkpoint')).toHaveTextContent('1');
  });

  it.each([
    ['0', 'between 0 and 210.0 km'],
    ['300', 'between 0 and 210.0 km'],
    ['abc', 'between 0 and 210.0 km'],
  ])('rejects the distance %j', async (km, message) => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), `${km}{Enter}`);
    expect(screen.getByLabelText('Add checkpoint at km')).toHaveAccessibleDescription(new RegExp(message));
    expect(table()).toHaveLength(2);
  });

  it('adds a checkpoint where the track is clicked, but not twice at the same place', async () => {
    await renderWithTrack();
    await userEvent.click(screen.getByRole('button', { name: 'click track at km 30' }));
    expect(table()[1]).toEqual(['1 CP1', '', '30.0', '0:53', '2:30']);

    await userEvent.click(screen.getByRole('button', { name: 'click track at km 30' }));
    expect(table()).toHaveLength(3);
    expect(screen.getByTestId('announcement')).toHaveTextContent('already is a checkpoint');
  });

  it('imports GPX waypoints near the track', async () => {
    await renderWithTrack();
    await userEvent.click(screen.getByRole('button', { name: 'Import 3 GPX waypoints' }));

    expect(screen.getByText(/Added 2 checkpoints.*1 waypoint is more than 1 km from the track and was skipped: Hotel/)).toBeInTheDocument();
    expect(table().map((row) => [row[0], row[1], row[2]])).toEqual([
      ['Start', '', '0.0'],
      ['1 CP1', 'Café', '50.0'],
      ['2 CP2', 'Lakeside', '150.0'],
      ['Finish', '', '210.0'],
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Import 3 GPX waypoints' }));
    expect(screen.getByText(/Added 0 checkpoints.*2 waypoints already had a checkpoint/)).toBeInTheDocument();
  });

  it('renames and moves a checkpoint and keeps the order', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '40{Enter}');
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '90{Enter}');

    await userEvent.type(screen.getByLabelText('Name of CP1'), 'Bakery{Enter}');
    const km = screen.getByLabelText('Distance of CP1 Bakery in km');
    await userEvent.clear(km);
    await userEvent.type(km, '100{Enter}');

    expect(table().map((row) => row.slice(0, 3))).toEqual([
      ['Start', '', '0.0'],
      ['1 CP1', '', '90.0'],
      ['2 CP2', 'Bakery', '100.0'],
      ['Finish', '', '210.0'],
    ]);
  });

  it('overrides a control window, flags impossible windows and resets to ACP', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '120{Enter}');

    const closes = screen.getByLabelText('Closing time of CP1, hours after the start');
    await userEvent.clear(closes);
    await userEvent.type(closes, '9h15{Enter}');
    expect(table()[1]).toEqual(['1 CP1', '', '120.0', '3:32', '9:15']);

    await userEvent.clear(closes);
    await userEvent.type(closes, '2:00{Enter}');
    expect(screen.getByText('Closes before it opens')).toBeInTheDocument();

    await userEvent.clear(closes);
    await userEvent.type(closes, 'soon{Enter}');
    expect(closes).toHaveAccessibleDescription(/as H:MM/);
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: 'Use the ACP times for CP1' }));
    expect(table()[1]).toEqual(['1 CP1', '', '120.0', '3:32', '8:00']);
    expect(screen.queryByRole('button', { name: /Use the ACP times/ })).not.toBeInTheDocument();
  });

  it('removes a checkpoint and recomputes windows for another brevet distance', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '120{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Remove CP1' }));
    expect(table()).toHaveLength(2);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Brevet distance/ }), 'No fixed time limit');
    expect(table()[1]).toEqual(['Finish', '', '210.0', '6:12', '14:00']);
  });

  it('focuses the name of a checkpoint when its map marker is clicked', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '120{Enter}');
    await userEvent.click(screen.getByTestId('map-checkpoint'));
    expect(screen.getByLabelText('Name of CP1')).toHaveFocus();
  });
});

describe('Segments (US3)', () => {
  const segmentColumns = () =>
    screen.getAllByTestId('checkpoint-row').map((row) => [
      row.querySelector('[data-testid="segment-distance"]')!.textContent,
      row.querySelector('[data-testid="segment-climb"]')!.textContent,
    ]);

  it('shows the segment ending at each control with distance and climb', async () => {
    await renderWithTrack();
    expect(segmentColumns()).toEqual([
      ['', ''],
      ['210.0', '210 m'],
    ]);

    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '60{Enter}');
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '150{Enter}');
    expect(segmentColumns()).toEqual([
      ['', ''],
      ['60.0', '60 m'],
      ['90.0', '90 m'],
      ['60.0', '60 m'],
    ]);
  });

  it('lists the segments below the profile and highlights the hovered one', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '60{Enter}');

    const strip = screen.getByRole('list', { name: 'Segments' });
    const chips = screen.getAllByTestId('segment-chip');
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Start → CP1: 60.0 km, climb 60 m, descent 0 m',
      'CP1 → Finish: 150.0 km, climb 150 m, descent 0 m',
    ]);
    expect(parseFloat((chips[0].parentElement as HTMLElement).style.width)).toBeCloseTo((60 / 210) * 100, 0);
    expect(strip).toBeInTheDocument();

    await userEvent.hover(chips[1]);
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('profile-range').style.left).toMatch(/^28\.5/);
    expect(screen.getAllByTestId('checkpoint-row')[2]).toHaveClass('is-active-segment');
    expect(screen.getByTestId('track-map')).toHaveAttribute('data-highlight-points');

    await userEvent.unhover(strip);
    expect(screen.queryByTestId('profile-range')).not.toBeInTheDocument();
  });

  it('highlights a segment when hovering its table row', async () => {
    await renderWithTrack();
    await userEvent.hover(screen.getAllByTestId('checkpoint-row')[1]);
    expect(screen.getByTestId('segment-chip')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('profile-range')).toBeInTheDocument();
  });
});

