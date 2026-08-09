import { and, eq, isNull, sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'
import { articles, citationEdges } from '~/db/schema'
import {
  applyResolvedEdges,
  graduateEdgesCiting,
} from '~/lit-tracker/citations/edges'
import { isSameWork } from '~/lit-tracker/citations/matching'
import type { SemanticScholarPaper } from '~/lit-tracker/enrichment/client'
import type { MatchKind } from '~/lit-tracker/enrichment/metadata'
import { enrichmentFrom } from '~/lit-tracker/enrichment/metadata'
import { alignReferences } from '~/lit-tracker/enrichment/reference-list'
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
 * Two requests, or three, whatever the size of the bibliography. The uploaded
 * paper and every reference GROBID found an identifier for are resolved in a
 * single batch call; a second fetches Semantic Scholar's own reference list for
 * the paper, which is where identifiers for the references that printed none
 * come from; a third happens only when the paper itself carried no identifier
 * and has to be found by title.
 *
 * That second call is what makes the graph worth having. A printed
 * machine-learning bibliography mostly cites proceedings by name — 47 of BERT's
 * 54 references carry no identifier at all — so without it the graph was 13%
 * full for exactly the papers this collection is made of.
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

  // Everything the printed bibliography could not identify itself, which in a
  // machine-learning paper is most of it — 47 of BERT's 54 references name a
  // conference proceeding and no identifier at all. Semantic Scholar's own
  // reference list for this paper has them already resolved, so one request
  // turns a graph that was 13% full into one that is 96% full.
  const alignedEdges = matched
    ? await alignAgainstReferenceList(
        job,
        matched.paper.paperId,
        resolvedEdges,
        services,
      )
    : []

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
    // so it can be pointed at that paper if the user already has it. The
    // identifiers the document printed go first, because they are the paper's
    // own claim about what it cited; the aligned ones fill the rest, and a
    // duplicate is dropped by `applyResolvedEdges` rather than colliding with
    // the unique constraint.
    await applyResolvedEdges(
      tx,
      { articleId: job.articleId, userId: job.userId },
      [...resolvedEdges, ...alignedEdges],
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

/**
 * Identifiers for the edges the citing document did not identify itself.
 *
 * The unresolved edges are read from the database rather than carried in the
 * job payload, because the payload only lists edges that *had* an identifier —
 * these are, by definition, the ones it has nothing to say about. They were
 * written by the extract stage, so the rows are already there.
 *
 * A failure to fetch the list is deliberately **not** propagated. By this point
 * the article is enriched and its printed identifiers are resolved; giving all
 * of that up and retrying the whole stage because one supplementary request
 * failed would be trading a good outcome for a worse one.
 */
async function alignAgainstReferenceList(
  job: EnrichJob,
  paperId: string,
  alreadyResolved: { edgeId: string }[],
  services: ExtractionServices,
): Promise<{ edgeId: string; semanticScholarId: string }[]> {
  const resolved = new Set(alreadyResolved.map((edge) => edge.edgeId))
  const unresolved = (
    await services.database.db
      .select({ id: citationEdges.id, title: citationEdges.title })
      .from(citationEdges)
      .where(
        and(
          eq(citationEdges.citingArticleId, job.articleId),
          isNull(citationEdges.semanticScholarId),
        ),
      )
  ).filter((edge) => !resolved.has(edge.id))

  if (unresolved.length === 0) {
    return []
  }

  try {
    const candidates = await services.fetchReferences(paperId)
    return alignReferences(
      unresolved.map((edge) => ({ edgeId: edge.id, title: edge.title })),
      candidates,
    )
  } catch (error) {
    console.warn(
      `Could not read Semantic Scholar's reference list for ${paperId}; leaving ${unresolved.length} edge(s) unresolved.`,
      error instanceof Error ? error.message : error,
    )
    return []
  }
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
