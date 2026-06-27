import { Component, ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook, act, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

class TestErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <span data-testid="theme-error">{this.state.error.message}</span>
    }

    return this.props.children
  }
}

function ThemeConsumerWithoutProvider() {
  useTheme()
  return null
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('ThemeProvider + useTheme', () => {
  it('defaults to light theme and persists it', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('light')
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('light'))
  })

  it('uses the saved theme from localStorage on mount', async () => {
    localStorage.setItem('theme', 'dark')

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('dark')
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('dark'))
  })

  it('toggles between light and dark themes and persists each change', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('dark'))

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('light')
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('light'))
  })

  it('sets the theme from animation state and persists it', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setThemeFromAnimation(true)
    })

    expect(result.current.theme).toBe('dark')
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('dark'))

    act(() => {
      result.current.setThemeFromAnimation(false)
    })

    expect(result.current.theme).toBe('light')
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('light'))
  })

  it('throws when useTheme is rendered without ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.error?.message === 'useTheme must be used within a ThemeProvider') {
        event.preventDefault()
      }
    }

    try {
      window.addEventListener('error', preventExpectedError)

      const { getByTestId } = render(
        <TestErrorBoundary>
          <ThemeConsumerWithoutProvider />
        </TestErrorBoundary>
      )

      expect(getByTestId('theme-error').textContent).toBe(
        'useTheme must be used within a ThemeProvider'
      )
    } finally {
      window.removeEventListener('error', preventExpectedError)
      consoleError.mockRestore()
    }
  })
})
