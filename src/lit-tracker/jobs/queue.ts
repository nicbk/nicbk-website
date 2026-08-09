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

/** What a finalize job carries: the row to remove. */
export interface FinalizeJob {
  uploadJobId: string
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
  await boss.createQueue(FINALIZE_QUEUE)
  await boss.createQueue(EXTRACT_QUEUE, EXTRACT_RETRY_POLICY)
  await boss.createQueue(ENRICH_QUEUE, ENRICH_RETRY_POLICY)
  // `createQueue` is a no-op on a queue that already exists — including its
  // options — so a database that already carries the extract queue from an
  // earlier version would keep that version's retry policy. Applying it again
  // here is what makes this function describe the queue rather than merely
  // create it.
  await boss.updateQueue(EXTRACT_QUEUE, EXTRACT_RETRY_POLICY)
  await boss.updateQueue(ENRICH_QUEUE, ENRICH_RETRY_POLICY)
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
