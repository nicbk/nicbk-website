import { PgBoss } from 'pg-boss'
import { env } from '~/env'

/**
 * The background-job queue: the queues this feature runs on, and the shared
 * pg-boss instance both ends of it use.
 *
 * It sits beside `upload/` and `extraction/` rather than inside either, because
 * both need it and neither owns it — the upload path sends, and the extraction
 * worker drains. A copy in each would be two definitions of the same queue
 * name, which is exactly the drift that turns into jobs sent to a queue nobody
 * is listening on.
 *
 * pg-boss keeps its own tables in a `pgboss` schema in the shared database.
 * That schema is deliberately outside the `zero_data` publication: its
 * internals are unstable across versions, and `upload_jobs` is the app-owned
 * projection clients read instead
 * (research/system-architecture/background-jobs.md).
 *
 * ## The chain
 *
 * `extract` → `enrich` → `finalize`, with each stage sending the next inside
 * the same transaction as its own database writes. The decided pipeline is
 * separate chained jobs, one per stage, so each retries and fails
 * independently.
 *
 * The two dead-letter queues are what make "independently" true in both
 * directions: an exhausted `extract` becomes a visible failure the user can
 * act on, while an exhausted `enrich` becomes a *success* — it hands the job
 * straight to `finalize`, because Semantic Scholar being unreachable is not
 * something a user's upload should be made to care about.
 */

/** Fetches the PDF, calls GROBID, and creates the article and its edges. */
export const EXTRACT_QUEUE = 'lit-tracker.extract'

/** Resolves the article and its bibliography against Semantic Scholar. */
export const ENRICH_QUEUE = 'lit-tracker.enrich'

/** Deletes the resolved `upload_jobs` row, emptying the status popup. */
export const FINALIZE_QUEUE = 'lit-tracker.finalize'

/**
 * Removes a deleted article's PDF from the object store.
 *
 * **Not part of the chain above**, and the only queue here that is not: the
 * other three run one after another to turn an upload into an article, while
 * this one runs once, at the other end of that life, when #11 deletes the
 * article again. It is a job rather than a line in the mutator for a reason the
 * mutator cannot get around — every mutator on this site runs in the browser
 * too, and a browser has no business holding bucket credentials
 * (research/security-privacy/pdf-and-annotation-data-protection.md).
 */
export const PDF_CLEANUP_QUEUE = 'lit-tracker.pdf-cleanup'

/**
 * Reads an older paper's bibliography again, keeping what the paper printed.
 *
 * **Not part of the upload chain either.** Queued when the worker starts, for
 * each paper whose bibliography was read before printed reference text was kept
 * (features/citation-graph-traversal, task `older-papers-are-re-read`). It
 * rewrites the bibliography and nothing else about the article.
 */
export const REFERENCE_REREAD_QUEUE = 'lit-tracker.reread-references'

/**
 * Where a re-read lands once its retries are exhausted: its row is marked
 * failed, which is what puts the warning, and its try again, in front of the
 * reader. The paper keeps the references it had.
 */
export const REFERENCE_REREAD_DEAD_LETTER_QUEUE =
  'lit-tracker.reread-references-exhausted'

/**
 * Where an extract job lands once its retries are exhausted.
 *
 * Without this a transient failure that never stopped being transient — GROBID
 * down for longer than the backoff covers — would leave the job row spinning in
 * `processing` forever, with no article behind it for #11 to open. The handler
 * on this queue is what turns "we gave up" into the same terminal, visible
 * failure a bad PDF produces.
 */
export const EXTRACT_DEAD_LETTER_QUEUE = 'lit-tracker.extract-exhausted'

/**
 * Where an enrich job lands once its retries are exhausted.
 *
 * Its handler finalizes the upload rather than failing it. Semantic Scholar is
 * a shared, aggressively throttled third party, and the decided behaviour is
 * that it can never fail a user's upload — the article simply stays
 * `grobid_only`. Without this queue an outage lasting past the backoff would
 * strand the job in `processing`, which is the one outcome that rule exists to
 * prevent.
 */
export const ENRICH_DEAD_LETTER_QUEUE = 'lit-tracker.enrich-exhausted'

