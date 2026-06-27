import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect } from 'vitest'
import { ApplicationsChart, generateApplicationsSummary, escapeHtml } from './ApplicationsChart'

// Mock theme hook to avoid needing full provider
vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

// Mock Recharts to avoid layout size warnings and rendering logs in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  Bar: ({ children }: any) => <g>{children}</g>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  LabelList: () => null,
  Tooltip: ({ content }: any) => {
    if (typeof content === 'function') {
      return (
        <div data-testid="mock-tooltip">
          {content({
            active: true,
            payload: [
              { dataKey: 'applications', value: 120, color: '#c9983a', payload: { month: 'Jan' } },
              { dataKey: 'merged', value: 80, color: '#4fb37a', payload: { month: 'Jan' } },
            ],
          })}
          {content({
            active: false,
            payload: [],
          })}
        </div>
      )
    }
    return null
  },
}))

const mockData = [
  { month: 'Jan', applications: 120, merged: 80 },
  { month: 'Feb', applications: 150, merged: 95 },
  { month: 'Mar', applications: 200, merged: 110 },
  { month: 'Apr', applications: 180, merged: 140 },
  { month: 'May', applications: 220, merged: 160 },
  { month: 'Jun', applications: 250, merged: 190 },
]

describe('generateApplicationsSummary', () => {
  it('handles empty series', () => {
    expect(generateApplicationsSummary([])).toBe('No application history data available.')
    expect(generateApplicationsSummary(null as any)).toBe('No application history data available.')
  })

  it('handles single data point', () => {
    const singleData = [{ month: 'Jan', applications: 5, merged: 2 }]
    const result = generateApplicationsSummary(singleData)
    expect(result).toContain('Applications history chart showing 1 month')
    expect(result).toContain('Peak month: Jan with 5 applications')
    expect(result).toContain('Jan: 5 applications, 2 merged')
  })

  it('handles pluralization correctly for single counts', () => {
    const singleData = [{ month: 'Jan', applications: 1, merged: 1 }]
    const result = generateApplicationsSummary(singleData)
    expect(result).toContain('Jan: 1 application, 1 merged')
    expect(result).toContain('Peak month: Jan with 1 application')
  })

  it('handles large series/normal series', () => {
    const result = generateApplicationsSummary(mockData)
    expect(result).toContain('Applications history chart showing data for 6 months')
    expect(result).toContain('Total applications: 1120')
    expect(result).toContain('Total merged: 775')
    expect(result).toContain('Peak month: Jun with 250 applications')
    expect(result).toContain('Jan: 120 applications, 80 merged')
  })
})

describe('escapeHtml helper', () => {
  it('escapes characters properly', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
    expect(escapeHtml('John & Jane')).toBe('John &amp; Jane')
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;')
    expect(escapeHtml("'test'")).toBe('&#039;test&#039;')
  })
})

