import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MapCheckpoint, TrackMapProps } from '../track/TrackMap';
import { renderWithServices } from '../../test/renderWithServices';
import { App } from '../App';
import { localDate } from '../../domain/time/clock';

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

/**
 * Renders the app with the 210 km track. US2/US4 tests check times relative to the start (as defined by the control
 * rules), so they switch the timetable to "Since start"; US6 tests use the default clock times.
 */
async function renderWithTrack({ times = 'elapsed' }: { times?: 'clock' | 'elapsed' } = {}) {
  await renderWithServices(<App />);
  await userEvent.upload(
    screen.getByLabelText('Choose GPX file'),
    new File([gpx], 'line.gpx', { type: 'application/gpx+xml' }),
  );
  await screen.findByRole('heading', { level: 1, name: 'Line 200' });
  if (times === 'elapsed') await userEvent.click(screen.getByRole('radio', { name: 'Since start' }));
}

/** Control, name, km, opens and closes of each table row as text (inputs: their value) */
function table() {
  const text = (cell: Element | null) => cell?.querySelector('input')?.value ?? cell?.textContent!.trim() ?? '';
  return screen.getAllByTestId('checkpoint-row').map((row) => [
    row.querySelector('.control-label')!.textContent!.trim(),
    (row.querySelector('.name-cell input') as HTMLInputElement | null)?.value ?? '',
    text(row.querySelector('td:nth-child(2)')),
    (row.querySelector('input[id$="-open"]') as HTMLInputElement).value,
    (row.querySelector('input[id$="-close"]') as HTMLInputElement).value,
  ]);
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

    expect(table()[1]).toEqual(['CP1', '', '120.0', '3:32', '8:00']);
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
    expect(table()[1]).toEqual(['CP1', '', '30.0', '0:53', '2:30']);

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
      ['CP1', 'Café', '50.0'],
      ['CP2', 'Lakeside', '150.0'],
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
      ['CP1', '', '90.0'],
      ['CP2', 'Bakery', '100.0'],
      ['Finish', '', '210.0'],
    ]);
  });

  it('overrides a control window, flags impossible windows and resets to ACP', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '120{Enter}');

    const closes = screen.getByLabelText('Closing time of CP1, hours after the start');
    await userEvent.clear(closes);
    await userEvent.type(closes, '9h15{Enter}');
    expect(table()[1]).toEqual(['CP1', '', '120.0', '3:32', '9:15']);

    await userEvent.clear(closes);
    await userEvent.type(closes, '2:00{Enter}');
    expect(screen.getByText('Closes before it opens')).toBeInTheDocument();

    await userEvent.clear(closes);
    await userEvent.type(closes, 'soon{Enter}');
    expect(closes).toHaveAccessibleDescription(/as H:MM/);
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: 'Use the ACP times for CP1' }));
    expect(table()[1]).toEqual(['CP1', '', '120.0', '3:32', '8:00']);
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
  /** distance, visible climb/descent and its accessible text per row */
  const segmentColumns = () =>
    screen.getAllByTestId('checkpoint-row').map((row) => {
      const elevation = row.querySelector('[data-testid="segment-climb"]');
      return [
        row.querySelector('[data-testid="segment-distance"]')?.textContent ?? '',
        elevation?.querySelector('[aria-hidden="true"]')!.textContent ?? '',
        elevation?.querySelector('.visually-hidden')!.textContent ?? '',
      ];
    });

  it('shows the segment ending at each control with distance, climb and descent', async () => {
    await renderWithTrack();
    expect(screen.getByRole('columnheader', { name: 'Segment' })).toBeInTheDocument();
    expect(segmentColumns()).toEqual([
      ['', '', ''],
      ['210.0 km', '↑210 ↓0 m', 'climb 210 m, descent 0 m'],
    ]);

    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '60{Enter}');
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '150{Enter}');
    expect(segmentColumns()).toEqual([
      ['', '', ''],
      ['60.0 km', '↑60 ↓0 m', 'climb 60 m, descent 0 m'],
      ['90.0 km', '↑90 ↓0 m', 'climb 90 m, descent 0 m'],
      ['60.0 km', '↑60 ↓0 m', 'climb 60 m, descent 0 m'],
    ]);
  });

  it('lists the segments below the profile and highlights the hovered one', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '60{Enter}');

    const strip = screen.getByRole('list', { name: 'Segments' });
    const chips = screen.getAllByTestId('segment-chip');
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Start → CP1: 60.0 km, climb 60 m, descent 0 m, riding time 2:14',
      'CP1 → Finish: 150.0 km, climb 150 m, descent 0 m, riding time 5:34',
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


