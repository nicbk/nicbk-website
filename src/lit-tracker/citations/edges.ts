import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import type { DatabaseTransaction } from '~/db/create-database'
import type { Author } from '~/db/schema'
import { articles, citationEdges } from '~/db/schema'
import type {
  BibliographyEntry,
  PaperIdentifiers,
} from '~/lit-tracker/extraction/tei'
import type { Work } from './matching'
import { firstAuthorKey, isSameWork, normalizeTitle } from './matching'

/**
 * Reading and writing the citation graph: turning a parsed bibliography into
 * `citation_edges` rows, and running the graduation match in both directions.
 *
 * Every function here takes a transaction rather than a database, because none
 * of them is ever the whole of a change — an edge is written in the same commit
 * as the article it belongs to, and a graduation is part of whichever stage
 * discovered it.
 *
 * **Everything is scoped to one user.** There is no cross-user canonical-paper
 * dedup, deliberately: two accounts holding the same paper hold two unrelated
 * collections, and a shared graph would leak the shape of one into the other.
 */

/** What a new edge needs, before anything has been resolved against it. */
interface EdgeDraft {
  title: string
  authors: Author[]
  publicationYear: number | null
  /** Not stored — carried so the caller knows what to look this edge up by. */
  identifiers: PaperIdentifiers
}

/**
 * A written edge, paired with what the citing paper said it could be looked up
 * by.
 *
 * The identifiers travel to the enrichment stage in the job payload rather than
 * into a column: once a lookup has happened the answer is the Semantic Scholar
 * id, and a `doi`/`arxiv_id`/`pubmed_id` column trio on every edge would be
 * three more things to keep true for one request's worth of use.
 */
export interface EdgeRecord {
  id: string
  citedArticleId: string | null
  identifiers: PaperIdentifiers
}

/**
 * Replaces an article's bibliography with the entries parsed from its PDF, and
 * resolves each against the articles this user already has.
 *
 * Delete-then-insert rather than upsert, per
 * research/data-modeling/citation-graph-schema.md: re-running a finished
 * extraction is not a workflow, and this only has to be repeatable because a
 * crash can replay the stage that calls it.
 *
 * Only the *title* fallback can run at this point — nothing here has a Semantic
 * Scholar id yet. The id-based pass is enrichment's, once the lookup has
 * happened.
 */
export async function writeBibliography(
  tx: DatabaseTransaction,
  citing: { articleId: string; userId: string },
  entries: BibliographyEntry[],
): Promise<EdgeRecord[]> {
  await tx
    .delete(citationEdges)
    .where(eq(citationEdges.citingArticleId, citing.articleId))

  const drafts = entries.flatMap(toDraft)
  if (drafts.length === 0) {
    return []
  }

  const ids = await generateIds(tx, drafts.length)
  const candidates = await unresolvedArticlesOf(tx, citing.userId)
  const rows = drafts.map((draft, index) => ({
    // Postgres 18's native generator, the same one `upload_jobs` defaults to.
    // Generated up front rather than in the INSERT because the caller has to
    // name these edges again in the next stage, and correlating them by the
    // order rows came back in is a guarantee worth not depending on.
    id: ids[index] as string,
    userId: citing.userId,
    citingArticleId: citing.articleId,
    // GROBID-only on both sides is exactly the case the title fallback exists
    // for, so this pass is worth running before any network call happens.
    citedArticleId:
      candidates.find(
        (candidate) =>
          candidate.id !== citing.articleId &&
          isSameWork(candidate, { semanticScholarId: null, ...draft }),
      )?.id ?? null,
    title: draft.title,
    authors: draft.authors,
    publicationYear: draft.publicationYear,
  }))

  await tx.insert(citationEdges).values(rows)
  return rows.map((row, index) => ({
    id: row.id,
    citedArticleId: row.citedArticleId,
    identifiers: (drafts[index] as EdgeDraft).identifiers,
  }))
}

/** `n` fresh UUIDv7s, from the database that defines what one is here. */
async function generateIds(
  tx: DatabaseTransaction,
  count: number,
): Promise<string[]> {
  const { rows } = await tx.execute<{ id: string }>(
    sql`select uuidv7() as id from generate_series(1, ${count})`,
  )
  return rows.map((row) => row.id)
}

/**
 * An entry worth storing, or nothing.
 *
 * A reference GROBID could not read a title out of is dropped rather than
 * stored as an empty row: `title` is the only thing an unresolved edge renders,
 * so a titleless one would show up in #10 as a blank line that can never
 * resolve or be corrected into anything.
 */