/** What an extract job carries. The handler needs no more than this to start. */
export interface ExtractJob {
  uploadJobId: string
  userId: string
  pdfObjectKey: string
}

/**
 * What an enrich job carries: the article, and every lookup key extraction
 * found.
 *
 * The keys travel in the payload rather than being re-read from the database
 * because most of them have nowhere to be read *from* — an edge stores the
 * Semantic Scholar id it ends up with, not the arXiv id or DOI the citing paper
 * printed, and the uploaded paper's own arXiv id has no column either. Carrying
 * them here is what avoids both a second GROBID call and three columns that
 * exist for the length of one request.
 */
export interface EnrichJob {
  uploadJobId: string
  userId: string
  articleId: string
  /** `DOI:…`, `ARXIV:…` or `PMID:…` for the uploaded paper; null if it had none. */
  articleLookupKey: string | null
  /** One entry per written edge that carried an identifier. */
  edgeLookups: { edgeId: string; key: string }[]
}

/** What a re-read carries: the paper, and whose it is. */
export interface ReferenceRereadJob {
  articleId: string
  userId: string
}

/** What a finalize job carries: the row to remove. */
export interface FinalizeJob {
  uploadJobId: string
}

/**
 * What a PDF cleanup job carries: who owned the article, and which one.
 *
 * **Not the object key**, though the sender has it. The key is a pure function
 * of these two values (`storage/object-key.ts`), so deriving it in the handler
 * means a cleanup job can only ever name an object inside its own user's
 * prefix — a key carried in the payload could name any object in the bucket, and
 * this row is written by the same request that a client initiated.
 */
export interface PdfCleanupJob {
  userId: string
  articleId: string
}

/**
 * What the upload path actually needs from pg-boss.
 *
 * Narrower than `PgBoss` so a caller can see, from the type alone, that
 * uploading only ever *sends* — it does not work, fail, or complete a job.
 */
export type JobQueue = Pick<PgBoss, 'send'>

/**
 * How hard the extract stage tries before a transient failure becomes a
 * terminal one.
 *
 * Chosen against the thing that actually fails: GROBID reloading its models
 * after a deploy, which takes a couple of minutes on the `-crf` image. Five
 * attempts with backoff from 30 seconds covers roughly that window, and the
 * dead-letter queue catches anything past it.
 */
const EXTRACT_RETRY_POLICY = {
  retryLimit: 5,
  retryDelay: 30,
  retryBackoff: true,
  deadLetter: EXTRACT_DEAD_LETTER_QUEUE,
} as const

/**
 * How hard the enrich stage tries before the article settles for
 * `grobid_only`.
 *
 * **Shorter than extraction's, deliberately.** Throttling is not handled here
 * at all — the in-process limiter in `enrichment/throttle.ts` already spaces
 * requests and backs off across four attempts, which is what absorbs the bursts
 * Semantic Scholar actually produces. This outer loop is only for an outage
 * that outlives that, and waiting it out is not free: the upload's row stays in
 * the status popup for as long as this runs, still reading as in progress.
 *
 * Three attempts, each of which is itself three requests through the limiter,
 * spread over about half a minute of waiting — then the article settles for
 * `grobid_only`. That is a documented success state, a complete and readable
 * article, so trading a longer window of "still working on it" for a slightly
 * better chance of a venue field is the wrong way round.
 */
const ENRICH_RETRY_POLICY = {
  retryLimit: 2,
  retryDelay: 10,
  retryBackoff: true,
  deadLetter: ENRICH_DEAD_LETTER_QUEUE,
} as const

/**
 * How hard a re-read tries before it is shown as failed.
 *
 * Extraction's policy, for extraction's reason: what fails is GROBID reloading
 * its models after a deploy — and a deploy is exactly when these are queued.
 *
 * **`exclusive`, keyed by article**: a paper can have one re-read queued or
 * running, never two. Sends carry the article id as `singletonKey`, so a try
 * again that lands while the paper is still queued is simply not added.
 */
