import { describe, expect, it } from 'vitest'
import {
  articlePdfUrl,
  BASE_PAGE_SCALE,
  createReaderPlugins,
  TILING,
} from './reader-plugins'

/**
 * What the reader is built from.
 *
 * Configuration rather than rendering, which is why it can be asserted here at
 * all — and configuration is exactly what breaks quietly: a plugin added by
 * reflex, or a document URL that points somewhere it should not.
 */

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

describe('articlePdfUrl', () => {
  it('points at this app’s own authorized route', () => {
    expect(articlePdfUrl(ARTICLE_ID)).toBe(
      `/api/lit-tracker/articles/${ARTICLE_ID}/pdf`,
    )
  })

  it('is same-origin, and not a presigned link to the object store', () => {
    // The load-bearing rule of this whole feature: every PDF read proxies
    // through the app server, because a presigned Garage URL is a bearer token
    // that works independently of any check this server makes
    // (research/security-privacy/pdf-and-annotation-data-protection.md).
    const url = articlePdfUrl(ARTICLE_ID)

    expect(url.startsWith('/')).toBe(true)
    expect(url).not.toMatch(/^https?:/)
    expect(url).not.toMatch(/X-Amz-|Signature|garage/i)
  })
})

describe('createReaderPlugins', () => {
  it('registers exactly the nine the reader needs', () => {
    // Thumbnails, search, printing, rotation and spreads all exist and none is
    // asked for. If this count changes, it should be because a task decided to
    // change it — the tiling plugin was the last to, and before it the
    // annotation plugin with the two its manifest requires.
    expect(createReaderPlugins(ARTICLE_ID)).toHaveLength(9)
  })

  it('registers the tiling plugin after the three it requires', () => {
    /*
     * Its manifest declares `requires: ['render', 'scroll', 'viewport']` — it
     * draws with the first and asks the other two which part of which page is
     * on screen. Registered before them, the reader is left with the one thing
     * this feature exists to remove: a full-page image at the current zoom.
     */
    const ids = pluginIds()

    expect(ids).toContain('tiling')
    expect(ids.indexOf('render')).toBeLessThan(ids.indexOf('tiling'))
    expect(ids.indexOf('scroll')).toBeLessThan(ids.indexOf('tiling'))
    expect(ids.indexOf('viewport')).toBeLessThan(ids.indexOf('tiling'))
  })

  it('gives the tiling plugin the sizes this reader chose', () => {
    // The config's type demands all three, so none of them can be forgotten —
    // what this asserts is that the reader's choice reaches the plugin, since a
    // registration that quietly dropped its config would still render, just at
    // someone else's numbers.
    const tiling = configOf('tiling')

    expect(tiling).toEqual(TILING)
  })

  it('does not pre-render tiles outside the viewport', () => {
    /*
     * Pinned separately from the object above because it is the one value that
     * would undo the point: every ring is more of exactly the rendering this
     * feature exists to stop paying for, spent on parts of the page nobody is
     * looking at. Raising it is a decision with a measurement attached.
     */
    expect(TILING.extraRings).toBe(0)
  })

  it('draws the base layer at a fixed scale, not the document’s', () => {
    // The base is what shows while tiles arrive. Pinned, it is rendered once
    // per page and never again; following the zoom, it would still be the
    // 620 MB at 400% that this feature was filed to remove.
    expect(BASE_PAGE_SCALE).toBe(1)
  })

  it('registers the annotation plugin’s dependencies before it', () => {
    // The plugin's manifest declares `requires: ['interaction-manager',
    // 'selection']`, and EmbedPDF's documentation is explicit that they must be
    // registered first. Nothing throws when they are not — the annotation layer
    // simply never responds to a pointer.
    const ids = pluginIds()

    expect(ids).toContain('annotation')
    expect(ids.indexOf('interaction-manager')).toBeLessThan(
      ids.indexOf('annotation'),
    )
    expect(ids.indexOf('selection')).toBeLessThan(ids.indexOf('annotation'))
  })

  it('leaves undo/redo out', () => {
    // The annotation plugin lists `history` as an *optional* dependency, so its
    // absence is a decision rather than an omission: annotations sync live and
    // are individually deletable, and an undo stack would be a second route to
    // one outcome (features/article-detail-and-reader/plan.md).
    expect(pluginIds()).not.toContain('history')
  })

  it('keeps the chosen tool live after a mark is made', () => {
    // The decided creation flow: pick a tool, then apply it repeatedly until
    // switching or deselecting. EmbedPDF's own default already behaves this way;
    // saying so is what keeps a future default from quietly changing it.
    const annotation = createReaderPlugins(ARTICLE_ID).find(
      (registration) =>
        (registration as { package: { manifest?: { id?: string } } }).package
          ?.manifest?.id === 'annotation',
    ) as unknown as { config?: { deactivateToolAfterCreate?: boolean } }

    expect(annotation.config?.deactivateToolAfterCreate).toBe(false)
  })

  it('opens the article’s own PDF, keyed by the article’s own id', () => {
    const [documentManager] = createReaderPlugins(ARTICLE_ID) as unknown as [
      { config?: { initialDocuments?: { url: string; documentId: string }[] } },
    ]

    expect(documentManager.config?.initialDocuments).toEqual([
      { url: articlePdfUrl(ARTICLE_ID), documentId: ARTICLE_ID },
    ])
  })

  it('gives every registration a distinct plugin', () => {
    // Registering the same package twice is the shape a copy-paste mistake
    // takes, and EmbedPDF would resolve one of them and silently drop the other.
    const ids = pluginIds()

    expect(new Set(ids).size).toBe(ids.length)
  })
})

/** The configuration handed to one registered plugin, by its manifest id. */
function configOf(pluginId: string): unknown {
  const registration = createReaderPlugins(ARTICLE_ID).find(
    (candidate) =>
      (candidate as { package: { manifest?: { id?: string } } }).package
        ?.manifest?.id === pluginId,
  ) as unknown as { config?: unknown } | undefined

  return registration?.config
}

/** The registered plugins' own manifest ids, in registration order. */
function pluginIds(): (string | undefined)[] {
  return createReaderPlugins(ARTICLE_ID).map(
    (registration) =>
      (registration as { package: { manifest?: { id?: string } } }).package
        ?.manifest?.id,
  )
}
