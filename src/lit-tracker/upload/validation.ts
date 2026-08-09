/**
 * What this site accepts as an uploadable PDF.
 *
 * The limits are configuration, not architecture — they bound what one request
 * can push into Garage and, later, GROBID, and they are comfortably above a
 * real paper. Confirmed with the user at task 3's review; change them freely.
 *
 * Kept pure and free of any request or storage type: this is the module the
 * upload endpoint consults *before* anything is stored, and the reason a
 * rejected file leaves nothing behind is that nothing has happened yet when it
 * runs.
 */

/** Per file. A 50 MB paper is already an outlier; scanned theses are the case this covers. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

/** Per submission. The modal is multi-select, so this bounds one click, not one file. */
export const MAX_FILES_PER_SUBMISSION = 20

/** The only content type the picker offers and the server accepts. */
export const PDF_CONTENT_TYPE = 'application/pdf'

/**
 * Every PDF begins with this signature.
 *
 * Checked in addition to the content type because the declared type is chosen
 * by the client and therefore attacker-controlled: a `.exe` announced as
 * `application/pdf` passes a type check and fails this one. It is the reason
 * the magic-byte check exists at all, and the pair is what the acceptance
 * criteria ask for.
 */
const PDF_MAGIC_BYTES = '%PDF-'

/**
 * Why a file was refused.
 *
 * Distinct members rather than one message string so the endpoint, the tests,
 * and the modal can each tell the cases apart — the user is told which file
 * failed and why, and "a file was rejected" would not be enough to fix it.
 */
export type UploadRejection =
  | { reason: 'too-many-files'; limit: number }
  | { reason: 'wrong-content-type'; declared: string }
  | { reason: 'not-a-pdf' }
  | { reason: 'too-large'; bytes: number; limit: number }

/** The parts of an uploaded file this module judges. */
export interface CandidateFile {
  readonly name: string
  readonly contentType: string
  readonly bytes: Uint8Array
}

/** Human-readable text for a rejection, shown inline beside the picker. */
export function describeRejection(rejection: UploadRejection): string {
  switch (rejection.reason) {
    case 'too-many-files':
      return `Too many files: at most ${rejection.limit} can be uploaded at once.`
    case 'wrong-content-type':
      return `Not a PDF: this file is ${rejection.declared}.`
    case 'not-a-pdf':
      // Deliberately distinct from the message above: the file *claimed* to be
      // a PDF, and saying only "not a PDF" would look like the picker had
      // misread a file the user knows is one.
      return 'Not a PDF: the file says it is one, but its contents are not.'
    case 'too-large':
      return `Too large: ${megabytes(rejection.bytes)} MB exceeds the ${megabytes(rejection.limit)} MB limit.`
  }
}

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}

/**
 * Checks how many files one submission carries.
 *
 * Separate from the per-file check because it is a property of the submission:
 * it must reject the batch as a whole rather than accept the first twenty.
 */
export function rejectionForCount(count: number): UploadRejection | null {
  if (count > MAX_FILES_PER_SUBMISSION) {
    return { reason: 'too-many-files', limit: MAX_FILES_PER_SUBMISSION }
  }
  return null
}

/** Checks one file, returning why it is unacceptable or `null` if it is fine. */
export function rejectionForFile(file: CandidateFile): UploadRejection | null {
  if (file.contentType !== PDF_CONTENT_TYPE) {
    return { reason: 'wrong-content-type', declared: file.contentType }
  }
  if (file.bytes.byteLength > MAX_FILE_BYTES) {
    return {
      reason: 'too-large',
      bytes: file.bytes.byteLength,
      limit: MAX_FILE_BYTES,
    }
  }
  if (!startsWithPdfMagic(file.bytes)) {
    return { reason: 'not-a-pdf' }
  }
  return null
}

/**
 * Compares the head of the file against `%PDF-`, byte by byte.
 *
 * Decoding the whole buffer to a string first would allocate a copy of a file
 * that may be 50 MB to look at five bytes of it.
 */
function startsWithPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PDF_MAGIC_BYTES.length) {
    return false
  }
  for (let index = 0; index < PDF_MAGIC_BYTES.length; index++) {
    if (bytes[index] !== PDF_MAGIC_BYTES.charCodeAt(index)) {
      return false
    }
  }
  return true
}
