import { describe, expect, it } from 'vitest'
import { deriveReaderState } from './reader-state'

/**
 * The reader's four states, which is the part of it a test can hold.
 *
 * The component around this draws a WebAssembly canvas that jsdom cannot render,
 * so what is asserted here is the rule rather than the picture — and the rule is
 * the one that matters: **a document that cannot be fetched must never look like
 * a slow connection.**
 */

/** The engine up, nothing wrong. Each case overrides what it is about. */
const RUNNING = { isEngineLoading: false, engineError: null }

describe('deriveReaderState', () => {
  it('waits on the engine before anything else', () => {
    // The wasm is ~4.6 MB and the document cannot even begin until it is
    // compiled, so this wait gets its own name rather than being folded into
    // "loading".
    expect(
      deriveReaderState({
        isEngineLoading: true,
        engineError: null,
        documentStatus: null,
      }),
    ).toBe('starting')
  })

  it('reports an engine that could not start as failed, not as still starting', () => {
    expect(
      deriveReaderState({
        isEngineLoading: false,
        engineError: new Error('no WebAssembly'),
        documentStatus: null,
      }),
    ).toBe('failed')
  })

  it('lets a failure win over a wait, even mid-start', () => {
    // Both flags set at once is what a hook reports for a beat when it fails;
    // answering "starting" there would leave a permanent spinner.
    expect(
      deriveReaderState({
        isEngineLoading: true,
        engineError: new Error('bad wasm url'),
        documentStatus: null,
      }),
    ).toBe('failed')
  })

  it('treats a document that has not been opened yet as loading', () => {
    // `null` is the beat between the plugin registering and the manager opening
    // its configured document. It is not a failure, and it is not ready.
    expect(deriveReaderState({ ...RUNNING, documentStatus: null })).toBe(
      'loading',
    )
  })

  it('reports a document still arriving as loading', () => {
    expect(deriveReaderState({ ...RUNNING, documentStatus: 'loading' })).toBe(
      'loading',
    )
  })

  it('reports a document that could not be fetched as failed', () => {
    // The assertion this module exists for: an article whose PDF is missing
    // from the bucket must not sit on "loading the paper…" forever.
    expect(deriveReaderState({ ...RUNNING, documentStatus: 'error' })).toBe(
      'failed',
    )
  })

  it('is ready only once the document is loaded', () => {
    expect(deriveReaderState({ ...RUNNING, documentStatus: 'loaded' })).toBe(
      'ready',
    )
  })
})
