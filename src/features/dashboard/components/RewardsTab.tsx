import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Filter,
  Github,
  Hourglass,
  LayoutGrid,
  RefreshCw,
  Search,
} from "lucide-react";
import { getProfileRewards, type ProfileReward } from "../../../shared/api/client";
import { SkeletonLoader } from "../../../shared/components/SkeletonLoader";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useLocalStorage } from "../../../shared/hooks/useLocalStorage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../app/components/ui/popover";

type RewardRow = {
  id: string;
  date: string;
  project: string;
  logo: string;
  from: string;
  contribution: string;
  amount: string;
  status: string;
};

type RewardsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; rewards: RewardRow[] };

const columns = [
  "Date",
  "ID",
  "Project",
  "From",
  "Contributions",
  "Amount",
  "Status",
];

const fallbackText = "N/A";

const normalizeText = (value?: string | null) => {
  const text = value?.trim();
  return text && text.toLowerCase() !== "undefined" ? text : fallbackText;
};

/**
 * Formats API reward amount/currency values without rendering placeholder text.
 *
 * @remarks
 * Missing or non-numeric amounts intentionally render `N/A`. Unknown or
 * invalid currency codes fall back to `USD` so `Intl.NumberFormat` cannot throw
 * and the UI never concatenates an `"undefined"` currency string.
 */
function formatRewardAmount(
  amount?: number | string | null,
  currency?: string | null,
) {
  const parsedAmount =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount ?? ""));

  if (!Number.isFinite(parsedAmount)) return fallbackText;

  const normalizedCurrency = currency?.trim().toUpperCase() || "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: Number.isInteger(parsedAmount) ? 0 : 2,
    }).format(parsedAmount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Number.isInteger(parsedAmount) ? 0 : 2,
    }).format(parsedAmount);
  }
}

const formatRewardDate = (reward: ProfileReward) => {
  const dateValue = reward.date || reward.awarded_at || reward.created_at;
  if (!dateValue) return fallbackText;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return normalizeText(dateValue);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const normalizeReward = (reward: ProfileReward): RewardRow => ({
  id: String(reward.id),
  date: formatRewardDate(reward),
  project: normalizeText(reward.project_name || reward.project),
  logo: normalizeText(reward.project_logo).slice(0, 2),
  from: normalizeText(reward.contributor_login || reward.from),
  contribution: normalizeText(reward.contribution_title || reward.contribution),
  amount: formatRewardAmount(reward.amount, reward.currency),
  status: normalizeText(reward.status),
});

const getStatusIcon = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("paid")) {
    return <Check className="w-4 h-4 text-green-600" />;
  }
  if (normalized.includes("processing")) {
    return <Hourglass className="w-4 h-4 text-yellow-600" />;
  }
  return <Hourglass className="w-4 h-4 text-orange-600" />;
};

function EmptyState({ theme }: { theme: string }) {
  return (
    <div
      className={`text-center py-16 backdrop-blur-[30px] bg-white/[0.12] rounded-[20px] border border-white/20 ${
        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
      }`}
    >
      <Github className="w-14 h-14 mx-auto mb-4 opacity-50" />
      <p className="text-[16px] font-semibold">No rewards yet</p>
      <p className="text-[13px] mt-2">
        Rewards from accepted contributions will appear here.
      </p>
    </div>
  );
}

