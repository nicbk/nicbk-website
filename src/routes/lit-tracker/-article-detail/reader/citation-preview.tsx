import { Popover } from '@base-ui/react/popover'
import { useDocumentState, useRegistry } from '@embedpdf/core/react'
import type { PdfLinkAnnoObject } from '@embedpdf/models'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { useRenderCapability } from '@embedpdf/plugin-render/react'
import { useScroll } from '@embedpdf/plugin-scroll/react'
import type { RefObject } from 'react'
import { useEffect, useState } from 'react'
import type { PreviewRegion } from './link-preview-region'
import { resolveLinkPreview } from './link-preview-source'
import { READER_TOOLBAR_ATTRIBUTE } from './menu-placement'
import styles from './citation-preview.module.css'

/**
 * What an internal link points at, shown beside the link rather than scrolled
 * to.
 *
 * Decided with the user (#22): clicking `[13]` shows reference 13 in place —
 * a rendered crop of the page, so it looks exactly like the paper and works the
 * same for a reference, a table or a section heading — with **go to p. N** for
 * a reader who wants to go there. The reading position is never taken away by a
 * click.
 *
 * **A crop, not text.** Extracted text is unreliable on exactly the papers that
 * need snapping most (a publisher PDF's comes out broken mid-word), and a crop
 * of a table is a table.
 */

/** The widest the crop is drawn, in CSS pixels, before the viewport caps it. */
const MAX_PREVIEW_WIDTH = 720
/** The popover's own side padding and gutter, subtracted from the viewport. */
const VIEWPORT_MARGIN = 56
/** Room left between the toolbar and the entry a reader went to. */
const GO_TO_BREATHING_ROOM = 8

/**
 * Where "go to" scrolls, in top-left page points.
 *
 * The region's own top would land under the reader's floating toolbar — found
 * in the browser, with reference 13 half behind the page controls — so the
 * scroll stops short by the toolbar's depth, converted from screen pixels to
 * page points at the reading zoom.
 */
export function goToCoordinates(
  region: PreviewRegion,
  toolbarClearancePx: number,
  scale: number,
): { x: number; y: number } {
  const clearance = (toolbarClearancePx + GO_TO_BREATHING_ROOM) / scale
  return {
    x: region.rect.origin.x,
    y: Math.max(0, region.rect.origin.y - clearance),
  }
}

/** How far the toolbar reaches down into the reader, in screen pixels. */
function toolbarClearance(): number {
  const bar = globalThis.document?.querySelector(
    `[${READER_TOOLBAR_ATTRIBUTE}]`,
  )
  const reader = bar?.parentElement
  if (!bar || !reader) {
    return 0
  }
  const groups = [...bar.children].map((child) => child.getBoundingClientRect())
  const bottom = groups.length
    ? Math.max(...groups.map((group) => group.bottom))
    : bar.getBoundingClientRect().bottom
  return Math.max(0, bottom - reader.getBoundingClientRect().top)
}

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'nothing' }
  | { kind: 'failed' }
  | {
      kind: 'ready'
      region: PreviewRegion
      url: string
      width: number
      height: number
    }

