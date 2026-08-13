import { ClientOnly } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'
import { ReaderNotice } from './reader-notice'
import { InertReaderToolbar } from './reader-toolbar'
import styles from './pdf-reader.module.css'

/**
 * The reader, mounted the only way a WebAssembly engine can be: in the browser,
 * after hydration.
 *
 * **PDFium is WebAssembly and this page renders on the server.** The engine
 * downloads a ~4.6 MB wasm binary, compiles it, and drives a Web Worker — none
 * of which exists during SSR, and none of which degrades to a server-rendered
 * snapshot. So the reader is loaded through `React.lazy` behind TanStack
 * Router's `ClientOnly`, exactly as the Zero provider is
 * (`~/routes/lit-tracker/-components/zero-client/zero-client-provider.tsx`):
 * `lazy` keeps the engine out of the initial bundle, `ClientOnly` keeps it from
 * being *called* during SSR, and both are needed — a lazy component still
 * renders on the server if nothing stops it.
 *
 * This split is also what keeps the wasm asset import out of the server build.
 * `pdf-reader.tsx` imports the binary's URL, and that import only ever runs in
 * the browser chunk because nothing on the server path reaches this module's
 * children.
 *
 * Everything around the reader — the metadata summary, the sidebar, the shell —
 * still renders server-side. Only this panel waits.
 */
const PdfReader = lazy(async () => {
  // `lazy` wants a default export and this project exports by name
  // (research/coding-conventions/component-and-export-conventions.md), so the
  // named export is adapted here rather than a default one being added.
  const { PdfReader: Loaded } = await import('./pdf-reader')
  return { default: Loaded }
})

interface ArticleReaderProps {
  /** The article whose PDF to read. Also the reader's document id. */
  articleId: string
  /**
   * The page's own controls, for the end of the toolbar — the sidebar trigger
   * and the article menu. They render in the fallback too, so they work before
   * the engine does: neither has anything to do with the document.
   */
  actions?: ReactNode
}

export function ArticleReader({ articleId, actions }: ArticleReaderProps) {
  // The same frame the loaded reader has, so the panel's shape is settled from
  // the first paint and only its contents change. `starting` is the honest
  // description of both moments it covers: the server render, and the wait for
  // the reader's own chunk.
  const frame = (
    <div className={styles.reader}>
      <div className={styles.notice}>
        <ReaderNotice state="starting" />
      </div>
      {/* Last, for the paint-order reason `pdf-reader.tsx` explains. */}
      <InertReaderToolbar actions={actions} />
    </div>
  )

  return (
    <ClientOnly fallback={frame}>
      <Suspense fallback={frame}>
        <PdfReader articleId={articleId} actions={actions} />
      </Suspense>
    </ClientOnly>
  )
}
