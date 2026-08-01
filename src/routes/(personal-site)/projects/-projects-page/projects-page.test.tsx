import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectsPage } from './projects-page'

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

  it('renders no link, since there is nothing to link to yet', () => {
    render(<ProjectsPage />)
    // The Literature Tracker has no route and no decided URL (see
    // features/projects-page/research.md), so an entry must not link anywhere.
    // When the feature that builds the tracker makes these entries links, this
    // test fails — which is the point: the change should be deliberate, made
    // together with a destination that actually resolves.
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
