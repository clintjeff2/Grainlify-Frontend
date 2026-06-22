import { logger } from '../../../shared/utils/logger';
import { X } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { Dropdown } from "../../../shared/components/ui/Dropdown";
import { ProjectCard, Project } from "../components/ProjectCard";
import { ProjectCardSkeleton } from "../components/ProjectCardSkeleton";
import { getPublicProjects, getEcosystems } from "../../../shared/api/client";
import {
  isValidProject,
  getRepoName,
} from "../../../shared/utils/projectFilter";
import {
  DEFAULT_PAGE_LIMIT,
  clampLimit,
  clampOffset,
  hasMoreByPageSize,
} from "../../../shared/utils/pagination";

interface BrowsePageProps {
  onProjectClick?: (id: string) => void;
}

/** Number of projects requested per page. */
const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

// Helper function to format numbers (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Helper function to get project icon/avatar
const getProjectIcon = (githubFullName: string): string => {
  const [owner] = githubFullName.split("/");
  // Use higher‑resolution owner avatar so cards look crisp
  return `https://github.com/${owner}.png?size=200`;
};

// Helper function to get gradient color based on project name
const getProjectColor = (name: string): string => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-red-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-gray-600 to-gray-800",
    "from-green-600 to-green-800",
    "from-cyan-500 to-blue-600",
  ];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Helper function to truncate description to first line or first 80 characters
const truncateDescription = (
  description: string | undefined | null,
  maxLength: number = 80,
): string => {
  if (!description || description.trim() === "") {
    return "";
  }

  // Get first line
  const firstLine = description.split("\n")[0].trim();

  // If first line is longer than maxLength, truncate it
  if (firstLine.length > maxLength) {
    return firstLine.substring(0, maxLength).trim() + "...";
  }

  return firstLine;
};

/** Selected filters keyed by filter group. */
type SelectedFilters = { [key: string]: string[] };

/**
 * Build the `getPublicProjects` query params from the currently selected
 * filters. The API accepts a single value for language/ecosystem/category and
 * a comma-separated list for tags.
 */
const buildFilterParams = (
  selectedFilters: SelectedFilters,
): {
  language?: string;
  ecosystem?: string;
  category?: string;
  tags?: string;
} => {
  const params: {
    language?: string;
    ecosystem?: string;
    category?: string;
    tags?: string;
  } = {};
  if (selectedFilters.languages.length > 0) {
    params.language = selectedFilters.languages[0];
  }
  if (selectedFilters.ecosystems.length > 0) {
    params.ecosystem = selectedFilters.ecosystems[0];
  }
  if (selectedFilters.categories.length > 0) {
    params.category = selectedFilters.categories[0];
  }
  if (selectedFilters.tags.length > 0) {
    params.tags = selectedFilters.tags.join(",");
  }
  return params;
};

/** Map a raw API project payload onto the UI {@link Project} shape. */
const mapApiProjects = (projectsArray: any[]): Project[] =>
  projectsArray.filter(isValidProject).map((p) => {
    const repoName = getRepoName(p.github_full_name);
    return {
      id: p.id || `project-${repoName}`,
      name: repoName,
      icon: getProjectIcon(p.github_full_name),
      stars: formatNumber(p.stars_count || 0),
      forks: formatNumber(p.forks_count || 0),
      contributors: p.contributors_count || 0,
      openIssues: p.open_issues_count || 0,
      prs: p.open_prs_count || 0,
      description:
        truncateDescription(p.description) ||
        `${p.language || "Project"} repository${p.category ? ` - ${p.category}` : ""}`,
      tags: Array.isArray(p.tags) ? p.tags : [],
      color: getProjectColor(repoName),
    };
  });

