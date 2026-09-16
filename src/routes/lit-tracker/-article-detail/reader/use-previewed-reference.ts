import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import type { EntryRegion } from '~/lit-tracker/extraction/tei/regions'
import { queries } from '~/zero/queries'
import type { PreviewRegion } from './link-preview-region'
import { previewedReference } from './previewed-reference'

/**
 * The reference the open preview is showing, from sync.
 *
 * The same query the citations view reads (`citationEdges.references`), which is
 * owner-scoped on the edge and on the article at its other end, so nothing here
 * filters again. The reader's `documentId` **is** the article's id.
 *
 * Only ever mounted while a preview is open — a paper carries hundreds of
 * links, and its bibliography is not worth a subscription until a reader opens
 * one.
 */

/** A reference row as the preview reads it. */
export interface PreviewedReference {
  id: string
  entryRegions: EntryRegion | null
  /** The paper it points at, when that paper is in the collection. */
  citedArticle?: { id: string; title: string } | null
}

export function usePreviewedReference(
  articleId: string,
  region: PreviewRegion | null,
): PreviewedReference | null {
  const [references] = useQuery(queries.citationEdges.references(articleId))

  return useMemo(
    () =>
      previewedReference(region, references as readonly PreviewedReference[]),
    [region, references],
  )
}
