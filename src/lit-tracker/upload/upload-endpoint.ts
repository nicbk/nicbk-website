import type { DatabaseHandle } from '~/db/create-database'
import type { JobQueue } from './queue'
import { storeUpload } from './store-upload'
import type { CandidateFile, UploadRejection } from './validation'
import {
  describeRejection,
  rejectionForCount,
  rejectionForFile,
} from './validation'

/**
 * The upload endpoint's behaviour, separated from how it is mounted.
 *
 * A plain function over `Request` → `Response` so the whole path — auth
 * refusal, each rejection, the stored result — can be exercised without a
 * router, the same shape `~/zero/query-endpoint.ts` uses.
 *
 * ## Why this is REST and not a Zero mutation
 *
 * Every other write this site makes goes through Zero. A PDF cannot: Zero's
 * mutation arguments are JSON, so a file would have to be base64-encoded (+33%)
 * and pushed over the sync socket, which rejects messages above
 * `websocketMaxPayloadBytes` — 10 MB by default, against a 50 MB file limit.
 * Mutations are also persisted client-side and replayed until acknowledged, so
 * every upload would be duplicated into browser storage, and they are ordered
 * per client group, so one upload would block every other write behind it.
 *
 * So the split is deliberate and permanent: **bytes in over REST, state out
 * over Zero.** The row this endpoint writes reaches the browser by sync, with
 * no refresh and no response payload carrying it. Task 4's job handler writes
 * `articles` the same way.
 */

/** What the browser is told about a submission. */
export interface UploadResponseBody {
  /** One entry per accepted file, in submission order. */
  accepted: { id: string; filename: string }[]
  /** One entry per refused file. Empty on success. */
  rejected: { filename: string; message: string }[]
}

/** The form field the modal puts its files in. */
const FILE_FIELD = 'files'

export interface UploadEndpointOptions {
  /** Resolves the signed-in user, or `null`. Injected so tests need no cookie jar. */
  getUserId: (request: Request) => Promise<string | null>
  database: DatabaseHandle
  /**
   * The job queue, resolved lazily.
   *
   * A function rather than the queue itself because connecting starts pg-boss
   * and installs its schema — work that should not happen while answering a
   * request that turns out to be unauthenticated or invalid.
   */
  getQueue: () => Promise<JobQueue>
}

/**
 * Handles one upload submission.
 *
 * **The whole submission is validated before anything is stored.** A batch
 * carrying one bad file stores none of it, so "a rejected file leaves nothing
 * behind" holds for the batch and not merely for the file — a user who fixes
 * the one bad file re-submits the set rather than discovering that nineteen of
 * twenty went through.
 */
export async function respondToUpload(
  request: Request,
  { getUserId, database, getQueue }: UploadEndpointOptions,
): Promise<Response> {
  const userId = await getUserId(request)
  if (!userId) {
    // The same answer an unauthenticated Zero query gets: this endpoint is
    // reachable on the public app server, and nothing below runs without a
    // session.
    return json({ error: 'Not signed in.' }, 401)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Expected a multipart form submission.' }, 400)
  }

  const files = form.getAll(FILE_FIELD).filter(isFile)
  if (files.length === 0) {
    return json({ error: 'No files were submitted.' }, 400)
  }

  const countRejection = rejectionForCount(files.length)
  if (countRejection) {
    // A submission-wide refusal, so it is reported once rather than repeated
    // against each file.
    return json(
      { accepted: [], rejected: [rejected(files, countRejection)] },
      400,
    )
  }

  const candidates = await Promise.all(files.map(toCandidate))

  const rejections = candidates.flatMap((candidate) => {
    const rejection = rejectionForFile(candidate)
    return rejection
      ? [{ filename: candidate.name, message: describeRejection(rejection) }]
      : []
  })
  if (rejections.length > 0) {
    return json({ accepted: [], rejected: rejections }, 400)
  }

  // Resolved only now that the submission is known to be storable.
  const queue = await getQueue()

  // Sequential rather than concurrent: a submission is up to twenty files of up
  // to 50 MB, and running them together would multiply peak memory by twenty
  // for no gain on a single-node store.
  const accepted = []
  for (const candidate of candidates) {
    const stored = await storeUpload(database, queue, {
      userId,
      filename: candidate.name,
      bytes: candidate.bytes,
    })
    accepted.push(stored)
  }

  const body: UploadResponseBody = { accepted, rejected: [] }
  return json(body, 201)
}

/**
 * A submission-wide rejection, reported against the first file.
 *
 * The count limit is not any one file's fault, so the message names the
 * submission; attaching it to a filename keeps the response one shape.
 */
function rejected(files: File[], rejection: UploadRejection) {
  return {
    filename: files[0]?.name ?? '',
    message: describeRejection(rejection),
  }
}

async function toCandidate(file: File): Promise<CandidateFile> {
  return {
    name: file.name,
    contentType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  }
}

/**
 * `FormData.getAll` returns strings for non-file fields; only real files are
 * candidates, and a client can put either under any name.
 */
function isFile(entry: FormDataEntryValue): entry is File {
  return typeof entry !== 'string'
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
