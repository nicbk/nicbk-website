import { XMLParser, XMLValidator } from 'fast-xml-parser'

/**
 * Turning GROBID's TEI-XML into a tree this module can walk, and the small set
 * of accessors the rest of the parser uses.
 *
 * Nothing here knows what TEI *means* — that is `header.ts` and
 * `bibliography.ts`. This file exists so those two read as a description of the
 * TEI structure rather than as XML plumbing.
 *
 * ## Why the parser is configured the way it is
 *
 * fast-xml-parser's defaults are tuned for configuration files, and three of
 * them are actively wrong for TEI:
 *
 * - **`alwaysCreateTextNode`** — off by default, so `<surname>Kaiser</surname>`
 *   parses to the bare string `'Kaiser'` while a `<title level="a">` parses to
 *   an object. Every accessor would then have to handle both shapes. On, every
 *   element is an object.
 * - **`parseTagValue` / `parseAttributeValue`** — on by default, so a year
 *   becomes a number, a DOI's suffix can become one, and a paper titled `1.5`
 *   would come back as `1.5`. Everything here is text and is coerced
 *   deliberately, once, where it is used.
 * - **`isArray`** — without it, one `<author>` is an object and two are an
 *   array, which is the classic source of "worked on the fixture, threw on the
 *   real paper". Every element that can legitimately repeat is forced to an
 *   array below.
 */

/**
 * Elements that may appear more than once among their siblings, forced to
 * arrays so the accessors never have to ask which shape they got.
 *
 * Over-listing is harmless — an element named here always arrives as an array
 * of one — so this errs toward including anything plausibly repeatable.
 */
const REPEATABLE_ELEMENTS = new Set([
  'author',
  'biblStruct',
  'date',
  'div',
  'forename',
  'idno',
  'note',
  'p',
  'title',
])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  alwaysCreateTextNode: true,
  parseTagValue: false,
  parseAttributeValue: false,
  // TEI's own elements are unprefixed, but GROBID emits xlink:/xsi: attributes;
  // stripping prefixes keeps the accessors from having to spell them.
  removeNSPrefix: true,
  isArray: (name) => REPEATABLE_ELEMENTS.has(name),
})

/** The text of an element, under `alwaysCreateTextNode`. */
const TEXT_KEY = '#text'

/**
 * One parsed element: its attributes (prefixed `@`), its text (`#text`), and
 * its child elements by name.
 *
 * Deliberately loose. A schema-shaped type would claim more about GROBID's
 * output than is true — TEI is permissive, and every field this parser reads is
 * one a real document sometimes omits.
 */
export type TeiElement = Record<string, unknown>

/** Raised when the response is not well-formed XML at all. */
export class MalformedTeiError extends Error {
  constructor(detail: string) {
    super(`GROBID returned XML that could not be parsed: ${detail}`)
    this.name = 'MalformedTeiError'
  }
}

/**
 * Parses a TEI document, rejecting anything that is not well-formed XML.
 *
 * The validation pass is not redundant: fast-xml-parser is lenient and will
 * happily return a partial tree for a truncated document, which would surface
 * later as inexplicably missing metadata rather than as a bad response. Failing
 * here is what lets the caller report "couldn't read the extraction result"
 * instead of "couldn't find authors".
 */
export function parseTeiDocument(xml: string): TeiElement {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) {
    throw new MalformedTeiError(validation.err.msg)
  }

  const document = parser.parse(xml) as TeiElement
  const root = element(document, 'TEI')
  if (!root) {
    throw new MalformedTeiError('the root element is not <TEI>')
  }
  return root
}

/** Every child element with this name, in document order. */
export function elements(parent: TeiElement, name: string): TeiElement[] {
  const value = parent[name]
  if (Array.isArray(value)) {
    return value.filter(isElement)
  }
  return isElement(value) ? [value] : []
}

/** The first child element with this name, if there is one. */
export function element(
  parent: TeiElement,
  name: string,
): TeiElement | undefined {
  return elements(parent, name)[0]
}

/**
 * Walks a chain of single child elements, e.g.
 * `path(root, 'teiHeader', 'fileDesc', 'titleStmt')`.
 *
 * TEI nests deeply and almost every read starts several levels down, so
 * without this the parser would be mostly optional chaining.
 */
export function path(
  root: TeiElement,
  ...names: string[]
): TeiElement | undefined {
  let current: TeiElement | undefined = root
  for (const name of names) {
    if (!current) {
      return undefined
    }
    current = element(current, name)
  }
  return current
}

/** An element's attribute value, if present. */
export function attribute(node: TeiElement, name: string): string | undefined {
  const value = node[`@${name}`]
  return typeof value === 'string' ? value : undefined
}

/** The first element whose attribute equals a value. */
export function elementWhere(
  parent: TeiElement,
  name: string,
  attributeName: string,
  attributeValue: string,
): TeiElement | undefined {
  return elements(parent, name).find(
    (candidate) => attribute(candidate, attributeName) === attributeValue,
  )
}

/**
 * All of an element's text, including text inside its descendants, collapsed
 * to single spaces.
 *
 * Recursive because TEI's prose is mixed content: an abstract paragraph can
 * carry `<ref>` markers inside it, and a title can be split across formatting
 * elements. Reading only the direct `#text` would silently truncate both.
 */
export function textOf(node: TeiElement | undefined): string {
  if (!node) {
    return ''
  }
  return collectText(node).replace(/\s+/g, ' ').trim()
}

function collectText(node: TeiElement): string {
  let text = ''
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@')) {
      continue
    }
    if (key === TEXT_KEY) {
      text += ` ${String(value)}`
      continue
    }
    for (const child of Array.isArray(value) ? value : [value]) {
      if (isElement(child)) {
        text += ` ${collectText(child)}`
      }
    }
  }
  return text
}

/** `textOf`, but absent rather than empty — the shape every caller wants. */
export function textOrNull(node: TeiElement | undefined): string | null {
  const text = textOf(node)
  return text.length > 0 ? text : null
}

function isElement(value: unknown): value is TeiElement {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
