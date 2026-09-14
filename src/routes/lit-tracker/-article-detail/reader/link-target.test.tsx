import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PdfLinkAnnoObject, PdfLinkTarget } from '@embedpdf/models'
import {
  PdfActionType,
  PdfAnnotationSubtype,
  PdfZoomMode,
} from '@embedpdf/models'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '~/routes/-shared/components/toast/toaster'
import { LINK_RENDERERS, LinkTarget } from './link-target'

/**
 * A paper's link, as the reader answers it.
 *
 * Rendered inside the real `Toaster`, because the confirmation and the failure
 * are what a reader sees — a toast that never appears is indistinguishable from
 * a copy that never happened.
 */

function link(target: PdfLinkTarget | undefined): PdfLinkAnnoObject {
  return {
    id: 'link-1',
    type: PdfAnnotationSubtype.LINK,
    pageIndex: 1,
    rect: { origin: { x: 400, y: 413 }, size: { width: 14, height: 10 } },
    target,
  } as PdfLinkAnnoObject
}

const URL_TARGET: PdfLinkTarget = {
  type: 'action',
  action: {
    type: PdfActionType.URI,
    uri: 'https://github.com/google-research/bert',
  },
}

const CITATION_TARGET: PdfLinkTarget = {
  type: 'destination',
  destination: {
    pageIndex: 10,
    zoom: { mode: PdfZoomMode.XYZ, params: { x: 108, y: 453, zoom: 0 } },
    view: [],
  },
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
  })
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>
}

/**
 * The toasts on screen with this title. Base UI gives a high-priority toast the
 * `alertdialog` role and a low-priority one `dialog`, so both are looked for —
 * the confirmation is low priority by design.
 */
function toastTitled(title: string) {
  return [
    ...screen.queryAllByRole('alertdialog', { hidden: true }),
    ...screen.queryAllByRole('dialog', { hidden: true }),
  ].filter((toast) => toast.textContent?.includes(title))
}

function renderLink(target: PdfLinkTarget | undefined) {
  const { container } = render(
    <Toaster>
      <LinkTarget link={link(target)} />
    </Toaster>,
  )
  const hitArea = container.querySelector('[data-link-action]')
  if (!(hitArea instanceof HTMLElement)) {
    throw new Error('the link rendered no hit area')
  }
  return hitArea
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('LinkTarget', () => {
  it('copies a URL and says so', async () => {
    const user = userEvent.setup()
    const hitArea = renderLink(URL_TARGET)
    const writeText = stubClipboard(async () => {})

    await user.click(hitArea)

    expect(writeText).toHaveBeenCalledWith(
      'https://github.com/google-research/bert',
    )
    await waitFor(() => expect(toastTitled('link copied')).toHaveLength(1))
  })

  it('reports a clipboard that refuses, rather than claiming a copy', async () => {
    const user = userEvent.setup()
    const hitArea = renderLink(URL_TARGET)
    stubClipboard(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })

    await user.click(hitArea)

    await waitFor(() =>
      expect(toastTitled('could not copy the link')).toHaveLength(1),
    )
    expect(toastTitled('link copied')).toHaveLength(0)
  })

  it('reports a browser with no clipboard at all', async () => {
    const user = userEvent.setup()
    const hitArea = renderLink(URL_TARGET)
    // After `setup()`, which installs a clipboard of its own.
    Reflect.deleteProperty(navigator, 'clipboard')

    await user.click(hitArea)

    await waitFor(() =>
      expect(toastTitled('could not copy the link')).toHaveLength(1),
    )
  })

  it('does not copy anything for a citation, which is inert until it previews', async () => {
    const user = userEvent.setup()
    const hitArea = renderLink(CITATION_TARGET)
    const writeText = stubClipboard(async () => {})

    await user.click(hitArea)

    expect(hitArea.getAttribute('data-link-action')).toBe('internal')
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('alertdialog', { hidden: true })).toHaveLength(
      0,
    )
  })

  it('gives a link with no target no pointer target at all', () => {
    const hitArea = renderLink(undefined)

    expect(hitArea.getAttribute('data-link-action')).toBe('none')
    expect(hitArea.className).toMatch(/inert/)
  })

  it('does not stop the pointer-down, which text selection needs', () => {
    const hitArea = renderLink(CITATION_TARGET)
    const reachedThePage = vi.fn()
    hitArea.parentElement?.addEventListener('pointerdown', reachedThePage)

    hitArea.dispatchEvent(
      new Event('pointerdown', { bubbles: true, cancelable: true }),
    )

    expect(reachedThePage).toHaveBeenCalled()
  })
})

describe('LINK_RENDERERS', () => {
  it('replaces the built-in link renderer, by its id', () => {
    // EmbedPDF keeps a built-in only when no supplied renderer shares its id.
    expect(LINK_RENDERERS.map(({ id }) => id)).toEqual(['link'])
  })

  it('answers links and nothing else', () => {
    const [renderer] = LINK_RENDERERS
    expect(renderer?.matches(link(URL_TARGET))).toBe(true)
    expect(
      renderer?.matches({
        ...link(URL_TARGET),
        type: PdfAnnotationSubtype.HIGHLIGHT,
      } as never),
    ).toBe(false)
  })

  it('never offers a link as something to drag or resize', () => {
    const [renderer] = LINK_RENDERERS
    expect(renderer?.interactionDefaults).toMatchObject({
      isDraggable: false,
      isResizable: false,
    })
  })
})

describe('link target styles', () => {
  const css = readFileSync(
    join(__dirname, 'link-target.module.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '')

  it('takes pointer events back from the wrappers it sits in', () => {
    // Found in the browser, invisible to jsdom: EmbedPDF's annotation wrappers
    // set `pointer-events: none`, which inherits, and without this the link
    // rendered at the right size and could not be clicked.
    expect(css).toMatch(/\.target\s*\{[^}]*pointer-events:\s*auto[^}]*\}/)
  })

  it('lets a link it does not follow pass every pointer through', () => {
    expect(css).toMatch(/\.inert\s*\{[^}]*pointer-events:\s*none[^}]*\}/)
  })
})
