import { ZoomMode } from '@embedpdf/plugin-zoom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InertReaderToolbar, ReaderToolbar } from './reader-toolbar'

/**
 * The controls, and what they reach.
 *
 * Everything here is asserted against injected callbacks rather than a running
 * engine: the toolbar drives EmbedPDF's scroll and zoom scopes, and the point of
 * passing them in as props is that this file needs neither WebAssembly nor a
 * document to prove the plumbing.
 */

function renderToolbar(
  overrides: Partial<Parameters<typeof ReaderToolbar>[0]> = {},
) {
  const props = {
    currentPage: 3,
    totalPages: 15,
    onGoToPage: vi.fn(),
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    currentZoom: 1,
    zoomLevel: 1 as Parameters<typeof ReaderToolbar>[0]['zoomLevel'],
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onRequestZoom: vi.fn(),
    disabled: false,
    ...overrides,
  }
  render(<ReaderToolbar {...props} />)
  return props
}

describe('the reader toolbar', () => {
  it('names every icon-only control', () => {
    // Four of the six controls are a glyph and nothing else, so without these
    // names the bar is unusable by anyone listening rather than looking.
    renderToolbar()

    for (const name of ['previous page', 'next page', 'zoom out', 'zoom in']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(
      screen.getByRole('textbox', { name: 'page number' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'zoom level' }),
    ).toBeInTheDocument()
  })

  it('turns the pages', async () => {
    const props = renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: 'next page' }))
    expect(props.onNextPage).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'previous page' }))
    expect(props.onPreviousPage).toHaveBeenCalledOnce()
  })

  it('steps the zoom', async () => {
    const props = renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: 'zoom in' }))
    expect(props.onZoomIn).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'zoom out' }))
    expect(props.onZoomOut).toHaveBeenCalledOnce()
  })

  it('reports the page in view against the total', () => {
    renderToolbar()

    expect(screen.getByRole('textbox', { name: 'page number' })).toHaveValue(
      '3',
    )
    expect(screen.getByText(/15/)).toBeInTheDocument()
  })

  it('jumps to a typed page', async () => {
    const props = renderToolbar()
    const field = screen.getByRole('textbox', { name: 'page number' })

    await userEvent.clear(field)
    await userEvent.type(field, '11{Enter}')

    expect(props.onGoToPage).toHaveBeenCalledWith(11)
  })

  it('stops going back at the first page', () => {
    // Where the disabled states turn over. A "previous" that does nothing is
    // worse than one that is visibly unavailable.
    renderToolbar({ currentPage: 1 })

    expect(screen.getByRole('button', { name: 'previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'next page' })).toBeEnabled()
  })

  it('stops going forward at the last page', () => {
    renderToolbar({ currentPage: 15 })

    expect(screen.getByRole('button', { name: 'next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'previous page' })).toBeEnabled()
  })

  it('shows the effective zoom, not the mode that was asked for', () => {
    // "fit width" is a request; what the reader is looking at is the percentage
    // it worked out to, and that number is the whole reason the control exists.
    renderToolbar({ zoomLevel: ZoomMode.FitWidth, currentZoom: 1.6934 })

    expect(
      screen.getByRole('button', { name: 'zoom level' }),
    ).toHaveTextContent('169%')
  })

  it('offers the presets, and asks for the one chosen', async () => {
    const props = renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: 'zoom level' }))
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: /fit width/ }),
    )

    expect(props.onRequestZoom).toHaveBeenCalledWith(ZoomMode.FitWidth)
  })

  it('keeps a space for the annotation tools task 4 adds', () => {
    // Reserved rather than laid out for two groups and re-laid-out for three.
    const { container } = render(
      <ReaderToolbar
        currentPage={1}
        totalPages={15}
        onGoToPage={vi.fn()}
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
        currentZoom={1}
        zoomLevel={1}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRequestZoom={vi.fn()}
        disabled={false}
      />,
    )

    expect(container.querySelector('[class*="toolSlot"]')).not.toBeNull()
  })

  it('carries the page’s own controls when it is given them', () => {
    // The sidebar trigger and the article menu, which moved here when the
    // metadata row went away (user-decided 2026-08-13).
    renderToolbar({ actions: <button type="button">options</button> })

    expect(screen.getByRole('button', { name: 'options' })).toBeInTheDocument()
  })

  describe('with no document', () => {
    it('stays on screen, inert', () => {
      // A paper that never arrives must not take the page's frame with it — but
      // controls that cannot act must not pretend they can either.
      renderToolbar({ disabled: true, totalPages: 0 })

      for (const name of [
        'previous page',
        'next page',
        'zoom out',
        'zoom in',
      ]) {
        expect(screen.getByRole('button', { name })).toBeDisabled()
      }
      expect(
        screen.getByRole('textbox', { name: 'page number' }),
      ).toBeDisabled()
      expect(screen.getByRole('button', { name: 'zoom level' })).toBeDisabled()
    })

    it('reports no page count rather than "1 / 0"', () => {
      renderToolbar({ disabled: true, totalPages: 0 })

      expect(screen.queryByText(/\b0\b/)).toBeNull()
      expect(screen.getByRole('textbox', { name: 'page number' })).toHaveValue(
        '—',
      )
    })
  })

  it('renders inert on its own, for the states that have no engine', () => {
    // The server pass, the wait for the reader's chunk, and an engine that
    // failed to start — none of which has a scope to drive the bar with.
    render(<InertReaderToolbar />)

    expect(screen.getByRole('button', { name: 'next page' })).toBeDisabled()
    expect(
      screen.getByRole('group', { name: 'reader controls' }),
    ).toBeInTheDocument()
  })
})