const REFERENCE_REREAD_RETRY_POLICY = {
  retryLimit: 5,
  retryDelay: 30,
  retryBackoff: true,
  deadLetter: REFERENCE_REREAD_DEAD_LETTER_QUEUE,
} as const

/**
 * How hard the cleanup tries before an object is left behind.
 *
 * **No dead-letter queue**, unlike the two stages above, because there is
 * nothing for a handler of last resort to do. An exhausted extract has a user
 * waiting on a row that must be resolved one way or the other; an exhausted
 * cleanup has a user whose article is already gone from every surface they can
 * see, and the only remaining consequence is a few megabytes nobody reads. So it
 * retries generously against the one failure that is real — Garage restarting
 * under a deploy — and then stops, loudly, in pg-boss's own failed-job table.
 */
const PDF_CLEANUP_RETRY_POLICY = {
  retryLimit: 5,
  retryDelay: 30,
  retryBackoff: true,
} as const

/**
 * Connects to the queue and makes sure its schema and queues exist.
 *
 * `start()` creates and migrates the `pgboss` schema, and `createQueue` is
 * required before a send: pg-boss 12 rejects a send to a queue that does not
 * exist, and creating one that does is a no-op.
 *
 * Takes the connection string rather than reading the environment, so the
 * integration tests can point it at their throwaway Postgres — the same reason
 * `createDatabase` is a factory rather than a singleton.
 */
export async function startQueue(connectionString: string): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString })
  // Surfaced rather than swallowed: pg-boss emits these instead of throwing, so
  // without a listener a failing queue would go silent.
  boss.on('error', (error: unknown) => {
    console.error('pg-boss error:', error)
  })
  await boss.start()
  // The dead-letter queue first: naming a queue that does not exist yet as
  // another queue's `deadLetter` is not something pg-boss accepts.
  await boss.createQueue(EXTRACT_DEAD_LETTER_QUEUE)
  await boss.createQueue(ENRICH_DEAD_LETTER_QUEUE)
  await boss.createQueue(REFERENCE_REREAD_DEAD_LETTER_QUEUE)
  await boss.createQueue(FINALIZE_QUEUE)
  await boss.createQueue(EXTRACT_QUEUE, EXTRACT_RETRY_POLICY)
  await boss.createQueue(ENRICH_QUEUE, ENRICH_RETRY_POLICY)
  await boss.createQueue(PDF_CLEANUP_QUEUE, PDF_CLEANUP_RETRY_POLICY)
  await boss.createQueue(REFERENCE_REREAD_QUEUE, {
    ...REFERENCE_REREAD_RETRY_POLICY,
    // Only at creation: pg-boss refuses a policy in `updateQueue`, even the
    // same one, so the loop below re-applies the retry settings alone.
    policy: 'exclusive',
  })
  // `createQueue` is a no-op on a queue that already exists — including its
  // options — so a database that already carries the extract queue from an
  // earlier version would keep that version's retry policy. Applying it again
  // here is what makes this function describe the queue rather than merely
  // create it.
  await boss.updateQueue(EXTRACT_QUEUE, EXTRACT_RETRY_POLICY)
  await boss.updateQueue(ENRICH_QUEUE, ENRICH_RETRY_POLICY)
  await boss.updateQueue(PDF_CLEANUP_QUEUE, PDF_CLEANUP_RETRY_POLICY)
  await boss.updateQueue(REFERENCE_REREAD_QUEUE, REFERENCE_REREAD_RETRY_POLICY)
  return boss
}

let started: Promise<PgBoss> | null = null

/**
 * The application's shared queue, connected on first use.
 *
 * Starting is slow enough that doing it per request would be wasteful, and it
 * must not race itself. Caching the promise rather than the resolved value is
 * what makes two concurrent first uploads share one startup instead of running
 * two schema migrations.
 */
export function getQueue(): Promise<PgBoss> {
  started ??= startQueue(env.DATABASE_URL).catch((error: unknown) => {
    // A *failed* start must not stay cached. Postgres being briefly
    // unreachable — a restart, a deploy — would otherwise poison this module
    // for the life of the process: every later caller would be handed the same
    // rejected promise and nothing would ever reconnect.
    started = null
    throw error
  })
  return started
}
