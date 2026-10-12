import type { AnnotationDocumentState } from '@embedpdf/plugin-annotation'
import { linkedPartners } from './linked-partners'
import styles from './linked-partner-outline.module.css'

/**
 * Outlines, on one page, the partner of a selected margin note or highlight
 * (`linked-partners.ts`). Renders nothing when nothing linked is selected.
 *
 * Positioned in page points times the page's scale, the coordinate space every
 * layer over the page shares, and transparent to pointers: it is a picture of a
 * relationship, never something to press.
 */
export function LinkedPartnerOutline({
  state,
  pageIndex,
  scale,
}: {
  state: Pick<AnnotationDocumentState, 'byUid' | 'selectedUids'>
  pageIndex: number
  /** CSS pixels per page point. */
  scale: number
}) {
  const rects = linkedPartners(state, pageIndex)
  if (rects.length === 0) {
    return null
  }
  return (
    <div className={styles.layer} aria-hidden="true">
      {rects.map((rect) => (
        <div
          key={`${rect.origin.x},${rect.origin.y}`}
          className={styles.outline}
          style={{
            left: rect.origin.x * scale,
            top: rect.origin.y * scale,
            width: rect.size.width * scale,
            height: rect.size.height * scale,
          }}
        />
      ))}
    </div>
  )
}
