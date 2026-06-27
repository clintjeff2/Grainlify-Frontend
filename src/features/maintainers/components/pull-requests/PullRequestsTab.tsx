import { logger } from '../../../../shared/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, ShieldOff } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useOptimisticData } from '../../../../shared/hooks/useOptimisticData';
import { PRFilterType } from '../../types';
import { PRRow } from './PRRow';
import { PRFilterDropdown } from './PRFilterDropdown';
import { getMaintainerPRs } from '../../../../shared/api/client';
import { PRRowSkeleton } from '../../../../shared/components/PRRowSkeleton';

interface PRFromAPI {
  github_pr_id: number;
  number: number;
  state: string;
  title: string;
  author_login: string;
  url: string;
  merged: boolean;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
  merged_at: string | null;
  last_seen_at: string;
}

interface Project {
  id: string;
  github_full_name: string;
  status: string;
}

interface PullRequestsTabProps {
  selectedProjects: Project[];
  onRefresh?: () => void;
}

/**
 * Explicit empty-state buckets for the PR table.
 *
 * Keeping these states separate avoids a generic "no rows" message and lets
 * the UI tell the user whether they need to select repositories, wait for PRs
 * to exist for the selected repositories, or clear filters.
 */
type EmptyStateKind = 'no-repos' | 'no-prs' | 'no-matches';

/**
 * Returns the empty-state bucket to render after loading and errors have been
 * ruled out.
 */
function getEmptyStateKind({
  selectedProjectCount,
  totalPullRequests,
  hasActiveFilters,
}: {
  selectedProjectCount: number;
  totalPullRequests: number;
  hasActiveFilters: boolean;
}): EmptyStateKind | null {
  if (selectedProjectCount === 0) {
    return 'no-repos';
  }

  if (totalPullRequests === 0) {
    return 'no-prs';
  }

  if (hasActiveFilters) {
    return 'no-matches';
  }

  return null;
}

