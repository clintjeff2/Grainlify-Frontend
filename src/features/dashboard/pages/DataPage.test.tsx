import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import * as apiClient from '../../../shared/api/client';

// --- Mock heavy chart / map libraries ------------------------------------

function Passthrough({ children, ...props }: Record<string, unknown>) {
  return <div data-testid={(props['data-testid'] as string) || undefined}>{children as ReactNode}</div>;
}

vi.mock('recharts', () => ({
  ResponsiveContainer: Passthrough,
  ComposedChart: ({ children, data }: { children: ReactNode; data: any[] }) => (
    <div data-testid="composed-chart" data-chart-points={data?.length || 0}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => null,
  Tooltip: ({ content }: { content: any }) => <div data-testid="tooltip">{content}</div>,
}));

vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Geographies: ({ children }: { children: (args: { geographies: unknown[] }) => ReactNode }) => (
    <div>{children({ geographies: [] })}</div>
  ),
  Geography: () => null,
  Marker: () => null,
  ZoomableGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
}));

// --- Mock API client -----------------------------------------------------

vi.mock('../../../shared/api/client', async () => {
  const actual = await vi.importActual('../../../shared/api/client');
  return {
    ...actual,
    getProjectActivity: vi.fn(),
    getContributorActivity: vi.fn(),
    getContributorsByRegion: vi.fn(),
    getAnalyticsStats: vi.fn(),
  };
});

const mockProjectData = [
  { month: 'January', value: 45, trend: 40, new: 12, reactivated: 5, active: 28, churned: -8, prMerged: 18, rewarded: 15420 },
];

const mockContributorData = [
  { month: 'January', value: 42, trend: 38, new: 10, reactivated: 4, active: 28, churned: -6, prMerged: 15, rewarded: 14200 },
];

const mockRegions = [
  { name: 'United Kingdom', value: 625, percentage: 45 },
];

const mockStats = {
  billing_profile_count: 50,
  total_contributor_count: 100,
  active_contributor_count: 30,
  total_count: 1000,
};

import { DataPage } from './DataPage';

const renderPage = () =>
  render(
    <ThemeProvider>
      <DataPage />
    </ThemeProvider>,
  );

describe('DataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getProjectActivity as any).mockResolvedValue(mockProjectData);
    (apiClient.getContributorActivity as any).mockResolvedValue(mockContributorData);
    (apiClient.getContributorsByRegion as any).mockResolvedValue(mockRegions);
    (apiClient.getAnalyticsStats as any).mockResolvedValue(mockStats);
  });

  // ------------- Loading and Error States ----------------------------------

  it('renders loading skeletons initially', async () => {
    // Delay resolution to catch loading state
    (apiClient.getProjectActivity as any).mockReturnValue(new Promise(r => setTimeout(() => r(mockProjectData), 100)));

    renderPage();

    expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('chart-skeleton').length).toBeGreaterThan(0);
  });

  it('renders retry-able error state on failure', async () => {
    (apiClient.getProjectActivity as any).mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    // Success on retry
    (apiClient.getProjectActivity as any).mockResolvedValue(mockProjectData);
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.getByText('Project activity')).toBeInTheDocument();
    });
  });

  it('renders explicit empty states when data is empty', async () => {
    (apiClient.getProjectActivity as any).mockResolvedValue([]);
    (apiClient.getContributorActivity as any).mockResolvedValue([]);
    (apiClient.getContributorsByRegion as any).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No project activity data available')).toBeInTheDocument();
      expect(screen.getByText('No contributor activity data available')).toBeInTheDocument();
      expect(screen.getByText('No regional data available')).toBeInTheDocument();
    });
  });

  // ------------- Tab filtering tests ----------------------------------------

  describe('view tabs', () => {
    it('renders all sections on Overview (default)', async () => {
      renderPage();
      await waitFor(() => expect(apiClient.getProjectActivity).toHaveBeenCalled());

      expect(screen.getByText('Project activity')).toBeInTheDocument();
      expect(screen.getByText('Contributors map')).toBeInTheDocument();
      expect(screen.getByText('Contributor activity')).toBeInTheDocument();
      expect(screen.getByText('Information')).toBeInTheDocument();
    });

    it('shows only project-related sections on Projects tab', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(apiClient.getProjectActivity).toHaveBeenCalled());

      await user.click(screen.getByRole('tab', { name: 'Projects' }));
      expect(screen.getByText('Project activity')).toBeInTheDocument();
      expect(screen.getByText('Contributors map')).toBeInTheDocument();
      expect(screen.queryByText('Contributor activity')).not.toBeInTheDocument();
      expect(screen.queryByText('Information')).not.toBeInTheDocument();
    });

    it('shows only contributor-related sections on Contributions tab', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(apiClient.getProjectActivity).toHaveBeenCalled());

      await user.click(screen.getByRole('tab', { name: 'Contributions' }));
      expect(screen.queryByText('Project activity')).not.toBeInTheDocument();
      expect(screen.queryByText('Contributors map')).not.toBeInTheDocument();
      expect(screen.getByText('Contributor activity')).toBeInTheDocument();
      expect(screen.getByText('Information')).toBeInTheDocument();
    });
  });

  // ------------- Category filter tests --------------------------------------

  describe('category filters', () => {
    it('clicking "New" project filter shows bar for new instead of value', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(apiClient.getProjectActivity).toHaveBeenCalled());

      await user.click(screen.getByRole('tab', { name: 'Projects' }));

      expect(screen.getByTestId('bar-value')).toBeInTheDocument();

      const newBtn = screen.getByRole('button', { name: 'New' });
      await user.click(newBtn);

      expect(screen.queryByTestId('bar-value')).not.toBeInTheDocument();
      expect(screen.getByTestId('bar-new')).toBeInTheDocument();
    });

    it('toggling multiple filters shows bars for each category', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(apiClient.getProjectActivity).toHaveBeenCalled());

      await user.click(screen.getByRole('tab', { name: 'Projects' }));

      await user.click(screen.getByRole('button', { name: 'New' }));
      await user.click(screen.getByRole('button', { name: 'Active' }));

      expect(screen.getByTestId('bar-new')).toBeInTheDocument();
      expect(screen.getByTestId('bar-active')).toBeInTheDocument();
    });
  });

  // ------------- Interval Selection -----------------------------------------

  describe('intervals', () => {
    it('refetches project activity when interval changes', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => expect(apiClient.getProjectActivity).toHaveBeenCalledWith('Monthly interval'));

      // Find the specific Monthly interval button for Project activity
      const projectHeader = screen.getByText('Project activity').parentElement;
      const intervalBtn = within(projectHeader!).getByRole('button');

      await user.click(intervalBtn);
      await user.click(screen.getByText('Weekly interval'));

      expect(apiClient.getProjectActivity).toHaveBeenCalledWith('Weekly interval');
    });
  });
});
