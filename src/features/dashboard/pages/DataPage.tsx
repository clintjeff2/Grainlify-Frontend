import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, Info, RefreshCw } from 'lucide-react';
import { Bar, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  getProjectActivity,
  getContributorActivity,
  getContributorsByRegion,
  getAnalyticsStats,
  ActivityDataPoint,
  ContributorRegion,
  AnalyticsStats
} from '../../../shared/api/client';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ChartSkeleton } from '../../../shared/components/ChartSkeleton';

/** Maps filter keys to their data field name and bar colour. */
const FILTER_META: Record<string, { dataKey: string; color: string }> = {
  new:          { dataKey: 'new',          color: '#c9983a' },
  reactivated:  { dataKey: 'reactivated',  color: '#d4af37' },
  active:       { dataKey: 'active',        color: '#b8860b' },
  churned:      { dataKey: 'churned',       color: '#ff6b6b' },
  prMerged:     { dataKey: 'prMerged',      color: '#8b6914' },
};

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  'United Kingdom': [-3.435973, 55.378051],
  'Germany': [10.451526, 51.165691],
  'Canada': [-106.346771, 56.130366],
  'India': [78.96288, 20.593684],
  'Brazil': [-51.92528, -14.235004],
  'Netherlands': [5.291266, 52.132633],
  'Australia': [133.775136, -25.274398],
  'Spain': [-3.74922, 40.463667],
  'Italy': [12.56738, 41.87194],
  'Poland': [19.145136, 51.919438],
  'Sweden': [18.643501, 60.128161],
  'Japan': [138.252924, 36.204824],
  'China': [104.195397, 35.86166],
};

/**
 * Ensures a value is a valid number, defaulting to 0.
 * Prevents chart crashes on malformed API data.
 */
