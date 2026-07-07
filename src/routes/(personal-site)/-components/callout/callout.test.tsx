import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Callout } from './callout'

describe('Callout', () => {
  it('renders its children', () => {
    render(<Callout>Some advice.</Callout>)
    expect(screen.getByText('Some advice.')).toBeInTheDocument()
  })

  it('defaults to the note variant', () => {
    render(<Callout>Body</Callout>)
    expect(screen.getByText('Note')).toBeInTheDocument()
  })

  it.each([
    ['note', 'Note'],
    ['warning', 'Warning'],
    ['tip', 'Tip'],
  ] as const)('conveys the %s type with a visible text label (not color alone)', (type, label) => {
    render(<Callout type={type}>Body</Callout>)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
