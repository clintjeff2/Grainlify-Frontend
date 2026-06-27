import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { OpenSourceWeekPage } from './pages/OpenSourceWeekPage';
import { OpenSourceWeekDetailPage } from './pages/OpenSourceWeekDetailPage';
import { EcosystemsPage } from './pages/EcosystemsPage';
import { EcosystemDetailPage } from './pages/EcosystemDetailPage';
import { MaintainersPage } from '../maintainers/pages/MaintainersPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { SearchPage } from './pages/SearchPage';

// Open Source Week Page Wrapper
export function OpenSourceWeekPageRoute() {
  const navigate = useNavigate();
  
  const handleEventClick = (eventId: string, eventName: string) => {
    navigate(`/dashboard/open-source-week/${eventId}`, { state: { eventName } });
  };

  return <OpenSourceWeekPage onEventClick={handleEventClick} />;
}

// Open Source Week Detail Page Wrapper
export function OpenSourceWeekDetailPageRoute() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { eventName?: string } || {};
  const eventName = state.eventName || '';

  if (!eventId) return <Navigate to="/dashboard/open-source-week" replace />;

  const handleBack = () => {
    navigate('/dashboard/open-source-week');
  };

  return (
    <OpenSourceWeekDetailPage
      eventId={eventId}
      eventName={eventName}
      onBack={handleBack}
    />
  );
}

// Ecosystems Page Wrapper
export function EcosystemsPageRoute() {
  const navigate = useNavigate();

  const handleEcosystemClick = (
    ecosystemId: string,
    ecosystemName: string,
    description?: string | null,
    logoUrl?: string | null
  ) => {
    navigate(`/dashboard/ecosystems/${ecosystemId}`, {
      state: { ecosystemName, description, logoUrl }
    });
  };

  return <EcosystemsPage onEcosystemClick={handleEcosystemClick} />;
}

// Ecosystem Detail Page Wrapper
export function EcosystemDetailPageRoute() {
  const { ecosystemId } = useParams<{ ecosystemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    ecosystemName?: string;
    description?: string | null;
    logoUrl?: string | null;
  } || {};

  if (!ecosystemId) return <Navigate to="/dashboard/ecosystems" replace />;

  const handleBack = () => {
    navigate('/dashboard/ecosystems');
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}`, {
      state: { backTarget: 'ecosystems' }
    });
  };

  return (
    <EcosystemDetailPage
      ecosystemId={ecosystemId}
      ecosystemName={state.ecosystemName || ''}
      initialDescription={state.description || null}
      initialLogoUrl={state.logoUrl || null}
      onBack={handleBack}
      onProjectClick={handleProjectClick}
    />
  );
}

// Maintainers Page Wrapper
export function MaintainersPageRoute() {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    navigate(`/dashboard/${page}`);
  };

  return <MaintainersPage onNavigate={handleNavigate} />;
}

// Project Detail Page Wrapper
export function ProjectDetailPageRoute() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { backTarget?: string } || {};

  if (!projectId) return <Navigate to="/dashboard/browse" replace />;

  const handleBack = () => {
    if (state.backTarget) {
      navigate(`/dashboard/${state.backTarget}`);
    } else {
      navigate('/dashboard/browse');
    }
  };

  const handleIssueClick = (issueId: string, projectId: string) => {
    navigate(`/dashboard/projects/${projectId}/issues/${issueId}`);
  };

  const getBackLabel = () => {
    switch (state.backTarget) {
      case 'browse': return 'Back to Browse';
      case 'profile': return 'Back to Profile';
      case 'leaderboard': return 'Back to Leaderboard';
      case 'ecosystems': return 'Back to Ecosystems';
      case 'discover': return 'Back to Discover';
      default: return 'Back';
    }
  };

  return (
    <ProjectDetailPage
      projectId={projectId}
      backLabel={getBackLabel()}
      onBack={handleBack}
      onIssueClick={handleIssueClick}
    />
  );
}

// Issue Detail Page Wrapper
export function IssueDetailPageRoute() {
  const { projectId, issueId } = useParams<{ projectId: string; issueId: string }>();
  const navigate = useNavigate();

  if (!projectId) return <Navigate to="/dashboard/browse" replace />;
  if (!issueId) return <Navigate to={`/dashboard/projects/${projectId}`} replace />;

  const handleClose = () => {
    navigate(`/dashboard/projects/${projectId}`);
  };

  return (
    <IssueDetailPage
      issueId={issueId}
      projectId={projectId}
      onClose={handleClose}
    />
  );
}

// Search Page Wrapper
export function SearchPageRoute() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard/discover');
  };

  const handleIssueClick = (issueId?: string, projectId?: string) => {
    if (issueId && projectId) {
      navigate(`/dashboard/projects/${projectId}/issues/${issueId}`);
    } else {
      navigate('/dashboard/discover');
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}`, {
      state: { backTarget: 'discover' }
    });
  };

  const handleContributorClick = () => {
    navigate(`/dashboard/contributors`);
  };

  return (
    <SearchPage
      onBack={handleBack}
      onIssueClick={handleIssueClick}
      onProjectClick={handleProjectClick}
      onContributorClick={handleContributorClick}
    />
  );
}
