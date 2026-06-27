import { logger } from '../../../../shared/utils/logger';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { FileText, GitPullRequest, GitMerge, AlertCircle, FolderOpen } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { StatsCard } from './StatsCard';
import { StatsCardSkeleton } from './StatsCardSkeleton';
import { ActivityItem } from './ActivityItem';
import { ApplicationsChart } from './ApplicationsChart';
import { StatCard, Activity, ChartDataPoint } from '../../types';
import { getProjectIssues, getProjectPRs } from '../../../../shared/api/client';
import { ActivityItemSkeleton } from '../../../../shared/components/ActivityItemSkeleton';
import { ChartSkeleton } from '../../../../shared/components/ChartSkeleton';

interface Project {
  id: string;
  github_full_name: string;
  status: string;
}

/**
 * Props for the {@link DashboardTab} component.
 */
interface DashboardTabProps {
  /** The list of projects currently selected in the sidebar. */
  selectedProjects: Project[];
  /** When true, parent is still loading the project list; show loading skeleton instead of empty state. */
  isLoadingProjects?: boolean;
  onRefresh?: () => void;
  /** Called when the user clicks an issue activity row, with the issue id and owning project id. */
  onNavigateToIssue?: (issueId: string, projectId: string) => void;
  /** Called when the user clicks a PR activity row, with the PR id. */
  onNavigateToPR?: (prId: string) => void;
}

/**
 * Clamps a computed stat value to a safe non-negative integer.
 * Defends against NaN/Infinity leaking into displayed stats.
 */
