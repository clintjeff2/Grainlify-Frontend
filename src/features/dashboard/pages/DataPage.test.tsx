import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';

// --- Mock heavy chart / map libraries ------------------------------------

function Passthrough({ children, ...props }: Record<string, unknown>) {
  return <div data-testid={(props['data-testid'] as string) || undefined}>{children as ReactNode}</div>;
}

vi.mock('recharts', () => ({
  ResponsiveContainer: Passthrough,
  ComposedChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="composed-chart" data-chart-points={data.length}>{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
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

import { DataPage } from './DataPage';

const renderPage = () =>
  render(
    <ThemeProvider>
      <DataPage />
    </ThemeProvider>,
  );

// ------------- Tab filtering tests ----------------------------------------

describe('DataPage view tabs', () => {
  it('renders all sections on Overview (default)', () => {
    renderPage();
    expect(screen.getByText('Project activity')).toBeInTheDocument();
    expect(screen.getByText('Contributors map')).toBeInTheDocument();
    expect(screen.getByText('Contributor activity')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('shows only project-related sections on Projects tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    expect(screen.getByText('Project activity')).toBeInTheDocument();
    expect(screen.getByText('Contributors map')).toBeInTheDocument();
    expect(screen.queryByText('Contributor activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Information')).not.toBeInTheDocument();
  });

  it('shows only contributor-related sections on Contributions tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Contributions' }));
    expect(screen.queryByText('Project activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Contributors map')).not.toBeInTheDocument();
    expect(screen.getByText('Contributor activity')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('sets aria-selected on the active tab', async () => {
    const user = userEvent.setup();
    renderPage();
    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    const projectsTab = screen.getByRole('tab', { name: 'Projects' });
    const contributionsTab = screen.getByRole('tab', { name: 'Contributions' });

    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(projectsTab).toHaveAttribute('aria-selected', 'false');
    expect(contributionsTab).toHaveAttribute('aria-selected', 'false');

    await user.click(projectsTab);
    expect(overviewTab).toHaveAttribute('aria-selected', 'false');
    expect(projectsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switching back to Overview shows all sections again', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    expect(screen.queryByText('Contributor activity')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByText('Project activity')).toBeInTheDocument();
    expect(screen.getByText('Contributor activity')).toBeInTheDocument();
  });
});

// ------------- Category filter tests --------------------------------------

describe('DataPage project category filters', () => {
  it('shows the default aggregate bar when no filter is active', () => {
    renderPage();
    expect(screen.getAllByTestId('bar-value').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('bar-new')).not.toBeInTheDocument();
  });

  it('clicking "New" filter shows a bar for the new dataKey instead of value', async () => {
    const user = userEvent.setup();
    renderPage();

    // Switch to Projects tab so only the project chart is visible
    await user.click(screen.getByRole('tab', { name: 'Projects' }));

    expect(screen.getByTestId('bar-value')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-new')).not.toBeInTheDocument();

    const newBtn = screen.getByRole('button', { name: 'New' });
    await user.click(newBtn);

    expect(screen.queryByTestId('bar-value')).not.toBeInTheDocument();
    expect(screen.getByTestId('bar-new')).toBeInTheDocument();
  });

  it('toggling multiple filters shows bars for each category', async () => {
    const user = userEvent.setup();
    renderPage();

    // Isolate to Projects tab for cleaner assertions
    await user.click(screen.getByRole('tab', { name: 'Projects' }));

    await user.click(screen.getByRole('button', { name: 'New' }));
    await user.click(screen.getByRole('button', { name: 'Active' }));

    expect(screen.getByTestId('bar-new')).toBeInTheDocument();
    expect(screen.getByTestId('bar-active')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-value')).not.toBeInTheDocument();
  });

  it('toggling a filter off restores the default bar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    const newBtn = screen.getByRole('button', { name: 'New' });

    // Toggle on then off
    await user.click(newBtn);
    expect(screen.getByTestId('bar-new')).toBeInTheDocument();

    await user.click(newBtn);
    expect(screen.queryByTestId('bar-new')).not.toBeInTheDocument();
    expect(screen.getByTestId('bar-value')).toBeInTheDocument();
  });

  it('sets aria-pressed on filter buttons', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    const newBtn = screen.getByRole('button', { name: 'New' });
    expect(newBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(newBtn);
    expect(newBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('DataPage contributor category filters', () => {
  it('clicking contributor "Active" filter shows bar for active data', async () => {
    const user = userEvent.setup();
    renderPage();

    // Switch to Contributions tab to isolate contributor chart
    await user.click(screen.getByRole('tab', { name: 'Contributions' }));

    const activeBtn = screen.getByRole('button', { name: 'Active' });
    await user.click(activeBtn);

    expect(screen.getByTestId('bar-active')).toBeInTheDocument();
  });

  it('contributor filter sets aria-pressed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Contributions' }));
    const churnedBtn = screen.getByRole('button', { name: 'Churned' });
    expect(churnedBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(churnedBtn);
    expect(churnedBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

// ------------- Edge cases -------------------------------------------------

describe('DataPage edge cases', () => {
  it('rapid filter toggling does not break rendering', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    const newBtn = screen.getByRole('button', { name: 'New' });
    // Rapid on-off-on
    await user.click(newBtn);
    await user.click(newBtn);
    await user.click(newBtn);

    expect(screen.getByTestId('bar-new')).toBeInTheDocument();
  });

  it('tab switching resets view without losing filter state', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Projects' }));
    const newBtn = screen.getByRole('button', { name: 'New' });
    await user.click(newBtn);
    expect(newBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to Contributions and back to Overview
    await user.click(screen.getByRole('tab', { name: 'Contributions' }));
    await user.click(screen.getByRole('tab', { name: 'Overview' }));

    // Project filter state preserved - first "New" button is in project section
    const newButtons = screen.getAllByRole('button', { name: 'New' });
    expect(newButtons[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('tablist has correct accessible structure', () => {
    renderPage();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
