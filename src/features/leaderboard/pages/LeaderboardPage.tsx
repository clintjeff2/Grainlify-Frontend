import { logger } from '../../../shared/utils/logger'
import { useState, useEffect, useRef } from 'react'
import { LeaderboardType, FilterType, Petal, LeaderData, ProjectData } from '../types'
import { getLeaderboard, getRecommendedProjects } from '../../../shared/api/client'
import { clampLimit, clampOffset, hasMoreByPageSize } from '../../../shared/utils/pagination'
import { useTheme } from '../../../shared/contexts/ThemeContext'
import { FallingPetals } from '../components/FallingPetals'
import { LeaderboardTypeToggle } from '../components/LeaderboardTypeToggle'
import { LeaderboardHero } from '../components/LeaderboardHero'
import { ContributorsPodium } from '../components/ContributorsPodium'
import { ProjectsPodium } from '../components/ProjectsPodium'
import { FiltersSection } from '../components/FiltersSection'
import { ContributorsTable } from '../components/ContributorsTable'
import { ProjectsTable } from '../components/ProjectsTable'
import { LeaderboardStyles } from '../components/LeaderboardStyles'
import { ContributorsPodiumSkeleton } from '../components/ContributorsPodiumSkeleton'
import { ContributorsTableSkeleton } from '../components/ContributorsTableSkeleton'

/**
 * Number of contributors requested per leaderboard page.
 *
 * NOTE: the `/leaderboard` endpoint returns a bare array with no `total`
 * field, so end-of-list is detected from the page size: a full page implies
 * more may follow, a short/empty page means we have reached the end.
 */
const LEADERBOARD_PAGE_SIZE = 10

/**
 * Generic, user-facing error copy shown when a leaderboard fetch fails.
 *
 * Security: intentionally free of any backend/HTTP detail so a failure never
 * leaks internals to the UI; the underlying error is only sent to {@link logger}.
 */
const CONTRIBUTORS_ERROR = "We couldn't load contributors. Please try again."
const PROJECTS_ERROR = "We couldn't load projects. Please try again."

/** Transform a raw leaderboard API row into the UI {@link LeaderData} shape. */
function transformLeader(item: Awaited<ReturnType<typeof getLeaderboard>>[number]): LeaderData {
  return {
    rank: item.rank,
    rank_tier: item.rank_tier,
    rank_tier_name: item.rank_tier_name,
    username: item.username,
    avatar: item.avatar || `https://github.com/${item.username}.png?size=200`,
    user_id: item.user_id || '',
    score: item.score,
    trend: item.trend,
    trendValue: item.trendValue,
    contributions: item.contributions,
    ecosystems: item.ecosystems || [],
  }
}