function coerceToNumber(val: any): number {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

export function DataPage() {
  const { theme } = useTheme();
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'contributions'>('overview');
  const [projectInterval, setProjectInterval] = useState('Monthly interval');
  const [contributorInterval, setContributorInterval] = useState('Monthly interval');
  const [showProjectIntervalDropdown, setShowProjectIntervalDropdown] = useState(false);
  const [showContributorIntervalDropdown, setShowContributorIntervalDropdown] = useState(false);

  // Data States
  const [projectData, setProjectData] = useState<ActivityDataPoint[]>([]);
  const [contributorData, setContributorData] = useState<ActivityDataPoint[]>([]);
  const [regions, setRegions] = useState<ContributorRegion[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectFilters, setProjectFilters] = useState({
    new: false,
    reactivated: false,
    active: false,
    churned: false,
    prMerged: false,
  });
  const [contributorFilters, setContributorFilters] = useState({
    new: false,
    reactivated: false,
    active: false,
    churned: false,
    prMerged: false,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [proj, contr, regs, summary] = await Promise.all([
        getProjectActivity(projectInterval),
        getContributorActivity(contributorInterval),
        getContributorsByRegion(),
        getAnalyticsStats()
      ]);
      setProjectData(proj || []);
      setContributorData(contr || []);
      setRegions(regs || []);
      setStats(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [projectInterval, contributorInterval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleProjectFilter = useCallback((filter: keyof typeof projectFilters) => {
    setProjectFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  }, []);

  const toggleContributorFilter = useCallback((filter: keyof typeof contributorFilters) => {
    setContributorFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  }, []);

  const activeProjectFilterKeys = Object.keys(projectFilters).filter(
    k => projectFilters[k as keyof typeof projectFilters],
  );
  const activeContributorFilterKeys = Object.keys(contributorFilters).filter(
    k => contributorFilters[k as keyof typeof contributorFilters],
  );

  const filteredProjectData = useMemo(() => {
    if (activeProjectFilterKeys.length === 0) return projectData;
    return projectData.map(d => {
      const sum = activeProjectFilterKeys.reduce(
        (acc, k) => acc + Math.abs(coerceToNumber(d[FILTER_META[k].dataKey as keyof typeof d])),
        0,
      );
      return { ...d, value: sum };
    });
  }, [activeProjectFilterKeys, projectData]);

  const filteredContributorData = useMemo(() => {
    if (activeContributorFilterKeys.length === 0) return contributorData;
    return contributorData.map(d => {
      const sum = activeContributorFilterKeys.reduce(
        (acc, k) => acc + Math.abs(coerceToNumber(d[FILTER_META[k].dataKey as keyof typeof d])),
        0,
      );
      return { ...d, value: sum };
    });
  }, [activeContributorFilterKeys, contributorData]);

  const showProjects      = activeTab === 'overview' || activeTab === 'projects';
  const showContributions = activeTab === 'overview' || activeTab === 'contributions';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="backdrop-blur-[30px] bg-[#1a1410]/95 border-2 border-white/20 rounded-[12px] px-5 py-4 min-w-[200px]">
          <p className="text-[13px] font-bold text-white mb-3">{data.month} 2025</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#c9983a]" />
                <span className="text-[12px] text-white/80">New</span>
              </div>
              <span className="text-[13px] font-bold text-[#c9983a]">{coerceToNumber(data.new)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#d4af37]" />
                <span className="text-[12px] text-white/80">Reactivated</span>
              </div>
              <span className="text-[13px] font-bold text-[#d4af37]">{coerceToNumber(data.reactivated)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#c9983a]/70" />
                <span className="text-[12px] text-white/80">Active</span>
              </div>
              <span className="text-[13px] font-bold text-[#c9983a]/90">{coerceToNumber(data.active)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff6b6b]" />
                <span className="text-[12px] text-white/80">Churned</span>
              </div>
              <span className="text-[13px] font-bold text-[#ff6b6b]">{coerceToNumber(data.churned)}</span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#c9983a] to-[#d4af37]" />
                <span className="text-[12px] text-white/80">Rewarded</span>
              </div>
              <span className="text-[13px] font-bold text-white">{coerceToNumber(data.rewarded).toLocaleString()} USD</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
          <RefreshCw className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Something went wrong</h3>
          <p className="text-sm text-white/60 max-w-md mt-1">{error}</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-bold text-white flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border p-2 transition-colors ${theme === 'dark'
          ? 'bg-white/[0.12] border-white/20'
          : 'bg-white/[0.12] border-white/20'
        }`}>
        <div className="flex items-center gap-2" role="tablist" aria-label="Data page views">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-[16px] font-bold text-[14px] transition-all duration-300 ${activeTab === 'overview'
                ? `bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 ${theme === 'dark' ? 'text-[#f5c563]' : 'text-[#2d2820]'
                }`
                : `${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'} hover:bg-white/[0.08]`
              }`}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 rounded-[16px] font-bold text-[14px] transition-all duration-300 ${activeTab === 'projects'
                ? `bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 ${theme === 'dark' ? 'text-[#f5c563]' : 'text-[#2d2820]'
                }`
                : `${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'} hover:bg-white/[0.08]`
              }`}
          >
            Projects
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'contributions'}
            onClick={() => setActiveTab('contributions')}
            className={`px-6 py-3 rounded-[16px] font-bold text-[14px] transition-all duration-300 ${activeTab === 'contributions'
                ? `bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 ${theme === 'dark' ? 'text-[#f5c563]' : 'text-[#2d2820]'
                }`
                : `${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'} hover:bg-white/[0.08]`
              }`}
          >
            Contributions
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      {showProjects && (
      <div className={`grid gap-6 ${showProjects && showContributions ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left Column - Project Activity */}
        <div className="backdrop-blur-[40px] bg-white/[0.12] rounded-[24px] border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-[18px] font-bold transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}>Project activity</h2>
            <div className="relative">
              <button
                onClick={() => setShowProjectIntervalDropdown(!showProjectIntervalDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] backdrop-blur-[20px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] transition-all"
              >
                <span className={`text-[13px] font-semibold transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
                  }`}>{projectInterval}</span>
                <ChevronDown className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
                  }`} />
              </button>
              {showProjectIntervalDropdown && (
                <div className="absolute right-0 mt-2 w-[180px] backdrop-blur-[30px] bg-white/[0.55] border-2 border-white/30 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden z-50">
                  {['Daily interval', 'Weekly interval', 'Monthly interval', 'Quarterly interval', 'Yearly interval'].map((int) => (
                    <button
                      key={int}
                      onClick={() => {
                        setProjectInterval(int);
                        setShowProjectIntervalDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-[13px] font-medium transition-all ${projectInterval === int
                          ? 'bg-white/[0.35] text-[#2d2820] font-bold'
                          : 'text-[#2d2820] hover:bg-white/[0.3]'
                        }`}
                    >
                      {int}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="h-[280px] mb-6 relative">
            {isLoading ? (
              <ChartSkeleton />
            ) : filteredProjectData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm italic">
                No project activity data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredProjectData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9983a" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(122, 107, 90, 0.1)" />
                  <XAxis
                    dataKey="month"
                    stroke="#7a6b5a"
                    tick={{ fill: '#7a6b5a', fontSize: 11, fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#7a6b5a" tick={{ fill: '#7a6b5a', fontSize: 11, fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {activeProjectFilterKeys.length === 0 ? (
                    <Bar
                      dataKey="value"
                      fill="url(#barGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={40}
                    />
                  ) : (
                    activeProjectFilterKeys.map(k => (
                      <Bar
                        key={k}
                        dataKey={FILTER_META[k].dataKey}
                        fill={FILTER_META[k].color}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={40}
                      />
                    ))
                  )}
                  <RechartsLine
                    type="monotone"
                    dataKey="trend"
                    stroke="#2d2820"
                    strokeWidth={3}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(FILTER_META).map((key) => (
              <button
                key={key}
                onClick={() => toggleProjectFilter(key as keyof typeof projectFilters)}
                aria-pressed={projectFilters[key as keyof typeof projectFilters]}
                className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${projectFilters[key as keyof typeof projectFilters]
                    ? 'bg-[#c9983a] text-white shadow-[0_3px_12px_rgba(201,152,58,0.3)]'
                    : 'backdrop-blur-[20px] bg-white/[0.15] border border-white/25 text-[#2d2820] hover:bg-white/[0.2]'
                  }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Contributors Map */}
        <div className="backdrop-blur-[40px] bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
          <h2 className={`text-[18px] font-bold mb-6 transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>Contributors map</h2>

          {/* World Map Visualization */}
          <div className="relative h-[280px] mb-6 rounded-[16px] backdrop-blur-[20px] bg-gradient-to-br from-[#2d2820]/80 via-[#1a1410]/70 to-[#2d2820]/80 border border-white/10 overflow-hidden">
            {/* Map Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(201,152,58,0.2)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* World Map SVG */}
            <div className="absolute inset-0 w-full h-full">
              {isLoading ? (
                <div className="w-full h-full animate-pulse bg-white/5" />
              ) : (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 100,
                }}
                className="w-full h-full"
              >
                <defs>
                  <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c9983a" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#d4af37" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#c9983a" stopOpacity="0.2" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <ZoomableGroup
                  zoom={mapZoom}
                  center={mapCenter}
                  onMoveEnd={({ coordinates, zoom }: { coordinates: [number, number]; zoom: number }) => {
                    setMapCenter(coordinates as [number, number]);
                    setMapZoom(zoom);
                  }}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }: { geographies: unknown[] }) =>
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      geographies.map((geo: any) => {
                        const isHighlighted = regions.some(region =>
                          geo.properties.name === region.name ||
                          (region.name === "United Kingdom" && geo.properties.name === "United Kingdom") ||
                          (region.name === "United States" && geo.properties.name === "United States of America")
                        );
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isHighlighted ? "url(#mapGradient)" : "rgba(255,255,255,0.05)"}
                            stroke="#c9983a"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { fill: "#d4af37", outline: "none", opacity: 0.8 },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>

                  {/* Markers */}
                  {regions.map((region) => {
                    const coords = COUNTRY_COORDINATES[region.name];
                    if (!coords) return null;
                    return (
                      <Marker key={region.name} coordinates={coords}>
                        <circle r={4} fill="#c9983a" stroke="#fff" strokeWidth={1} style={{ filter: 'url(#glow)' }}>
                          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>
              )}
            </div>

            {/* Map Info Overlay */}
            {!isLoading && (
            <div className="absolute top-4 right-4 flex flex-col gap-1">
              <button
                onClick={() => setMapZoom(z => Math.min(z * 1.5, 8))}
                className="w-8 h-8 rounded-[8px] backdrop-blur-[25px] bg-white/[0.2] border border-white/30 flex items-center justify-center text-white font-bold text-[11px] hover:bg-white/[0.3] transition-all cursor-pointer"
              >
                +
              </button>
              <button
                onClick={() => setMapZoom(z => Math.max(z / 1.5, 1))}
                className="w-8 h-8 rounded-[8px] backdrop-blur-[25px] bg-white/[0.2] border border-white/30 flex items-center justify-center text-white font-bold text-[11px] hover:bg-white/[0.3] transition-all cursor-pointer"
              >
                −
              </button>
            </div>
            )}
          </div>

          {/* Country Bars */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 mb-4">
                  <SkeletonLoader className="h-4 w-1/3" />
                  <SkeletonLoader className="h-6 w-full rounded-md" />
                </div>
              ))
            ) : regions.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">No regional data available</div>
            ) : (
              regions.map((region) => (
                <div key={region.name} className="flex items-center gap-3 group">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[13px] font-semibold transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
                        }`}>{region.name}</span>
                      <span className="text-[12px] font-bold text-[#c9983a]">{coerceToNumber(region.value)}</span>
                    </div>
                    <div className="h-6 rounded-[6px] backdrop-blur-[15px] bg-white/[0.08] border border-white/15 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#c9983a] to-[#d4af37] rounded-[6px] transition-all duration-500 group-hover:shadow-[0_0_15px_rgba(201,152,58,0.5)]"
                        style={{ width: `${coerceToNumber(region.percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {/* Bottom Grid */}
      {showContributions && (
      <div className={`grid gap-6 ${showProjects && showContributions ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Contributor Activity */}
        <div className="backdrop-blur-[40px] bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-[18px] font-bold transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}>Contributor activity</h2>
            <div className="relative">
              <button
                onClick={() => setShowContributorIntervalDropdown(!showContributorIntervalDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] backdrop-blur-[20px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] transition-all"
              >
                <span className={`text-[13px] font-semibold transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
                  }`}>{contributorInterval}</span>
                <ChevronDown className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
                  }`} />
              </button>
              {showContributorIntervalDropdown && (
                <div className="absolute right-0 mt-2 w-[180px] backdrop-blur-[30px] bg-white/[0.55] border-2 border-white/30 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden z-50">
                  {['Daily interval', 'Weekly interval', 'Monthly interval', 'Quarterly interval', 'Yearly interval'].map((int) => (
                    <button
                      key={int}
                      onClick={() => {
                        setContributorInterval(int);
                        setShowContributorIntervalDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-[13px] font-medium transition-all ${contributorInterval === int
                          ? 'bg-white/[0.35] text-[#2d2820] font-bold'
                          : 'text-[#2d2820] hover:bg-white/[0.3]'
                        }`}
                    >
                      {int}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="h-[280px] mb-6 relative">
            {isLoading ? (
              <ChartSkeleton />
            ) : filteredContributorData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm italic">
                No contributor activity data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredContributorData}>
                  <defs>
                    <linearGradient id="contributorBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9983a" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(122, 107, 90, 0.1)" />
                  <XAxis
                    dataKey="month"
                    stroke="#7a6b5a"
                    tick={{ fill: '#7a6b5a', fontSize: 11, fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#7a6b5a" tick={{ fill: '#7a6b5a', fontSize: 11, fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {activeContributorFilterKeys.length === 0 ? (
                    <Bar
                      dataKey="value"
                      fill="url(#contributorBarGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={40}
                    />
                  ) : (
                    activeContributorFilterKeys.map(k => (
                      <Bar
                        key={k}
                        dataKey={FILTER_META[k].dataKey}
                        fill={FILTER_META[k].color}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={40}
                      />
                    ))
                  )}
                  <RechartsLine
                    type="monotone"
                    dataKey="trend"
                    stroke="#2d2820"
                    strokeWidth={3}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(FILTER_META).map((key) => (
              <button
                key={key}
                onClick={() => toggleContributorFilter(key as keyof typeof contributorFilters)}
                aria-pressed={contributorFilters[key as keyof typeof contributorFilters]}
                className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${contributorFilters[key as keyof typeof contributorFilters]
                    ? 'bg-[#c9983a] text-white shadow-[0_3px_12px_rgba(201,152,58,0.3)]'
                    : 'backdrop-blur-[20px] bg-white/[0.15] border border-white/25 text-[#2d2820] hover:bg-white/[0.2]'
                  }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </button>
            ))}
          </div>
        </div>

        {/* Information Panel */}
        <div className="backdrop-blur-[40px] bg-white/[0.12] rounded-[24px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8">
          <h2 className={`text-[18px] font-bold mb-6 transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>Information</h2>

          {/* Info Text */}
          <div className="mb-6 p-5 rounded-[16px] backdrop-blur-[20px] bg-white/[0.15] border border-white/25">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#c9983a] flex-shrink-0 mt-0.5" />
              <p className={`text-[14px] leading-relaxed transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'
                }`}>
                Only data from contributors who have completed a KYC are included. Contributors without a completed KYC are excluded from the map.
              </p>
            </div>
          </div>

          {/* Contributor Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-6 rounded-[16px] backdrop-blur-[25px] bg-gradient-to-br from-white/[0.2] to-white/[0.12] border-2 border-white/30 shadow-[0_6px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_32px_rgba(201,152,58,0.15)] transition-all group">
              <div>
                <h3 className={`text-[14px] font-bold uppercase tracking-wider mb-2 transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
                  }`}>Contributors with billing profile</h3>
                <div className={`text-[42px] font-black leading-none transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'bg-gradient-to-r from-[#2d2820] to-[#c9983a] bg-clip-text text-transparent'
                  }`}>
                  {isLoading ? (
                    <SkeletonLoader className="h-10 w-32 inline-block" />
                  ) : (
                    `${coerceToNumber(stats?.billing_profile_count)} / ${coerceToNumber(stats?.total_contributor_count)}`
                  )}
                </div>
              </div>
              <div className="w-16 h-16 rounded-[16px] bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 flex items-center justify-center shadow-[0_4px_16px_rgba(201,152,58,0.25)] group-hover:scale-110 group-hover:shadow-[0_6px_24px_rgba(201,152,58,0.4)] transition-all duration-300">
                <svg className="w-8 h-8 text-[#c9983a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Additional Stats Placeholder */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-[14px] backdrop-blur-[20px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] transition-all group cursor-pointer">
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
                  }`}>Active</div>
                <div className={`text-[28px] font-black transition-colors ${theme === 'dark' ? 'text-[#f5f5f5] group-hover:text-[#c9983a]' : 'text-[#2d2820] group-hover:text-[#c9983a]'
                  }`}>
                  {isLoading ? <SkeletonLoader className="h-8 w-12" /> : coerceToNumber(stats?.active_contributor_count)}
                </div>
              </div>
              <div className="p-5 rounded-[14px] backdrop-blur-[20px] bg-white/[0.15] border border-white/25 hover:bg-white/[0.2] transition-all group cursor-pointer">
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 transition-colors ${theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
                  }`}>Total</div>
                <div className={`text-[28px] font-black transition-colors ${theme === 'dark' ? 'text-[#f5f5f5] group-hover:text-[#c9983a]' : 'text-[#2d2820] group-hover:text-[#c9983a]'
                  }`}>
                  {isLoading ? <SkeletonLoader className="h-8 w-12" /> : coerceToNumber(stats?.total_count)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(201, 152, 58, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(201, 152, 58, 0.7);
        }
      `}</style>
    </div>
  );
}