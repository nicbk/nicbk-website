/**
 * Turning a browser's `If-None-Match` into the condition handed to Garage.
 *
 * The route forwards this header to the object store rather than comparing
 * tags itself, so that Garage — which knows the object's current tag — is what
 * decides "unchanged". That makes the header an input to a storage request, and
 * this is the gate it passes through first.
 *
 * ## Why anything not well-formed is dropped rather than refused
 *
 * A condition the route cannot read is not a reason to fail the request: the
 * reader asked for a paper, and without a usable condition the right answer is
 * simply the whole paper. So every rejection here yields `null` — "no
 * condition" — and never an error.
 *
 * ## Why the weak prefix is stripped
 *
 * `If-None-Match` is compared weakly (RFC 9110 §13.1.2), so `W/"x"` and `"x"`
 * must match the same object. Garage does not do that: measured 2026-09-14, a
 * `W/`-prefixed copy of the object's own tag got a full 200 back. Stripping the
 * prefix here is what makes a weakened tag — which a proxy that compresses
 * responses would produce — still revalidate.
 */

/**
 * Longer than any header a browser sends back for one cached response, and far
 * below anything that would matter to Garage. A header past this is not one
 * this route produced.
 */
const MAX_HEADER_LENGTH = 1024

/**
 * One entity tag and the separator after it, matched from a fixed position.
 *
 * `etagc` is `%x21 / %x23-7E` — every visible character except the quote — so
 * a tag may itself contain a comma. That is why the list is scanned tag by tag
 * rather than split on commas, which would cut such a tag in two.
 */
const ENTITY_TAG = /[ \t]*(?:W\/)?("[\x21\x23-\x7e]*")[ \t]*(?:,|$)/y

/**
 * The condition to forward for a request's `If-None-Match`, or `null` for none.
 *
 * Returns `*` as itself, a list of tags with any weak prefix removed, or `null`
 * when the header is absent, empty, too long, or malformed anywhere in it.
 */
export function entityTagsToForward(header: string | null): string | null {
  if (header === null || header.length > MAX_HEADER_LENGTH) {
    return null
  }

  const trimmed = header.trim()
  if (trimmed === '*') {
    return '*'
  }
  if (trimmed === '') {
    return null
  }

  const tags: string[] = []
  ENTITY_TAG.lastIndex = 0
  while (ENTITY_TAG.lastIndex < trimmed.length) {
    const match = ENTITY_TAG.exec(trimmed)
    if (!match?.[1]) {
      // Something between or around the tags is not a tag. All or nothing: a
      // partly readable list is not a condition anyone can be sure they sent.
      return null
    }
    tags.push(match[1])
  }

  return tags.length > 0 ? tags.join(', ') : null
}
