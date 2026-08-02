import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectsPage } from './projects-page'

// TanStack Router's <Link> needs a live router; the decided unit-test pattern
// (research/testing-qa/test-runner-and-frameworks.md) mocks it to a plain
// anchor so the page renders in isolation.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

describe('ProjectsPage', () => {
  it('exposes exactly one main heading for structure and focus handoff', () => {
    render(<ProjectsPage />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('projects')
  })

  it('lists the Literature Tracker with its one-line description', () => {
    render(<ProjectsPage />)
    const entry = screen.getByRole('listitem')
    expect(entry).toHaveTextContent('Academic Literature Tracker')
    expect(entry).toHaveTextContent(
      'upload papers, read and annotate them, and track reading progress',
    )
  })

  it('marks the entries up as a list, not loose text', () => {
    render(<ProjectsPage />)
    const list = screen.getByRole('list', { name: 'Projects' })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(list).toContainElement(screen.getByRole('listitem'))
  })

  it('links the Literature Tracker to the tracker itself', () => {
    render(<ProjectsPage />)
    // This entry shipped unlinked because the tracker had no route and no
    // decided URL (features/projects-page/research.md); the feature that built
    // it supplied both. The name is the link — the description stays plain
    // text, so the clickable target is the thing being named.
    const link = screen.getByRole('link', {
      name: 'Academic Literature Tracker',
    })
    expect(link).toHaveAttribute('href', '/lit-tracker')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
