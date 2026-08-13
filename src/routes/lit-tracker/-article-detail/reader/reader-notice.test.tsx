import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReaderNotice } from './reader-notice'

/**
 * The three states that are not a document.
 *
 * The load-bearing assertion is that **failed does not look like loading**. A
 * reader whose PDF is missing from the bucket seeing "loading the paper…"
 * forever is the defect this component exists to prevent, and it is exactly the
 * one a single `isLoading` boolean produces.
 */

describe('ReaderNotice', () => {
  it('names the engine’s wait and the document’s separately', () => {
    // Two different waits: the engine downloads once per session, the paper once
    // per article. Which one is happening is the difference between a wait that
    // makes sense and an unexplained pause.
    const starting = render(<ReaderNotice state="starting" />)
    expect(screen.getByText(/starting the reader/)).toBeInTheDocument()
    starting.unmount()

    render(<ReaderNotice state="loading" />)
    expect(screen.getByText(/loading the paper/)).toBeInTheDocument()
  })

  it('says a document could not be loaded, and does not say it is loading', () => {
    render(<ReaderNotice state="failed" />)

    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
    expect(screen.queryByText(/loading/)).toBeNull()
    expect(screen.queryByText(/starting/)).toBeNull()
  })

  it('interrupts on failure and stays polite while waiting', () => {
    // A reader who has moved on to the sidebar still needs to be told the paper
    // is not coming; they do not need to be interrupted to be told it is on its
    // way.
    const loading = render(<ReaderNotice state="loading" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    loading.unmount()

    render(<ReaderNotice state="failed" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('carries failure in more than colour', () => {
    // Contrast alone would not survive a monochrome display or a reader who
    // cannot distinguish red (research/accessibility/…/color-contrast…).
    const loading = render(<ReaderNotice state="loading" />)
    const loadingIcon = loading.container.querySelector('svg')?.innerHTML
    loading.unmount()

    const failed = render(<ReaderNotice state="failed" />)
    const failedIcon = failed.container.querySelector('svg')?.innerHTML

    expect(failedIcon).not.toBe(loadingIcon)
  })

  it('says nothing at all once the paper is on screen', () => {
    const { container } = render(<ReaderNotice state="ready" />)

    expect(container).toBeEmptyDOMElement()
  })
})
