import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import { DashboardTab } from './DashboardTab';
import { getProjectIssues, getProjectPRs } from '../../../../shared/api/client';

// Mock theme hook to avoid needing full provider
vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// Mock API Client
vi.mock('../../../../shared/api/client', () => ({
  getProjectIssues: vi.fn(),
  getProjectPRs: vi.fn(),
}));

// Mock logger to prevent cluttering the test logs
vi.mock('../../../../shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock recharts to avoid rendering logs / size errors in JSDOM environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

describe('DashboardTab', () => {
  const mockProjects = [
    { id: 'proj-1', github_full_name: 'test/repo', status: 'active' }
  ];

  const RealDate = window.Date;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Stub Date constructor and Date.now for deterministic relative time calculations
    const mockSystemTime = new Date('2026-06-23T12:00:00Z');
    
    // Create a mock Date constructor
    const MockDateConstructor = function (this: any, ...args: any[]) {
      if (args.length === 0) {
        return new RealDate(mockSystemTime.getTime());
      }
      return new (RealDate as any)(...args);
    } as any;

    MockDateConstructor.prototype = RealDate.prototype;
    MockDateConstructor.now = () => mockSystemTime.getTime();
    MockDateConstructor.parse = RealDate.parse;
    MockDateConstructor.UTC = RealDate.UTC;

    (window as any).Date = MockDateConstructor;
  });

  afterEach(() => {
    (window as any).Date = RealDate;
  });

  /**
   * Helper to retrieve only the activity headings from the DOM.
   * Filters out StatsCard headings by targeting the 'font-medium' class on ActivityItem headings.
   */
  const getActivityHeadings = () => {
    return screen.getAllByRole('heading', { level: 3 }).filter(el => 
      el.className.includes('font-medium')
    );
  };

  it('correctly sorts activity items chronologically (most recent first) and formats relative time', async () => {
    const oneDayAgo = '2026-06-22T12:00:00Z';
    const twoHoursAgo = '2026-06-23T10:00:00Z';
    const fiveMinsAgo = '2026-06-23T11:55:00Z';

    vi.mocked(getProjectIssues).mockResolvedValue({
      issues: [
        {
          github_issue_id: 10,
          number: 1,
          title: 'Older Issue',
          comments_count: 0,
          projectId: 'proj-1',
          updated_at: oneDayAgo,
        },
        {
          github_issue_id: 20,
          number: 2,
          title: 'Newer Issue',
          comments_count: 0,
          projectId: 'proj-1',
          updated_at: fiveMinsAgo,
        }
      ] as any
    });

    vi.mocked(getProjectPRs).mockResolvedValue({
      prs: [
        {
          github_pr_id: 30,
          number: 3,
          title: 'Middle PR',
          state: 'open',
          merged: false,
          updated_at: twoHoursAgo,
        }
      ] as any
    });

    render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    // Wait until the statistics cards are rendered, signaling that loading has finished.
    await waitFor(() => {
      expect(screen.getByText('Issue Views')).toBeInTheDocument();
    });

    const activityElements = getActivityHeadings();
    expect(activityElements).toHaveLength(3);
    expect(activityElements[0].textContent).toBe('Newer Issue');
    expect(activityElements[1].textContent).toBe('Middle PR');
    expect(activityElements[2].textContent).toBe('Older Issue');

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('maintains stable ordering for ties (stable sorting)', async () => {
    const sameTime = '2026-06-23T11:00:00Z'; // 1 hour ago

    vi.mocked(getProjectIssues).mockResolvedValue({
      issues: [
        {
          github_issue_id: 100,
          number: 10,
          title: 'Same Time Issue',
          comments_count: 0,
          projectId: 'proj-1',
          updated_at: sameTime,
        }
      ] as any
    });

    vi.mocked(getProjectPRs).mockResolvedValue({
      prs: [
        {
          github_pr_id: 200,
          number: 20,
          title: 'Same Time PR',
          state: 'open',
          merged: false,
          updated_at: sameTime,
        }
      ] as any
    });

    render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    // Wait until the statistics cards are rendered, signaling that loading has finished.
    await waitFor(() => {
      expect(screen.getByText('Issue Views')).toBeInTheDocument();
    });

    const activityElements = getActivityHeadings();
    expect(activityElements).toHaveLength(2);
    expect(activityElements[0].textContent).toBe('Same Time PR');
    expect(activityElements[1].textContent).toBe('Same Time Issue');
  });

  it('guards against invalid/NaN dates and lists them at the bottom with "unknown time" label', async () => {
    const validTime = '2026-06-23T11:00:00Z'; // 1 hour ago
    const invalidTime = 'this-is-not-a-valid-date-string';

    vi.mocked(getProjectIssues).mockResolvedValue({
      issues: [
        {
          github_issue_id: 11,
          number: 11,
          title: 'Invalid Time Issue',
          comments_count: 0,
          projectId: 'proj-1',
          updated_at: invalidTime,
        }
      ] as any
    });

    vi.mocked(getProjectPRs).mockResolvedValue({
      prs: [
        {
          github_pr_id: 22,
          number: 22,
          title: 'Valid Time PR',
          state: 'open',
          merged: false,
          updated_at: validTime,
        }
      ] as any
    });

    render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    // Wait until the statistics cards are rendered, signaling that loading has finished.
    await waitFor(() => {
      expect(screen.getByText('Issue Views')).toBeInTheDocument();
    });

    const activityElements = getActivityHeadings();
    expect(activityElements).toHaveLength(2);
    expect(activityElements[0].textContent).toBe('Valid Time PR');
    expect(activityElements[1].textContent).toBe('Invalid Time Issue');

    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    expect(screen.getByText('unknown time')).toBeInTheDocument();
  });

  it('renders empty state with CTA when no projects are selected', async () => {
    render(<DashboardTab selectedProjects={[]} isLoadingProjects={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No repository selected')).toBeInTheDocument();
    expect(screen.getByText(/Select one or more repositories/i)).toBeInTheDocument();
    // Should not show stat cards or skeletons
    expect(screen.queryByText('Issue Views')).not.toBeInTheDocument();
  });

  it('renders a loading skeleton while the parent is still fetching projects', () => {
    vi.mocked(getProjectIssues).mockResolvedValue({ issues: [] } as any);
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] } as any);

    render(<DashboardTab selectedProjects={[]} isLoadingProjects={true} />);

    // Empty state must not appear while projects are still loading
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('renders error state with retry button when the dashboard fetch throws', async () => {
    // Both API calls throw so the outer loadData catch fires
    vi.mocked(getProjectIssues).mockRejectedValue(new Error('network error'));
    vi.mocked(getProjectPRs).mockRejectedValue(new Error('network error'));

    render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // Stat cards must not appear
    expect(screen.queryByText('Issue Views')).not.toBeInTheDocument();
  });

  it('retries loading data when the retry button is clicked', async () => {
    vi.mocked(getProjectIssues).mockRejectedValueOnce(new Error('network error'));
    vi.mocked(getProjectPRs).mockRejectedValueOnce(new Error('network error'));

    // Second call succeeds
    vi.mocked(getProjectIssues).mockResolvedValueOnce({ issues: [] } as any);
    vi.mocked(getProjectPRs).mockResolvedValueOnce({ prs: [] } as any);

    const { getByRole } = render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    getByRole('button', { name: /retry/i }).click();

    await waitFor(() => {
      expect(screen.getByText('Issue Views')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('does not display a Repository Views card', async () => {
    vi.mocked(getProjectIssues).mockResolvedValue({ issues: [] } as any);
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] } as any);

    render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    await waitFor(() => {
      expect(screen.getByText('Issue Views')).toBeInTheDocument();
    });

    expect(screen.queryByText('Repository Views')).not.toBeInTheDocument();
  });

  it('validates stat values — renders 0 for stats that would produce invalid numbers', async () => {
    vi.mocked(getProjectIssues).mockResolvedValue({
      issues: [
        {
          github_issue_id: 1,
          number: 1,
          title: 'Issue with bad comment count',
          comments_count: NaN,
          projectId: 'proj-1',
          updated_at: '2026-06-23T11:00:00Z',
        }
      ] as any
    });
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] } as any);

    render(<DashboardTab selectedProjects={mockProjects} isLoadingProjects={false} />);

    await waitFor(() => {
      expect(screen.getByText('Issue Views')).toBeInTheDocument();
    });

    // Issue Applications should clamp NaN comments_count to 0
    const applicationsHeading = screen.getByText('Issue Applications');
    const card = applicationsHeading.closest('[class*="rounded"]');
    // The value displayed in the card should be 0 (not NaN)
    expect(card).toHaveTextContent('0');
  });
});
