import { initialState } from '@embedpdf/plugin-interaction-manager'
import { describe, expect, it } from 'vitest'
import { READING_MODE } from './reading-mode'

/**
 * The one flag that decides whether a thumb can move the paper.
 *
 * `touch-action` itself has no observable behaviour in jsdom — no layout, no
 * compositor, no touch — so nothing here claims a drag scrolls. What is
 * assertable, and what would break silently, is the descriptor handed to the
 * engine: the flag's value, and that it still replaces the entry the library
 * seeded rather than adding a second one beside it.
 */

describe('the reading mode', () => {
  it('declines raw touch, which is the whole of the change', () => {
    // `wantsRawTouch !== false` is how the interaction manager reads it, so
    // `undefined` means "yes". Only an explicit `false` gives the paper back to
    // the browser.
    expect(READING_MODE.wantsRawTouch).toBe(false)
  })

  it('keeps the id the selection plugin hard-codes', () => {
    /*
     * Not cosmetic. The selection plugin seeds its per-mode configuration with
     * the literal string 'pointerMode' — so a reading mode under any other name
     * is a default mode with text selection switched off, and selecting text
     * with a mouse would break in a way no test here would otherwise catch.
     *
     * Compared against the installed library's own exported initial state
     * rather than a copy of the string, so this fails if EmbedPDF ever renames
     * its default instead of silently registering a mode nothing activates.
     */
    expect(READING_MODE.id).toBe(initialState.defaultMode)
  })

  it('replaces the library’s default rather than diverging from it', () => {
    // Registering this id overwrites the entry EmbedPDF made for itself, so
    // every field that is not the flag has to keep saying what the library
    // said. A mode that accidentally became exclusive, or lost its page scope,
    // would take the pointer handling of the whole reader with it.
    expect(READING_MODE.scope).toBe('page')
    expect(READING_MODE.exclusive).toBe(false)
    expect(READING_MODE.cursor).toBe('auto')
  })
})