export function PullRequestsTab({ selectedProjects }: PullRequestsTabProps) {
  const { theme } = useTheme();
  const { userRole } = useAuth();
  const isAuthorized = userRole === 'maintainer' || userRole === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PRFilterType>('All states');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const {
    data: prs,
    isLoading,
    hasError,
    error,
    retry,
    fetchData,
  } = useOptimisticData<Array<PRFromAPI & { projectName: string }>>([], {
    cacheKey: `maintainer-prs-${selectedProjects.map((p) => p.id).join(',')}`,
    cacheDuration: 30000,
  });

  const loadPRs = useCallback(async () => {
    if (!isAuthorized) return;
    await fetchData(async (signal) => {
      if (selectedProjects.length === 0) {
        return [];
      }

      // Fetch PRs from all selected projects in parallel
      let successCount = 0;
      let lastError: any = null;

      const prPromises = selectedProjects.map(async (project: Project) => {
        try {
          const response = await getMaintainerPRs(project.id, { signal });
          successCount++;
          return (response.prs || []).map((pr: PRFromAPI) => ({
            ...pr,
            projectName: project.github_full_name,
          }));
        } catch (err) {
          logger.error(`Failed to fetch PRs for ${project.github_full_name}:`, err);
          lastError = err;
          return [];
        }
      });

      const allPRs = await Promise.all(prPromises);
      if (selectedProjects.length > 0 && successCount === 0 && lastError) {
        throw lastError;
      }
      const flattenedPRs = allPRs.flat();

      // Sort by updated_at (most recent first)
      flattenedPRs.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.last_seen_at).getTime();
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.last_seen_at).getTime();
        return dateB - dateA;
      });

      return flattenedPRs;
    });
  }, [selectedProjects, fetchData, isAuthorized]);

  // Fetch PRs from selected projects
  useEffect(() => {
    loadPRs();
  }, [loadPRs]);

  // Refresh PRs when selectedProjects change
  // Also refresh when page becomes visible (user switches back to tab)
  // And when repositories are refreshed (new repo added)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPRs();
      }
    };

    const handleRepositoriesRefreshed = () => {
      // Refresh PRs when repositories are added or updated.
      loadPRs();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('repositories-refreshed', handleRepositoriesRefreshed);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('repositories-refreshed', handleRepositoriesRefreshed);
    };
  }, [loadPRs]);

  if (!isAuthorized) {
    return (
      <div className={`backdrop-blur-[40px] rounded-[24px] border p-8 flex flex-col items-center justify-center text-center transition-colors ${
        theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
      }`}>
        <ShieldOff className="w-16 h-16 text-red-500/70 mb-4" strokeWidth={1.5} />
        <h3 className={`text-[20px] font-bold mb-2 transition-colors ${
          theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
        }`}>Access Restricted</h3>
        <p className={`text-[14px] max-w-md transition-colors ${
          theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
        }`}>
          You must be a project maintainer or admin to access pull request data.
        </p>
      </div>
    );
  }

  // Filter PRs based on search and filter
  const filteredPRs = prs.filter(pr => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      pr.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      pr.author_login.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter - map API state to filter type
    let matchesStatus = true;
    if (filter !== 'All states') {
      if (filter === 'Merged') {
        matchesStatus = pr.merged === true;
      } else if (filter === 'Open') {
        matchesStatus = pr.state === 'open';
      } else if (filter === 'Closed') {
        matchesStatus = pr.state === 'closed' && pr.merged === false;
      } else if (filter === 'Draft') {
        // GitHub API doesn't have draft state in the response we're getting
        // We'll skip draft filter for now or check title/body
        matchesStatus = false; // No draft info in current API response
      }
    }

    return matchesSearch && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilter('All states');
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || filter !== 'All states';
  const emptyStateKind = !isLoading && !error
    ? getEmptyStateKind({
        selectedProjectCount: selectedProjects.length,
        totalPullRequests: prs.length,
        hasActiveFilters,
      })
    : null;

  return (
    <div className={`backdrop-blur-[40px] rounded-[24px] border p-8 transition-colors ${
      theme === 'dark'
        ? 'bg-[#2d2820]/[0.4] border-white/10'
        : 'bg-white/[0.12] border-white/20'
    }`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-[28px] font-bold mb-2 transition-colors ${
          theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
        }`}>Pull Requests</h2>
        <p className={`text-[14px] transition-colors ${
          theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
        }`}>Review and manage pull requests with quality indicators and contributor insights.</p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`} />
          <input
            type="text"
            placeholder="Search pull request by title or author name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-11 pr-4 py-3 rounded-[14px] backdrop-blur-[25px] border text-[14px] focus:outline-none transition-all ${
              theme === 'dark'
                ? 'bg-white/[0.08] border-white/20 text-[#e8dfd0] placeholder:text-[#8a7b6a] focus:bg-white/[0.12] focus:border-[#c9983a]/40'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder:text-[#9a8b7a] focus:bg-white/[0.2] focus:border-[#c9983a]/40'
            }`}
          />
        </div>

        {/* Filter Dropdown */}
        <PRFilterDropdown
          value={filter}
          onChange={setFilter}
          isOpen={isFilterDropdownOpen}
          onToggle={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
          onClose={() => setIsFilterDropdownOpen(false)}
        />

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            className={`px-5 py-3 rounded-[14px] backdrop-blur-[25px] border transition-all ${
              theme === 'dark'
                ? 'bg-white/[0.08] border-white/20 hover:bg-white/[0.12] hover:border-[#c9983a]/30 text-[#b8a898]'
                : 'bg-white/[0.15] border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/30 text-[#7a6b5a]'
            }`}
            onClick={handleClearFilters}
            type="button"
          >
            <span className="text-[14px] font-semibold">Clear filters</span>
          </button>
        )}
      </div>

      {/* Pull Requests Table */}
      <div className="space-y-4">
        {/* Table Header */}
        <div className={`grid grid-cols-[2fr_1.5fr_1fr_0.5fr] gap-6 px-6 py-3 border-b-2 transition-colors ${
          theme === 'dark' ? 'border-white/20' : 'border-white/20'
        }`}>
          <div className={`text-[12px] font-bold uppercase tracking-wide transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}>Pull Request</div>
          <div className={`text-[12px] font-bold uppercase tracking-wide transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}>Author</div>
          <div className={`text-[12px] font-bold uppercase tracking-wide transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}>Repository</div>
          <div className={`text-[12px] font-bold uppercase tracking-wide transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}>Indicators</div>
        </div>

        {/* Pull Request Rows */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(8)].map((_, idx) => (
              <PRRowSkeleton key={idx} />
            ))}
          </div>
        ) : hasError ? (
          <div className={`flex flex-col items-center gap-3 px-6 py-6 mx-4 rounded-[16px] border transition-colors ${
            theme === 'dark'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-red-100/50 border-red-300/40 text-red-700'
          }`}>
            <AlertCircle className="w-8 h-8 flex-shrink-0" />
            <div className="text-center">
              <p className="text-[14px] font-semibold mb-1">Failed to load pull requests</p>
              <p className="text-[12px] opacity-80 mb-3">
                {error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unknown error occurred'}
              </p>
              <button
                onClick={retry}
                className={`px-4 py-2 rounded-[10px] text-[12px] font-bold border transition-all ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                    : 'bg-white hover:bg-white/50 border-gray-300 text-gray-800'
                }`}
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : filteredPRs.length > 0 ? (
          filteredPRs.map((pr) => {
            // Determine status: merged takes priority, then state
            const status: 'merged' | 'draft' | 'open' | 'closed' = pr.merged 
              ? 'merged' 
              : (pr.state === 'open' ? 'open' : 'closed');
            
            // Determine which date to use for status detail
            let statusDate: string;
            let statusAction: string;
            if (pr.merged && pr.merged_at) {
              statusDate = pr.merged_at;
              statusAction = 'merged';
            } else if (pr.state === 'closed' && pr.closed_at) {
              statusDate = pr.closed_at;
              statusAction = 'closed';
            } else if (pr.state === 'open' && pr.created_at) {
              statusDate = pr.created_at;
              statusAction = 'opened';
            } else {
              statusDate = pr.updated_at || pr.last_seen_at;
              statusAction = pr.state;
            }

            // Convert API PR to component format
            const prForComponent = {
              id: pr.github_pr_id,
              number: pr.number,
              title: pr.title,
              status: status,
              statusDetail: `${statusAction} ${formatTimeAgo(statusDate)}`,
              url: pr.url, // Add URL for clicking
              author: {
                name: pr.author_login,
                avatar: '',
                badges: [],
              },
              repo: pr.projectName.split('/')[1] || pr.projectName,
              org: pr.projectName.split('/')[0] || '',
              indicators: [] as ('check' | 'x' | 'trophy' | 'eye' | 'code')[],
            };
            return <PRRow key={`${pr.github_pr_id}-${pr.projectName}`} pr={prForComponent} />;
          })
        ) : (
          <div
            className={`text-center py-12 px-6 rounded-[16px] border ${
              theme === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.08] border-white/15'
            }`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {emptyStateKind === 'no-repos' ? (
              <>
                <p className={`text-[14px] font-medium mb-1 transition-colors ${
                  theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                }`}>
                  Select one or more repositories to view pull requests
                </p>
                <p className={`text-[12px] transition-colors ${
                  theme === 'dark' ? 'text-[#8a7b6a]' : 'text-[#9a8b7a]'
                }`}>
                  Use the repository selector above to choose which repositories to include.
                </p>
              </>
            ) : emptyStateKind === 'no-prs' ? (
              <>
                <p className={`text-[14px] font-medium mb-1 transition-colors ${
                  theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                }`}>
                  No pull requests were found in the selected repositories
                </p>
                <p className={`text-[12px] transition-colors ${
                  theme === 'dark' ? 'text-[#8a7b6a]' : 'text-[#9a8b7a]'
                }`}>
                  Try a different repository selection or come back after new pull requests are opened.
                </p>
              </>
            ) : (
              <>
                <p className={`text-[14px] font-medium mb-1 transition-colors ${
                  theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
                }`}>
                  No pull requests match the current search or state filters
                </p>
                <p className={`text-[12px] mb-4 transition-colors ${
                  theme === 'dark' ? 'text-[#8a7b6a]' : 'text-[#9a8b7a]'
                }`}>
                  Clear the search or state filter to bring rows back into view.
                </p>
                <button
                  className={`px-5 py-3 rounded-[14px] backdrop-blur-[25px] border transition-all ${
                    theme === 'dark'
                      ? 'bg-white/[0.08] border-white/20 hover:bg-white/[0.12] hover:border-[#c9983a]/30 text-[#b8a898]'
                      : 'bg-white/[0.15] border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/30 text-[#7a6b5a]'
                  }`}
                  onClick={handleClearFilters}
                  type="button"
                >
                  <span className="text-[14px] font-semibold">Clear filters</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
}
