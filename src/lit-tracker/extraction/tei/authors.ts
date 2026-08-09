import type { Author } from '~/db/schema'
import type { TeiElement } from './document'
import { attribute, element, elements, textOf } from './document'

/**
 * TEI `<author>` elements to the `Author` shape the `articles` table stores.
 *
 * Shared by the header and the bibliography because GROBID emits the same
 * element in both, and an author list that parsed one way in the header and
 * another way in a reference would be a quiet source of mismatched data once
 * task 5 starts resolving references against articles.
 *
 * `name` is always populated — it is what every display surface renders — while
 * `given`/`family` are filled in only when a `<persName>` provides them, per
 * the schema's own note (src/db/schema/lit-tracker.ts).
 */

/**
 * Reads every usable author out of a container element.
 *
 * Authors that yield no name at all are dropped rather than stored as empty
 * strings: an article listing a blank author is worse than one listing fewer.
 */
export function authorsOf(container: TeiElement): Author[] {
  const parsed: Author[] = []
  for (const node of elements(container, 'author')) {
    const author = authorOf(node)
    if (author) {
      parsed.push(author)
    }
  }
  return parsed
}

function authorOf(node: TeiElement): Author | undefined {
  const persName = element(node, 'persName')
  if (!persName) {
    // No structured name. GROBID does this for authors it could not segment,
    // leaving the raw string as the element's own text — which is still a
    // usable display name, so it is kept rather than discarded.
    const raw = textOf(node)
    return raw.length > 0 ? { name: raw } : undefined
  }

  const given = givenNameOf(persName)
  const family = textOf(element(persName, 'surname'))
  // Falls back to the whole element's text for a `<persName>` carrying neither
  // — GROBID emits that when it recognised a name but not its parts.
  const name = [given, family].filter(Boolean).join(' ') || textOf(persName)
  if (name.length === 0) {
    return undefined
  }

  const author: Author = { name }
  if (given.length > 0) {
    author.given = given
  }
  if (family.length > 0) {
    author.family = family
  }
  return author
}

/**
 * The forenames, in the order TEI marks them.
 *
 * GROBID splits a name like "Aidan N Gomez" into a `first` forename and a
 * `middle` one; both belong in `given`, and joining them here is what keeps
 * `name` equal to what a reader would write.
 */
function givenNameOf(persName: TeiElement): string {
  const forenames = elements(persName, 'forename')
  const first = forenames.filter((node) => attribute(node, 'type') !== 'middle')
  const middle = forenames.filter(
    (node) => attribute(node, 'type') === 'middle',
  )
  return [...first, ...middle]
    .map(textOf)
    .filter((part) => part.length > 0)
    .join(' ')
}
