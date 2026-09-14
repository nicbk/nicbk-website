import type {
  PdfDocumentObject,
  PdfEngine,
  PdfLinkAnnoObject,
  PdfLinkTarget,
} from '@embedpdf/models'
import { PdfActionType, PdfAnnotationSubtype } from '@embedpdf/models'
import type { TrackedAnnotation } from '@embedpdf/plugin-annotation'
import type {
  LinkLanding,
  PageText,
  PreviewRegion,
} from './link-preview-region'
import { previewRegion, targetTop } from './link-preview-region'

/**
 * Feeding `previewRegion` from the open document.
 *
 * `link-preview-region.ts` decides; this gathers what it decides from — the
 * link's own characters, the text of the pages around its target, and where
 * every other link lands — with the engine injected, so the gathering is tested
 * without WebAssembly.
 *
 * **Text is read on demand**, for the clicked link's page and the target page
 * and its neighbours only, and kept per document: a paper's pages do not
 * change while it is open, and a second click on the same citation should not
 * ask the engine again.
 */

type TextEngine = Pick<
  PdfEngine,
  'getPageGlyphs' | 'getPageTextRuns' | 'getTextSlices'
>

/** The destination a link points to in this document, if it has one. */
export function destinationOf(target: PdfLinkTarget | undefined) {
  if (target?.type === 'destination') {
    return target.destination
  }
  if (target?.type === 'action' && target.action.type === PdfActionType.Goto) {
    return target.action.destination
  }
  return null
}

/** Where every internal link in the loaded annotations lands. */
export function landingsFrom(
  annotations: readonly TrackedAnnotation[],
  document: PdfDocumentObject,
): LinkLanding[] {
  const landings: LinkLanding[] = []
  for (const { object } of annotations) {
    if (object.type !== PdfAnnotationSubtype.LINK) {
      continue
    }
    const destination = destinationOf((object as PdfLinkAnnoObject).target)
    const page = destination && document.pages[destination.pageIndex]
    if (!destination || !page) {
      continue
    }
    const { x, y } = targetTop(destination, page.size)
    // A destination with no position says nothing about where an entry starts.
    if (x !== 0 || y !== 0) {
      landings.push({ pageIndex: destination.pageIndex, x, y })
    }
  }
  return landings
}

const pageTextCache = new WeakMap<
  PdfDocumentObject,
  Map<number, Promise<PageText>>
>()

function readPageText(
  engine: TextEngine,
  document: PdfDocumentObject,
  pageIndex: number,
): Promise<PageText> | undefined {
  const page = document.pages[pageIndex]
  if (!page) {
    return undefined
  }
  let pages = pageTextCache.get(document)
  if (!pages) {
    pages = new Map()
    pageTextCache.set(document, pages)
  }
  let text = pages.get(pageIndex)
  if (!text) {
    text = engine
      .getPageTextRuns(document, page)
      .toPromise()
      .then(({ runs }) => ({
        width: page.size.width,
        height: page.size.height,
        runs,
      }))
    // A failed read is not remembered: the next click asks again.
    text.catch(() => pages?.delete(pageIndex))
    pages.set(pageIndex, text)
  }
  return text
}

/**
 * The characters a link covers, read from the glyphs inside its box.
 *
 * Glyphs rather than text runs, because a run is a stretch of one font — for a
 * citation, usually the whole sentence around it — and snapping depends on
 * knowing the link reads `18` and not "long short-term memory [18] and".
 * A glyph counts when its centre is inside the link's rect; the characters from
 * the first such glyph to the last are the link's text.
 */
export async function linkText(
  engine: TextEngine,
  document: PdfDocumentObject,
  link: Pick<PdfLinkAnnoObject, 'pageIndex' | 'rect'>,
): Promise<string> {
  const page = document.pages[link.pageIndex]
  if (!page) {
    return ''
  }
  const glyphs = await engine.getPageGlyphs(document, page).toPromise()
  const { origin, size } = link.rect
  let first = -1
  let last = -1
  glyphs.forEach((glyph, index) => {
    // The engine leaves holes for characters with no box, such as line breaks.
    if (!glyph) {
      return
    }
    const box =
      glyph.tightOrigin && glyph.tightSize
        ? { origin: glyph.tightOrigin, size: glyph.tightSize }
        : glyph
    const cx = box.origin.x + box.size.width / 2
    const cy = box.origin.y + box.size.height / 2
    if (
      cx >= origin.x &&
      cx <= origin.x + size.width &&
      cy >= origin.y &&
      cy <= origin.y + size.height
    ) {
      first = first === -1 ? index : first
      last = index
    }
  })
  if (first === -1) {
    return ''
  }
  const [text] = await engine
    .getTextSlices(document, [
      {
        pageIndex: link.pageIndex,
        charIndex: first,
        charCount: last - first + 1,
      },
    ])
    .toPromise()
  return text ?? ''
}

/** The region to preview for a link, gathered from the open document. */
export async function resolveLinkPreview({
  engine,
  document,
  link,
  annotations,
}: {
  engine: TextEngine
  document: PdfDocumentObject
  link: PdfLinkAnnoObject
  annotations: readonly TrackedAnnotation[]
}): Promise<PreviewRegion | null> {
  const destination = destinationOf(link.target)
  if (!destination) {
    return null
  }

  const neighbours = [
    destination.pageIndex - 1,
    destination.pageIndex,
    destination.pageIndex + 1,
  ]
  const [text, ...pages] = await Promise.all([
    linkText(engine, document, link),
    ...neighbours.map((index) => readPageText(engine, document, index)),
  ])
  const byIndex = new Map<number, PageText>()
  neighbours.forEach((index, i) => {
    const page = pages[i]
    if (page) {
      byIndex.set(index, page)
    }
  })

  return previewRegion({
    linkText: text,
    destination,
    pageText: (index) => byIndex.get(index),
    landings: landingsFrom(annotations, document),
  })
}
