import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Filter,
  GitFork,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  getProfileContributions,
  type ProfileContribution,
} from "../../../shared/api/client";
import { SkeletonLoader } from "../../../shared/components/SkeletonLoader";
import { useTheme } from "../../../shared/contexts/ThemeContext";

type ContributionStatus = "applied" | "assigned" | "pending" | "complete";
type RewardFilter = "Rewarded" | "Unrewarded";

type ContributionCardData = {
  id: string;
  title: string;
  status: ContributionStatus;
  badge: string | null;
  time: string;
  project: string;
  contributor: string;
  tag: string;
  tagType: "bug" | "feature" | "enhancement";
  url: string | null;
  rewardFilter: RewardFilter;
};

type BoardState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; contributions: ContributionCardData[] };

const contributionColumns: Array<{
  key: ContributionStatus;
  title: string;
  emptyLabel: string;
}> = [
  { key: "applied", title: "Applied", emptyLabel: "No applied contributions" },
  {
    key: "assigned",
    title: "Assigned issue",
    emptyLabel: "No assigned contributions",
  },
  {
    key: "pending",
    title: "Pending review",
    emptyLabel: "No pending review contributions",
  },
  { key: "complete", title: "Complete", emptyLabel: "No complete contributions" },
];

const rewardOptions: RewardFilter[] = ["Rewarded", "Unrewarded"];
const fallbackTitle = "Untitled contribution";
const fallbackProject = "Unknown project";
const fallbackTag = "contribution";
const fallbackTime = "Recently";

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const text = String(value).trim();
  return text && text.toLowerCase() !== "undefined" ? text : fallback;
};

const normalizeStatus = (status?: string | null): ContributionStatus => {
  const normalized = status?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";

  if (
    ["complete", "completed", "merged", "done", "paid", "closed"].includes(
      normalized,
    )
  ) {
    return "complete";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("submitted")
  ) {
    return "pending";
  }
  if (normalized.includes("assign") || normalized.includes("progress")) {
    return "assigned";
  }
  return "applied";
};

const getFirstLabel = (contribution: ProfileContribution) => {
  const firstLabel = contribution.labels?.[0];
  if (typeof firstLabel === "string") return firstLabel;
  return firstLabel?.name ?? contribution.label ?? contribution.tag;
};

const getTagType = (tag: string): ContributionCardData["tagType"] => {
  const normalized = tag.toLowerCase();
  if (normalized.includes("bug") || normalized.includes("fix")) return "bug";
  if (normalized.includes("feature")) return "feature";
  return "enhancement";
};

const getBadge = (contribution: ProfileContribution) => {
  const value =
    contribution.badge ?? contribution.issue_number ?? contribution.number ?? null;
  return value === null ? null : normalizeText(value, "");
};

const getContributionId = (contribution: ProfileContribution) =>
  normalizeText(
    contribution.id,
    `${normalizeText(contribution.title, fallbackTitle)}-${normalizeText(
      contribution.project_name ||
        contribution.project ||
        contribution.repository ||
        contribution.github_full_name,
      fallbackProject,
    )}`,
  );

const getRewardFilter = (contribution: ProfileContribution): RewardFilter => {
  const rewardStatus = contribution.reward_status?.toLowerCase() ?? "";
  if (
    contribution.rewarded ||
    contribution.is_rewarded ||
    (contribution.amount !== null && contribution.amount !== undefined) ||
    rewardStatus.includes("reward") ||
    rewardStatus.includes("paid") ||
    rewardStatus.includes("complete")
  ) {
    return "Rewarded";
  }
  return "Unrewarded";
};

