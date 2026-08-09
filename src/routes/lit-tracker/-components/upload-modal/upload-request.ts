/**
 * Posting a set of PDFs to the upload endpoint.
 *
 * Split out of the component so the request shape — which field name the files
 * travel under, and how a refusal is read back — can be tested and changed
 * without rendering anything.
 *
 * This is the one write on this site that is not a Zero mutation. Nothing about
 * the *result* comes back through here beyond whether it was accepted: the job
 * rows the upload creates reach the page by sync, so a successful upload
 * returns nothing the caller has to render.
 */

/** Where the endpoint is mounted (src/routes/api/lit-tracker/upload.ts). */
const UPLOAD_URL = '/api/lit-tracker/upload'

/** The form field name the endpoint reads. */
const FILE_FIELD = 'files'

/** A file the server refused, and why — shown inline beside the picker. */
export interface RejectedFile {
  filename: string
  message: string
}

/**
 * The outcome of one submission.
 *
 * `rejected` being non-empty means **nothing** was stored: the endpoint
 * validates the whole batch before storing any of it, so a partial success is
 * not a state this can report.
 */
export type UploadOutcome =
  | { status: 'accepted'; count: number }
  | { status: 'rejected'; rejected: RejectedFile[] }

/** A refusal with no per-file detail — a network failure, or an unexpected status. */
export function generalRejection(message: string): UploadOutcome {
  return { status: 'rejected', rejected: [{ filename: '', message }] }
}

/**
 * Submits files to the upload endpoint.
 *
 * Never throws: a transport failure is an outcome the modal has to show inline
 * just as a validation refusal is, and making the caller handle two shapes of
 * failure would mean two ways of rendering the same thing.
 */
export async function uploadPdfs(files: File[]): Promise<UploadOutcome> {
  const form = new FormData()
  for (const file of files) {
    form.append(FILE_FIELD, file, file.name)
  }

  let response: Response
  try {
    response = await fetch(UPLOAD_URL, { method: 'POST', body: form })
  } catch {
    return generalRejection('Upload failed: could not reach the server.')
  }

  if (response.ok) {
    return { status: 'accepted', count: files.length }
  }

  // A 401 is its own case: the session expired while the modal was open, and
  // "not signed in" is actionable where a generic failure is not.
  if (response.status === 401) {
    return generalRejection('Upload failed: you are no longer signed in.')
  }

  const body = await response.json().catch(() => null)
  const rejected = readRejections(body)
  return rejected
    ? { status: 'rejected', rejected }
    : generalRejection('Upload failed: the server refused the submission.')
}

/** Reads the endpoint's `rejected` list, tolerating a body of any other shape. */
function readRejections(body: unknown): RejectedFile[] | null {
  if (typeof body !== 'object' || body === null || !('rejected' in body)) {
    return null
  }
  const { rejected } = body as { rejected: unknown }
  if (!Array.isArray(rejected) || rejected.length === 0) {
    return null
  }
  return rejected.map((entry) => ({
    filename: String(entry?.filename ?? ''),
    message: String(entry?.message ?? 'This file was refused.'),
  }))
}
