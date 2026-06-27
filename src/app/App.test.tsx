import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    current: {
      isLoading: false,
      isAuthenticated: true,
      userRole: 'contributor' as 'contributor' | 'maintainer' | 'admin' | null,
      login: vi.fn(),
      logout: vi.fn(),
    },
  },
}))

vi.mock('../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockAuth.current,
}))

vi.mock('../shared/components/Toast', () => ({
  default: () => null,
}))

vi.mock('../features/landing', () => ({
  LandingPage: () => <div>Landing page</div>,
}))

vi.mock('../features/auth', () => ({
  SignInPage: () => <div>Sign in page</div>,
  SignUpPage: () => <div>Sign up page</div>,
  AuthCallbackPage: () => <div>Auth callback page</div>,
}))

vi.mock('../features/dashboard/DashboardLayout', async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    DashboardLayout: () => (
      <div>
        <div>Dashboard shell</div>
        <Outlet />
      </div>
    ),
  }
})

vi.mock('../features/dashboard/pages/DiscoverPage', async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))

  return {
    DiscoverPage: () => <div>Discover content</div>,
  }
})

vi.mock('../features/dashboard/pages/BrowsePage', () => ({
  BrowsePage: () => <div>Browse content</div>,
}))

vi.mock('../features/dashboard/pages/ContributorsPage', () => ({
  ContributorsPage: () => <div>Contributors content</div>,
}))

vi.mock('../features/dashboard/pages/ProfilePage', () => ({
  ProfilePage: () => <div>Profile content</div>,
}))

vi.mock('../features/dashboard/pages/DataPage', () => ({
  DataPage: () => <div>Data content</div>,
}))

vi.mock('../features/leaderboard/pages/LeaderboardPage', () => ({
  LeaderboardPage: () => <div>Leaderboard content</div>,
}))

vi.mock('../features/blog/pages/BlogPage', () => ({
  BlogPage: () => <div>Blog content</div>,
}))

vi.mock('../features/blog/pages/BlogArticlePage', () => ({
  BlogArticlePage: () => <div>Blog article content</div>,
}))

vi.mock('../features/settings/pages/SettingsPage', () => ({
  SettingsPage: () => <div>Settings content</div>,
}))

vi.mock('../features/admin/pages/AdminPage', () => ({
  AdminPage: () => <div>Admin content</div>,
}))

vi.mock('../features/dashboard/routeWrappers', () => ({
  OpenSourceWeekPageRoute: () => <div>Open Source Week content</div>,
  OpenSourceWeekDetailPageRoute: () => <div>Open Source Week detail</div>,
  EcosystemsPageRoute: () => <div>Ecosystems content</div>,
  EcosystemDetailPageRoute: () => <div>Ecosystem detail</div>,
  MaintainersPageRoute: () => <div>Maintainers content</div>,
  ProjectDetailPageRoute: () => <div>Project detail</div>,
  IssueDetailPageRoute: () => <div>Issue detail</div>,
  SearchPageRoute: () => <div>Search content</div>,
}))

import App from './App'

describe('App route code splitting', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/dashboard/discover')
    localStorage.clear()
    mockAuth.current = {
      isLoading: false,
      isAuthenticated: true,
      userRole: 'contributor',
      login: vi.fn(),
      logout: vi.fn(),
    }
  })

  it('shows a themed route fallback before lazy dashboard content resolves', async () => {
    render(<App />)

    expect(screen.getByRole('status', { name: /loading route/i })).toBeInTheDocument()
    expect(screen.queryByText('Dashboard shell')).not.toBeInTheDocument()

    expect(await screen.findByText('Dashboard shell')).toBeInTheDocument()
    expect(await screen.findByText('Discover content')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: /loading route/i })).not.toBeInTheDocument()
  })

  it('keeps protected lazy route chunks behind the auth guard while auth is loading', () => {
    mockAuth.current = {
      isLoading: true,
      isAuthenticated: false,
      userRole: null,
      login: vi.fn(),
      logout: vi.fn(),
    }

    render(<App />)

    expect(screen.getByRole('status', { name: /checking authentication/i })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: /loading route/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard shell')).not.toBeInTheDocument()
  })
})
