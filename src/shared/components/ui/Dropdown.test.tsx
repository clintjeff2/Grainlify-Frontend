// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropdown } from './Dropdown'

const themeState = vi.hoisted(() => ({ theme: 'light' as 'light' | 'dark' }))

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: themeState.theme,
    toggleTheme: vi.fn(),
    setThemeFromAnimation: vi.fn(),
  }),
}))

const OPTIONS = [
  { name: 'Frontend' },
  { name: 'Backend' },
  { name: 'Design' },
  { name: 'Documentation' },
]

function DropdownHarness({
  onToggle,
  initialSelectedValues = ['Backend'],
  renderOption,
}: {
  onToggle?: (value: string) => void
  initialSelectedValues?: string[]
  renderOption?: (option: (typeof OPTIONS)[number], isSelected: boolean) => ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>(initialSelectedValues)

  return (
    <Dropdown
      filterType="skills"
      options={OPTIONS}
      selectedValues={selectedValues}
      onToggle={(value) => {
        setSelectedValues((current) =>
          current.includes(value)
            ? current.filter((selected) => selected !== value)
            : [...current, value]
        )
        onToggle?.(value)
      }}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      isOpen={isOpen}
      onToggleOpen={() => setIsOpen((open) => !open)}
      onClose={() => setIsOpen(false)}
      renderOption={renderOption}
    />
  )
}

describe('Dropdown accessibility', () => {
  beforeEach(() => {
    themeState.theme = 'light'
  })

  it('exposes listbox state on the trigger', () => {
    render(<DropdownHarness />)

    const trigger = screen.getByRole('button', { name: /select skills/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')
  })

  it('renders a labelled listbox with option selection semantics', async () => {
    const user = userEvent.setup()
    render(<DropdownHarness />)

    await user.click(screen.getByRole('button', { name: /select skills/i }))

    expect(screen.getByRole('listbox', { name: 'Select skills' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length)
    expect(screen.getByRole('option', { name: 'Backend' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Frontend' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('moves from search to options with arrow keys and toggles with Enter', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<DropdownHarness onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: /select skills/i }))
    const search = screen.getByRole('searchbox', { name: 'Search skills' })
    await waitFor(() => expect(search).toHaveFocus())

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Frontend' })).toHaveFocus())

    fireEvent.keyDown(screen.getByRole('option', { name: 'Frontend' }), { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Backend' })).toHaveFocus())

    fireEvent.keyDown(screen.getByRole('option', { name: 'Backend' }), { key: 'Enter' })

    expect(onToggle).toHaveBeenCalledWith('Backend')
    expect(screen.getByRole('listbox', { name: 'Select skills' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Backend' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('keeps keyboard navigation aligned with search filtering', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<DropdownHarness onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: /select skills/i }))
    const search = screen.getByRole('searchbox', { name: 'Search skills' })
    await user.type(search, 'doc')

    expect(screen.getAllByRole('option')).toHaveLength(1)
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Documentation' })).toHaveFocus())

    fireEvent.keyDown(screen.getByRole('option', { name: 'Documentation' }), { key: 'Enter' })

    expect(onToggle).toHaveBeenCalledWith('Documentation')
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<DropdownHarness />)
    const trigger = screen.getByRole('button', { name: /select skills/i })

    await user.click(trigger)
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search skills' }), {
      key: 'Escape',
    })

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('opens from the trigger with arrow keys and supports Home and End navigation', async () => {
    render(<DropdownHarness />)
    const trigger = screen.getByRole('button', { name: /select skills/i })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

    const search = screen.getByRole('searchbox', { name: 'Search skills' })
    fireEvent.keyDown(search, { key: 'End' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Documentation' })).toHaveFocus())

    fireEvent.keyDown(screen.getByRole('option', { name: 'Documentation' }), { key: 'Home' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Frontend' })).toHaveFocus())

    fireEvent.keyDown(screen.getByRole('option', { name: 'Frontend' }), { key: 'ArrowUp' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Documentation' })).toHaveFocus())
  })

  it('keeps focus on search when arrowing through an empty result set', async () => {
    const user = userEvent.setup()
    render(<DropdownHarness />)

    await user.click(screen.getByRole('button', { name: /select skills/i }))
    const search = screen.getByRole('searchbox', { name: 'Search skills' })
    await user.type(search, 'zzz')

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No options found')).toBeInTheDocument()

    fireEvent.keyDown(search, { key: 'ArrowDown' })

    expect(search).toHaveFocus()
  })

  it('toggles an option on click and preserves the open listbox', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<DropdownHarness onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: /select skills/i }))
    await user.click(screen.getByRole('option', { name: 'Design' }))

    expect(onToggle).toHaveBeenCalledWith('Design')
    expect(screen.getByRole('listbox', { name: 'Select skills' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Design' })).toHaveAttribute('aria-selected', 'true')
  })

  it('closes from the close button and by clicking outside', async () => {
    const user = userEvent.setup()
    render(<DropdownHarness />)
    const trigger = screen.getByRole('button', { name: /select skills/i })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Close skills dropdown' }))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())

    await user.click(trigger)
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
    fireEvent.mouseDown(document.body)

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('supports custom option rendering without removing option semantics', async () => {
    const user = userEvent.setup()
    render(
      <DropdownHarness
        renderOption={(option, isSelected) => (
          <span>
            {option.name}
            {isSelected ? ' selected' : ' available'}
          </span>
        )}
      />
    )

    await user.click(screen.getByRole('button', { name: /select skills/i }))

    expect(screen.getByRole('option', { name: 'Backend selected' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('option', { name: 'Frontend available' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('keeps semantics in dark theme for selected and unselected states', async () => {
    themeState.theme = 'dark'
    const user = userEvent.setup()
    render(<DropdownHarness initialSelectedValues={[]} />)

    await user.click(screen.getByRole('button', { name: /select skills/i }))

    expect(screen.getByRole('listbox', { name: 'Select skills' })).toHaveAttribute(
      'aria-multiselectable',
      'true'
    )
    expect(screen.getByRole('option', { name: 'Frontend' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })
})
