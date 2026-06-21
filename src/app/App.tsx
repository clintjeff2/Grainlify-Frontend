import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../shared/contexts/AuthContext";
import { ThemeProvider } from "../shared/contexts/ThemeContext";
import { LandingPage } from "../features/landing";
import { SignInPage, SignUpPage, AuthCallbackPage } from "../features/auth";
import { DashboardLayout } from "../features/dashboard/DashboardLayout";
import { DiscoverPage } from "../features/dashboard/pages/DiscoverPage";
import { BrowsePage } from "../features/dashboard/pages/BrowsePage";
import { ContributorsPage } from "../features/dashboard/pages/ContributorsPage";
import { ProfilePage } from "../features/dashboard/pages/ProfilePage";
import { DataPage } from "../features/dashboard/pages/DataPage";
import { LeaderboardPage } from "../features/leaderboard/pages/LeaderboardPage";
import { BlogPage } from "../features/blog/pages/BlogPage";
import { BlogArticlePage } from "../features/blog/pages/BlogArticlePage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { AdminPage } from "../features/admin/pages/AdminPage";
import {
  OpenSourceWeekPageRoute,
  OpenSourceWeekDetailPageRoute,
  EcosystemsPageRoute,
  EcosystemDetailPageRoute,
  MaintainersPageRoute,
  ProjectDetailPageRoute,
  IssueDetailPageRoute,
  SearchPageRoute,
} from "../features/dashboard/routeWrappers";
import { NotFoundPage } from "../shared/components/NotFoundPage";
import { RoleGuard } from "../shared/components/RoleGuard";
import Toast from "../shared/components/Toast";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return children; // let AuthProvider finish initial check
  if (!isAuthenticated) {
    const returnTo = location.pathname + (location.search || "");
    const signinUrl = returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : "/signin";
    return <Navigate to={signinUrl} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="overflow-x-hidden">
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
            <Toast />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
