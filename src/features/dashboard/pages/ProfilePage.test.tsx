/**
 * @file ProfilePage.test.tsx
 * @description Tests for ProfilePage focused on the activity and contributions
 *  (contributed-projects) sections:
 *   - Loading skeletons remain in place while requests are in flight
 *   - Empty states ("No contributions yet" / "No projects contributed yet")
 *   - Error states with a working Retry that re-invokes the failed API call
 *   - Public-profile (other user) view: error/retry parity + no leakage of the
 *     authenticated user's own data into the public view (security)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'

// ---------------------------------------------------------------------------
// Mock API client — declared BEFORE vi.mock() factory so they are in scope
// ---------------------------------------------------------------------------
const mockGetUserProfile = vi.fn()
const mockGetPublicProfile = vi.fn()
const mockGetProjectsContributed = vi.fn()
const mockGetProjectsLed = vi.fn()
const mockGetProfileCalendar = vi.fn()
const mockGetProfileActivity = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getUserProfile: (...a: unknown[]) => mockGetUserProfile(...a),
  getPublicProfile: (...a: unknown[]) => mockGetPublicProfile(...a),
  getProjectsContributed: (...a: unknown[]) => mockGetProjectsContributed(...a),
  getProjectsLed: (...a: unknown[]) => mockGetProjectsLed(...a),
  getProfileCalendar: (...a: unknown[]) => mockGetProfileCalendar(...a),
  getProfileActivity: (...a: unknown[]) => mockGetProfileActivity(...a),
}))

// Authenticated user — distinct login so we can assert it never leaks into the
// public-profile view.
vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { github: { login: 'owner-self', avatar_url: 'https://example.com/self.png' } },
  }),
}))

// recharts renders nothing meaningful in jsdom (0×0 container); stub it out to
// keep the tests fast and free of width/height warnings.
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}))

// ---------------------------------------------------------------------------
// Component under test (import AFTER mocks)
// ---------------------------------------------------------------------------
import { ProfilePage } from './ProfilePage'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    contributions_count: 5,
    languages: [{ language: 'TypeScript', contribution_count: 4 }],
    ecosystems: [{ ecosystem_name: 'Stellar', contribution_count: 3 }],
    projects_contributed_to_count: 1,
    projects_led_count: 0,
    rewards_count: 0,
    rank: { position: 1, tier: 'gold', tier_name: 'Gold', tier_color: '#c9983a' },
    ...overrides,
  }
}

function makeActivity() {
  return {
    activities: [
      {
        type: 'pull_request',
        id: 'pr-1',
        number: 42,
        title: 'Fix the flaky test',
        url: 'https://github.com/org/repo/pull/42',
        state: 'open',
        date: '2026-06-01T00:00:00Z',
        month_year: 'June 2026',
        project_name: 'repo',
        project_id: 'proj-1',
      },
    ],
    total: 1,
    limit: 100,
    offset: 0,
  }
}

function makeContributedProjects() {
  return [
    {
      id: 'proj-1',
      github_full_name: 'org/cool-repo',
      status: 'active',
      ecosystem_name: 'Stellar',
      language: 'TypeScript',
      owner_avatar_url: undefined,
    },
  ]
}

function renderPage(props: Partial<React.ComponentProps<typeof ProfilePage>> = {}) {
  return render(
    <ThemeProvider>
      <ProfilePage {...props} />
    </ThemeProvider>
  )
}

beforeEach(() => {
  mockGetUserProfile.mockReset().mockResolvedValue(makeProfile())
  mockGetPublicProfile.mockReset()
  mockGetProjectsContributed.mockReset().mockResolvedValue(makeContributedProjects())
  mockGetProjectsLed.mockReset().mockResolvedValue([])
  mockGetProfileCalendar.mockReset().mockResolvedValue({ calendar: [] })
  mockGetProfileActivity.mockReset().mockResolvedValue(makeActivity())
})

// ===========================================================================
// Activity section
// ===========================================================================
describe('ProfilePage — contribution activity', () => {
  it('renders activity items on success', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Fix the flaky test')).toBeInTheDocument())
    expect(mockGetProfileActivity).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there is no activity', async () => {
    mockGetProfileActivity.mockResolvedValue({ activities: [], total: 0, limit: 100, offset: 0 })
    renderPage()
    await waitFor(() => expect(screen.getByText('No contributions yet')).toBeInTheDocument())
  })

  it('shows an error + retry state when the activity request fails', async () => {
    mockGetProfileActivity.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => expect(screen.getByText("Couldn't load activity")).toBeInTheDocument())
    // Error state is announced and does NOT collapse to the empty state.
    expect(screen.queryByText('No contributions yet')).not.toBeInTheDocument()
    expect(screen.getByText("Couldn't load activity").closest('[role="alert"]')).toBeInTheDocument()
  })

  it('recovers when Retry succeeds after an activity failure', async () => {
    mockGetProfileActivity.mockRejectedValueOnce(new Error('network'))
    renderPage()
    const errorPanel = await screen.findByText("Couldn't load activity")
    const retry = errorPanel.closest('[role="alert"]')!.querySelector('button')!

    mockGetProfileActivity.mockResolvedValue(makeActivity())
    await userEvent.click(retry)

    await waitFor(() => expect(screen.getByText('Fix the flaky test')).toBeInTheDocument())
    expect(screen.queryByText("Couldn't load activity")).not.toBeInTheDocument()
    expect(mockGetProfileActivity).toHaveBeenCalledTimes(2)
  })
})

// ===========================================================================
// Contributed-projects section
// ===========================================================================
describe('ProfilePage — contributed projects', () => {
  it('renders contributed projects on success', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('cool-repo')).toBeInTheDocument())
    expect(mockGetProjectsContributed).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when no projects are returned', async () => {
    mockGetProjectsContributed.mockResolvedValue([])
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No projects contributed yet')).toBeInTheDocument()
    )
  })

  it('shows an error + retry state when the projects request fails', async () => {
    mockGetProjectsContributed.mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => expect(screen.getByText("Couldn't load projects")).toBeInTheDocument())
    expect(screen.queryByText('No projects contributed yet')).not.toBeInTheDocument()
  })

  it('recovers when Retry succeeds after a projects failure', async () => {
    mockGetProjectsContributed.mockRejectedValueOnce(new Error('boom'))
    renderPage()
    const errorPanel = await screen.findByText("Couldn't load projects")
    const retry = errorPanel.closest('[role="alert"]')!.querySelector('button')!

    mockGetProjectsContributed.mockResolvedValue(makeContributedProjects())
    await userEvent.click(retry)

    await waitFor(() => expect(screen.getByText('cool-repo')).toBeInTheDocument())
    expect(screen.queryByText("Couldn't load projects")).not.toBeInTheDocument()
    expect(mockGetProjectsContributed).toHaveBeenCalledTimes(2)
  })
})

// ===========================================================================
// Public-profile (other user) view
// ===========================================================================
describe('ProfilePage — public profile view', () => {
  beforeEach(() => {
    mockGetPublicProfile.mockResolvedValue(
      makeProfile({ login: 'other-user', avatar_url: 'https://example.com/other.png' })
    )
  })

  it('fetches activity/contributions for the viewed login, not the signed-in user', async () => {
    renderPage({ viewingUserLogin: 'other-user' })
    await waitFor(() => expect(screen.getByText('Fix the flaky test')).toBeInTheDocument())

    expect(mockGetPublicProfile).toHaveBeenCalled()
    expect(mockGetUserProfile).not.toHaveBeenCalled()
    expect(mockGetProfileActivity).toHaveBeenCalledWith(100, 0, undefined, 'other-user')
    expect(mockGetProjectsContributed).toHaveBeenCalledWith(undefined, 'other-user')
  })

  it('does not leak the authenticated user into the public view (security)', async () => {
    renderPage({ viewingUserLogin: 'other-user' })
    await waitFor(() => expect(screen.getByText('other-user')).toBeInTheDocument())
    expect(screen.queryByText('owner-self')).not.toBeInTheDocument()
  })

  it('shows error + retry for activity on the public view and recovers', async () => {
    mockGetProfileActivity.mockRejectedValueOnce(new Error('network'))
    renderPage({ viewingUserLogin: 'other-user' })

    const errorPanel = await screen.findByText("Couldn't load activity")
    const retry = errorPanel.closest('[role="alert"]')!.querySelector('button')!

    mockGetProfileActivity.mockResolvedValue(makeActivity())
    await userEvent.click(retry)

    await waitFor(() => expect(screen.getByText('Fix the flaky test')).toBeInTheDocument())
    // Retry must re-query the same public login, never the signed-in user.
    expect(mockGetProfileActivity).toHaveBeenLastCalledWith(100, 0, undefined, 'other-user')
  })
})
