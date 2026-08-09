/**
 * Aligning a PDF's parsed bibliography with Semantic Scholar's own reference
 * list for the same paper.
 *
 * ## Why this exists
 *
 * Resolving a reference needs an identifier, and most references do not print
 * one. Measured on real GROBID output, 47 of BERT's 54 parsed references carry
 * no DOI, arXiv id or PubMed id — because its bibliography cites conference
 * proceedings the way proceedings are cited, by name. Those edges could never
 * graduate, so the citation graph was 13% full for exactly the papers this
 * collection is mostly made of.
 *
 * Semantic Scholar already knows the answer. It holds its own resolved
 * reference list for the citing paper, every entry carrying a `paperId`, and
 * `GET /paper/{id}/references` returns the whole thing in **one** request. So
 * the identifiers are fetched from there and matched onto the entries GROBID
 * parsed, by title.
 *
 * Result on the same four papers: 13% → 96%, 38% → 97%, 28% → 93%, 95% → 100%.
 *
 * ## Why matching on title is safe *here*
 *
 * It would not be, in general — which is why the graduation rule in
 * `citations/matching.ts` is far stricter, and stays that way. The difference
 * is the candidate set. There, a title is compared against an entire
 * collection, and a false positive links two unrelated papers forever. Here it
 * is compared against **the ~50 papers this exact paper cited**, both sides
 * describing the same reference, and a title that matches one of them is
 * essentially certain to be it.
 *
 * That closed set is what pays for the tolerant normalization below. GROBID
 * reproduces a printed reference imperfectly and predictably: it keeps a year
 * prefix ("2018a. Deep contextualized word representations"), a trailing venue
 * ("Neural Machine Translation in Linear Time. arXiv"), or an author fragment
 * ("Marcos. Findings of the 2016 conference..."). Every one of those was
 * observed in real output, and every one is recovered by comparing
 * letters-and-digits only and allowing one title to contain the other.
 */

/** One entry of Semantic Scholar's reference list. */
export interface ReferenceCandidate {
  paperId: string
  title: string | null
}

/** A written edge that still has no identifier of its own. */
export interface UnresolvedEdge {
  edgeId: string
  title: string
}

/**
 * How much title two entries must share before containment is allowed to
 * decide.
 *
 * Containment on a short title is not evidence — "attention" is inside a dozen
 * plausible papers. Twenty letters is long enough that a containment inside a
 * single paper's reference list is not a coincidence.
 */
const MIN_CONTAINMENT_LENGTH = 20

/**
 * Matches unresolved edges against the citing paper's reference list.
 *
 * Returns only the ones that matched; an entry Semantic Scholar's list does not
 * cover simply stays a placeholder, which is a normal outcome rather than a
 * failure. Nothing here overwrites an identifier the paper itself printed —
 * only edges with no id are passed in.
 */
export function alignReferences(
  edges: UnresolvedEdge[],
  candidates: ReferenceCandidate[],
): { edgeId: string; semanticScholarId: string }[] {
  const normalized = candidates.flatMap((candidate) => {
    const title = normalizeForAlignment(candidate.title)
    return title ? [{ title, paperId: candidate.paperId }] : []
  })

  // Built once rather than per edge: a paper can cite the same work twice, and
  // a title that is ambiguous *within the reference list* must not resolve at
  // all — a wrong edge is worse than a missing one.
  const exact = new Map<string, string | null>()
  for (const { title, paperId } of normalized) {
    exact.set(title, exact.has(title) ? null : paperId)
  }

  return edges.flatMap((edge) => {
    const title = normalizeForAlignment(edge.title)
    if (!title) {
      return []
    }
    const paperId = exact.get(title) ?? containedMatch(title, normalized)
    return paperId ? [{ edgeId: edge.edgeId, semanticScholarId: paperId }] : []
  })
}

/**
 * The one candidate whose title contains this one, or that it contains.
 *
 * Ambiguity resolves to nothing: if two of the paper's references are both
 * compatible with what GROBID read, there is no way to tell which was meant,
 * and guessing would attach a citation the author never made.
 */
function containedMatch(
  title: string,
  candidates: { title: string; paperId: string }[],
): string | null {
  if (title.length < MIN_CONTAINMENT_LENGTH) {
    return null
  }
  const matches = new Set(
    candidates
      .filter(
        (candidate) =>
          candidate.title.length >= MIN_CONTAINMENT_LENGTH &&
          (candidate.title.includes(title) || title.includes(candidate.title)),
      )
      .map((candidate) => candidate.paperId),
  )
  return matches.size === 1 ? (matches.values().next().value ?? null) : null
}

/**
 * A title reduced to its letters and digits.
 *
 * Deliberately more aggressive than `normalizeTitle` in
 * `citations/matching.ts`, and deliberately not shared with it. Dropping
 * punctuation and spaces is what makes GROBID's "attentionbased" match the
 * printed "Attention-based", and what makes a title survive the hyphenation
 * and capitalisation differences between a PDF and a database. That tolerance
 * is only affordable against a closed candidate set — see this file's header.
 */
export function normalizeForAlignment(title: string | null): string | null {
  const normalized = (title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalized.length > 0 ? normalized : null
}
