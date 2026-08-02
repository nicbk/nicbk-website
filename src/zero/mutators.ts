import { defineMutators } from '@rocicorp/zero'

/**
 * Every write the client may ask Zero to perform. There are none yet.
 *
 * That is not an oversight, and the registry is not a placeholder that does
 * nothing: nothing in the article-upload feature writes from the browser.
 * Uploads are a plain multipart POST to the app server (a PDF is not something
 * to put through an optimistic mutation), and everything after that — creating
 * the article, recording extraction results, deleting the finished job — is
 * written by background job handlers on the server. The first real mutators
 * arrive with the collection view (#8), which edits data the user can see.
 *
 * The endpoint is stood up now anyway, authorized the same way `/query` is, so
 * that the seam exists and is proven closed. An unauthenticated request is
 * refused rather than silently accepted — the alternative is discovering in #8
 * that the write path was never checked because it never had a consumer.
 */
export const mutators = defineMutators({})
