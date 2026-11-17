import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryPlanRepository } from '../storage/InMemoryPlanRepository';
import { lineGpx, planFileFor, samplePlanFiles } from '../test/planFixtures';
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

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('App', () => {
  it('shows the brand, the language selector and the start screen', async () => {
    await renderWithServices(<App />);
    expect(screen.getByRole('link', { name: /brevet planner/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveDisplayValue('English');
    expect(screen.getByRole('heading', { level: 1, name: 'Route plans' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'New plan' })).toBeInTheDocument();
  });

  it('shows the track after uploading a GPX file', async () => {
    await renderWithServices(<App />);
    await userEvent.upload(screen.getByLabelText('Choose GPX file'), gpxFile());

    expect(await screen.findByRole('heading', { level: 1, name: 'Morning loop' })).toBeInTheDocument();
    expect(screen.getByTestId('track-distance')).toHaveTextContent('22.2 km');
    expect(screen.getByTestId('track-climb')).toHaveTextContent('120 m');
    // one line with the key figures, labelled for screen readers (US15)
    expect(screen.getByTestId('track-figures')).toHaveTextContent('Distance 22.2 km · Climb ↑ 120 m');
    expect(screen.getByTestId('track-map')).toHaveTextContent('Morning loop');
    expect(screen.getByRole('slider', { name: 'Elevation profile' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New plan' })).not.toBeInTheDocument();
  });

  it('shows start → finish in the title row and the plan settings collapsed (US15)', async () => {
    await renderWithServices(<App />);
    await userEvent.upload(screen.getByLabelText('Choose GPX file'), gpxFile());
    await screen.findByRole('heading', { level: 1, name: 'Morning loop' });
    expect(screen.getByTestId('plan-schedule')).toHaveTextContent(/^\w{3}, \w{3} \d{1,2} 06:00 → 06:58$/);

    // the toggle carries only its title; the settings (with the brevet distance) are behind it
    const toggle = screen.getByRole('button', { name: 'Plan settings' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const settings = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(settings).toContainElement(screen.getByLabelText('Start time'));
    expect(settings).toContainElement(screen.getByLabelText('Brevet distance (ACP)'));
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // the totals are outside the settings, right above the timetable
    const totals = screen.getByTestId('total-finish').closest('dl')!;
    expect(settings).not.toContainElement(totals);
    expect(totals.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('accepts a file dropped on the start screen', async () => {
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
    expect(screen.getByRole('heading', { name: 'New plan' })).toBeInTheDocument();
  });
});

describe('Route plans (US5)', () => {
  let downloads: { name: string; content: Promise<string> }[];

  beforeEach(() => {
    downloads = [];
    // jsdom has no object URLs and doesn't download – record what would be downloaded
    URL.createObjectURL = vi.fn((blob: Blob) => {
      downloads.push({ name: '', content: blob.text() });
      return `blob:${downloads.length}`;
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.at(-1)!.name = this.download;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const repository = (extra: Record<string, string> = {}) => new InMemoryPlanRepository({ ...samplePlanFiles(), ...extra });
  const renderApp = (planRepository = repository()) => renderWithServices(<App />, { planRepository });
  const openSavedPlan = async () => {
    await userEvent.click(await screen.findByRole('link', { name: /Line 200 – spring/ }));
    return screen.findByRole('heading', { level: 1, name: 'Line 200 – spring' });
  };

  it('lists the saved plans next to the upload, with tracks without plan and broken files', async () => {
    await renderApp(repository({ 'broken.plan.json': '{oops' }));
    const card = await screen.findByRole('link', { name: /Line 200 – spring/ });
    expect(card).toHaveTextContent('Sat, May 1, 2027 · 06:00');
    expect(card).toHaveTextContent('210.0 km · ↑210 m · 1 checkpoint · 200 km brevet');
    expect(card).toHaveAttribute('href', '?plan=line-200');

    const broken = screen.getAllByTestId('plan-card').find((c) => c.textContent?.includes('broken.plan.json'))!;
    expect(within(broken).getByTestId('plan-error')).toHaveTextContent('The file is not valid JSON.');

    const tracks = within(screen.getByRole('region', { name: 'Tracks without plan' }));
    expect(tracks.getByTestId('track-without-plan')).toHaveTextContent('Unplanned routeunplanned.gpx');
  });

  it('shows the distance and time limit of a custom brevet on its card (US16)', async () => {
    const files = samplePlanFiles();
    const plan = { ...JSON.parse(files['line-200.plan.json']), brevetKm: 210, customTimeLimitMin: 12 * 60 };
    await renderApp(new InMemoryPlanRepository({ ...files, 'line-200.plan.json': JSON.stringify(plan) }));
    expect(await screen.findByRole('link', { name: /Line 200 – spring/ })).toHaveTextContent('210 km brevet, limit 12:00');
  });

  it('shows a loading state while the plans are read – valid HTML, no console errors', async () => {
    const errors = vi.spyOn(console, 'error');
    const slow = new InMemoryPlanRepository();
    slow.list = () => new Promise(() => {}); // never answers
    await renderApp(slow);
    expect(screen.getByRole('status')).toHaveTextContent('Loading plans…');
    expect(errors).not.toHaveBeenCalled();
  });

  it('explains how to add plans when the folder is empty', async () => {
    await renderApp(new InMemoryPlanRepository());
    expect(await screen.findByTestId('plans-empty')).toHaveTextContent('No saved plans yet.');
    expect(screen.getByTestId('plans-empty')).toHaveTextContent('public/plans/');
  });

  it('opens a saved plan with all its planning decisions and puts it into the URL', async () => {
    await renderApp();
    await openSavedPlan();
    expect(window.location.search).toBe('?plan=line-200');
    expect(screen.getByLabelText('Name of CP1 Café')).toHaveValue('Café');
    expect(screen.getByLabelText('Rest at CP1 Café in minutes')).toHaveValue('20');
    expect(screen.getByLabelText('Start date')).toHaveValue('2027-05-01');
    expect(screen.getByLabelText('Start time')).toHaveValue('06:00');
    expect(screen.getByLabelText('Time zone')).toHaveValue('Europe/Berlin');
    expect(screen.queryByTestId('unsaved')).not.toBeInTheDocument();
  });

  it('opens the plan of the URL directly, and explains unknown plans', async () => {
    window.history.replaceState(null, '', '/?plan=line-200');
    const { unmount } = await renderApp();
    expect(await screen.findByRole('heading', { level: 1, name: 'Line 200 – spring' })).toBeInTheDocument();
    unmount();

    window.history.replaceState(null, '', '/?plan=missing');
    await renderApp();
    expect(await screen.findByTestId('start-message')).toHaveTextContent('The plan “missing” was not found.');
    expect(window.location.search).toBe('');
  });

  it('starts a new plan from a track without plan', async () => {
    await renderApp();
    await userEvent.click(await screen.findByRole('button', { name: 'Start plan' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Unplanned route' })).toBeInTheDocument();
    expect(screen.getAllByTestId('checkpoint-row')).toHaveLength(2); // start and finish
    expect(screen.getByTestId('unsaved')).toHaveTextContent('Not saved');
    expect(window.location.search).toBe('?new');
  });

  it('downloads a new plan as plan file and offers its track, then shows it as saved', async () => {
    await renderApp();
    await userEvent.upload(await screen.findByLabelText('Choose GPX file'), gpxFile(gpx, 'Morning Loop.gpx'));
    await screen.findByRole('heading', { level: 1, name: 'Morning loop' });
    await userEvent.click(screen.getByRole('button', { name: 'Rename plan' }));
    await userEvent.clear(screen.getByLabelText('Plan name'));
    await userEvent.type(screen.getByLabelText('Plan name'), 'Saturday loop{Enter}');
    expect(screen.getByRole('heading', { level: 1, name: 'Saturday loop' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Download plan' }));
    expect(downloads[0].name).toBe('morning-loop.plan.json');
    const file = JSON.parse(await downloads[0].content);
    expect(file).toMatchObject({ format: 'brevet-planner-plan', name: 'Saturday loop', track: 'Morning Loop.gpx' });
    expect(screen.queryByTestId('unsaved')).not.toBeInTheDocument();

    const dialog = within(screen.getByRole('dialog', { name: 'Plan downloaded' }));
    expect(dialog.getByText('morning-loop.plan.json')).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Download GPX' })); // uploaded: not in the folder yet
    expect(downloads[1].name).toBe('Morning Loop.gpx');
    expect(await downloads[1].content).toBe(gpx);
  });

  it('downloads a saved plan under its file name, without offering the track again', async () => {
    await renderApp();
    await openSavedPlan();
    await userEvent.click(screen.getByRole('button', { name: 'Download plan' }));
    expect(downloads[0].name).toBe('line-200.plan.json');
    expect(screen.getByRole('dialog', { name: 'Plan downloaded' })).not.toHaveTextContent('Download GPX');
  });

  it('asks before leaving a plan with unsaved changes', async () => {
    await renderApp();
    await openSavedPlan();
    const tight = screen.getByLabelText('Tight below (min)');
    await userEvent.clear(tight);
    await userEvent.type(tight, '30{Enter}');
    expect(screen.getByTestId('unsaved')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /switch plan/ }));
    await userEvent.click(screen.getByRole('button', { name: 'All plans' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Unsaved changes' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Stay' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Line 200 – spring' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: /brevet planner/i }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Unsaved changes' })).getByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Route plans' })).toBeInTheDocument();
    expect(downloads).toHaveLength(0);
  });

  it('switches between saved plans with the plan menu', async () => {
    const other = lineGpx('Short line', 60);
    await renderApp(
      repository({
        'short.gpx': other,
        'short.plan.json': JSON.stringify(planFileFor(other, 'short.gpx', { name: 'Short line', checkpointKm: 30 })),
      }),
    );
    await openSavedPlan();
    await userEvent.click(screen.getByRole('button', { name: /switch plan/ }));
    const current = screen.getByRole('button', { name: /Line 200 – spring/, current: true });
    expect(current).toHaveTextContent('210.0 km');
    await userEvent.click(screen.getByRole('button', { name: /^Short line/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Short line' })).toBeInTheDocument();
    expect(window.location.search).toBe('?plan=short');
  });

  it('returns to the start screen with the browser back button', async () => {
    await renderApp();
    await openSavedPlan();
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Route plans' })).toBeInTheDocument();
  });
});

describe('StartupError', () => {
  it('shows the reason why the app could not start', () => {
    render(<StartupError error={new Error('"site.url" must be an http(s) URL')} />);
    expect(screen.getByRole('heading', { name: /could not start/ })).toBeInTheDocument();
    expect(screen.getByText('"site.url" must be an http(s) URL')).toBeInTheDocument();
  });
});
