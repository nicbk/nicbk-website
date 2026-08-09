import { eq, sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'
import { articles } from '~/db/schema'
import {
  applyResolvedEdges,
  graduateEdgesCiting,
} from '~/lit-tracker/citations/edges'
import { isSameWork } from '~/lit-tracker/citations/matching'
import type { SemanticScholarPaper } from '~/lit-tracker/enrichment/client'
import type { MatchKind } from '~/lit-tracker/enrichment/metadata'
import { enrichmentFrom } from '~/lit-tracker/enrichment/metadata'
import type { EnrichJob, FinalizeJob } from '~/lit-tracker/jobs/queue'
import { FINALIZE_QUEUE } from '~/lit-tracker/jobs/queue'
import type { ExtractionServices } from './services'

/**
 * The stage that resolves an article and its bibliography against Semantic
 * Scholar.
 *
 * ## Nothing here can fail an upload
 *
 * That is the decided behaviour and the reason this stage exists after the
 * article is already written and readable. Semantic Scholar is a public API,
 * shared with every other unauthenticated caller, throttled by whatever load it
 * happens to be under. It is allowed to be unavailable.
 *
 * So the only failure mode this stage has is *transient*: it throws, pg-boss
 * retries it, and if the retries run out the job lands on the dead-letter queue
 * where `runExhaustedEnrichStage` finalizes it anyway. The article keeps
 * `extraction_status = 'grobid_only'` — which is a success, not a failure — the
 * job row disappears from the popup as usual, and the user never learns that a
 * third party was having a bad afternoon.
 *
 * ## What one run costs
 *
 * One request, or two. The uploaded paper and every reference GROBID found an
 * identifier for are resolved in a single batch call; the second request
 * happens only when the paper itself carried no identifier and has to be found
 * by title.
 */

/** Runs the enrich stage for one job. Throws only to ask to be retried. */
export async function runEnrichStage(
  job: EnrichJob,
  services: ExtractionServices,
): Promise<void> {
  const article = await loadArticle(services, job.articleId)
  if (!article) {
    // Deleted while the job sat in the queue — by #11, or with the account.
    // There is nothing to enrich and nothing to finalize.
    return
  }

  const keys = [
    ...(job.articleLookupKey ? [job.articleLookupKey] : []),
    ...job.edgeLookups.map((lookup) => lookup.key),
  ]
  const papers = await services.lookupPapers(keys)

  const matched = await matchArticle(job, article, papers, services)
  const resolvedEdges = job.edgeLookups.flatMap((lookup) => {
    const paper = papers.get(lookup.key)
    return paper
      ? [{ edgeId: lookup.edgeId, semanticScholarId: paper.paperId }]
      : []
  })

  await services.database.db.transaction(async (tx) => {
    if (matched) {
      const enrichment = enrichmentFrom(matched.paper, article, matched.kind)
      await tx
        .update(articles)
        .set({
          ...enrichment,
          extractionStatus: 'enriched',
          updatedAt: new Date(),
        })
        .where(eq(articles.id, job.articleId))

      // Direction two again, now that this article has an id to be matched by.
      // The extract stage already ran the GROBID-only form of this check; the
      // edges it could not reach are exactly the ones that had an id and
      // therefore skipped the title fallback.
      await graduateEdgesCiting(tx, {
        id: job.articleId,
        userId: job.userId,
        semanticScholarId: enrichment.semanticScholarId,
        title: article.title,
        authors: article.authors,
      })
    }

    // Direction one: each edge that resolved now knows which paper it names,
    // so it can be pointed at that paper if the user already has it.
    await applyResolvedEdges(
      tx,
      { articleId: job.articleId, userId: job.userId },
      resolvedEdges,
    )

    const finalize: FinalizeJob = { uploadJobId: job.uploadJobId }
    await services.queue.send(FINALIZE_QUEUE, finalize, {
      db: fromDrizzle(tx, sql),
    })
  })
}

/**
 * Finalizes a job whose enrichment never succeeded.
 *
 * Runs on the dead-letter queue. This is the stage that makes "enrichment is
 * non-fatal" true rather than merely intended: without it, an outage lasting
 * longer than eight retries would leave the upload spinning in the status popup
 * forever, with a perfectly good article behind it.
 */
export async function runExhaustedEnrichStage(
  job: EnrichJob,
  services: ExtractionServices,
): Promise<void> {
  console.warn(
    `Enrichment gave up on article ${job.articleId}; leaving it grobid_only.`,
  )
  const finalize: FinalizeJob = { uploadJobId: job.uploadJobId }
  await services.queue.send(FINALIZE_QUEUE, finalize)
}

/** The article's own Semantic Scholar record, if one can be found. */
async function matchArticle(
  job: EnrichJob,
  article: LoadedArticle,
  papers: Map<string, SemanticScholarPaper>,
  services: ExtractionServices,
): Promise<{ paper: SemanticScholarPaper; kind: MatchKind } | null> {
  if (job.articleLookupKey) {
    const paper = papers.get(job.articleLookupKey)
    return paper ? { paper, kind: 'identifier' } : null
  }

  // No DOI, no arXiv id, no PubMed id — common for a conference paper or a
  // scan. A title search is the only way in, and it costs the upload's second
  // and last request.
  const candidate = await services.matchPaperByTitle(article.title)
  if (!candidate) {
    return null
  }

  // The API returns its *closest* match and a score with no documented
  // threshold, so a nonsense query still comes back with something plausible.
  // The candidate is therefore held to the same rule everything else here uses:
  // the same normalized title and the same first author. Anything less would
  // stamp a confident, wrong Semantic Scholar id onto the article — and that id
  // then silently drives every graduation decision afterwards.
  const agrees = isSameWork(
    { semanticScholarId: null, title: article.title, authors: article.authors },
    {
      semanticScholarId: null,
      title: candidate.title,
      authors: (candidate.authors ?? []).map((author) => ({
        name: author.name ?? '',
      })),
    },
  )
  return agrees ? { paper: candidate, kind: 'title' } : null
}

/** The columns enrichment reads before deciding what to write back. */
interface LoadedArticle {
  title: string
  authors: { name: string; given?: string; family?: string }[]
  publicationYear: number | null
  venue: string | null
  doi: string | null
  abstract: string | null
}

async function loadArticle(
  services: ExtractionServices,
  articleId: string,
): Promise<LoadedArticle | undefined> {
  return services.database.db.query.articles.findFirst({
    columns: {
      title: true,
      authors: true,
      publicationYear: true,
      venue: true,
      doi: true,
      abstract: true,
    },
    where: eq(articles.id, articleId),
  })
}
