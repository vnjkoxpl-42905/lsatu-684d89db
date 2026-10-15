import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routePreload = vi.hoisted(() => ({
  loadDrillHub: vi.fn<() => Promise<unknown>>(),
  preloadDrillHub: vi.fn(),
}));

vi.mock('@/lib/routePreload', () => routePreload);

import {
  drillHubSectionHref,
  useDrillHubSectionNavigation,
} from './useDrillHubSectionNavigation';

function Runner() {
  const openSection = useDrillHubSectionNavigation();
  return <button onClick={() => openSection('rc')}>Switch to RC</button>;
}

describe('useDrillHubSectionNavigation', () => {
  beforeEach(() => {
    routePreload.loadDrillHub.mockReset();
    routePreload.preloadDrillHub.mockReset();
  });

  it('uses the direct drill-hub URL instead of the lazy /rc redirect', () => {
    expect(drillHubSectionHref('lr')).toBe('/classroom/drill?section=lr');
    expect(drillHubSectionHref('rc')).toBe('/classroom/drill?section=rc');
  });

  it('keeps the runner mounted until the hub chunk is ready', async () => {
    let finishLoading!: () => void;
    routePreload.loadDrillHub.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLoading = resolve;
      }),
    );

    render(
      <MemoryRouter initialEntries={['/drill']}>
        <Routes>
          <Route path="/drill" element={<Runner />} />
          <Route path="/classroom/drill" element={<div>RC hub ready</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(routePreload.preloadDrillHub).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to RC' }));

    expect(screen.getByRole('button', { name: 'Switch to RC' })).toBeInTheDocument();
    expect(screen.queryByText('RC hub ready')).toBeNull();

    finishLoading();
    await waitFor(() => expect(screen.getByText('RC hub ready')).toBeInTheDocument());
  });
});