function ErrorState({ theme, onRetry }: { theme: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className={`text-center py-16 backdrop-blur-[30px] bg-white/[0.12] rounded-[20px] border border-white/20 ${
        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
      }`}
    >
      <AlertCircle className="w-14 h-14 mx-auto mb-4 opacity-60" />
      <p className="text-[16px] font-semibold">Unable to load rewards</p>
      <p className="text-[13px] mt-2 mb-5">
        Something went wrong while loading your reward history.
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

function RewardsSkeleton() {
  return (
    <div aria-label="Loading rewards" aria-busy="true" className="space-y-3">
      <div className="hidden md:block backdrop-blur-[30px] bg-white/[0.12] rounded-[20px] border border-white/20 overflow-hidden p-4">
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="grid grid-cols-5 gap-4 py-3">
            {Array.from({ length: 5 }).map((__, cell) => (
              <SkeletonLoader key={cell} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="backdrop-blur-[30px] bg-white/[0.12] rounded-[16px] border border-white/20 p-4"
          >
            <SkeletonLoader className="h-5 w-32 mb-3" />
            <SkeletonLoader className="h-4 w-48 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonLoader className="h-14 w-full" />
              <SkeletonLoader className="h-14 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RewardsTab() {
  const { theme } = useTheme();
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useLocalStorage<string[]>(
    "rewards_selected_columns",
    columns,
    (raw) => {
      if (!Array.isArray(raw)) return null;
      const valid = (raw as unknown[]).filter(
        (c): c is string => typeof c === "string" && columns.includes(c),
      );
      return valid.length > 0 ? valid : null;
    },
  );
  const [columnSearchQuery, setColumnSearchQuery] = useState("");
  const [state, setState] = useState<RewardsState>({ status: "loading" });

  const fetchRewards = useCallback(() => {
    setState({ status: "loading" });
    getProfileRewards()
      .then((response) => {
        setState({
          status: "ok",
          rewards: (response.rewards || []).map(normalizeReward),
        });
      })
      .catch(() => {
        setState({ status: "error" });
      });
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const rewards = state.status === "ok" ? state.rewards : [];
  const visibleColumnOptions = useMemo(
    () =>
      columns.filter((col) =>
        col.toLowerCase().includes(columnSearchQuery.toLowerCase()),
      ),
    [columnSearchQuery],
  );

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="h-12 flex-shrink-0 w-10 sm:w-12 flex items-center justify-center rounded-[12px] backdrop-blur-[30px] bg-white/[0.15] border border-white/25 text-[#7a6b5a] hover:bg-white/[0.2] hover:border-[#c9983a]/40 transition-all">
            <Filter className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7a6b5a] z-10" />
            <input
              type="text"
              placeholder="Search"
              className="w-full h-12 pl-12 pr-4 py-2.5 sm:py-3 rounded-[12px] backdrop-blur-[30px] bg-white/[0.15] border border-white/25 text-[#2d2820] placeholder-[#7a6b5a] focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/40 transition-all text-[13px]"
            />
          </div>
        </div>

        <Popover open={isColumnsModalOpen} onOpenChange={setIsColumnsModalOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="Toggle column visibility"
              className="w-full h-12 flex-shrink-0 sm:w-12 flex items-center justify-center rounded-[12px] backdrop-blur-[30px] bg-white/[0.15] border border-white/25 text-[#7a6b5a] hover:bg-white/[0.2] hover:border-[#c9983a]/40 transition-all"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[320px] p-0 backdrop-blur-[40px] bg-white/[0.12] rounded-[16px] border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/20">
              <h3 className="text-[16px] font-bold text-[#2d2820]">
                Rewards columns
              </h3>
            </div>

            <div className="px-5 pt-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2d2820]" />
                <input
                  type="text"
                  placeholder="Search"
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-[10px] backdrop-blur-[20px] bg-white/[0.2] border border-white/25 text-[#2d2820] text-[13px] placeholder-[#7a6b5a] focus:outline-none focus:bg-white/[0.25] focus:border-[#c9983a]/40 transition-all"
                />
              </div>
            </div>

            <div className="px-5 pb-4 max-h-[360px] overflow-y-auto scrollbar-hide">
              <div className="space-y-2">
                {visibleColumnOptions.map((column) => {
                  const isSelected = selectedColumns.includes(column);
                  return (
                    <button
                      key={column}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedColumns(
                            selectedColumns.filter((c) => c !== column),
                          );
                        } else {
                          setSelectedColumns([...selectedColumns, column]);
                        }
                      }}
                      className={`w-full px-3.5 py-3 rounded-[10px] text-left text-[13px] font-medium transition-all flex items-center gap-3 backdrop-blur-[20px] bg-white/[0.15] border border-white/25 text-[#2d2820] hover:bg-white/[0.2] ${
                        isSelected ? "hover:border-[#c9983a]/40" : ""
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-[6px] flex items-center justify-center border-2 transition-all ${
                          isSelected
                            ? "bg-[#c9983a] border-[#c9983a]"
                            : "bg-white/30 border-[#7a6b5a]/40"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </div>
                      <span>{column}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/20 flex items-center justify-between">
              <button
                onClick={() => setIsColumnsModalOpen(false)}
                className="text-[13px] text-[#7a6b5a] hover:text-[#2d2820] transition-all font-medium"
              >
                Pending request
              </button>
              <button
                onClick={() => setIsColumnsModalOpen(false)}
                className="flex items-center gap-1.5 text-[13px] text-[#2d2820] hover:text-[#c9983a] transition-all font-semibold"
              >
                <Check className="w-4 h-4" />
                <span>Complete</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {state.status === "loading" ? (
          <RewardsSkeleton />
        ) : state.status === "error" ? (
          <ErrorState theme={theme} onRetry={fetchRewards} />
        ) : rewards.length === 0 ? (
          <EmptyState theme={theme} />
        ) : (
          <>
            <div className="hidden md:block backdrop-blur-[30px] bg-white/[0.12] rounded-[20px] border border-white/20 overflow-hidden">
              <table className="w-full">
                <thead className="backdrop-blur-[20px] bg-white/[0.08] border-b border-white/20">
                  <tr>
                    {selectedColumns.includes("Date") && (
                      <HeaderCell theme={theme}>Date</HeaderCell>
                    )}
                    {selectedColumns.includes("ID") && (
                      <HeaderCell theme={theme}>ID</HeaderCell>
                    )}
                    {selectedColumns.includes("Project") && (
                      <HeaderCell theme={theme}>Project</HeaderCell>
                    )}
                    {selectedColumns.includes("Amount") && (
                      <HeaderCell theme={theme}>Amount</HeaderCell>
                    )}
                    {selectedColumns.includes("Status") && (
                      <HeaderCell theme={theme}>Status</HeaderCell>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward, idx) => (
                    <tr
                      key={reward.id}
                      className={`border-b border-white/10 hover:bg-white/[0.05] transition-colors ${
                        idx % 2 === 0 ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      {selectedColumns.includes("Date") && (
                        <BodyCell theme={theme}>{reward.date}</BodyCell>
                      )}
                      {selectedColumns.includes("ID") && (
                        <BodyCell theme={theme}>#{reward.id}</BodyCell>
                      )}
                      {selectedColumns.includes("Project") && (
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                              {reward.logo}
                            </div>
                            <span
                              className={`text-[12px] lg:text-[13px] transition-colors ${
                                theme === "dark"
                                  ? "text-[#f5f5f5]"
                                  : "text-[#2d2820]"
                              }`}
                            >
                              {reward.project}
                            </span>
                          </div>
                        </td>
                      )}
                      {selectedColumns.includes("Amount") && (
                        <BodyCell theme={theme}>{reward.amount}</BodyCell>
                      )}
                      {selectedColumns.includes("Status") && (
                        <td className="px-4 lg:px-6 py-4">
                          <StatusPill status={reward.status} theme={theme} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {rewards.map((reward) => (
                <MobileRewardCard key={reward.id} reward={reward} theme={theme} />
              ))}
            </div>
          </>
        )}
    </div>
  );
}

function HeaderCell({ theme, children }: { theme: string; children: ReactNode }) {
  return (
    <th
      className={`px-4 lg:px-6 py-4 text-left text-[11px] lg:text-[12px] font-semibold uppercase tracking-wider transition-colors ${
        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
      }`}
    >
      {children}
    </th>
  );
}

function BodyCell({ theme, children }: { theme: string; children: ReactNode }) {
  return (
    <td
      className={`px-4 lg:px-6 py-4 text-[12px] lg:text-[13px] transition-colors ${
        theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
      }`}
    >
      {children}
    </td>
  );
}

function StatusPill({ status, theme }: { status: string; theme: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-[20px] bg-white/[0.15] border border-white/20">
      {getStatusIcon(status)}
      <span
        className={`text-[12px] lg:text-[13px] transition-colors ${
          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function MobileRewardCard({ reward, theme }: { reward: RewardRow; theme: string }) {
  return (
    <div
      className={`backdrop-blur-[30px] bg-white/[0.12] rounded-[16px] border border-white/20 p-4 transition-colors hover:bg-white/[0.15] ${
        theme === "dark" ? "hover:border-white/30" : "hover:border-white/25"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span
            className={`text-[12px] ${
              theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
            }`}
          >
            {reward.date}
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
              {reward.logo}
            </div>
            <span
              className={`text-[13px] font-medium ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              {reward.project}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusPill status={reward.status} theme={theme} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobileStat label="Amount" value={reward.amount} theme={theme} />
        <MobileStat label="ID" value={`#${reward.id}`} theme={theme} />
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0" />
          <span
            className={`text-[12px] ${
              theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
            }`}
          >
            {reward.from}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Github
            className={`w-4 h-4 flex-shrink-0 ${
              theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
            }`}
          />
          <span
            className={`text-[12px] ${
              theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
            }`}
          >
            {reward.contribution}
          </span>
        </div>
      </div>
    </div>
  );
}

function MobileStat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: string;
}) {
  return (
    <div className="backdrop-blur-[20px] bg-white/[0.05] rounded-[10px] p-2.5">
      <span
        className={`text-[11px] block ${
          theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-[13px] font-semibold mt-0.5 ${
          theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
