import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithServices } from '../test/renderWithServices';
import { App } from './App';
import { StartupError } from './StartupError';
import { render } from '@testing-library/react';

describe('App', () => {
  it('shows the brand, language selector and empty state', async () => {
    await renderWithServices(<App />);
    expect(screen.getByRole('link', { name: /brevet planner/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveDisplayValue('English');
    expect(screen.getByRole('heading', { level: 1, name: 'No track yet' })).toBeInTheDocument();
  });
});

describe('StartupError', () => {
  it('shows the reason why the app could not start', () => {
    render(<StartupError error={new Error('"site.url" must be an http(s) URL')} />);
    expect(screen.getByRole('heading', { name: /could not start/ })).toBeInTheDocument();
    expect(screen.getByText('"site.url" must be an http(s) URL')).toBeInTheDocument();
  });
});
