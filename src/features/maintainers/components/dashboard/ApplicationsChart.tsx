import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { useTheme } from '../../../../shared/contexts/ThemeContext'
import { ChartDataPoint } from '../../types'

interface ApplicationsChartProps {
  data: ChartDataPoint[]
}

/**
 * Escapes special HTML characters in a string to prevent raw HTML injection.
 *
 * @param str - The raw string to escape.
 * @returns The escaped HTML string.
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generates an accessible, escaped, screen-reader friendly summary of the applications chart data.
 * Describes the key trends, data volume (total applications and merged), peak month, and details of the chart series.
 *
 * @param data - The raw series data representing application volume and merge counts.
 * @returns A descriptive, localized, and safe summary text.
 */
export function generateApplicationsSummary(data: ChartDataPoint[]): string {
  if (!data || data.length === 0) {
    return 'No application history data available.'
  }

  const totalApplications = data.reduce((sum, d) => sum + (d.applications || 0), 0)
  const totalMerged = data.reduce((sum, d) => sum + (d.merged || 0), 0)

  // Find peak month (month with the highest number of applications)
  let peakMonth = ''
  let maxApplications = -1
  for (const d of data) {
    const apps = d.applications || 0
    if (apps > maxApplications) {
      maxApplications = apps
      peakMonth = d.month || ''
    }
  }

  const monthBreakdown = data
    .map(
      (d) =>
        `${d.month}: ${d.applications} application${
          d.applications === 1 ? '' : 's'
        }, ${d.merged} merged`
    )
    .join('; ')

  const peakMonthText = peakMonth
    ? ` Peak month: ${peakMonth} with ${maxApplications} application${
        maxApplications === 1 ? '' : 's'
      }.`
    : ''

  if (data.length === 1) {
    return `Applications history chart showing 1 month.${peakMonthText} ${monthBreakdown}.`
  }

  return `Applications history chart showing data for ${data.length} months. Total applications: ${totalApplications}, Total merged: ${totalMerged}.${peakMonthText} Monthly breakdown: ${monthBreakdown}.`
}

