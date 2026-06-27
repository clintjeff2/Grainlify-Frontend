// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssuesTab } from './IssuesTab';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import { getMaintainerIssues } from '../../../../shared/api/client';

vi.mock('../../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    userRole: 'maintainer',
    user: { id: 'user-1', github: { login: 'maintainer-1' } },
  }),
}));

vi.mock('../../../../shared/api/client', () => ({
  getMaintainerIssues: vi.fn(),
  applyToIssue: vi.fn(),
  postBotComment: vi.fn(),
  withdrawApplication: vi.fn(),
  assignApplicant: vi.fn(),
  unassignApplicant: vi.fn(),
  rejectApplication: vi.fn(),
}));

const mockGetMaintainerIssues = vi.mocked(getMaintainerIssues);

const PROJECTS = [
  {
    id: 'proj-1',
    github_full_name: 'test-org/test-repo',
    status: 'verified',
  },
];

const ISSUES = [
  {
    github_issue_id: 101,
    number: 42,
    state: 'open',
    title: 'Fix styling bug',
    description: 'The layout is broken on mobile.',
    author_login: 'contributor-1',
    assignees: [],
    labels: [{ name: 'bug' }, { name: 'ui' }],
    comments_count: 1,
    comments: [
      {
        id: 1001,
        body: '**@contributor-1 has applied to work on this issue as part of the Grainlify program**\n> I want to solve this.',
        user: { login: 'contributor-1' },
        created_at: '2026-06-20T12:00:00Z',
        updated_at: '2026-06-20T12:00:00Z',
      },
    ],
    url: 'https://github.com/test-org/test-repo/issues/42',
    updated_at: '2026-06-20T12:00:00Z',
    last_seen_at: '2026-06-20T12:00:00Z',
  },
];

/** Opens the filter panel via the filter button. */
async function openFilterPanel(user: ReturnType<typeof userEvent.setup>) {
  const filterBtn = screen.getByTestId('filter-button');
  await user.click(filterBtn);
}