function safeStatValue(v: number): number {
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

/**
 * Main dashboard panel for maintainers.
 *
 * Fetches issues and PRs for all selected projects, computes aggregate stats,
 * and renders stat cards, a recent-activity timeline, and a monthly chart.
 *
 * Error handling:
 * - Per-project fetch failures are swallowed so one bad project does not blank
 *   the entire view.
 * - An outer-level failure (e.g. unexpected throw) surfaces an error banner with
 *   a retry button instead of silently staying in skeleton state forever.
 *
 * Empty state:
 * - When no project is selected a CTA prompt is rendered instead of empty data.
 */
export function DashboardTab({ selectedProjects, isLoadingProjects = false, onNavigateToIssue, onNavigateToPR }: DashboardTabProps) {
  const { theme } = useTheme();
  const [issues, setIssues] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Show loading when parent is loading projects OR when we're loading dashboard data
  const showLoading = isLoadingProjects || isLoading;

  /**
   * Return a navigation handler only when the activity row has a valid destination.
   * Issue activities require a project destination. PR activities require a PR navigator.
   */
  const getActivityClickHandler = (activity: Activity) => {
    if (activity.type === 'issue' && activity.projectId && onNavigateToIssue) {
      return () => onNavigateToIssue(activity.id.toString(), activity.projectId!);
    }

    if (activity.type === 'pr' && onNavigateToPR) {
      return () => onNavigateToPR(activity.id.toString());
    }

    return undefined;
  };

  // Fetch data from selected projects (only when parent has finished loading and we have projects)
  useEffect(() => {
    if (isLoadingProjects) return;
    loadData();
    // Reset expanded state when projects change
    setShowAllActivities(false);
  }, [selectedProjects, isLoadingProjects]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedProjects.length === 0) {
        setIssues([]);
        setPrs([]);
        setIsLoading(false);
        return;
      }

      // Track how many per-project fetches fail so we can surface an error
      // if every single request bounces (network down, auth expired, etc.).
      let fetchFailures = 0;
      const totalFetches = selectedProjects.length * 2;

      // Fetch issues and PRs from all selected projects
      const [issuesData, prsData] = await Promise.all([
        Promise.all(selectedProjects.map(async (project) => {
          try {
            const response = await getProjectIssues(project.id);
            return (response.issues || []).map((issue: any) => ({
              ...issue,
              projectName: project.github_full_name,
            }));
          } catch (err) {
            logger.error(`Failed to fetch issues for ${project.github_full_name}:`, err);
            fetchFailures++;
            return [];
          }
        })),
        Promise.all(selectedProjects.map(async (project) => {
          try {
            const response = await getProjectPRs(project.id);
            return (response.prs || []).map((pr: any) => ({
              ...pr,
              projectName: project.github_full_name,
            }));
          } catch (err) {
            logger.error(`Failed to fetch PRs for ${project.github_full_name}:`, err);
            fetchFailures++;
            return [];
          }
        })),
      ]);

      // All fetches failed — surface an error instead of displaying empty data
      if (fetchFailures >= totalFetches) {
        setError('Failed to load dashboard data. Please try again.');
        setIsLoading(false);
        return;
      }

      const allIssues = issuesData.flat();
      const allPRs = prsData.flat();

      // Sort by updated_at (most recent first)
      allIssues.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.last_seen_at).getTime();
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.last_seen_at).getTime();
        return dateB - dateA;
      });

      allPRs.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.last_seen_at).getTime();
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.last_seen_at).getTime();
        return dateB - dateA;
      });

      setIssues(allIssues);
      setPrs(allPRs);
      setIsLoading(false);
    } catch (err) {
      logger.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      setIsLoading(false);
    }
  };

  // Refresh data when page becomes visible (user switches back to tab)
  // And when repositories are refreshed (new repo added)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedProjects.length > 0) {
        loadData();
      }
    };

    const handleRepositoriesRefreshed = () => {
      // Refresh dashboard data when repositories are added/updated
      if (selectedProjects.length > 0) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('repositories-refreshed', handleRepositoriesRefreshed);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('repositories-refreshed', handleRepositoriesRefreshed);
    };
  }, [selectedProjects]);

  // Helper function to format time ago (memoized to prevent unnecessary re-renders)
  const formatTimeAgo = useCallback((date: Date): string => {
    const timeMs = date.getTime();
    if (isNaN(timeMs)) {
      return 'unknown time';
    }
    const now = new Date();
    const diffMs = now.getTime() - timeMs;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }, []);

  /**
   * Safely parses a date string, returning its Unix timestamp in milliseconds.
   * Returns 0 if the date string is null, undefined, or invalid to prevent NaN sorting issues.
   * 
   * @param dateStr - The date string to parse.
   * @returns The parsed Unix time in milliseconds, or 0 if invalid.
   */
  const safeParseDate = useCallback((dateStr?: string | null): number => {
    if (!dateStr) return 0;
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Calculate stats from real data
  const stats: StatCard[] = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentIssues = issues.filter(issue => {
      const updatedAt = issue.updated_at ? new Date(issue.updated_at) : new Date(issue.last_seen_at);
      return updatedAt >= sevenDaysAgo;
    });

    const recentPRs = prs.filter(pr => {
      const updatedAt = pr.updated_at ? new Date(pr.updated_at) : new Date(pr.last_seen_at);
      return updatedAt >= sevenDaysAgo;
    });

    const openedPRs = recentPRs.filter(pr => pr.state === 'open');
    const mergedPRs = recentPRs.filter(pr => pr.merged === true);

    return [
      {
        id: 1,
        title: 'Issue Views',
        subtitle: 'Last 7 days',
        value: safeStatValue(recentIssues.length),
        change: 0,
        icon: FileText,
      },
      {
        id: 2,
        title: 'Issue Applications',
        subtitle: 'Last 7 days',
        value: safeStatValue(recentIssues.reduce((sum, issue) => sum + (issue.comments_count || 0), 0)),
        change: 0,
        icon: FileText,
      },
      {
        id: 3,
        title: 'Pull Requests Opened',
        subtitle: 'Last 7 days',
        value: safeStatValue(openedPRs.length),
        change: openedPRs.length > 0 ? 100 : 0,
        icon: GitPullRequest,
      },
      {
        id: 4,
        title: 'Pull Requests Merged',
        subtitle: 'Last 7 days',
        value: safeStatValue(mergedPRs.length),
        change: mergedPRs.length > 0 ? 100 : 0,
        icon: GitMerge,
      },
    ];
  }, [issues, prs]);

  // Generate activity from real data
  const activities: Activity[] = useMemo(() => {
    const combined: Activity[] = [];

    // Add recent PRs
    prs.slice(0, 10).forEach(pr => {
      const timestamp = pr.updated_at || pr.last_seen_at || '';
      combined.push({
        id: pr.github_pr_id,
        type: 'pr',
        number: pr.number,
        title: pr.title,
        label: pr.merged ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed',
        timestamp,
        timeAgo: timestamp ? formatTimeAgo(new Date(timestamp)) : 'unknown time',
      });
    });

    // Add recent issues
    issues.slice(0, 10).forEach(issue => {
      const timestamp = issue.updated_at || issue.last_seen_at || '';
      combined.push({
        id: issue.github_issue_id,
        type: 'issue',
        number: issue.number,
        title: issue.title,
        label: issue.comments_count > 0 ? `${issue.comments_count} comment${issue.comments_count !== 1 ? 's' : ''}` : null,
        projectId: issue.projectId,
        timestamp,
        timeAgo: timestamp ? formatTimeAgo(new Date(timestamp)) : 'unknown time',
      });
    });

    // Sort by timestamp (most recent first) with stable tie-breaking
    const indexed = combined.map((activity, idx) => ({ activity, idx }));
    indexed.sort((a, b) => {
      const timeA = safeParseDate(a.activity.timestamp);
      const timeB = safeParseDate(b.activity.timestamp);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return a.idx - b.idx; // Stable tie-breaking using original array indices
    });

    return indexed.map(item => item.activity);
  }, [issues, prs, formatTimeAgo, safeParseDate]);

  // Generate chart data from real data (last 6 months)
  const chartData: ChartDataPoint[] = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const now = new Date();

    return months.map((month, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);

      const monthIssues = issues.filter(issue => {
        const createdAt = issue.updated_at ? new Date(issue.updated_at) : new Date(issue.last_seen_at);
        return createdAt >= monthDate && createdAt < nextMonth;
      });

      const monthPRs = prs.filter(pr => {
        const createdAt = pr.updated_at ? new Date(pr.updated_at) : new Date(pr.last_seen_at);
        return createdAt >= monthDate && createdAt < nextMonth;
      });

      const mergedPRs = monthPRs.filter(pr => pr.merged);

      return {
        month,
        applications: monthIssues.reduce((sum, issue) => sum + (issue.comments_count || 0), 0),
        merged: mergedPRs.length,
      };
    });
  }, [issues, prs]);

  // No-project CTA — rendered before skeleton/error so parent loading is still covered
  if (!showLoading && !error && selectedProjects.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[24px] border p-16 text-center ${
          theme === 'dark'
            ? 'bg-[#2d2820]/[0.4] border-white/10 text-[#b8a898]'
            : 'bg-white/[0.12] border-white/20 text-[#7a6b5a]'
        }`}
        data-testid="empty-state"
      >
        <FolderOpen className="w-12 h-12 mb-4 opacity-40" />
        <h2 className={`text-[18px] font-bold mb-2 ${theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'}`}>
          No repository selected
        </h2>
        <p className="text-[14px] max-w-xs">
          Select one or more repositories from the sidebar to view your dashboard stats.
        </p>
      </div>
    );
  }

  // Error state — replaces all content and offers a retry
  if (!showLoading && error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[24px] border p-16 text-center ${
          theme === 'dark'
            ? 'bg-[#2d2820]/[0.4] border-white/10 text-[#b8a898]'
            : 'bg-white/[0.12] border-white/20 text-[#7a6b5a]'
        }`}
        data-testid="error-state"
      >
        <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
        <h2 className={`text-[18px] font-bold mb-2 ${theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'}`}>
          Failed to load dashboard
        </h2>
        <p className="text-[14px] mb-6 max-w-xs">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-2.5 rounded-[10px] backdrop-blur-[25px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/20 border border-[#c9983a]/40 text-[13px] font-semibold text-[#c9983a] hover:from-[#c9983a]/35 hover:to-[#d4af37]/30 hover:scale-105 transition-all duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-5">
        {showLoading ? (
          [...Array(4)].map((_, idx) => (
            <StatsCardSkeleton key={idx} />
          ))
        ) : (
          stats.map((stat, idx) => (
            <StatsCard key={stat.id} stat={stat} index={idx} />
          ))
        )}
      </div>

      {/* Main Content: Last Activity & Applications History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Last Activity */}
        <div className={`backdrop-blur-[40px] rounded-[24px] border p-8 relative overflow-hidden group/activity transition-colors ${theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
          {/* Background Glow */}
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#c9983a]/8 to-transparent rounded-full blur-3xl pointer-events-none group-hover/activity:scale-125 transition-transform duration-1000" />

          <div className="relative">
            <h2 className={`text-[20px] font-bold mb-6 transition-colors ${theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}>Last activity</h2>

            {/* Activity List */}
            {showLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <ActivityItemSkeleton key={idx} />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className={`text-center py-8 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                      No recent activity found.
                    </div>
                  ) : (
                    (showAllActivities ? activities : activities.slice(0, 5)).map((activity, idx) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        index={idx}
                        onClick={getActivityClickHandler(activity)}
                      />
                    ))
                  )}
                </div>
                {/* View More / Show Less Button */}
                {activities.length > 5 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className={`px-6 py-2.5 rounded-[10px] backdrop-blur-[25px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/20 border border-[#c9983a]/40 text-[13px] font-semibold text-[#c9983a] hover:from-[#c9983a]/35 hover:to-[#d4af37]/30 hover:scale-105 transition-all duration-200 ${
                        theme === 'dark' ? 'hover:border-[#c9983a]/60' : 'hover:border-[#c9983a]/50'
                      }`}
                    >
                      {showAllActivities ? 'Show less' : 'View more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Applications History */}
        <div className={`backdrop-blur-[40px] rounded-[24px] border p-8 relative overflow-hidden group/chart transition-colors ${theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
          {showLoading ? (
            <ChartSkeleton />
          ) : (
            <ApplicationsChart data={chartData} />
          )}
        </div>
      </div>
    </>
  );
}