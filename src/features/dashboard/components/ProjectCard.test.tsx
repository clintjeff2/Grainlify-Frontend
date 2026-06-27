import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { ProjectCard, type Project } from './ProjectCard'

const project: Project = {
  id: 42,
  name: 'Grainlify Frontend',
  icon: 'GF',
  stars: '1.2k',
  forks: '88',
  contributors: 12,
  openIssues: 7,
  prs: 4,
  description: 'Open-source contribution dashboard',
  tags: ['React', 'A11y'],
  color: 'from-[#c9983a] to-[#8b6f3a]',
}

describe('ProjectCard', () => {
  it('uses a semantic button that supports pointer and keyboard activation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    renderWithTheme(<ProjectCard project={project} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Open Grainlify Frontend project',
    })

    await user.click(card)
    expect(onClick).toHaveBeenLastCalledWith('42')

    onClick.mockClear()
    card.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenLastCalledWith('42')

    onClick.mockClear()
    await user.keyboard(' ')
    expect(onClick).toHaveBeenLastCalledWith('42')
    expect(card).toHaveClass('focus-visible:ring-2')
  })

  it('labels project stats and hides decorative icons from assistive tech', () => {
    renderWithTheme(<ProjectCard project={project} />)

    expect(screen.getByLabelText('Stars: 1.2k')).toHaveTextContent('1.2k')
    expect(screen.getByLabelText('Forks: 88')).toHaveTextContent('88')
    expect(screen.getByLabelText('Contributors: 12')).toHaveTextContent('12')
    expect(screen.getByLabelText('Open issues: 7')).toHaveTextContent('7')
    expect(screen.getByLabelText('Pull requests: 4')).toHaveTextContent('4')

    expect(document.querySelectorAll("svg:not([aria-hidden='true'])")).toHaveLength(0)
  })

  it('does not crash when project data is missing', () => {
    const onClick = vi.fn()

    const { container } = renderWithTheme(
      <ProjectCard project={null as unknown as Project} onClick={onClick} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(onClick).not.toHaveBeenCalled()
  })
})
