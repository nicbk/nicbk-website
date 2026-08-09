import type { DatabaseHandle } from '~/db/create-database'
import type { SemanticScholarPaper } from '~/lit-tracker/enrichment/client'
import { createSemanticScholarClient } from '~/lit-tracker/enrichment/client'
import type { ReferenceCandidate } from '~/lit-tracker/enrichment/reference-list'
import type { JobQueue } from '~/lit-tracker/jobs/queue'
import { getArticlePdf } from '~/storage/pdf-storage'
import { requestTei } from './grobid'
import type { ExtractedMetadata } from './tei'
import { parseTei } from './tei'

/**
 * Everything the extraction stages reach outside themselves, as one injected
 * bundle.
 *
 * The stages take this rather than importing the real thing for the same reason
 * `storeUpload` takes its database handle and its queue: the integration tier
 * points them at throwaway infrastructure, and the unit tier replaces them
 * outright so the *decisions* — what is retried, what is written, in which
 * order — can be tested without a Postgres, a Garage and a GROBID between the
 * assertion and the code.
 */
export interface ExtractionServices {
  database: DatabaseHandle
  queue: JobQueue
  /** Reads a stored PDF back, refusing keys the user does not own. */
  fetchPdf: (key: string, userId: string) => Promise<Uint8Array>
  /** One PDF in, structured metadata out. Throws per failure.ts. */
  extractMetadata: (pdf: Uint8Array) => Promise<ExtractedMetadata>
  /**
   * Resolves Semantic Scholar lookup keys — the uploaded paper's and its
   * references' together — in as few requests as the API allows.
   */
  lookupPapers: (keys: string[]) => Promise<Map<string, SemanticScholarPaper>>
  /** The last resort for a paper carrying no identifier at all. */
  matchPaperByTitle: (title: string) => Promise<SemanticScholarPaper | null>
  /**
   * Semantic Scholar's own reference list for a paper — where the identifiers
   * for references that printed none come from.
   */
  fetchReferences: (paperId: string) => Promise<ReferenceCandidate[]>
}

/**
 * The real services, built from the application's own singletons.
 *
 * `extractMetadata` is the whole of the GROBID round trip: the HTTP call
 * classifies the response, and the parser turns a successful one into fields.
 * They compose here rather than in either module so neither has to know the
 * other exists.
 */
export function productionServices(
  database: DatabaseHandle,
  queue: JobQueue,
): ExtractionServices {
  // One client, and so one throttle, for the life of the process — the rate
  // limiter only works if every Semantic Scholar request in the app queues
  // behind the same one.
  const semanticScholar = createSemanticScholarClient()

  return {
    database,
    queue,
    fetchPdf: getArticlePdf,
    extractMetadata: async (pdf) => parseTei(await requestTei(pdf)),
    lookupPapers: semanticScholar.lookupPapers,
    matchPaperByTitle: semanticScholar.matchByTitle,
    fetchReferences: semanticScholar.fetchReferences,
  }
}