function toDraft(entry: BibliographyEntry): EdgeDraft[] {
  const title = entry.title?.trim()
  if (!title) {
    return []
  }
  return [
    {
      title,
      authors: entry.authors,
      publicationYear: entry.publicationYear,
      identifiers: entry.identifiers,
    },
  ]
}

/** An edge Semantic Scholar resolved, and the record it resolved to. */
export interface ResolvedEdge {
  edgeId: string
  semanticScholarId: string
  /**
   * The paper as Semantic Scholar holds it, when that record is available.
   *
   * Written over what GROBID parsed, because for a reference Semantic Scholar
   * resolved its record really is the better one: a canonical title where
   * GROBID kept a year prefix or a trailing venue, and a year where GROBID
   * often has none. What is lost is the printed form of a reference that was
   * matched wrongly — which #11's article-edit is the correction path for.
   */
  paper?: {
    title: string | null
    authors: { name?: string }[] | null
    year: number | null
  }
}

/**
 * Attaches Semantic Scholar ids to this article's edges, resolving each against
 * the user's collection as it goes.
 *
 * Two edges of the same article can resolve to the same paper — a bibliography
 * that lists a preprint and its published version, or a GROBID mis-segmentation
 * that split one reference in two. The `unique (citing_article_id,
 * semantic_scholar_id)` constraint refuses that, so the duplicate keeps a null
 * id and stays a placeholder. Dropping the row instead would delete a
 * bibliography entry the paper really printed.
 */
export async function applyResolvedEdges(
  tx: DatabaseTransaction,
  citing: { articleId: string; userId: string },
  resolved: ResolvedEdge[],
): Promise<void> {
  const claimed = new Set<string>()
  const byArticle = await articlesBySemanticScholarId(
    tx,
    citing.userId,
    resolved.map((entry) => entry.semanticScholarId),
  )

  for (const { edgeId, semanticScholarId, paper } of resolved) {
    if (claimed.has(semanticScholarId)) {
      continue
    }
    claimed.add(semanticScholarId)

    const cited = byArticle.get(semanticScholarId)
    // A paper listing itself in its own bibliography is a real thing to print
    // and a useless edge to traverse.
    const citedArticleId =
      cited && cited !== citing.articleId ? cited : undefined

    await tx
      .update(citationEdges)
      .set({
        semanticScholarId,
        // `coalesce` rather than an assignment: this pass only ever *fills* the
        // column. An edge the title fallback already resolved keeps that
        // answer — the id pass exists to reach the ones it could not, not to
        // overrule it.
        ...(citedArticleId
          ? {
              citedArticleId: sql`coalesce(${citationEdges.citedArticleId}, ${citedArticleId}::uuid)`,
            }
          : {}),
        ...metadataOf(paper),
        updatedAt: new Date(),
      })
      .where(eq(citationEdges.id, edgeId))
  }
}

/**
 * The columns to take from a Semantic Scholar record, skipping whatever it does
 * not hold — an absent year must not erase the one the document printed.
 */
function metadataOf(paper: ResolvedEdge['paper']): Partial<{
  title: string
  authors: Author[]
  publicationYear: number
}> {
  if (!paper) {
    return {}
  }
  const title = paper.title?.trim()
  const authors = (paper.authors ?? []).flatMap((author) => {
    const name = author.name?.trim()
    return name ? [{ name }] : []
  })
  return {
    ...(title ? { title } : {}),
    ...(authors.length > 0 ? { authors } : {}),
    ...(typeof paper.year === 'number' ? { publicationYear: paper.year } : {}),
  }
}

/**
 * Adds edges for references Semantic Scholar knows and the PDF's own parse did
 * not produce.
 *
 * The larger half of the coverage gap. GROBID drops a reference it cannot
 * segment and garbles others past matching — *Attention Is All You Need* cites
 * *Layer Normalization* and GROBID emitted no title for it at all — while
 * Semantic Scholar's list has them, resolved. Since a reference the citing
 * paper genuinely made is a real edge whoever managed to read it, these are
 * inserted as edges of their own.
 *
 * `onConflictDoNothing` guards the one case the caller cannot fully exclude: a
 * paper already claimed by an edge this run did not look at.
 */
