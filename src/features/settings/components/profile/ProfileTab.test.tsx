// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { ProfileTab } from './ProfileTab'

const mockGetCurrentUser = vi.fn()
const mockUpdateProfile = vi.fn()
const mockUpdateAvatar = vi.fn()
const mockResyncGitHubProfile = vi.fn()

vi.mock('../../../../shared/api/client', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  updateAvatar: (...args: unknown[]) => mockUpdateAvatar(...args),
  resyncGitHubProfile: (...args: unknown[]) => mockResyncGitHubProfile(...args),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockUser = {
  id: 'user-1',
  role: 'developer',
  first_name: 'John',
  last_name: 'Doe',
  location: 'San Francisco',
  website: 'https://example.com',
  bio: 'A developer',
  avatar_url: null,
  telegram: '@johndoe',
  linkedin: 'johndoe',
  whatsapp: '+1234567890',
  twitter: '@johndoe',
  discord: 'johndoe#1234',
  github: {
    login: 'johndoe',
    avatar_url: 'https://avatars.githubusercontent.com/u/1',
    name: 'John Doe',
    email: 'john@example.com',
    location: 'San Francisco',
    bio: 'A developer',
    website: 'https://example.com',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfileTab', () => {
  it('renders heading and loads data', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    expect(screen.getByText('Profile')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
  })

  it('shows website validation error on blur', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
    })

    const websiteInput = screen.getByDisplayValue('https://example.com')
    await user.clear(websiteInput)
    await user.type(websiteInput, 'not-a-url')
    await user.tab()

    expect(await screen.findByText(/valid URL/i)).toBeInTheDocument()
  })

  it('disables submit button when form is not dirty', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('disables submit button when form is invalid', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
    })

    const websiteInput = screen.getByDisplayValue('https://example.com')
    await user.clear(websiteInput)
    await user.type(websiteInput, 'bad-url')
    await user.tab()

    expect(await screen.findByText(/valid URL/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('calls updateProfile and shows success toast on valid submit', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockUpdateProfile.mockResolvedValue(undefined)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Jane' }),
      )
    })
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!')
  })

  it('shows error toast when updateProfile fails', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    mockUpdateProfile.mockRejectedValue(new Error('API error'))
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to update profile. Please try again.',
      )
    })
  })

  it('shows error messages for fields exceeding max length', async () => {
    const user = userEvent.setup()
    mockGetCurrentUser.mockResolvedValue(mockUser)
    renderWithTheme(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const firstNameInput = screen.getByDisplayValue('John')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'a'.repeat(51))
    await user.tab()

    expect(await screen.findByText(/First name must be 50 characters or less/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })
})
