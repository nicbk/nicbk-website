import type { DocumentStatus } from '@embedpdf/core'

/**
 * What the reader is doing, derived from the two independent things that have
 * to succeed before a page appears.
 *
 * Two waits, not one: the engine is a ~4.6 MB WebAssembly binary that has to
 * download and compile, and the paper is a separate multi-megabyte fetch that
 * cannot start until the engine exists. Collapsing them into one boolean is
 * what produces a reader that spins forever when the document 404s — the
 * defect this module exists to make impossible.
 *
 * Kept out of the component deliberately. The component around it renders a
 * WebAssembly canvas that jsdom cannot draw, so this is the part of the reader
 * a unit test can actually hold to account
 * (features/article-detail-and-reader/tasks/pdf-reader/testing.md).
 */
export type ReaderState =
  /** The engine's wasm is still downloading or compiling. Nothing else can start. */
  | 'starting'
  /** The engine is up and the paper itself is on its way. */
  | 'loading'
  /** Pages can be drawn. */
  | 'ready'
  /** Either half failed. Terminal — no amount of waiting fixes it. */
  | 'failed'

export interface ReaderStateInput {
  /** True while `usePdfiumEngine` is fetching and instantiating the wasm. */
  isEngineLoading: boolean
  /** Set if the engine could not start at all — a bad wasm URL, or no WebAssembly. */
  engineError: Error | null
  /**
   * The document manager's own status, or `null` before it has opened one.
   *
   * `null` is not a failure: the plugin registers, then opens its
   * `initialDocuments`, and there is a beat in between with no document state
   * at all.
   */
  documentStatus: DocumentStatus | null
}

/**
 * Resolves the reader's single visible state from the engine's and the
 * document's.
 *
 * Failure wins over waiting, and it wins in both halves: an engine that could
 * not start is as terminal as a document that could not be fetched, and either
 * one showing as "still loading" would be a lie the user has no way to see
 * through.
 */
export function deriveReaderState({
  isEngineLoading,
  engineError,
  documentStatus,
}: ReaderStateInput): ReaderState {
  if (engineError) {
    return 'failed'
  }
  if (isEngineLoading) {
    return 'starting'
  }
  if (documentStatus === 'error') {
    return 'failed'
  }
  // No document yet means the manager has not finished opening the one it was
  // configured with — the engine is ready and the paper is not, which is
  // exactly what 'loading' says.
  if (documentStatus === null || documentStatus === 'loading') {
    return 'loading'
  }
  return 'ready'
}
