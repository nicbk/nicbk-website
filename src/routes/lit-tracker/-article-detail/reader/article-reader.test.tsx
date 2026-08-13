import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * That the engine never renders on the server.
 *
 * This is a **framework constraint, not a preference**: PDFium is WebAssembly
 * and it drives a Web Worker, neither of which exists during SSR, and neither of
 * which degrades to a server-rendered snapshot. The rest of this page — the
 * sidebar, the header, the shell — does render on the server, so the boundary
 * has to be exactly here.
 *
 * The assertion that matters is the **negative** one: the module holding the
 * engine is not so much as imported during the server pass. A test that only
 * checked the fallback renders would still pass if a refactor made the engine
 * SSR-eligible and merely slow.
 */

/** Set if `pdf-reader.tsx` is ever imported. It must not be, here. */
const engineImported = vi.hoisted(() => ({ current: false }))

vi.mock('./pdf-reader', async () => {
  engineImported.current = true
  const { createElement } = await import('react')
  return {
    PdfReader: ({ articleId }: { articleId: string }) =>
      createElement('p', null, `reader:${articleId}`),
  }
})

// Stands in for the real boundary by rendering only its fallback, which is what
// the server pass produces. Deliberately not a pass-through: a `ClientOnly` that
// rendered its children here would make this file assert nothing.
vi.mock('@tanstack/react-router', async () => {
  const { createElement, Fragment } = await import('react')
  return {
    ClientOnly: ({ fallback }: { fallback: React.ReactNode }) =>
      createElement(Fragment, null, fallback),
  }
})

const { ArticleReader } = await import('./article-reader')

describe('ArticleReader', () => {
  it('does not reach the engine during a server render', () => {
    render(<ArticleReader articleId="article-1" />)

    // `React.lazy` is the half that keeps the engine out of the initial bundle;
    // `ClientOnly` is the half that keeps it from being *called*. Both are
    // needed — a lazy component still renders on the server if nothing stops it.
    expect(engineImported.current).toBe(false)
    expect(screen.queryByText('reader:article-1')).toBeNull()
  })

  it('says the reader is starting rather than showing an empty panel', () => {
    render(<ArticleReader articleId="article-1" />)

    expect(screen.getByText(/starting the reader/)).toBeInTheDocument()
  })

  it('renders the toolbar before the engine exists, so the panel’s shape is settled', () => {
    // The frame is there from the first paint and only its contents change —
    // otherwise the document would arrive and push everything down.
    render(<ArticleReader articleId="article-1" />)

    expect(
      screen.getByRole('group', { name: 'reader controls' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'next page' })).toBeDisabled()
  })

  it('carries the page’s controls in the fallback too', () => {
    // The sidebar trigger and the article menu have nothing to do with the
    // document, so they must work before it — and before the engine — exists.
    render(
      <ArticleReader
        articleId="article-1"
        actions={<button type="button">options</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'options' })).toBeInTheDocument()
  })
})