describe('ApplicationsChart Component', () => {
  // Test 1: Accessible table is present in the DOM
  it('accessible table is present in the DOM', () => {
    render(<ApplicationsChart data={mockData} />)
    const table = screen.getByTestId('accessible-applications-table')
    expect(table).toBeInTheDocument()
    expect(table).toHaveClass('visually-hidden')
    expect(table.textContent).toContain('Jan')
    expect(table.textContent).toContain('120')
    expect(table.textContent).toContain('80')
  })

  // Test 2: SVG has aria-hidden="true"
  it('SVG has aria-hidden="true"', () => {
    const { container } = render(<ApplicationsChart data={mockData} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  // Test 3: Container has correct role="img" and aria-label
  it('container has correct role="img" and aria-label', () => {
    render(<ApplicationsChart data={mockData} />)
    const container = screen.getByRole('img')
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute('aria-label')
    expect(container.getAttribute('aria-label')).toContain('Applications history chart')
  })

  // Test 4: Empty series renders without crashing
  it('empty series renders without crashing', () => {
    render(<ApplicationsChart data={[]} />)
    const container = screen.getByRole('img')
    expect(container.getAttribute('aria-label')).toBe('No application history data available.')

    const table = screen.getByTestId('accessible-applications-table')
    expect(table).toBeInTheDocument()
    expect(screen.getAllByText('No application history data available.').length).toBeGreaterThan(0)
  })

  // Test 5: Single data point renders correctly
  it('single data point renders correctly', () => {
    const singleData = [{ month: 'Jan', applications: 5, merged: 2 }]
    render(<ApplicationsChart data={singleData} />)

    const container = screen.getByRole('img')
    expect(container.getAttribute('aria-label')).toContain('Applications history chart showing 1 month')
    expect(container.getAttribute('aria-label')).toContain('Peak month: Jan with 5 applications')

    const table = screen.getByTestId('accessible-applications-table')
    expect(table).toBeInTheDocument()
    expect(table.textContent).toContain('Jan')
    expect(table.textContent).toContain('5')
    expect(table.textContent).toContain('2')
  })

  // Test 6: Large series renders correctly
  it('large series renders correctly', () => {
    render(<ApplicationsChart data={mockData} />)
    const container = screen.getByRole('img')
    expect(container.getAttribute('aria-label')).toContain('Applications history chart showing data for 6 months')
    expect(container.getAttribute('aria-label')).toContain('Total applications: 1120')
    expect(container.getAttribute('aria-label')).toContain('Total merged: 775')
    expect(container.getAttribute('aria-label')).toContain('Peak month: Jun with 250 applications')
  })

  it('escapes month labels in the chart to prevent HTML injection', () => {
    const maliciousData = [
      { month: 'Jan<script>alert("xss")</script>', applications: 10, merged: 5 },
    ]
    render(<ApplicationsChart data={maliciousData} />)

    const table = screen.getByTestId('accessible-applications-table')
    expect(table.textContent).toContain('Jan&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(table.textContent).not.toContain('<script>')
  })

  it('initially displays visual chart and hides the data table visually', () => {
    const { container } = render(<ApplicationsChart data={mockData} />)

    const chartContainer = screen.getByRole('img')
    expect(chartContainer).toHaveClass('block')
    expect(chartContainer).not.toHaveClass('hidden')

    const tableContainer = container.querySelector('#applications-data-table')
    expect(tableContainer).toHaveClass('hidden')
  })

  it('toggles to data table view on button click and back to chart view', () => {
    const { container } = render(<ApplicationsChart data={mockData} />)

    const toggleButton = screen.getByRole('button', { name: /view table/i })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    // Click to view table
    fireEvent.click(toggleButton)
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /view chart/i })).toBeInTheDocument()

    // Visual chart container should now be hidden
    const chartContainer = screen.getByRole('img', { hidden: true })
    expect(chartContainer).toHaveClass('hidden')
    expect(chartContainer).not.toHaveClass('block')

    // Table container should be visible (not hidden)
    const tableContainer = container.querySelector('#applications-data-table')
    expect(tableContainer).not.toHaveClass('hidden')
    expect(tableContainer).toHaveClass('h-[320px]')

    // Verify table structure and data
    const tableHeaders = screen.getAllByRole('columnheader')
    expect(tableHeaders).toHaveLength(3)
    expect(tableHeaders[0]).toHaveTextContent('Month')
    expect(tableHeaders[1]).toHaveTextContent('Applications')
    expect(tableHeaders[2]).toHaveTextContent('Merged')

    // Click to view chart again
    fireEvent.click(toggleButton)
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(chartContainer).toHaveClass('block')
    expect(tableContainer).toHaveClass('hidden')
  })

  it('renders custom tooltip content correctly when active and covers all tooltip paths', () => {
    render(<ApplicationsChart data={mockData} />)

    // Verify mock tooltip exists and renders correctly
    const tooltipContainer = screen.getByTestId('mock-tooltip')
    expect(tooltipContainer).toBeInTheDocument()

    // Check that we have values from applications (120) and merged (80)
    expect(screen.getAllByText('Applications').length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByText('Merged').length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByText('120').length).toBeGreaterThan(0)
    expect(screen.getAllByText('80').length).toBeGreaterThan(0)
  })
})