interface CitationPreviewProps {
  documentId: string
  link: PdfLinkAnnoObject
  /** The link's own hit area, which the popover sits beside. */
  anchor: RefObject<HTMLElement | null>
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Whether a dismissal is the press on the link itself.
 *
 * The link is the popover's anchor but not a Base UI trigger, so to Base UI a
 * press on it is a press *outside* — it closes the popover, and the click that
 * follows reopens it, and the link cannot close what it opened. Found by a unit
 * test; a browser does the same. The link's own click decides instead.
 */
export function isPressOnAnchor(
  reason: string,
  target: EventTarget | null | undefined,
  anchor: Element | null,
): boolean {
  return (
    reason === 'outside-press' &&
    anchor !== null &&
    target instanceof Node &&
    anchor.contains(target)
  )
}

export function CitationPreview({
  documentId,
  link,
  anchor,
  open,
  onOpenChange,
}: CitationPreviewProps) {
  const preview = useCitationPreview({ documentId, link, open })
  const { provides: scroll } = useScroll(documentId)
  const scale = useDocumentState(documentId)?.scale ?? 1

  function goTo(region: PreviewRegion) {
    scroll?.scrollToPage({
      pageNumber: region.pageIndex + 1,
      // Top-left page points, the same frame `navigateTarget` hands the scroller.
      pageCoordinates: goToCoordinates(region, toolbarClearance(), scale),
      behavior: 'smooth',
    })
    onOpenChange(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        if (
          !next &&
          isPressOnAnchor(details.reason, details.event?.target, anchor.current)
        ) {
          details.cancel()
          return
        }
        onOpenChange(next)
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          className={styles.positioner}
          anchor={anchor}
          sideOffset={6}
          collisionPadding={16}
        >
          <Popover.Popup className={styles.popup} data-preview={preview.kind}>
            {preview.kind === 'ready' ? (
              <>
                <div className={styles.header}>
                  <Popover.Title className={styles.title}>
                    p. {preview.region.pageIndex + 1}
                  </Popover.Title>
                  <button
                    type="button"
                    className={styles.goTo}
                    onClick={() => goTo(preview.region)}
                  >
                    go to p. {preview.region.pageIndex + 1}
                  </button>
                </div>
                <img
                  className={styles.crop}
                  src={preview.url}
                  width={preview.width}
                  height={preview.height}
                  alt={`what the link points to, on page ${preview.region.pageIndex + 1}`}
                />
              </>
            ) : (
              <Popover.Title className={styles.status}>
                {STATUS[preview.kind]}
              </Popover.Title>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

const STATUS = {
  loading: 'finding it…',
  nothing: 'this link points outside the paper.',
  failed: 'could not show where this link points.',
} as const

/**
 * Resolves and renders the preview while the popover is open.
 *
 * Nothing is read until a reader actually opens a link: a paper carries
 * hundreds, and the engine is busy drawing pages.
 */
function useCitationPreview({
  documentId,
  link,
  open,
}: {
  documentId: string
  link: PdfLinkAnnoObject
  open: boolean
}): PreviewState {
  const { registry } = useRegistry()
  const documentState = useDocumentState(documentId)
  const document = documentState?.document ?? null
  // The reader's zoom. A preview is read like the page it comes from, so it is
  // drawn at the same size — found in the browser, where a crop fitted to a
  // fixed width came out at 73% of the text it sat over.
  const readingScale = documentState?.scale ?? 1
  const { state: annotations } = useAnnotation(documentId)
  const { provides: render } = useRenderCapability()
  const [state, setState] = useState<PreviewState>({ kind: 'loading' })

  // `annotations.byUid` changes identity on every annotation event; the landings
  // it yields do not change while a popover is open, so it is read once per
  // opening rather than re-resolving on each mark a reader makes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (!open || !registry || !document || !render) {
      return
    }
    let cancelled = false
    let url: string | null = null
    setState({ kind: 'loading' })

    const tracked = Object.values(annotations.byUid)
    resolveLinkPreview({
      engine: registry.getEngine(),
      document,
      link,
      annotations: tracked,
    })
      .then(async (region) => {
        if (!region) {
          return { kind: 'nothing' } as const
        }
        const widest = Math.min(
          MAX_PREVIEW_WIDTH,
          globalThis.innerWidth - VIEWPORT_MARGIN,
        )
        const scale = Math.min(readingScale, widest / region.rect.size.width)
        const blob = await render
          .forDocument(documentId)
          .renderPageRect({
            pageIndex: region.pageIndex,
            rect: region.rect,
            options: {
              scaleFactor: scale,
              dpr: globalThis.devicePixelRatio || 1,
            },
          })
          .toPromise()
        url = URL.createObjectURL(blob)
        return {
          kind: 'ready',
          region,
          url,
          width: Math.round(region.rect.size.width * scale),
          height: Math.round(region.rect.size.height * scale),
        } as const
      })
      .then(
        (next) => {
          if (!cancelled) {
            setState(next)
          }
        },
        (error: unknown) => {
          console.error('Could not preview a link:', error)
          if (!cancelled) {
            setState({ kind: 'failed' })
          }
        },
      )

    return () => {
      cancelled = true
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [open, registry, document, render, documentId, link, readingScale])

  return state
}
