import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import { DiscoverPage } from './DiscoverPage';

// Mock the API client
const mockGetRecommendedProjects = vi.fn();
const mockGetPublicProjectIssues = vi.fn();

vi.mock('../../../shared/api/client', () => ({
  getRecommendedProjects: (...args: any[]) => mockGetRecommendedProjects(...args),
  getPublicProjectIssues: (...args: any[]) => mockGetPublicProjectIssues(...args),
}));

// Mock Lucide icons to avoid rendering issues in tests
vi.mock('lucide-react', () => ({
  Heart: () => <div data-testid="heart-icon" />,
  Star: () => <div data-testid="star-icon" />,
  GitFork: () => <div data-testid="fork-icon" />,
  ArrowUpRight: () => <div data-testid="arrow-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
}));

const renderPage = () =>
  render(
    <ThemeProvider>
      <DiscoverPage />
    </ThemeProvider>
  );

describe('DiscoverPage Metadata Refactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders projects and issues with API-derived metadata', async () => {
    const mockProjects = [
      {
        id: '1',
        github_full_name: 'owner/repo1',
        stars_count: 100,
        forks_count: 50,
        open_issues_count: 5,
        description: 'Description 1',
        language: 'TypeScript',
        tags: ['tag1', 'tag2'],
        ecosystem_name: 'Ecosystem 1',
      },
    ];

    const mockIssues = {
      issues: [
        {
          github_issue_id: 101,
          title: 'Issue 1',
          description: 'Issue Description 1',
          labels: [{ name: 'good first issue' }],
        },
      ],
    };

    mockGetRecommendedProjects.mockResolvedValue({ projects: mockProjects });
    mockGetPublicProjectIssues.mockResolvedValue(mockIssues);

    renderPage();

    // Verify project metadata
    await waitFor(() => expect(screen.getByText('repo1')).toBeInTheDocument());
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Ecosystem 1')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();

    // Verify issue metadata
    await waitFor(() => expect(screen.getByText('Issue 1')).toBeInTheDocument());

    // Check for language text specifically within the issue section
    const issueCard = screen.getByTestId('issue-card-101');
    expect(issueCard).toHaveTextContent('TypeScript');

    expect(screen.getByText('good first issue')).toBeInTheDocument(); // Derived from labels[0]
  });

  it('falls back to tag[0] for language if language metadata is missing', async () => {
    const mockProjects = [
      {
        id: '2',
        github_full_name: 'owner/repo2',
        stars_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        description: 'Description 2',
        language: null, // Missing language
        tags: ['Rust', 'other'],
        ecosystem_name: null,
      },
    ];

    const mockIssues = {
      issues: [
        {
          github_issue_id: 102,
          title: 'Issue 2',
          description: 'Issue Description 2',
          labels: [],
        },
      ],
    };

    mockGetRecommendedProjects.mockResolvedValue({ projects: mockProjects });
    mockGetPublicProjectIssues.mockResolvedValue(mockIssues);

    renderPage();

    await waitFor(() => expect(screen.getByText('repo2')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Issue 2')).toBeInTheDocument());

    // Should fall back to first tag for language
    const issueCard = screen.getByTestId('issue-card-102');
    expect(issueCard).toHaveTextContent('Rust');
  });

  it('renders neutral fallback for language if both language and tags are missing', async () => {
    const mockProjects = [
      {
        id: '2.1',
        github_full_name: 'owner/repo2.1',
        stars_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        description: 'Description 2.1',
        language: null,
        tags: [], // No tags
        ecosystem_name: null,
      },
    ];

    const mockIssues = {
      issues: [
        {
          github_issue_id: 1021,
          title: 'Issue 2.1',
          description: 'Issue Description 2.1',
          labels: [],
        },
      ],
    };

    mockGetRecommendedProjects.mockResolvedValue({ projects: mockProjects });
    mockGetPublicProjectIssues.mockResolvedValue(mockIssues);

    renderPage();

    await waitFor(() => expect(screen.getByText('repo2.1')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Issue 2.1')).toBeInTheDocument());

    const issueCard = screen.getByTestId('issue-card-1021');
    // It should NOT contain common language names we use as defaults like TypeScript
    expect(issueCard).not.toHaveTextContent('TypeScript');
  });

  it('renders neutral fallback when issue labels are absent', async () => {
    const mockProjects = [
      {
        id: '3',
        github_full_name: 'owner/repo3',
        stars_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        description: 'Description 3',
        language: 'Go',
        tags: ['tag3'],
        ecosystem_name: null,
      },
    ];

    const mockIssues = {
      issues: [
        {
          github_issue_id: 103,
          title: 'Issue 3',
          description: 'Issue Description 3',
          labels: [], // No labels
        },
      ],
    };

    mockGetRecommendedProjects.mockResolvedValue({ projects: mockProjects });
    mockGetPublicProjectIssues.mockResolvedValue(mockIssues);

    renderPage();

    await waitFor(() => expect(screen.getByText('Issue 3')).toBeInTheDocument());

    // Verify that no primary tag pill is rendered for this issue
    // Since we only take labels[0], and it's empty, getPrimaryTag returns undefined.
    // IssueCard doesn't render the tag if primaryTag is falsy.
    const tags = screen.queryAllByText(/good first issue|bug|enhancement/i);
    expect(tags.length).toBe(0);
  });

  it('correctly uses the first label from the API as the primary tag', async () => {
     const mockProjects = [
      {
        id: '4',
        github_full_name: 'owner/repo4',
        stars_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        description: 'Description 4',
        language: 'Python',
        tags: ['tag4'],
        ecosystem_name: null,
      },
    ];

    const mockIssues = {
      issues: [
        {
          github_issue_id: 104,
          title: 'Issue 4',
          description: 'Issue Description 4',
          labels: [{ name: 'custom-tag' }, { name: 'bug' }],
        },
      ],
    };

    mockGetRecommendedProjects.mockResolvedValue({ projects: mockProjects });
    mockGetPublicProjectIssues.mockResolvedValue(mockIssues);

    renderPage();

    await waitFor(() => expect(screen.getByText('Issue 4')).toBeInTheDocument());

    // Should pick 'custom-tag' as it is the first one, even if 'bug' is present later
    expect(screen.getByText('custom-tag')).toBeInTheDocument();
  });

  it('applies custom label colors from the API', async () => {
    const mockProjects = [
      {
        id: '5',
        github_full_name: 'owner/repo5',
        stars_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        description: 'Description 5',
        language: 'Python',
        tags: ['tag5'],
        ecosystem_name: null,
      },
    ];

    const mockIssues = {
      issues: [
        {
          github_issue_id: 105,
          title: 'Issue 5',
          description: 'Issue Description 5',
          labels: [{ name: 'colored-tag', color: 'ff0000' }],
        },
      ],
    };

    mockGetRecommendedProjects.mockResolvedValue({ projects: mockProjects });
    mockGetPublicProjectIssues.mockResolvedValue(mockIssues);

    renderPage();

    await waitFor(() => expect(screen.getByText('Issue 5')).toBeInTheDocument());

    const tag = screen.getByText('colored-tag');
    expect(tag).toHaveStyle({
      color: '#ff0000',
      backgroundColor: '#ff000033'
    });
  });
});
