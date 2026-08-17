import type { ZoomLevel } from '@embedpdf/plugin-zoom'
import type { ReactNode } from 'react'
import { AnnotationToolControl } from './annotation-tool-control'
import { PageNavigation } from './page-navigation'
import { ZoomControl } from './zoom-control'
import styles from './reader-toolbar.module.css'

/**
 * The reader's persistent controls: pages on the left, the annotation tools in
 * the middle, zoom on the right, and the page's own controls at the end.
 *
 * **Persistent, and floating over the document.** The decided spec asks for a
 * toolbar that is "not floating/contextual"
 * (research/ui-ux/pages/lit-tracker/components/reader-annotation.md), and the
 * half that matters is kept: it is always there, identical whatever the reader
 * is doing, never summoned by a selection. What changed is where its pixels come
 * from (user-decided 2026-08-13). As a solid row above the paper it cost its own
 * height everywhere on the one page whose whole purpose is showing a document;
 * as groups floating over the top of it, the document keeps the full panel and
 * the paper shows through between them. `reader-toolbar.module.css` covers how,
 * including why this element must not claim a `z-index`.
 *
 * **The middle was left empty by task 3 and is filled here.** That worked as
 * intended: the tools arrived as one more floating group in a space already laid
 * out for them, and nothing about the bar's arrangement had to change.
 *
 * **`role="group"` rather than `role="toolbar"`.** A toolbar's ARIA contract is
 * roving tabindex — one tab stop, arrow keys between controls — and this bar
 * holds a text field whose arrow keys belong to the text. Rather than break
 * either the field or the contract, the bar is a labelled group and every
 * control is its own tab stop, which is the plain, predictable behaviour here.
 */

interface ReaderToolbarProps {
  currentPage: number
  totalPages: number
  onGoToPage: (page: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
  currentZoom: number
  zoomLevel: ZoomLevel
  onZoomIn: () => void
  onZoomOut: () => void
  onRequestZoom: (level: ZoomLevel) => void
  /** EmbedPDF's active annotation tool for this document, or null when none is. */
  activeToolId: string | null
  /** Null deselects, leaving the reader selecting text normally again. */
  onSelectTool: (toolId: string | null) => void
  /**
   * True while there is no document to act on.
   *
   * The bar stays either way — a paper that never arrives must not take the
   * page's frame with it — but controls that cannot do anything say so rather
   * than failing silently when pressed.
   */
  disabled: boolean
  /**
   * The page's own controls — the sidebar trigger and the article menu — at the
   * end of the bar.
   *
   * They sit here rather than in a row of their own (user-decided 2026-08-13,
   * reversing the 2026-08-09 placement). That earlier call kept page-level
   * controls out of a strip that is "otherwise entirely about the document", and
   * it was right while the page had a metadata header to put them in. Once the
   * title moved up into the tracker's header, keeping a row for two buttons cost
   * more document than the separation was worth — and as its own floating group
   * beside the others, the distinction survives the move.
   *
   * An element, so the reader stays a reader: it knows nothing about tags,
   * status, or sheets.
   */
  actions?: ReactNode
}

export function ReaderToolbar({
  currentPage,
  totalPages,
  onGoToPage,
  onPreviousPage,
  onNextPage,
  currentZoom,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onRequestZoom,
  activeToolId,
  onSelectTool,
  disabled,
  actions,
}: ReaderToolbarProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> is for form controls; this groups a document's controls, and a labelled group is the role with no keyboard contract this bar would break (see above).
    <div className={styles.toolbar} role="group" aria-label="reader controls">
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onGoToPage={onGoToPage}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
        disabled={disabled}
      />

      <AnnotationToolControl
        activeToolId={activeToolId}
        onSelectTool={onSelectTool}
        disabled={disabled}
      />

      <ZoomControl
        currentZoom={currentZoom}
        zoomLevel={zoomLevel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onRequestZoom={onRequestZoom}
        disabled={disabled}
      />

      {/* Its own floating group, which is the break between what acts on the
          document and what acts on the page — they share one bar, but not one
          surface. */}
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}

/**
 * The bar with nothing behind it, for the moments when there are no scopes to
 * drive it: the server render, the wait for the reader's chunk, and an engine
 * that failed to start.
 *
 * The handlers are empty because every control is disabled — there is nothing
 * for them to reach, and inventing a scope to satisfy the props would be a lie
 * about what exists. Having it render this early is what keeps the panel's
 * shape steady: the frame is there from the first paint, and only its contents
 * change.
 */
export function InertReaderToolbar({ actions }: { actions?: ReactNode }) {
  return (
    <ReaderToolbar
      actions={actions}
      currentPage={1}
      totalPages={0}
      onGoToPage={() => {}}
      onPreviousPage={() => {}}
      onNextPage={() => {}}
      currentZoom={1}
      zoomLevel={1}
      onZoomIn={() => {}}
      onZoomOut={() => {}}
      onRequestZoom={() => {}}
      activeToolId={null}
      onSelectTool={() => {}}
      disabled
    />
  )
}
