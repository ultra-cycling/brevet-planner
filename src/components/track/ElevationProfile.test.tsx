import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildTrack } from '../../domain/track/track';
import { renderWithServices } from '../../test/renderWithServices';
import { ElevationProfile } from './ElevationProfile';

// 101 points, 1 km apart (0.009° latitude ≈ 1 km), elevation rising 10 m per km
const track = buildTrack(
  'Test',
  Array.from({ length: 101 }, (_, i) => ({ lat: 48 + i * 0.008993, lon: 11, ele: 400 + i * 10 })),
);

function Controlled() {
  const [index, setIndex] = useState<number | null>(null);
  return <ElevationProfile track={track} activeIndex={index} onActiveIndexChange={setIndex} />;
}

describe('ElevationProfile', () => {
  it('shows a hint until a position is selected', async () => {
    await renderWithServices(<Controlled />);
    expect(screen.getByTestId('profile-readout')).toHaveTextContent('Point at the profile');
    expect(screen.queryByTestId('profile-cursor')).not.toBeInTheDocument();
  });

  it('can be operated with the keyboard', async () => {
    await renderWithServices(<Controlled />);
    const slider = screen.getByRole('slider', { name: 'Elevation profile' });
    slider.focus();

    await userEvent.keyboard('{End}');
    expect(slider).toHaveAttribute('aria-valuetext', '100.0 km · 1,400 m');

    await userEvent.keyboard('{Home}{Shift>}{ArrowRight}{/Shift}');
    expect(slider).toHaveAttribute('aria-valuenow', '10');
    expect(parseFloat(screen.getByTestId('profile-cursor').style.left)).toBeCloseTo(10, 6);
  });

  it('maps the pointer position to the nearest track point', async () => {
    const onChange = vi.fn();
    await renderWithServices(<ElevationProfile track={track} activeIndex={null} onActiveIndexChange={onChange} />);
    const slider = screen.getByRole('slider');
    slider.getBoundingClientRect = () => ({ left: 100, width: 400, top: 0, height: 140, right: 500, bottom: 140, x: 100, y: 0, toJSON: () => ({}) });

    fireEvent.pointerMove(slider, { clientX: 300 }); // half way → km 50
    expect(onChange).toHaveBeenLastCalledWith(50);
    fireEvent.pointerLeave(slider);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('picks the clicked position and the cursor position on Enter', async () => {
    const onPick = vi.fn();
    await renderWithServices(
      <ElevationProfile track={track} activeIndex={20} onActiveIndexChange={() => {}} onPick={onPick} />,
    );
    const slider = screen.getByRole('slider');
    slider.getBoundingClientRect = () => ({ left: 100, width: 400, top: 0, height: 140, right: 500, bottom: 140, x: 100, y: 0, toJSON: () => ({}) });

    fireEvent.click(slider, { clientX: 400 }); // three quarters → km 75
    expect(onPick.mock.lastCall![0]).toBeCloseTo(75, 1);

    slider.focus();
    await userEvent.keyboard('{Enter}');
    expect(onPick.mock.lastCall![0]).toBeCloseTo(20, 1);
    expect(slider).toHaveAttribute('aria-valuetext', '20.0 km · 600 m');
  });

  it('shows checkpoints as numbered lines', async () => {
    await renderWithServices(
      <ElevationProfile
        track={track}
        activeIndex={null}
        onActiveIndexChange={() => {}}
        checkpoints={[{ id: 'a', distanceKm: 25, label: 'CP1 Café · 25.0 km', tag: '1' }]}
      />,
    );
    const line = screen.getByTestId('profile-checkpoint');
    expect(line).toHaveTextContent('1');
    expect(line).toHaveAttribute('title', 'CP1 Café · 25.0 km');
    expect(parseFloat(line.style.left)).toBeCloseTo(25, 2);
  });

  it('explains when the track has no elevation', async () => {
    const flat = buildTrack('Flat', [
      { lat: 48, lon: 11, ele: null },
      { lat: 48.1, lon: 11, ele: null },
    ]);
    await renderWithServices(<ElevationProfile track={flat} activeIndex={null} onActiveIndexChange={() => {}} />);
    expect(screen.getByText(/no elevation data/)).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('ElevationProfile – moving checkpoints (US9)', () => {
  const RECT = { left: 100, width: 400, top: 0, height: 140, right: 500, bottom: 140, x: 100, y: 0, toJSON: () => ({}) };
  const checkpoints = [{ id: 'cp1', distanceKm: 20, label: 'CP1 · 20.0 km', tag: '1' }];

  async function renderProfile(props: Partial<Parameters<typeof ElevationProfile>[0]> = {}) {
    const onMove = vi.fn(() => true);
    const onPick = vi.fn();
    await renderWithServices(
      <ElevationProfile
        track={track}
        activeIndex={null}
        onActiveIndexChange={() => {}}
        checkpoints={checkpoints}
        onPick={onPick}
        onCheckpointMove={onMove}
        {...props}
      />,
    );
    screen.getByRole('slider').getBoundingClientRect = () => RECT;
    return { onMove, onPick, handle: screen.getByTestId('profile-checkpoint-handle'), line: screen.getByTestId('profile-checkpoint') };
  }

  it('drags a checkpoint line by its number to another distance', async () => {
    const { onMove, onPick, handle, line } = await renderProfile();
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 180 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 300 }); // half way → km 50
    expect(line).toHaveClass('is-dragging');
    expect(parseFloat(line.style.left)).toBeCloseTo(50, 1);
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 300 });
    fireEvent.click(handle);

    expect(onMove).toHaveBeenCalledWith('cp1', expect.closeTo(50, 1)); // half the distance
    expect(onPick).not.toHaveBeenCalled(); // the drop doesn't add a checkpoint
    expect(line).not.toHaveClass('is-dragging');
  });

  it('keeps the grab offset: grabbing beside the line does not make it jump', async () => {
    const { onMove, handle } = await renderProfile();
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 184 }); // 1 km right of the line
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 304 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 304 });
    expect(onMove).toHaveBeenCalledWith('cp1', expect.closeTo(50, 1));
  });

  it('cancels the drag with Escape', async () => {
    const { onMove, handle, line } = await renderProfile();
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 180 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 300 });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 300 });

    expect(onMove).not.toHaveBeenCalled();
    expect(parseFloat(line.style.left)).toBeCloseTo(20, 1);
  });

  it('shows a checkpoint dragged on the map at its current distance', async () => {
    const { line } = await renderProfile({ dragPreview: { id: 'cp1', distanceKm: 70 } });
    expect(line).toHaveClass('is-dragging');
    expect(parseFloat(line.style.left)).toBeCloseTo(70, 1);
  });

  it('cannot be dragged without onCheckpointMove', async () => {
    const { handle, line } = await renderProfile({ onCheckpointMove: undefined });
    expect(handle).not.toHaveClass('is-draggable');
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 180 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 300 });
    expect(line).not.toHaveClass('is-dragging');
  });
});
