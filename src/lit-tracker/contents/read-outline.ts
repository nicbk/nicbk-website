import { randomUUID } from 'node:crypto'
import { PdfiumNative } from '@embedpdf/engines/pdfium'
import { init } from '@embedpdf/pdfium'
import type { ContentsEntry } from './contents'
import { outlineEntries } from './outline'
import { pdfiumWasm } from './pdfium-wasm'

/**
 * Reads a PDF's outline on the server, with the engine the reader already
 * ships (features/a-paper-shows-its-contents).
 *
 * **No second PDF library.** `@embedpdf/engines`' pdfium build runs in Node as
 * it does in the browser — measured for this feature, it opened every test file
 * and returned their outlines — so the server reads outlines with the same
 * engine, and the same version, the reader renders the paper with.
 *
 * **One engine for the process, created when first needed.** Compiling the
 * WebAssembly module costs far more than opening a document, and the worker
 * reads one paper at a time; each document is closed as soon as its outline is
 * read, so a textbook is not held in memory past its own job.
 */

let engine: Promise<PdfiumNative> | null = null

function pdfium(): Promise<PdfiumNative> {
  // The WebAssembly is handed over rather than found: in the bundled server it
  // is not where the module would look (`pdfium-wasm.ts`).
  engine ??= pdfiumWasm()
    .then((wasmBinary) => init({ wasmBinary }))
    .then((module) => new PdfiumNative(module))
  return engine
}

/** The outline's entries, or an empty list for a PDF that has none. */
export async function readOutline(pdf: Uint8Array): Promise<ContentsEntry[]> {
  const native = await pdfium()
  const content = pdf.buffer.slice(
    pdf.byteOffset,
    pdf.byteOffset + pdf.byteLength,
  ) as ArrayBuffer
  const document = await native
    .openDocumentBuffer({ id: randomUUID(), content })
    .toPromise()
  try {
    const { bookmarks } = await native.getBookmarks(document).toPromise()
    return outlineEntries(
      bookmarks,
      document.pages.map((page) => page.size.height),
    )
  } finally {
    await native.closeDocument(document).toPromise()
  }
}
