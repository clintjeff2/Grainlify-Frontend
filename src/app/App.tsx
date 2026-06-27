import { lazy, Suspense, type ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../shared/contexts/AuthContext'
import { ThemeProvider } from '../shared/contexts/ThemeContext'
import { LandingPage } from '../features/landing'
import { SignInPage, SignUpPage, AuthCallbackPage } from '../features/auth'
import { NotFoundPage } from '../shared/components/NotFoundPage'
import { RoleGuard } from '../shared/components/RoleGuard'
import { AuthGuard } from '../shared/components/AuthGuard'
import Toast from '../shared/components/Toast'
import { I18nProvider } from '../shared/i18n'
import { ScrollToTop } from '../shared/components/ScrollToTop'
import { SkeletonLoader } from '../shared/components/SkeletonLoader'

const DashboardLayout = lazy(() =>
  import('../features/dashboard/DashboardLayout').then((module) => ({
    default: module.DashboardLayout,
  }))
)
const DiscoverPage = lazy(() =>
  import('../features/dashboard/pages/DiscoverPage').then((module) => ({
    default: module.DiscoverPage,
  }))
)
const BrowsePage = lazy(() =>
  import('../features/dashboard/pages/BrowsePage').then((module) => ({
    default: module.BrowsePage,
  }))
)
const ContributorsPage = lazy(() =>
  import('../features/dashboard/pages/ContributorsPage').then((module) => ({
    default: module.ContributorsPage,
  }))
)
const ProfilePage = lazy(() =>
  import('../features/dashboard/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  }))
)
const DataPage = lazy(() =>
  import('../features/dashboard/pages/DataPage').then((module) => ({
    default: module.DataPage,
  }))
)
const LeaderboardPage = lazy(() =>
  import('../features/leaderboard/pages/LeaderboardPage').then((module) => ({
    default: module.LeaderboardPage,
  }))
)
const BlogPage = lazy(() =>
  import('../features/blog/pages/BlogPage').then((module) => ({
    default: module.BlogPage,
  }))
)
const BlogArticlePage = lazy(() =>
  import('../features/blog/pages/BlogArticlePage').then((module) => ({
    default: module.BlogArticlePage,
  }))
)
const SettingsPage = lazy(() =>
  import('../features/settings/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  }))
)
const AdminPage = lazy(() =>
  import('../features/admin/pages/AdminPage').then((module) => ({
    default: module.AdminPage,
  }))
)
const OpenSourceWeekPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.OpenSourceWeekPageRoute,
  }))
)
const OpenSourceWeekDetailPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.OpenSourceWeekDetailPageRoute,
  }))
)
const EcosystemsPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.EcosystemsPageRoute,
  }))
)
const EcosystemDetailPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.EcosystemDetailPageRoute,
  }))
)
const MaintainersPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.MaintainersPageRoute,
  }))
)
const ProjectDetailPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.ProjectDetailPageRoute,
  }))
)
const IssueDetailPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.IssueDetailPageRoute,
  }))
)
const SearchPageRoute = lazy(() =>
  import('../features/dashboard/routeWrappers').then((module) => ({
    default: module.SearchPageRoute,
  }))
)

/**
 * Applies the three-state authentication boundary to protected routes.
 * Loading renders only the guard fallback, authenticated renders the route,
 * and unauthenticated redirects to sign in while preserving `returnTo`.
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  return <AuthGuard>{children}</AuthGuard>
}

function RouteLoadingFallback() {
  return (
    <div
      className="min-h-[60vh] px-6 py-10"
      role="status"
      aria-live="polite"
      aria-label="Loading route"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <SkeletonLoader className="h-10 w-64 max-w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonLoader className="h-28" />
          <SkeletonLoader className="h-28" />
          <SkeletonLoader className="h-28" />
        </div>
        <SkeletonLoader className="h-72" />
        <span className="sr-only">Loading route</span>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/discover" replace />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="open-source-week" element={<OpenSourceWeekPageRoute />} />
        <Route path="open-source-week/:eventId" element={<OpenSourceWeekDetailPageRoute />} />
        <Route path="ecosystems" element={<EcosystemsPageRoute />} />
        <Route path="ecosystems/:ecosystemId" element={<EcosystemDetailPageRoute />} />
        <Route path="contributors" element={<ContributorsPage />} />
        <Route path="maintainers" element={<RoleGuard allow={['maintainer', 'admin']}><MaintainersPageRoute /></RoleGuard>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPageRoute />} />
        <Route path="projects/:projectId/issues/:issueId" element={<IssueDetailPageRoute />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="blog" element={<BlogPage />} />
        {/* Deep link to an individual article. The `:slug` param is
            untrusted input — see BlogArticlePage for sanitize+lookup. */}
        <Route path="blog/:slug" element={<BlogArticlePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<RoleGuard allow={['admin']}><AdminPage /></RoleGuard>} />
        <Route path="search" element={<SearchPageRoute />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ScrollToTop />
            {/* Skip link: visible on keyboard focus, hidden otherwise */}
            <a
              href="#main"
              id="skip-target"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:shadow"
            >
              Skip to main content
            </a>
            <main id="main" tabIndex={-1} className="outline-none overflow-x-hidden">
              <Suspense fallback={<RouteLoadingFallback />}>
                <AppRoutes />
              </Suspense>
              <Toast />
            </main>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </I18nProvider>
  )
}