describe('Timetable (US4)', () => {
  const cell = (row: number, testId: string) =>
    screen.getAllByTestId('checkpoint-row')[row].querySelector(`[data-testid="${testId}"]`)!.textContent;

  it('estimates the riding time with the plan speed and climb rate', async () => {
    await renderWithTrack();
    // 210 km / 28 km/h = 7:30 + 210 m / 700 m/h = 0:18
    expect(cell(1, 'ride-time')).toBe('7:48');
    expect(cell(1, 'arrival')).toBe('7:48');
    expect(cell(1, 'buffer')).toBe('5:42'); // closes at 13:30
    expect(screen.getByTestId('total-ride')).toHaveTextContent('7:48');
    expect(screen.getByTestId('total-stops')).toHaveTextContent('0:00');
    expect(screen.getByTestId('total-finish')).toHaveTextContent('7:48');
    expect(screen.getByTestId('total-tightest')).toHaveTextContent('5:42 at Finish');
    expect(screen.getByLabelText('Speed (km/h)')).toHaveValue('28');
    expect(screen.getByLabelText('Climb rate (m/h)')).toHaveValue('700');
  });

  it('rests at checkpoints and recalculates when the pace changes', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '100{Enter}');

    expect(screen.getByLabelText('Rest at CP1 in minutes')).toHaveValue('15'); // planning.defaultRestMinutes
    expect(cell(1, 'arrival')).toBe('3:43');
    expect(cell(1, 'departure')).toBe('3:58');
    expect(cell(2, 'arrival')).toBe('8:03');
    expect(screen.getByTestId('total-stops')).toHaveTextContent('0:15');

    const rest = screen.getByLabelText('Rest at CP1 in minutes');
    await userEvent.clear(rest);
    await userEvent.type(rest, '60{Enter}');
    expect(cell(2, 'arrival')).toBe('8:48');

    const speed = screen.getByLabelText('Speed (km/h)');
    await userEvent.clear(speed);
    await userEvent.type(speed, '25{Enter}');
    // 100 km: 4:00 + 0:09, 60 min rest, 110 km: 4:24 + 0:09
    expect(cell(1, 'arrival')).toBe('4:09');
    expect(cell(2, 'arrival')).toBe('9:42');
  });

  it('overrides speed or climb rate for a single segment', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '100{Enter}');

    const speed = screen.getByLabelText('Speed (km/h) to Finish');
    expect(speed).toHaveValue('');
    expect(speed).toHaveAttribute('placeholder', '28');
    await userEvent.type(speed, '20{Enter}');
    expect(speed.parentElement).toHaveClass('is-overridden');
    expect(cell(2, 'ride-time')).toBe('5:39'); // 110 km at 20 km/h + 110 m at 700 m/h
    expect(cell(1, 'ride-time')).toBe('3:43'); // other segments keep the plan values

    await userEvent.clear(speed);
    await userEvent.tab();
    expect(cell(2, 'ride-time')).toBe('4:05');
  });

  it('rejects parameters outside the model range', async () => {
    await renderWithTrack();
    const speed = screen.getByLabelText('Speed (km/h)');
    await userEvent.clear(speed);
    await userEvent.type(speed, '500{Enter}');
    expect(speed).toHaveAccessibleDescription('Enter a value between 1 and 80 km/h');
    expect(cell(1, 'ride-time')).toBe('7:48');

    const rest = screen.getByLabelText('Speed (km/h) to Finish');
    await userEvent.type(rest, '0{Enter}');
    expect(rest).toHaveAccessibleDescription('Enter a value between 1 and 80 km/h');
  });

  it('waits at a control that is not open yet', async () => {
    await renderWithTrack();
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '20{Enter}');
    const speed = screen.getByLabelText('Speed (km/h)');
    await userEvent.clear(speed);
    await userEvent.type(speed, '50{Enter}');
    const rest = screen.getByLabelText('Rest at CP1 in minutes');
    await userEvent.clear(rest);
    await userEvent.type(rest, '0{Enter}');

    // 20 km at 50 km/h + 20 m climb = 0:26, the control opens at 0:35
    expect(cell(1, 'arrival')).toBe('0:26');
    expect(cell(1, 'departure')).toBe('0:35incl. 0:09 wait');
  });
});

