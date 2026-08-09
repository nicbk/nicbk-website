import type { DatabaseHandle } from '~/db/create-database'
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
  return {
    database,
    queue,
    fetchPdf: getArticlePdf,
    extractMetadata: async (pdf) => parseTei(await requestTei(pdf)),
  }
}
