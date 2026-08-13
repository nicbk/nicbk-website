import { describe, expect, it } from 'vitest'
import { articlePdfUrl, createReaderPlugins } from './reader-plugins'

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
  it('registers exactly the five the viewer needs', () => {
    // Thumbnails, search, printing, rotation and spreads all exist and none is
    // asked for. If this count changes, it should be because a task decided to
    // change it — task 4 adds the annotation plugin and its two peers.
    expect(createReaderPlugins(ARTICLE_ID)).toHaveLength(5)
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
    const ids = createReaderPlugins(ARTICLE_ID).map(
      (registration) =>
        (registration as { package: { manifest?: { id?: string } } }).package
          ?.manifest?.id,
    )

    expect(new Set(ids).size).toBe(ids.length)
  })
})