describe('Start time (US6)', () => {
  const rows = () => screen.getAllByTestId('checkpoint-row');
  const cell = (row: number, testId: string) => rows()[row].querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
  const windowOf = (row: number) =>
    ['open', 'close'].map((which) => (rows()[row].querySelector(`input[id$="-${which}"]`) as HTMLInputElement).value);
  const setStart = async (date: string, time: string) => {
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: date } });
    const input = screen.getByLabelText('Start time');
    await userEvent.clear(input);
    await userEvent.type(input, `${time}{Enter}`);
  };

  it('shows the timetable as clock times from the default start time', async () => {
    await renderWithTrack({ times: 'clock' });
    expect(screen.getByLabelText('Start time')).toHaveValue('06:00'); // planning.defaultStartTime
    expect(screen.getByLabelText('Start date')).toHaveValue(localDate());
    expect(windowOf(0)).toEqual(['06:00', '07:00']);
    expect(windowOf(1)).toEqual(['11:53', '19:30']); // 5:53 and 13:30 after the start
    expect(cell(1, 'arrival')).toBe('13:48'); // 7:48 riding
    expect(cell(1, 'buffer')).toBe('5:42');
    expect(screen.getByTestId('total-finishAt')).toHaveTextContent('13:48');
    expect(screen.getByTestId('total-finish')).toHaveTextContent('7:48');
  });

  it('recalculates the whole timetable when the start changes, with weekdays across midnight', async () => {
    await renderWithTrack({ times: 'clock' });
    await setStart('2026-11-14', '21:00'); // a Saturday
    expect(windowOf(0)).toEqual(['Sat 21:00', 'Sat 22:00']);
    expect(windowOf(1)).toEqual(['Sun 02:53', 'Sun 10:30']);
    expect(cell(1, 'arrival')).toBe('Sun 04:48');
    expect(screen.getByTestId('total-finishAt')).toHaveTextContent('Sun 04:48');

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-15' } });
    expect(cell(1, 'arrival')).toBe('Mon 04:48');

    // durations don't depend on the start
    expect(cell(1, 'ride-time')).toBe('7:48');
    expect(cell(1, 'buffer')).toBe('5:42');
  });

  it('rejects an invalid start time', async () => {
    await renderWithTrack({ times: 'clock' });
    const input = screen.getByLabelText('Start time');
    await userEvent.clear(input);
    await userEvent.type(input, '25:00{Enter}');
    expect(input).toHaveAccessibleDescription('Enter the start time as HH:MM, e.g. 06:00');
    expect(cell(1, 'arrival')).toBe('13:48');
  });

  it('switches between clock times and times since the start', async () => {
    await renderWithTrack({ times: 'clock' });
    expect(screen.getByRole('radio', { name: 'Clock time' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Since start' }));
    expect(cell(1, 'arrival')).toBe('7:48');
    expect(windowOf(1)).toEqual(['5:53', '13:30']);
    expect(screen.getByTestId('total-finishAt')).toHaveTextContent('13:48'); // always a clock time
  });

  it('enters control windows as clock times, with or without weekday', async () => {
    await renderWithTrack({ times: 'clock' });
    await setStart('2026-11-14', '21:00');
    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '120{Enter}');
    const closes = screen.getByLabelText('Closing time of CP1');
    expect(closes).toHaveValue('Sun 05:00'); // 8:00 after the start

    await userEvent.clear(closes);
    await userEvent.type(closes, '06:30{Enter}'); // the closest 06:30 is on Sunday
    expect(closes).toHaveValue('Sun 06:30');
    expect(closes.parentElement).toHaveClass('is-overridden');

    await userEvent.clear(closes);
    await userEvent.type(closes, 'Sat 23:30{Enter}');
    expect(closes).toHaveValue('Sat 23:30');

    await userEvent.clear(closes);
    await userEvent.type(closes, 'soon{Enter}');
    expect(closes).toHaveAccessibleDescription(
      'Enter a time of day as HH:MM, e.g. 13:30 – add the weekday for another day, e.g. Sun 09:00',
    );
    await userEvent.type(closes, '{Escape}');

    await userEvent.click(screen.getByRole('radio', { name: 'Since start' }));
    expect(screen.getByLabelText('Closing time of CP1, hours after the start')).toHaveValue('2:30');
  });

  it('marks each arrival as OK, Tight, Early or Late – with text, not only colour', async () => {
    await renderWithTrack({ times: 'clock' });
    expect(cell(0, 'status')).toBe(''); // no status for the start
    expect(cell(1, 'status')).toBe('OK'); // finish: 5:42 left

    const tight = screen.getByLabelText('Tight below (min)');
    expect(tight).toHaveValue('75'); // planning.tightBufferMinutes
    await userEvent.clear(tight);
    await userEvent.type(tight, '400{Enter}');
    expect(cell(1, 'status')).toBe('Tight');

    await userEvent.type(screen.getByLabelText('Add checkpoint at km'), '20{Enter}');
    const speed = screen.getByLabelText('Speed (km/h)');
    await userEvent.clear(speed);
    await userEvent.type(speed, '50{Enter}');
    expect(cell(1, 'status')).toBe('Early'); // 20 km in 0:26 – the control opens at 0:35

    const closes = screen.getByLabelText('Closing time of CP1');
    await userEvent.clear(closes);
    await userEvent.type(closes, '06:20{Enter}');
    expect(cell(1, 'status')).toBe('Late');
    expect(rows()[1]).toHaveClass('is-late');
    expect(rows()[1].querySelector('[data-testid="status"]')).toHaveAttribute('title', 'Arrival after the control closes');
    expect(rows()[1].querySelector('[data-testid="status"] svg')).toBeInTheDocument();
  });
});
