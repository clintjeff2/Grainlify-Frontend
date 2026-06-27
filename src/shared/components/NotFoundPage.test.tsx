import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from '../contexts/ThemeContext'
import { NotFoundPage } from './NotFoundPage'

function LocationProbe() {
  const location = useLocation()

  return <span data-testid="current-path">{location.pathname}</span>
}

function renderNotFoundPage({
  theme = 'light',
  initialEntries = ['/missing'],
  initialIndex = 0,
}: {
  theme?: 'light' | 'dark'
  initialEntries?: string[]
  initialIndex?: number
} = {}) {
  localStorage.setItem('theme', theme)

  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <ThemeProvider>
        <NotFoundPage />
        <LocationProbe />
      </ThemeProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('NotFoundPage', () => {
  it('renders the light-themed 404 content and actions', () => {
    const { container } = renderNotFoundPage({ theme: 'light' })

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument()
    expect(screen.getByText(/please contact support/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('from-[#e8dfd0]')
  })

  it('renders the dark-themed 404 variant', () => {
    const { container } = renderNotFoundPage({ theme: 'dark' })

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('from-[#1a1512]')
  })

  it('navigates back to the previous in-app route', async () => {
    const user = userEvent.setup()
    renderNotFoundPage({
      initialEntries: ['/dashboard', '/unknown-page'],
      initialIndex: 1,
    })

    await user.click(screen.getByRole('button', { name: /go back/i }))

    expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
  })

  it('navigates to the relative dashboard route without leaving the app', async () => {
    const user = userEvent.setup()
    renderNotFoundPage()

    await user.click(screen.getByRole('button', { name: /go to dashboard/i }))

    expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
  })
})