const formatContributionTime = (contribution: ProfileContribution) => {
  const value =
    contribution.updated_at ||
    contribution.submitted_at ||
    contribution.merged_at ||
    contribution.created_at;
  if (!value) return fallbackTime;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalizeText(value, fallbackTime);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

/**
 * Converts nullable API rows into stable card data for the board.
 *
 * @remarks
 * React renders all title/project/tag fields as text nodes, so repository-
 * supplied strings such as issue titles are escaped by default rather than
 * interpreted as HTML.
 */
function normalizeContribution(
  contribution: ProfileContribution,
): ContributionCardData {
  const tag = normalizeText(getFirstLabel(contribution), fallbackTag);

  return {
    id: getContributionId(contribution),
    title: normalizeText(contribution.title, fallbackTitle),
    status: normalizeStatus(contribution.status),
    badge: getBadge(contribution),
    time: formatContributionTime(contribution),
    project: normalizeText(
      contribution.project_name ||
        contribution.project ||
        contribution.repository ||
        contribution.github_full_name,
      fallbackProject,
    ),
    contributor: normalizeText(
      contribution.contributor_login || contribution.author_login,
      fallbackProject,
    ),
    tag,
    tagType: getTagType(tag),
    url: contribution.url ?? null,
    rewardFilter: getRewardFilter(contribution),
  };
}

/**
 * Groups normalized contribution cards into the four dashboard columns.
 */
function groupContributions(contributions: ContributionCardData[]) {
  return contributionColumns.reduce(
    (groups, column) => ({
      ...groups,
      [column.key]: contributions.filter((item) => item.status === column.key),
    }),
    {
      applied: [],
      assigned: [],
      pending: [],
      complete: [],
    } as Record<ContributionStatus, ContributionCardData[]>,
  );
}

function isProjectMatch(project: string, query: string) {
  return project.toLowerCase().includes(query.trim().toLowerCase());
}

function ContributionSkeleton() {
  return (
    <div
      aria-label="Loading contributions"
      aria-busy="true"
      className="grid grid-cols-1 md:grid-cols-4 gap-5"
    >
      {contributionColumns.map((column) => (
        <div
          key={column.key}
          className="backdrop-blur-[30px] rounded-[16px] border p-5 bg-white/[0.15] border-white/25"
        >
          <SkeletonLoader className="h-5 w-32 mb-5" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[12px] border border-white/25 p-4 bg-white/[0.12]"
              >
                <SkeletonLoader className="h-5 w-full mb-3" />
                <SkeletonLoader className="h-4 w-28 mb-3" />
                <SkeletonLoader className="h-4 w-36 mb-3" />
                <SkeletonLoader className="h-7 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContributionError({
  theme,
  onRetry,
}: {
  theme: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className={`text-center py-16 backdrop-blur-[30px] bg-white/[0.12] rounded-[20px] border border-white/20 ${
        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
      }`}
    >
      <AlertCircle className="w-14 h-14 mx-auto mb-4 opacity-60" />
      <p className="text-[16px] font-semibold">Unable to load contributions</p>
      <p className="text-[13px] mt-2 mb-5">
        Something went wrong while loading your contribution board.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 text-[#c9983a] text-[13px] font-semibold hover:scale-105 hover:shadow-[0_4px_12px_rgba(201,152,58,0.4)] transition-all duration-300"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

function EmptyColumn({ label, theme }: { label: string; theme: string }) {
  return (
    <div
      className={`rounded-[12px] border p-5 text-center text-[13px] ${
        theme === "dark"
          ? "bg-white/[0.05] border-white/10 text-[#b8a898]"
          : "bg-white/[0.1] border-white/20 text-[#7a6b5a]"
      }`}
    >
      {label}
    </div>
  );
}

function ContributionCard({
  item,
  theme,
}: {
  item: ContributionCardData;
  theme: string;
}) {
  const isComplete = item.status === "complete";
  const actionLabel =
    item.status === "applied" || item.status === "assigned"
      ? "See application"
      : "See detail";

  return (
    <div
      className={`rounded-[12px] border p-4 transition-all ${
        theme === "dark"
          ? "bg-white/[0.08] border-white/15 hover:border-white/25"
          : "bg-white/[0.2] border-white/30 hover:border-white/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4
          className={`text-[14px] font-semibold flex-1 transition-colors ${
            theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
          }`}
        >
          {item.title}
        </h4>
        {isComplete ? (
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : item.badge ? (
          <span className="px-2 py-0.5 bg-green-500/20 border border-green-600/30 rounded-[6px] text-[10px] font-semibold text-green-800 flex-shrink-0">
            {item.badge}
          </span>
        ) : null}
      </div>

      <div
        className={`flex items-center space-x-2 mb-3 text-[12px] transition-colors ${
          theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{item.time}</span>
      </div>

      <div className="flex items-center space-x-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
        <span
          className={`text-[12px] transition-colors ${
            theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
          }`}
        >
          {item.project}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span
          className={`px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
            item.tagType === "bug"
              ? "bg-red-500/15 border border-red-600/25 text-red-800"
              : theme === "dark"
                ? "bg-[#c9983a]/20 border border-[#c9983a]/30 text-[#f5c563]"
                : "bg-[#c9983a]/15 border border-[#c9983a]/25 text-[#8b6f3a]"
          }`}
        >
          {item.tag}
        </span>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-[#c9983a] hover:text-[#a67c2e] font-medium flex items-center space-x-1"
          >
            <span>{actionLabel}</span>
            {actionLabel === "See application" ? (
              <GitFork className="w-3 h-3" />
            ) : (
              <Star className="w-3 h-3" />
            )}
          </a>
        ) : (
          <span className="text-[12px] text-[#c9983a] font-medium flex items-center space-x-1">
            <span>{actionLabel}</span>
            {actionLabel === "See application" ? (
              <GitFork className="w-3 h-3" />
            ) : (
              <Star className="w-3 h-3" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function ContributionColumn({
  column,
  items,
  theme,
}: {
  column: (typeof contributionColumns)[number];
  items: ContributionCardData[];
  theme: string;
}) {
  return (
    <div
      className={`backdrop-blur-[30px] rounded-[16px] border p-5 transition-colors ${
        theme === "dark"
          ? "bg-white/[0.08] border-white/10"
          : "bg-white/[0.15] border-white/25"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`text-[16px] font-bold transition-colors ${
            theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
          }`}
        >
          {column.title}{" "}
          <span className={theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"}>
            {items.length}
          </span>
        </h3>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <ContributionCard key={item.id} item={item} theme={theme} />
          ))
        ) : (
          <EmptyColumn label={column.emptyLabel} theme={theme} />
        )}
      </div>
    </div>
  );
}

export function ContributionsTab() {
  const { theme } = useTheme();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRewards, setSelectedRewards] =
    useState<RewardFilter[]>(rewardOptions);
  const [isProjectSectionOpen, setIsProjectSectionOpen] = useState(true);
  const [isRewardedSectionOpen, setIsRewardedSectionOpen] = useState(true);
  const [state, setState] = useState<BoardState>({ status: "loading" });

  const fetchContributions = useCallback(() => {
    setState({ status: "loading" });
    getProfileContributions()
      .then((response) => {
        setState({
          status: "ok",
          contributions: (response.contributions || []).map(normalizeContribution),
        });
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const allContributions = useMemo(
    () => (state.status === "ok" ? state.contributions : []),
    [state],
  );

  const projectOptions = useMemo(
    () =>
      Array.from(new Set(allContributions.map((item) => item.project)))
        .filter((project) => project !== fallbackProject)
        .filter((project) => isProjectMatch(project, projectSearchQuery))
        .sort((a, b) => a.localeCompare(b)),
    [allContributions, projectSearchQuery],
  );

  const visibleContributions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return allContributions.filter((item) => {
      const matchesProject = selectedProject
        ? item.project === selectedProject
        : true;
      const matchesReward = selectedRewards.includes(item.rewardFilter);
      const matchesSearch = normalizedSearch
        ? [item.title, item.project, item.tag, item.contributor].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          )
        : true;

      return matchesProject && matchesReward && matchesSearch;
    });
  }, [allContributions, searchQuery, selectedProject, selectedRewards]);

  const groupedContributions = useMemo(
    () => groupContributions(visibleContributions),
    [visibleContributions],
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Filter contributions"
            onClick={() => setIsFilterOpen(true)}
            className={`h-10 sm:h-12 flex-shrink-0 w-10 sm:w-12 flex items-center justify-center rounded-[12px] backdrop-blur-[30px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/40 transition-all ${
              theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 z-10 transition-colors ${
                theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              className={`w-full pl-12 pr-4 py-2.5 sm:py-3 rounded-[12px] backdrop-blur-[30px] bg-white/[0.15] border border-white/25 focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/40 transition-all text-[13px] ${
                theme === "dark"
                  ? "text-[#f5efe5] placeholder-[#b8a898]"
                  : "text-[#2d2820] placeholder-[#7a6b5a]"
              }`}
            />
          </div>
        </div>

        {state.status === "loading" ? (
          <ContributionSkeleton />
        ) : state.status === "error" ? (
          <ContributionError theme={theme} onRetry={fetchContributions} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {contributionColumns.map((column) => (
              <ContributionColumn
                key={column.key}
                column={column}
                items={groupedContributions[column.key]}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>

      {isFilterOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] transition-opacity"
            onClick={() => setIsFilterOpen(false)}
          />

          <div
            className={`fixed top-0 right-0 h-full w-[min(400px,100vw)] backdrop-blur-[40px] border-l z-[60] shadow-[0_0_40px_rgba(0,0,0,0.15)] p-6 flex flex-col animate-slide-in-right transition-colors ${
              theme === "dark"
                ? "bg-[#2d2820]/95 border-white/10 text-[#f5efe5]"
                : "bg-[#e5ddd1]/95 border-white/30 text-[#2d2820]"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className={`text-[18px] font-bold ${
                  theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                }`}
              >
                Filter contributions
              </h2>
              <button
                type="button"
                aria-label="Close filter"
                onClick={() => setIsFilterOpen(false)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  theme === "dark"
                    ? "hover:bg-white/[0.1]"
                    : "hover:bg-white/[0.3]"
                }`}
              >
                <X
                  className={`w-6 h-6 stroke-[2.5] ${
                    theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                  }`}
                />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto scrollbar-hide">
              <div>
                <button
                  type="button"
                  onClick={() => setIsProjectSectionOpen(!isProjectSectionOpen)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <div className="flex items-center gap-3">
                    <Circle
                      className={`w-5 h-5 ${theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
                    />
                    <span
                      className={`text-[14px] font-semibold ${theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"}`}
                    >
                      Projects
                    </span>
                    {selectedProject && (
                      <span className="px-2 py-0.5 bg-[#c9983a] text-white text-[11px] font-semibold rounded-full">
                        1
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${isProjectSectionOpen ? "rotate-180" : ""} ${
                      theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                    }`}
                  />
                </button>

                {isProjectSectionOpen && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          theme === "dark" ? "text-[#b8a898]" : "text-[#2d2820]"
                        }`}
                      />
                      <input
                        type="text"
                        value={projectSearchQuery}
                        onChange={(event) =>
                          setProjectSearchQuery(event.target.value)
                        }
                        placeholder="Search projects"
                        className={`w-full pl-10 pr-4 py-3 rounded-[12px] backdrop-blur-[30px] border transition-all text-[13px] focus:outline-none focus:border-[#c9983a]/40 ${
                          theme === "dark"
                            ? "bg-white/[0.05] border-white/10 text-[#f5efe5] placeholder-[#b8a898] focus:bg-white/[0.1]"
                            : "bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a] focus:bg-white/[0.2]"
                        }`}
                      />
                    </div>

                    <div
                      className={`backdrop-blur-[20px] rounded-[12px] border p-3 space-y-2 ${
                        theme === "dark"
                          ? "bg-white/[0.05] border-white/10"
                          : "bg-white/[0.1] border-white/20"
                      }`}
                    >
                      {projectOptions.length > 0 ? (
                        projectOptions.map((project) => (
                          <button
                            key={project}
                            type="button"
                            aria-pressed={selectedProject === project}
                            onClick={() =>
                              setSelectedProject(
                                selectedProject === project ? "" : project,
                              )
                            }
                            className={`w-full px-4 py-3 rounded-[12px] text-left text-[13px] font-medium transition-all flex items-center justify-between ${
                              selectedProject === project
                                ? "bg-[#c9983a] text-white shadow-[0_4px_12px_rgba(201,152,58,0.3)]"
                                : theme === "dark"
                                  ? "bg-white/[0.05] border border-white/10 text-[#f5efe5] hover:bg-white/[0.1]"
                                  : "bg-white/[0.1] border border-white/20 text-[#2d2820] hover:bg-white/[0.15]"
                            }`}
                          >
                            <span>{project}</span>
                            {selectedProject === project && (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        ))
                      ) : (
                        <p
                          className={`text-[12px] text-center py-2 ${theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
                        >
                          No items found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setIsRewardedSectionOpen(!isRewardedSectionOpen)
                  }
                  className="w-full flex items-center justify-between mb-3"
                >
                  <div className="flex items-center gap-3">
                    <Circle
                      className={`w-5 h-5 ${theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
                    />
                    <span
                      className={`text-[14px] font-semibold ${theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"}`}
                    >
                      Rewarded
                    </span>
                    <span className="px-2 py-0.5 bg-[#c9983a] text-white text-[11px] font-semibold rounded-full">
                      {selectedRewards.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${isRewardedSectionOpen ? "rotate-180" : ""} ${
                      theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"
                    }`}
                  />
                </button>

                {isRewardedSectionOpen && (
                  <div className="space-y-2">
                    <div
                      className={`px-4 py-3 rounded-[12px] backdrop-blur-[30px] border ${
                        theme === "dark"
                          ? "bg-white/[0.05] border-white/10"
                          : "bg-white/[0.15] border-white/25"
                      }`}
                    >
                      <span
                        className={`text-[13px] ${theme === "dark" ? "text-[#f5efe5]" : "text-[#2d2820]"}`}
                      >
                        {selectedRewards.length > 0
                          ? selectedRewards.join(", ")
                          : "No reward filters selected"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {rewardOptions.map((reward) => (
                        <button
                          key={reward}
                          type="button"
                          onClick={() => {
                            if (selectedRewards.includes(reward)) {
                              setSelectedRewards(
                                selectedRewards.filter((item) => item !== reward),
                              );
                            } else {
                              setSelectedRewards([...selectedRewards, reward]);
                            }
                          }}
                          className={`w-full px-4 py-3 rounded-[12px] text-left text-[13px] font-medium transition-all flex items-center justify-between ${
                            selectedRewards.includes(reward)
                              ? "bg-[#c9983a] text-white shadow-[0_4px_12px_rgba(201,152,58,0.3)]"
                              : theme === "dark"
                                ? "backdrop-blur-[20px] bg-white/[0.05] border border-white/10 text-[#f5efe5] hover:bg-white/[0.1]"
                                : "backdrop-blur-[20px] bg-white/[0.1] border border-white/20 text-[#2d2820] hover:bg-white/[0.15]"
                          }`}
                        >
                          <span>{reward}</span>
                          {selectedRewards.includes(reward) && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`flex items-center gap-3 mt-6 pt-6 border-t ${
                theme === "dark" ? "border-white/10" : "border-white/20"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedProject("");
                  setProjectSearchQuery("");
                  setSelectedRewards(rewardOptions);
                }}
                className={`flex-1 px-4 py-3 rounded-[12px] backdrop-blur-[30px] border text-[13px] font-semibold transition-all ${
                  theme === "dark"
                    ? "bg-white/[0.05] border-white/10 text-[#b8a898] hover:bg-white/[0.1]"
                    : "bg-white/[0.15] border-white/25 text-[#6b5d4d] hover:bg-white/[0.2]"
                }`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 px-4 py-3 rounded-[12px] bg-[#c9983a] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(201,152,58,0.3)] hover:shadow-[0_6px_16px_rgba(201,152,58,0.4)] transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
