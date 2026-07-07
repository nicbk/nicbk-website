import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GPG_FINGERPRINT } from '~/gpg/fingerprint.generated'
import { AboutPage } from './about-page'

describe('AboutPage', () => {
  it('exposes exactly one main heading for structure and focus handoff', () => {
    render(<AboutPage />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('about')
  })

  it('renders the Résumé/CV and LinkedIn links with their hrefs', () => {
    render(<AboutPage />)
    expect(screen.getByRole('link', { name: 'Résumé/CV' })).toHaveAttribute(
      'href',
      '/nicbk_cv.pdf',
    )
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/nicbk',
    )
  })

  it('renders the Communication section with both obfuscated addresses', () => {
    render(<AboutPage />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Communication' }),
    ).toBeInTheDocument()
    expect(screen.getByText('nicolas at nicbk dot com')).toBeInTheDocument()
    expect(screen.getByText('nicbk at stanford dot edu')).toBeInTheDocument()
    // The sign/encrypt note (matched loosely so wrapping/whitespace doesn't
    // make the assertion brittle).
    expect(
      screen.getByText(/sign or encrypt email messages/),
    ).toBeInTheDocument()
  })

  it('shows the fingerprint from the generated constant, not a literal', () => {
    render(<AboutPage />)
    // The guard against re-hard-coding: the rendered value must equal the
    // constant the generator derives from public/pgp/nicbk.asc.
    expect(screen.getByText(GPG_FINGERPRINT)).toBeInTheDocument()
  })

  it('links the Public Key row to the served .asc', () => {
    render(<AboutPage />)
    expect(
      screen.getByRole('link', {
        name: 'Nicolás Kennedy <nicolas at nicbk dot com>',
      }),
    ).toHaveAttribute('href', '/pgp/nicbk.asc')
  })

  it('renders the Version Control section with distinct profile links', () => {
    render(<AboutPage />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Version Control' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'GitHub profile: nicbk' }),
    ).toHaveAttribute('href', 'https://github.com/nicbk')
    expect(
      screen.getByRole('link', { name: 'GitLab profile: nicbk' }),
    ).toHaveAttribute('href', 'https://gitlab.com/nicbk')
    expect(
      screen.getByText('I usually host projects on GitHub.'),
    ).toBeInTheDocument()
  })
})
