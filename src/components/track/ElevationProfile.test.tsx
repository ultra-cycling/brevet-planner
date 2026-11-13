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