export function BrowsePage({ onProjectClick }: BrowsePageProps) {
  const { theme } = useTheme();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({
    languages: "",
    ecosystems: "",
    categories: "",
    tags: "",
  });
  const [selectedFilters, setSelectedFilters] = useState<{
    [key: string]: string[];
  }>({
    languages: [],
    ecosystems: [],
    categories: [],
    tags: [],
  });

  // --- Pagination state ---------------------------------------------------
  /** Projects accumulated across all loaded pages for the current filters. */
  const [projects, setProjects] = useState<Project[]>([]);
  /** Total number of projects available for the current filters (from API). */
  const [total, setTotal] = useState(0);
  /** Whether the API indicates more pages remain to be loaded. */
  const [hasMore, setHasMore] = useState(false);
  /** True while the very first page for the current filters is loading. */
  const [isLoading, setIsLoading] = useState(true);
  /** True while an additional ("load more") page is being fetched. */
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  /** True when the most recent fetch failed. */
  const [hasError, setHasError] = useState(false);

  // Offset (start index) of the NEXT page to request. Tracked in a ref so the
  // value is always current inside async callbacks without re-creating them.
  const offsetRef = useRef(0);
  // Synchronous guard so rapid double-clicks of "Load more" cannot fire two
  // concurrent requests (state updates are async and would race).
  const loadingMoreRef = useRef(false);
  // Monotonic request id; responses from a superseded filter set are ignored.
  const requestSeqRef = useRef(0);

  const [ecosystems, setEcosystems] = useState<Array<{ name: string }>>([]);
  const [_isLoadingEcosystems, setIsLoadingEcosystems] = useState(true);

  // Filter options data
  const filterOptions = {
    languages: [
      { name: "TypeScript" },
      { name: "JavaScript" },
      { name: "Python" },
      { name: "Go" },
      { name: "Rust" },
      { name: "Java" },
    ],
    ecosystems: ecosystems,
    categories: [
      { name: "Frontend" },
      { name: "Backend" },
      { name: "Full Stack" },
      { name: "DevOps" },
      { name: "Mobile" },
    ],
    tags: [
      { name: "Good first issues" },
      { name: "Open issues" },
      { name: "Help wanted" },
      { name: "Bug" },
      { name: "Feature" },
      { name: "Documentation" },
    ],
  };

  // Fetch ecosystems from API
  useEffect(() => {
    const fetchEcosystems = async () => {
      setIsLoadingEcosystems(true);
      try {
        const response = await getEcosystems();
        // Handle different response structures
        let ecosystemsArray: any[] = [];

        if (response && Array.isArray(response)) {
          ecosystemsArray = response;
        } else if (
          response &&
          response.ecosystems &&
          Array.isArray(response.ecosystems)
        ) {
          ecosystemsArray = response.ecosystems;
        } else if (response && typeof response === "object") {
          // Try to find any array property
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray((response as any)[key])) {
              ecosystemsArray = (response as any)[key];
              break;
            }
          }
        }

        // Filter only active ecosystems and map to expected format
        const activeEcosystems = ecosystemsArray
          .filter((eco: any) => eco.status === "active")
          .map((eco: any) => ({ name: eco.name }));

        setEcosystems(activeEcosystems);
      } catch (err) {
        logger.error("BrowsePage: Failed to fetch ecosystems:", err);
        // Fallback to empty array on error
        setEcosystems([]);
      } finally {
        setIsLoadingEcosystems(false);
      }
    };

    fetchEcosystems();
  }, []);

  const toggleFilter = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter((v) => v !== value)
        : [...prev[filterType], value],
    }));
  };

  const clearFilter = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].filter((v) => v !== value),
    }));
  };


  /**
   * Load a page of projects for the current filters.
   *
   * @param reset - When `true`, start a fresh result set at offset 0 (used on
   *   mount and whenever filters change). When `false`, append the next page
   *   ("Load more"). Concurrent "load more" calls are ignored so a double click
   *   never issues two simultaneous requests.
   */
  const loadProjects = useCallback(
    async (reset: boolean) => {
      // Guard against duplicate concurrent "load more" requests.
      if (!reset && loadingMoreRef.current) return;

      const seq = ++requestSeqRef.current;

      if (reset) {
        offsetRef.current = 0;
        setIsLoading(true);
        setHasError(false);
      } else {
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
      }

      // Clamp paging values to safe bounds before they reach the API so
      // user-influenced state can never request an abusive page/offset.
      const limit = clampLimit(PAGE_SIZE);
      const offset = clampOffset(reset ? 0 : offsetRef.current);

      try {
        const response = await getPublicProjects({
          ...buildFilterParams(selectedFilters),
          limit,
          offset,
        });

        // A newer request (e.g. filters changed) has superseded this one.
        if (seq !== requestSeqRef.current) return;

        logger.debug("BrowsePage: API response received", { response });

        let projectsArray: any[] = [];
        if (response && Array.isArray(response.projects)) {
          projectsArray = response.projects;
        } else if (Array.isArray(response)) {
          projectsArray = response;
        } else {
          logger.warn("BrowsePage: Unexpected response format", response);
        }

        const received = projectsArray.length;
        const mapped = mapApiProjects(projectsArray);
        const apiTotal =
          response && typeof (response as any).total === "number"
            ? (response as any).total
            : undefined;

        // Advance the cursor by the raw page size received (not the mapped
        // count, which may be smaller after filtering invalid repos).
        const nextOffset = offset + received;
        offsetRef.current = nextOffset;

        // More pages remain only if the last page was full AND (when the API
        // reports a total) we have not yet reached it.
        const more =
          hasMoreByPageSize(received, limit) &&
          (apiTotal != null ? nextOffset < apiTotal : true);

        setProjects((prev) => (reset ? mapped : [...prev, ...mapped]));
        setTotal(apiTotal ?? 0);
        setHasMore(more);
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        logger.error("BrowsePage: Failed to fetch projects:", err);
        setHasError(true);
        if (reset) setProjects([]);
        setHasMore(false);
      } finally {
        if (seq === requestSeqRef.current) {
          if (reset) {
            setIsLoading(false);
          } else {
            setIsLoadingMore(false);
          }
        }
        if (!reset) loadingMoreRef.current = false;
      }
    },
    [selectedFilters],
  );

  /** Public handler for the "Load more" button. */
  const handleLoadMore = useCallback(() => {
    void loadProjects(false);
  }, [loadProjects]);

  // (Re)load the first page whenever the filters change. Changing filters
  // resets pagination back to offset 0 via loadProjects(reset = true).
  useEffect(() => {
    void loadProjects(true);
  }, [loadProjects]);

  return (
    <div className="space-y-6">
      {/* Active Filters Display */}
      {Object.values(selectedFilters).some((arr) => arr.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(selectedFilters).map(([filterType, values]) =>
            values.map((value) => (
              <span
                key={`${filterType}-${value}`}
                className={`px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border-[1.5px] flex items-center gap-2 transition-all hover:scale-105 shadow-lg ${
                  theme === "dark"
                    ? "bg-[#a17932] border-[#c9983a] text-white"
                    : "bg-[#b8872f] border-[#a17932] text-white"
                }`}
              >
                {value}
                <button
                  onClick={() => clearFilter(filterType, value)}
                  className="hover:text-red-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )),
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center flex-wrap gap-3">
        {["languages", "ecosystems", "categories", "tags"].map((filterType) => (
          <Dropdown
            key={filterType}
            filterType={filterType}
            options={filterOptions[filterType as keyof typeof filterOptions]}
            selectedValues={selectedFilters[filterType]}
            onToggle={(value) => toggleFilter(filterType, value)}
            searchValue={searchTerms[filterType]}
            onSearchChange={(value) =>
              setSearchTerms((prev) => ({ ...prev, [filterType]: value }))
            }
            isOpen={openDropdown === filterType}
            onToggleOpen={() =>
              setOpenDropdown(openDropdown === filterType ? null : filterType)
            }
            onClose={() => setOpenDropdown(null)}
          />
        ))}
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(8)].map((_, idx) => (
            <ProjectCardSkeleton key={idx} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div
          className={`p-8 rounded-[16px] border text-center ${
            theme === "dark"
              ? "bg-white/[0.08] border-white/15 text-[#d4d4d4]"
              : "bg-white/[0.15] border-white/25 text-[#7a6b5a]"
          }`}
        >
          <p className="text-[16px] font-semibold">
            {hasError ? "Couldn't load projects" : "No projects found"}
          </p>
          <p className="text-[14px] mt-2">
            {hasError
              ? "Something went wrong while loading projects. Please try again."
              : "Try adjusting your filters or check back later."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={onProjectClick}
              />
            ))}
          </div>

          {/* Pagination footer */}
          <div className="flex flex-col items-center gap-3 mt-6">
            {total > 0 && (
              <p
                className={`text-[13px] ${
                  theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                }`}
              >
                Showing {projects.length} of {total} projects
              </p>
            )}

            {hasMore ? (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className={`px-6 py-3 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[14px] shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            ) : (
              <p
                className={`text-[13px] font-medium ${
                  theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                }`}
              >
                You&apos;ve reached the end of the list.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