describe('IssuesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ────────────────────────────────────────────────────────

  it('renders skeleton cards when loading', async () => {
    let resolvePromise: any;
    const promise = new Promise((res) => { resolvePromise = res; });
    mockGetMaintainerIssues.mockReturnValue(promise as any);

    const { container } = renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();

    resolvePromise({ issues: [] });
  });

  it('renders empty issue state when no issues exist', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: [] });

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await waitFor(() => {
      expect(screen.getByText('No issues found')).toBeInTheDocument();
    });
  });

  it('renders the list of issues and selecting an issue displays details', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    const issueCard = await screen.findByText('Fix styling bug');
    expect(issueCard).toBeInTheDocument();

    await user.click(issueCard);

    expect(screen.getByRole('heading', { name: 'Fix styling bug', level: 1 })).toBeInTheDocument();

    const discussionsTab = screen.getByRole('button', { name: /discussions/i });
    await user.click(discussionsTab);

    expect(screen.getByText('The layout is broken on mobile.')).toBeInTheDocument();
  });

  // ─── Error state ────────────────────────────────────────────────────────────

  it('displays error UI and retry works', async () => {
    mockGetMaintainerIssues.mockRejectedValueOnce(new Error('API failure'));
    mockGetMaintainerIssues.mockResolvedValueOnce({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    const errorText = await screen.findByText('Failed to load issues');
    expect(errorText).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry Connection' });
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);

    expect(await screen.findByText('Fix styling bug')).toBeInTheDocument();
  });

  it('shows the error message from the API when available', async () => {
    mockGetMaintainerIssues.mockRejectedValue(new Error('Network timeout'));

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Failed to load issues');
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  // ─── Dynamic category filter options ───────────────────────────────────────

  it('derives category filter options from issue labels (non-language labels)', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    // 'bug' and 'ui' are non-language labels → should appear as category buttons
    const filterPanel = screen.getByText('Categories').closest('div')!;
    expect(within(filterPanel).getByRole('button', { name: 'bug' })).toBeInTheDocument();
    expect(within(filterPanel).getByRole('button', { name: 'ui' })).toBeInTheDocument();
  });

  it('does not show hardcoded category names that are absent from issue data', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    // Hardcoded names that no longer exist should not be present
    expect(screen.queryByRole('button', { name: 'Blockchain & Cryptocurrencies' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cryptography' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stellar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Web Development' })).not.toBeInTheDocument();
  });

  it('shows empty state in Categories when issues have no non-language labels', async () => {
    const issueWithLangLabelOnly = [{
      ...ISSUES[0],
      labels: [{ name: 'typescript' }],
    }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithLangLabelOnly });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    expect(screen.getByText('No categories available')).toBeInTheDocument();
  });

  // ─── Dynamic language filter options ───────────────────────────────────────

  it('derives language filter options from labels matching known programming language names', async () => {
    const issueWithLangLabels = [{
      ...ISSUES[0],
      labels: [{ name: 'typescript' }, { name: 'rust' }, { name: 'bug' }],
    }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithLangLabels });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    const langSection = screen.getByText('Languages').closest('div')!;
    expect(within(langSection).getByRole('button', { name: 'typescript' })).toBeInTheDocument();
    expect(within(langSection).getByRole('button', { name: 'rust' })).toBeInTheDocument();

    // 'bug' is not a language — should not appear in the Languages section
    expect(within(langSection).queryByRole('button', { name: 'bug' })).not.toBeInTheDocument();
  });

  it('does not show hardcoded language names that are absent from issue data', async () => {
    // ISSUES only has 'bug' and 'ui' labels — no known language labels
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    expect(screen.queryByRole('button', { name: 'JavaScript' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Makefile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shell' })).not.toBeInTheDocument();
  });

  it('shows empty state in Languages when no issues have language labels', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    expect(screen.getByText('No languages available')).toBeInTheDocument();
  });

  // ─── Filter deduplication ───────────────────────────────────────────────────

  it('deduplicates labels across multiple issues in the same filter section', async () => {
    const twoIssues = [
      { ...ISSUES[0], github_issue_id: 101, title: 'Issue A', labels: [{ name: 'bug' }] },
      { ...ISSUES[0], github_issue_id: 102, title: 'Issue B', labels: [{ name: 'bug' }, { name: 'typescript' }] },
    ];
    mockGetMaintainerIssues.mockResolvedValue({ issues: twoIssues });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Issue A');
    await openFilterPanel(user);

    // 'bug' appears in both issues but should only render one button
    const catSection = screen.getByText('Categories').closest('div')!;
    expect(within(catSection).getAllByRole('button', { name: 'bug' })).toHaveLength(1);
  });

  // ─── Filters sync with data changes ─────────────────────────────────────────

  it('filter options update when issues from a different project are loaded', async () => {
    // First render: only 'bug' label
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    const { rerender } = renderWithTheme(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />
    );

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    const catSection = () => screen.getByText('Categories').closest('div')!;
    expect(within(catSection()).getByRole('button', { name: 'bug' })).toBeInTheDocument();
    expect(within(catSection()).queryByRole('button', { name: 'enhancement' })).not.toBeInTheDocument();

    // Close filter and switch projects — now only 'enhancement' label
    await user.click(screen.getByLabelText('Filter issues'));

    const NEW_PROJECTS = [{ id: 'proj-2', github_full_name: 'other-org/other-repo', status: 'verified' }];
    const newIssues = [{ ...ISSUES[0], github_issue_id: 200, title: 'Another issue', labels: [{ name: 'enhancement' }] }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: newIssues });

    rerender(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={NEW_PROJECTS} />
    );

    await screen.findByText('Another issue');
    await openFilterPanel(user);

    expect(within(catSection()).getByRole('button', { name: 'enhancement' })).toBeInTheDocument();
    expect(within(catSection()).queryByRole('button', { name: 'bug' })).not.toBeInTheDocument();
  });

  // ─── Category filter actually filters the issue list ────────────────────────

  it('category filter hides issues whose labels do not match', async () => {
    const twoIssues = [
      { ...ISSUES[0], github_issue_id: 101, number: 1, title: 'Bug issue', labels: [{ name: 'bug' }] },
      { ...ISSUES[0], github_issue_id: 102, number: 2, title: 'Feature issue', labels: [{ name: 'enhancement' }] },
    ];
    mockGetMaintainerIssues.mockResolvedValue({ issues: twoIssues });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    expect(await screen.findByText('Bug issue')).toBeInTheDocument();
    expect(screen.getByText('Feature issue')).toBeInTheDocument();

    await openFilterPanel(user);

    // Select only 'bug' category
    const catSection = screen.getByText('Categories').closest('div')!;
    await user.click(within(catSection).getByRole('button', { name: 'bug' }));

    // 'Feature issue' should be gone from the issue list
    await waitFor(() => {
      expect(screen.queryByText('Feature issue')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Bug issue')).toBeInTheDocument();
  });

  // ─── Language filter actually filters the issue list ────────────────────────

  it('language filter hides issues whose labels do not match', async () => {
    const twoIssues = [
      { ...ISSUES[0], github_issue_id: 201, number: 1, title: 'TypeScript issue', labels: [{ name: 'typescript' }] },
      { ...ISSUES[0], github_issue_id: 202, number: 2, title: 'Rust issue', labels: [{ name: 'rust' }] },
    ];
    mockGetMaintainerIssues.mockResolvedValue({ issues: twoIssues });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    expect(await screen.findByText('TypeScript issue')).toBeInTheDocument();
    expect(screen.getByText('Rust issue')).toBeInTheDocument();

    await openFilterPanel(user);

    const langSection = screen.getByText('Languages').closest('div')!;
    await user.click(within(langSection).getByRole('button', { name: 'typescript' }));

    await waitFor(() => {
      expect(screen.queryByText('Rust issue')).not.toBeInTheDocument();
    });
    expect(screen.getByText('TypeScript issue')).toBeInTheDocument();
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────────

  it('handles issues with no labels without crashing', async () => {
    const issueWithNoLabels = [{ ...ISSUES[0], labels: [] }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithNoLabels });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    expect(screen.getByText('No categories available')).toBeInTheDocument();
    expect(screen.getByText('No languages available')).toBeInTheDocument();
  });

  it('handles issues with null labels without crashing', async () => {
    const issueWithNullLabels = [{ ...ISSUES[0], labels: null as any }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithNullLabels });

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    // Should not throw; component should render successfully
    await screen.findByText('Fix styling bug');
  });

  it('handles string-form labels (as well as object-form)', async () => {
    const issueWithStringLabels = [{ ...ISSUES[0], labels: ['bug', 'typescript'] as any }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithStringLabels });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    const catSection = screen.getByText('Categories').closest('div')!;
    expect(within(catSection).getByRole('button', { name: 'bug' })).toBeInTheDocument();

    const langSection = screen.getByText('Languages').closest('div')!;
    expect(within(langSection).getByRole('button', { name: 'typescript' })).toBeInTheDocument();
  });

  it('truncates excessively long label names for safety', async () => {
    const longLabel = 'a'.repeat(100);
    const issueWithLongLabel = [{ ...ISSUES[0], labels: [{ name: longLabel }] }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithLongLabel });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    const truncated = 'a'.repeat(60);
    const catSection = screen.getByText('Categories').closest('div')!;
    expect(within(catSection).getByRole('button', { name: truncated })).toBeInTheDocument();
  });

  it('shows no issues message when all projects are deselected', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: [] });

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Select repositories to view issues')).toBeInTheDocument();
    });
  });

  it('shows "no match" message when filters exclude all loaded issues', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    // ISSUES have status 'open'; switch filter to 'closed' — no matches
    await user.click(screen.getByRole('button', { name: 'Closed' }));

    await waitFor(() => {
      expect(screen.getByText('No issues match the filters')).toBeInTheDocument();
    });
  });

  it('clear filters button resets category and language selections', async () => {
    const issueWithLabels = [{ ...ISSUES[0], labels: [{ name: 'bug' }, { name: 'typescript' }] }];
    mockGetMaintainerIssues.mockResolvedValue({ issues: issueWithLabels });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await screen.findByText('Fix styling bug');
    await openFilterPanel(user);

    // Select a category and a language
    const catSection = screen.getByText('Categories').closest('div')!;
    await user.click(within(catSection).getByRole('button', { name: 'bug' }));

    const langSection = screen.getByText('Languages').closest('div')!;
    await user.click(within(langSection).getByRole('button', { name: 'typescript' }));

    // Clear filters
    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    // Buttons should no longer be in the selected (gold-border) state
    // Verify by checking the filter count badge drops back to 1 (only default status=open)
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
