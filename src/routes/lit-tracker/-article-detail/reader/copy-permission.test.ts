import { PdfPermissionFlag } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { canCopyText } from './copy-permission'

/**
 * The rule that decides whether the copy control is offered.
 *
 * It reproduces a check the engine makes internally and does not export, so
 * these assertions are what keep the reproduction honest: get it wrong in the
 * permissive direction and the button does nothing when pressed, get it wrong in
 * the restrictive direction and a perfectly copyable paper says it is not.
 */

describe('canCopyText', () => {
  it('permits everything when the document declares no permissions', () => {
    // The common case by an enormous margin: an ordinary paper carries no
    // permission bits at all, and the engine reads that as unrestricted.
    expect(canCopyText(undefined)).toBe(true)
  })

  it('permits copying when the flag is set', () => {
    expect(canCopyText(PdfPermissionFlag.CopyContents)).toBe(true)
  })

  it('permits copying when the flag is one of several set', () => {
    expect(
      canCopyText(
        PdfPermissionFlag.CopyContents | PdfPermissionFlag.ModifyAnnotations,
      ),
    ).toBe(true)
  })

  it('refuses when the document withholds that one flag', () => {
    // A paper that allows annotation but not extraction — the case worth
    // getting right, because everything else about the reader still works.
    expect(canCopyText(PdfPermissionFlag.ModifyAnnotations)).toBe(false)
  })

  it('refuses when the document permits nothing', () => {
    expect(canCopyText(0)).toBe(false)
  })
})
