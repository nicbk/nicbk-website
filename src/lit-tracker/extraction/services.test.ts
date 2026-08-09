// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import type { JobQueue } from '~/lit-tracker/jobs/queue'

/**
 * The one composition in this module: GROBID's answer goes through the TEI
 * parser, and the PDF comes from the ownership-checked read.
 *
 * Small, but it is the seam that lets every other test replace the
 * infrastructure — if it stopped calling the parser, the stages' tests would
 * all still pass.
 */

const requestTei = vi.hoisted(() => vi.fn())
const getArticlePdf = vi.hoisted(() => vi.fn())
vi.mock('./grobid', () => ({ requestTei }))
vi.mock('~/storage/pdf-storage', () => ({ getArticlePdf }))

const { productionServices } = await import('./services')

const database = {} as DatabaseHandle
const queue = {} as JobQueue

describe('productionServices', () => {
  it('parses what GROBID returns', async () => {
    requestTei.mockResolvedValue(`<?xml version="1.0"?>
      <TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc>
        <titleStmt><title level="a" type="main">A Real Paper</title></titleStmt>
      </fileDesc></teiHeader></TEI>`)
    const pdf = new TextEncoder().encode('%PDF-1.7')

    const metadata = await productionServices(database, queue).extractMetadata(
      pdf,
    )

    expect(requestTei).toHaveBeenCalledWith(pdf)
    expect(metadata.title).toBe('A Real Paper')
  })

  it('reads PDFs through the ownership-checked path', async () => {
    // Not a bare S3 get: this is the read half of the storage path, and the
    // check belongs to it rather than to the caller.
    expect(productionServices(database, queue).fetchPdf).toBe(getArticlePdf)
  })
})
