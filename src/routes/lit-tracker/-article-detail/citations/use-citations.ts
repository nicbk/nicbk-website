import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import { queries } from '~/zero/queries'
import type { CitationEdge, CitationLists } from './citation-lists'
import { citationLists } from './citation-lists'

export type CitationsState = 'syncing' | 'ready' | 'error'

export interface Citations {
  state: CitationsState
  lists: CitationLists
}

/**
 * A paper's citations in both directions, from sync.
 *
 * Both queries are owner-scoped on the edge and on the related article
 * (`src/zero/queries.ts`), so nothing here filters again.
 *
 * `'syncing'` until **both** have finished their first round trip: an empty
 * list before then is not evidence of anything, and drawing "its bibliography
 * was not read" for the half-second before the rows arrive would be a false
 * statement on every open.
 */
export function useCitations(articleId: string): Citations {
  const [references, referencesDetails] = useQuery(
    queries.citationEdges.references(articleId),
  )
  const [citedBy, citedByDetails] = useQuery(
    queries.citationEdges.citedBy(articleId),
  )

  const lists = useMemo(
    () =>
      citationLists(
        references as readonly CitationEdge[],
        citedBy as readonly CitationEdge[],
      ),
    [references, citedBy],
  )

  const types = [referencesDetails.type, citedByDetails.type]
  const state: CitationsState = types.includes('error')
    ? 'error'
    : types.every((type) => type === 'complete')
      ? 'ready'
      : 'syncing'

  return { state, lists }
}