export function LeaderboardPage() {
  const { theme } = useTheme()
  const [activeFilter, setActiveFilter] = useState<FilterType>('overall')
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('contributors')
  const [showEcosystemDropdown, setShowEcosystemDropdown] = useState(false)
  const [selectedEcosystem, setSelectedEcosystem] = useState({
    label: 'All Ecosystems',
    value: 'all',
  })
  const [petals, setPetals] = useState<Petal[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<LeaderData[]>([])
  const [projectsData, setProjectsData] = useState<ProjectData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  /** Generic error copy shown when the contributors fetch fails (null = ok). */
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  /** Generic error copy shown when the projects fetch fails (null = ok). */
  const [projectsError, setProjectsError] = useState<string | null>(null)
  // Bumping these tokens re-runs the corresponding fetch effect; the table
  // "Try again" buttons increment them to retry against the data source.
  const [contributorsRetry, setContributorsRetry] = useState(0)
  const [projectsRetry, setProjectsRetry] = useState(0)
  /** Offset (start index) of the last loaded contributors page. */
  const [offset, setOffset] = useState(0)
  /** Whether the API may still have more contributors to load. */
  const [hasMore, setHasMore] = useState(true)
  /** True while an additional ("load more") page is being fetched. */
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Synchronous guard so a rapid double-click of "Load more" cannot start two
  // concurrent requests before `isLoadingMore` state has flushed.
  const loadingMoreRef = useRef(false)

  const getProjectIcon = (githubFullName: string) => {
    const [owner] = githubFullName.split('/')
    // Use higher‑resolution owner avatar so leaderboard projects look crisp
    return `https://github.com/${owner}.png?size=200`
  }

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (leaderboardType === 'contributors') {
        setIsLoading(true)
        setLeaderboardError(null)
        // Changing leaderboard type / filter / ecosystem resets pagination.
        setOffset(0)
        setHasMore(true)
        const limit = clampLimit(LEADERBOARD_PAGE_SIZE)
        try {
          const data = await getLeaderboard(
            limit,
            0,
            selectedEcosystem.value !== 'all' ? selectedEcosystem.value : undefined
          )
          setLeaderboardData(data.map(transformLeader))
          // A full first page implies more may exist; a short page is the end.
          setHasMore(hasMoreByPageSize(data.length, limit))
          setIsLoading(false)
        } catch (err) {
          logger.error('Failed to fetch leaderboard:', err)
          setLeaderboardData([])
          setHasMore(false)
          // Surface a generic error state (with retry) rather than a blank table.
          setLeaderboardError(CONTRIBUTORS_ERROR)
          setIsLoading(false) // Set loading to false to show error state instead of skeleton
        }
      } else {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [leaderboardType, activeFilter, selectedEcosystem.value, contributorsRetry])

  // Fetch projects leaderboard (top projects by contributors count)
  useEffect(() => {
    if (leaderboardType !== 'projects') return
    let cancelled = false
    const fetchProjects = async () => {
      setIsLoadingProjects(true)
      setProjectsError(null)
      try {
        const res = await getRecommendedProjects(50)
        const projects = res?.projects ?? []
        if (cancelled) return
        const mapped: ProjectData[] = projects
          .filter((p) => (p.github_full_name.split('/')[1] || '') !== '.github')
          .map((p, idx) => {
            const repoName = p.github_full_name.split('/')[1] || p.github_full_name
            const contributors = p.contributors_count ?? 0
            const openIssues = p.open_issues_count ?? 0
            const activity =
              openIssues > 10
                ? 'Very High'
                : openIssues > 5
                  ? 'High'
                  : openIssues > 2
                    ? 'Medium'
                    : 'Low'
            return {
              id: p.id,
              rank: idx + 1,
              name: repoName,
              logo: getProjectIcon(p.github_full_name),
              score: contributors,
              trend: 'same' as const,
              trendValue: 0,
              contributors,
              ecosystems: p.ecosystem_name ? [p.ecosystem_name] : [],
              activity,
            }
          })
        setProjectsData(mapped)
      } catch (err) {
        logger.error('Failed to fetch recommended projects:', err)
        if (!cancelled) {
          setProjectsData([])
          // Surface a generic error state (with retry) rather than a blank table.
          setProjectsError(PROJECTS_ERROR)
        }
      } finally {
        if (!cancelled) setIsLoadingProjects(false)
      }
    }
    fetchProjects()
    return () => {
      cancelled = true
    }
  }, [leaderboardType, projectsRetry])

  /**
   * Append the next page of contributors to the leaderboard.
   *
   * Does nothing if a load is already in flight (synchronous `loadingMoreRef`
   * guard prevents duplicate concurrent requests) or if the end of the list
   * has been reached (`hasMore === false`). Paging values are clamped before
   * being sent to the API.
   */
  const loadMore = async () => {
    if (loadingMoreRef.current || isLoadingMore || !hasMore) return

    loadingMoreRef.current = true
    setIsLoadingMore(true)
    const limit = clampLimit(LEADERBOARD_PAGE_SIZE)
    const nextOffset = clampOffset(offset + limit)
    try {
      const data = await getLeaderboard(
        limit,
        nextOffset,
        selectedEcosystem.value !== 'all' ? selectedEcosystem.value : undefined
      )

      if (data.length > 0) {
        setLeaderboardData((prev) => [...prev, ...data.map(transformLeader)])
        setOffset(nextOffset)
      }
      // Disable "Load more" once a short/empty page signals the end of list.
      setHasMore(hasMoreByPageSize(data.length, limit))
    } catch (err) {
      logger.error('Failed to load more leaderboard:', err)
      setHasMore(false)
    } finally {
      loadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }

  // Generate falling petals on mount
  useEffect(() => {
    const generatePetals = () => {
      const newPetals: Petal[] = []
      for (let i = 0; i < 30; i++) {
        newPetals.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 5,
          duration: 8 + Math.random() * 6,
          rotation: Math.random() * 360,
          size: 0.6 + Math.random() * 0.8,
        })
      }
      setPetals(newPetals)
    }

    generatePetals();
    const loadTimer = setTimeout(() => setIsLoaded(true), 100);

    // Regenerate petals every 15 seconds for continuous effect
    const interval = setInterval(generatePetals, 15000);
    return () => {
      clearTimeout(loadTimer);
      clearInterval(interval);
    };
  }, []);

  // Ensure we have at least 3 items for the podium (pad with empty data if needed)
  const contributorTopThree: LeaderData[] = [
    ...leaderboardData.slice(0, 3),
    ...Array(Math.max(0, 3 - leaderboardData.length))
      .fill(null)
      .map((_, i) => ({
        rank: leaderboardData.length + i + 1,
        username: '-',
        avatar: '👤',
        score: 0,
        trend: 'same' as const,
        trendValue: 0,
        contributions: 0,
        ecosystems: [],
      })),
  ].slice(0, 3) as LeaderData[]

  const projectTopThree: ProjectData[] = [
    ...projectsData.slice(0, 3),
    ...Array(Math.max(0, 3 - projectsData.length))
      .fill(null)
      .map((_, i) => ({
        rank: projectsData.length + i + 1,
        name: '-',
        logo: '📦',
        score: 0,
        trend: 'same' as const,
        trendValue: 0,
        contributors: 0,
        ecosystems: [] as string[],
        activity: 'Low',
      })),
  ].slice(0, 3) as ProjectData[]

  return (
    <div className="space-y-6 relative">
      {/* Falling Golden Petals - Full Page */}
      <FallingPetals petals={petals} />

      {/* Leaderboard Type Toggle - Floating Above Everything */}
      <LeaderboardTypeToggle
        leaderboardType={leaderboardType}
        onToggle={setLeaderboardType}
        isLoaded={isLoaded}
      />

      {/* Hero Header Section */}
      <LeaderboardHero leaderboardType={leaderboardType} isLoaded={isLoaded}>
        {/* Top 3 Podium - Contributors */}
        {leaderboardType === 'contributors' && isLoading && <ContributorsPodiumSkeleton />}
        {leaderboardType === 'contributors' && !isLoading && leaderboardData.length > 0 && (
          <ContributorsPodium
            topThree={contributorTopThree}
            isLoaded={isLoaded}
            actualCount={leaderboardData.length}
          />
        )}
        {leaderboardType === 'contributors' && !isLoading && leaderboardData.length === 0 && (
          <div
            className={`text-center py-8 transition-colors ${
              theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}
          >
            No contributors yet. Be the first to contribute!
          </div>
        )}

        {/* Top 3 Podium - Projects */}
        {leaderboardType === 'projects' && isLoadingProjects && <ContributorsPodiumSkeleton />}
        {leaderboardType === 'projects' && !isLoadingProjects && projectsData.length > 0 && (
          <ProjectsPodium topThree={projectTopThree} isLoaded={isLoaded} />
        )}
        {leaderboardType === 'projects' && !isLoadingProjects && projectsData.length === 0 && (
          <div
            className={`text-center py-8 transition-colors ${
              theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}
          >
            No projects yet. Complete project setup to appear here.
          </div>
        )}
      </LeaderboardHero>

      {/* Filters Section */}
      <FiltersSection
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        selectedEcosystem={selectedEcosystem}
        onEcosystemChange={(ecosystem) => {
          setSelectedEcosystem(ecosystem)
        }}
        showDropdown={showEcosystemDropdown}
        onToggleDropdown={() => setShowEcosystemDropdown(!showEcosystemDropdown)}
        isLoaded={isLoaded}
      />

      {/* Leaderboard Table - Contributors */}
      {leaderboardType === 'contributors' && (
        <>
          {isLoading ? (
            <ContributorsTableSkeleton />
          ) : (
            <>
              <ContributorsTable
                data={leaderboardData}
                activeFilter={activeFilter}
                isLoaded={isLoaded}
                error={leaderboardError}
                onRetry={() => setContributorsRetry((n) => n + 1)}
                onUserClick={(username, userId) => {
                  // Navigate to profile page with user identifier
                  const identifier = userId || username
                  window.location.href = `/dashboard?tab=profile&user=${identifier}`
                }}
              />
              <div className="flex justify-center mt-6">
                {hasMore ? (
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className={`px-6 py-3 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[14px] shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </button>
                ) : (
                  leaderboardData.length > 0 && (
                    <p
                      className={`text-[13px] font-medium transition-colors ${
                        theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                      }`}
                    >
                      You&apos;ve reached the end of the leaderboard.
                    </p>
                  )
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Leaderboard Table - Projects */}
      {leaderboardType === 'projects' && (
        <>
          {isLoadingProjects ? (
            <ContributorsTableSkeleton />
          ) : (
            <ProjectsTable
              data={projectsData}
              activeFilter={activeFilter}
              isLoaded={isLoaded}
              error={projectsError}
              onRetry={() => setProjectsRetry((n) => n + 1)}
            />
          )}
        </>
      )}

      {/* CSS Animations */}
      <LeaderboardStyles />
    </div>
  )
}