export function ApplicationsChart({ data }: ApplicationsChartProps) {
  const { theme } = useTheme()
  const [showTable, setShowTable] = useState(false)
  const isDark = theme === 'dark'

  const tooltipBg = isDark
    ? 'bg-neutral-900/80 border-white/10'
    : 'bg-[#e8dfd0]/95 border-white/25'

  const tooltipTitleText = isDark ? 'text-neutral-300' : 'text-[#7a6b5a]'

  const tooltipLabelText = isDark ? 'text-neutral-400' : 'text-[#7a6b5a]'

  const tooltipValueText = isDark ? 'text-neutral-100' : 'text-[#2d2820]'

  // Escape chart data to prevent HTML injection
  const escapedData = data
    ? data.map((point) => ({
        ...point,
        month: escapeHtml(point.month || ''),
      }))
    : []

  const summary = generateApplicationsSummary(escapedData)

  return (
    <div
      role="region"
      aria-labelledby="applications-chart-title"
      className={`backdrop-blur-[40px] rounded-[24px] border p-8 relative overflow-hidden group/chart transition-colors ${
        theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
      }`}
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#c9983a]/8 to-transparent rounded-full blur-3xl pointer-events-none group-hover/chart:scale-125 transition-transform duration-1000" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              id="applications-chart-title"
              className={`text-[20px] font-bold mb-1 transition-colors ${
                theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}
            >
              Applications History
            </h2>
            <p
              className={`text-[12px] font-medium transition-colors ${
                theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}
            >
              Last 6 months overview
            </p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            aria-expanded={showTable}
            aria-controls="applications-data-table"
            className={`px-4 py-2 text-[12px] font-bold rounded-[12px] border transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/[0.05] border-white/10 text-[#e8dfd0] hover:bg-white/[0.1]'
                : 'bg-white/[0.6] border-[#7a6b5a]/20 text-[#2d2820] hover:bg-white/[0.8] shadow-sm'
            }`}
          >
            {showTable ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
                <span>View Chart</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span>View Table</span>
              </>
            )}
          </button>
        </div>

        {/* Bar Chart Container */}
        <div
          role="img"
          aria-label={summary}
          className={`h-[320px] backdrop-blur-[25px] rounded-[16px] border p-6 transition-colors ${
            showTable ? 'hidden' : 'block'
          } ${theme === 'dark' ? 'bg-white/[0.05] border-white/10' : 'bg-white/[0.08] border-white/20'}`}
        >
          <div aria-hidden="true" className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={escapedData} barGap={4} aria-hidden="true">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    theme === 'dark' ? 'rgba(184, 168, 152, 0.12)' : 'rgba(122, 107, 90, 0.15)'
                  }
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke={theme === 'dark' ? '#b8a898' : '#7a6b5a'}
                  tick={{
                    fill: theme === 'dark' ? '#b8a898' : '#7a6b5a',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  axisLine={{
                    stroke:
                      theme === 'dark' ? 'rgba(184, 168, 152, 0.2)' : 'rgba(122, 107, 90, 0.2)',
                  }}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#b8a898' : '#7a6b5a'}
                  tick={{
                    fill: theme === 'dark' ? '#b8a898' : '#7a6b5a',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  axisLine={{
                    stroke:
                      theme === 'dark' ? 'rgba(184, 168, 152, 0.2)' : 'rgba(122, 107, 90, 0.2)',
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(201, 152, 58, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div
                          className={`backdrop-blur-[40px] rounded-[14px] border px-5 py-4 ${tooltipBg}`}
                        >
                          <div className={`text-[13px] font-bold mb-2 ${tooltipTitleText}`}>
                            {payload[0].payload.month}
                          </div>

                          {payload.map((entry: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 mb-1"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className={`text-[12px] font-medium ${tooltipLabelText}`}>
                                  {entry.dataKey === 'applications' ? 'Applications' : 'Merged'}
                                </span>
                              </div>

                              <span className={`text-[14px] font-bold ${tooltipValueText}`}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }

                    return null
                  }}
                />

                <Bar
                  dataKey="applications"
                  fill="url(#applicationsPattern)"
                  radius={[8, 8, 0, 0]}
                  animationBegin={0}
                  animationDuration={800}
                >
                  <LabelList
                    dataKey="applications"
                    position="top"
                    fill={theme === 'dark' ? '#b8a898' : '#7a6b5a'}
                    fontSize={10}
                    fontWeight={600}
                  />
                </Bar>
                <Bar
                  dataKey="merged"
                  fill="url(#mergedGradient)"
                  radius={[8, 8, 0, 0]}
                  animationBegin={100}
                  animationDuration={800}
                >
                  <LabelList
                    dataKey="merged"
                    position="top"
                    fill={theme === 'dark' ? '#b8a898' : '#7a6b5a'}
                    fontSize={10}
                    fontWeight={600}
                  />
                </Bar>
                <defs>
                  <linearGradient id="applicationsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9983a" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="mergedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4fb37a" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#2e6947" stopOpacity={0.6} />
                  </linearGradient>
                  <pattern
                    id="applicationsPattern"
                    width="12"
                    height="12"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="12" height="12" fill="#c9983a" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="12"
                      stroke="#e8dfd0"
                      strokeWidth="2.5"
                      opacity="0.4"
                    />
                  </pattern>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visually-hidden table below the chart for screen-reader traversal */}
        <table className="visually-hidden" data-testid="accessible-applications-table">
          <caption>Applications History Data</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Applications</th>
              <th>Merged</th>
            </tr>
          </thead>
          <tbody>
            {escapedData.length === 0 ? (
              <tr>
                <td colSpan={3}>No application history data available.</td>
              </tr>
            ) : (
              escapedData.map((point) => (
                <tr key={point.month}>
                  <td>{point.month}</td>
                  <td>{point.applications}</td>
                  <td>{point.merged}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Toggleable Data Table for Sighted Users */}
        <div
          id="applications-data-table"
          aria-hidden="true"
          className={
            showTable
              ? `h-[320px] overflow-y-auto backdrop-blur-[25px] rounded-[16px] border p-6 transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-white/[0.05] border-white/10'
                    : 'bg-white/[0.08] border-white/20'
                }`
              : 'hidden'
          }
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-[12px] font-bold uppercase tracking-wider ${
                  theme === 'dark'
                    ? 'border-white/10 text-[#b8a898]'
                    : 'border-neutral-200 text-[#7a6b5a]'
                }`}
              >
                <th className="pb-3">Month</th>
                <th className="pb-3 text-right">Applications</th>
                <th className="pb-3 text-right">Merged</th>
              </tr>
            </thead>
            <tbody
              className={`text-[14px] font-medium ${
                theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}
            >
              {escapedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className={`py-8 text-center text-sm ${
                      theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                    }`}
                  >
                    No application history data available.
                  </td>
                </tr>
              ) : (
                escapedData.map((point) => (
                  <tr
                    key={point.month}
                    className={`border-b last:border-0 hover:bg-white/[0.02] transition-colors ${
                      theme === 'dark' ? 'border-white/5' : 'border-neutral-100'
                    }`}
                  >
                    <td className="py-3 font-semibold">{point.month}</td>
                    <td className="py-3 text-right">{point.applications}</td>
                    <td className="py-3 text-right">{point.merged}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div
          className="flex items-center justify-center gap-6 mt-5"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-[4px] border border-white/10"
              style={{
                backgroundColor: '#c9983a',
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(232, 223, 208, 0.4) 2px, rgba(232, 223, 208, 0.4) 4px)',
              }}
            />
            <span
              className={`text-[13px] font-semibold transition-colors ${
                theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}
            >
              Applications
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#4fb37a] to-[#2e6947]" />
            <span
              className={`text-[13px] font-semibold transition-colors ${
                theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}
            >
              Merged
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}