export async function addReferenceEdges(
  tx: DatabaseTransaction,
  citing: { articleId: string; userId: string },
  references: {
    paperId: string
    title: string | null
    authors: { name?: string }[] | null
    year: number | null
  }[],
): Promise<number> {
  const usable = references.flatMap((reference) => {
    const metadata = metadataOf(reference)
    // A reference with no title renders as a blank line and can never be
    // corrected into anything — the same rule the parsed entries follow.
    return metadata.title
      ? [{ paperId: reference.paperId, ...metadata, title: metadata.title }]
      : []
  })
  if (usable.length === 0) {
    return 0
  }

  const ids = await generateIds(tx, usable.length)
  const byArticle = await articlesBySemanticScholarId(
    tx,
    citing.userId,
    usable.map((reference) => reference.paperId),
  )

  const inserted = await tx
    .insert(citationEdges)
    .values(
      usable.map((reference, index) => {
        const cited = byArticle.get(reference.paperId)
        return {
          id: ids[index] as string,
          userId: citing.userId,
          citingArticleId: citing.articleId,
          // Direction one, for an edge that never existed until now.
          citedArticleId: cited && cited !== citing.articleId ? cited : null,
          title: reference.title,
          authors: reference.authors ?? [],
          publicationYear: reference.publicationYear ?? null,
          semanticScholarId: reference.paperId,
        }
      }),
    )
    .onConflictDoNothing()
    .returning({ id: citationEdges.id })

  return inserted.length
}

/**
 * Direction two: the edges that were waiting for this article.
 *
 * The direction that is easy to forget, and the reason the decided rule says
 * "both". Without it, uploading a paper and *then* uploading something that
 * cites it would leave the citing paper's bibliography permanently unresolved,
 * even though both papers are sitting in the same collection.
 */
export async function graduateEdgesCiting(
  tx: DatabaseTransaction,
  article: { id: string; userId: string } & Work,
): Promise<number> {
  const graduated = new Set<string>()

  if (article.semanticScholarId !== null) {
    const byId = await tx
      .update(citationEdges)
      .set({ citedArticleId: article.id, updatedAt: new Date() })
      .where(
        and(
          eq(citationEdges.userId, article.userId),
          isNull(citationEdges.citedArticleId),
          eq(citationEdges.semanticScholarId, article.semanticScholarId),
          // A paper citing itself is a real thing to print and a useless edge
          // to traverse; #10 would render it as a node linking to itself.
          ne(citationEdges.citingArticleId, article.id),
        ),
      )
      .returning({ id: citationEdges.id })
    for (const row of byId) {
      graduated.add(row.id)
    }
  }

  // The title fallback applies only where neither side has an id, so an article
  // that Semantic Scholar resolved never reaches it.
  if (article.semanticScholarId === null) {
    const title = normalizeTitle(article.title)
    const author = firstAuthorKey(article.authors)
    if (title !== null && author !== null) {
      const waiting = await tx
        .select({
          id: citationEdges.id,
          title: citationEdges.title,
          authors: citationEdges.authors,
        })
        .from(citationEdges)
        .where(
          and(
            eq(citationEdges.userId, article.userId),
            isNull(citationEdges.citedArticleId),
            isNull(citationEdges.semanticScholarId),
            ne(citationEdges.citingArticleId, article.id),
            sql`lower(trim(${citationEdges.title})) = ${title}`,
          ),
        )

      // The title narrows it in SQL; the author is confirmed here, against the
      // same pure rule every other direction uses.
      const matched = waiting.filter(
        (edge) => firstAuthorKey(edge.authors) === author,
      )
      if (matched.length > 0) {
        await tx
          .update(citationEdges)
          .set({ citedArticleId: article.id, updatedAt: new Date() })
          .where(
            inArray(
              citationEdges.id,
              matched.map((edge) => edge.id),
            ),
          )
        for (const edge of matched) {
          graduated.add(edge.id)
        }
      }
    }
  }

  return graduated.size
}

/**
 * This user's articles that no Semantic Scholar id has been attached to.
 *
 * Only these can be reached by the title fallback, so only these are worth
 * loading for it — an enriched article is matched by id or not at all.
 */
async function unresolvedArticlesOf(
  tx: DatabaseTransaction,
  userId: string,
): Promise<({ id: string } & Work)[]> {
  return tx
    .select({
      id: articles.id,
      semanticScholarId: articles.semanticScholarId,
      title: articles.title,
      authors: articles.authors,
    })
    .from(articles)
    .where(and(eq(articles.userId, userId), isNull(articles.semanticScholarId)))
}

/** This user's articles carrying any of these Semantic Scholar ids. */
async function articlesBySemanticScholarId(
  tx: DatabaseTransaction,
  userId: string,
  semanticScholarIds: string[],
): Promise<Map<string, string>> {
  if (semanticScholarIds.length === 0) {
    return new Map()
  }
  const rows = await tx
    .select({ id: articles.id, semanticScholarId: articles.semanticScholarId })
    .from(articles)
    .where(
      and(
        eq(articles.userId, userId),
        inArray(articles.semanticScholarId, semanticScholarIds),
      ),
    )
  return new Map(
    rows.flatMap((row) =>
      row.semanticScholarId ? [[row.semanticScholarId, row.id] as const] : [],
    ),
  )
}
