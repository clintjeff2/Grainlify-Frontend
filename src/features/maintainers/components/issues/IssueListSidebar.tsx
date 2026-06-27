

import { Search, Filter } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { useDebouncedValue } from '../../../../shared/hooks/useDebouncedValue';
import { Issue } from '../../types';
import { IssueCard } from './IssueCard';
import { IssueFilterDropdown } from './IssueFilterDropdown';

interface IssueListSidebarProps {
  issues: Issue[];
  issueFilter: string;
  setIssueFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterDropdownOpen: boolean;
  setIsFilterDropdownOpen: (open: boolean) => void;
  appliedFilterCount: number;
  onFilterClick: () => void;
  onIssueSelect: (issue: Issue) => void;
}

/**
 * Formats the filter-count badge value to avoid layout overflow.
 *
 * - 0..99 => exact count
 * - >= 100 => "99+"
 */
function formatCountBadge(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, count) : 0;
  if (safe >= 100) return '99+';
  return String(Math.trunc(safe));
}

/**
 * Sidebar listing maintainer issues with search and filter controls.
 *
 * The search input is debounced (300ms) before `setSearchQuery` is called,
 * so list filtering doesn't run on every keystroke. Renders a distinct
 * empty state when there are no issues at all versus when search/filters
 * exclude every issue.
 */
export function IssueListSidebar({
  issues,
  issueFilter,
  setIssueFilter,
  searchQuery,
  setSearchQuery,
  isFilterDropdownOpen,
  setIsFilterDropdownOpen,
  appliedFilterCount,
  onFilterClick,
  onIssueSelect,
}: IssueListSidebarProps) {
  const { theme } = useTheme();

  // Debounce search updates to avoid expensive filtering on each keystroke.
  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const debouncedSearch = useDebouncedValue(draftSearch, 300);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  // Skip the first run so mounting doesn't re-emit the initial search value.
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const badgeText = useMemo(() => formatCountBadge(appliedFilterCount), [appliedFilterCount]);

  const isDefaultFilter = issueFilter === 'All';
  const hasActiveSearch = searchQuery.trim().length > 0;
  const showNoIssuesFound = issues.length === 0 && !hasActiveSearch && isDefaultFilter;
  const showNoMatches = issues.length === 0 && !showNoIssuesFound;

  return (
    <div
      className={`w-[380px] backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col transition-colors ${
        theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
      }`}
    >
      {/* Fixed Header Section */}
      <div className="p-6 flex-shrink-0">
        {/* All Dropdown + Filters */}
        <div className="flex items-center gap-3 mb-6">
          <IssueFilterDropdown
            value={issueFilter}
            onChange={setIssueFilter}
            isOpen={isFilterDropdownOpen}
            onToggle={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            onClose={() => setIsFilterDropdownOpen(false)}
          />

          <button
            className="relative px-4 py-3 rounded-[14px] backdrop-blur-[25px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/30 transition-all group"
            onClick={onFilterClick}
          >
            <Filter className="w-4 h-4 text-[#7a6b5a] group-hover:text-[#c9983a] transition-colors" />
            <span className="absolute -top-1 -right-1 w-7 h-5 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] border-2 border-[#d4c5b0] flex items-center justify-center text-[11px] font-bold text-white shadow-lg">
              {badgeText}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}
          />
          <input
            type="text"
            placeholder="Search"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            className={`w-full pl-11 pr-4 py-3 rounded-[14px] backdrop-blur-[25px] border text-[14px] focus:outline-none focus:border-[#c9983a]/40 focus:ring-2 focus:ring-[#c9983a]/20 transition-all ${
              theme === 'dark'
                ? 'bg-white/[0.08] border-white/15 text-[#e8dfd0] placeholder:text-[#8a7b6a] focus:bg-white/[0.12]'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder:text-[#9a8b7a] focus:bg-white/[0.2]'
            }`}
          />
        </div>
      </div>

      {/* Scrollable Issues List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-3">
          {showNoIssuesFound && (
            <div className={`px-6 py-10 text-center ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              <p className="text-[14px] font-medium mb-1">No issues found</p>
              <p className="text-[12px]">Select repositories or refresh the list.</p>
            </div>
          )}

          {showNoMatches && (
            <div className={`px-6 py-10 text-center ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              <p className="text-[14px] font-medium mb-1">No matches for search/filters</p>
              <p className="text-[12px]">Try clearing search or changing filters.</p>
            </div>
          )}

          {!showNoIssuesFound &&
            !showNoMatches &&
            issues.map((issue, idx) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                index={idx}
                onClick={() => onIssueSelect(issue)}
              />
            ))}

        </div>
      </div>

      {/* Fixed Footer: Total Issues Count */}
      <div
        className={`px-6 py-5 border-t text-center flex-shrink-0 bg-gradient-to-t from-white/5 to-transparent transition-colors ${
          theme === 'dark' ? 'border-white/10' : 'border-white/20'
        }`}
      >
        <span
          className={`text-[13px] font-bold transition-colors ${
            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}
        >
          {issues.length} issues
        </span>
      </div>
    </div>
  );
}

