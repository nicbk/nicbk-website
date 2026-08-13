/**
 * Makes the engine's WebAssembly URL absolute before it is handed to a worker.
 *
 * **This is not tidiness — a root-relative URL cannot be resolved inside
 * EmbedPDF's worker at all.** The engine builds its worker from a `blob:` URL
 * (`URL.createObjectURL` over the worker source, in
 * `@embedpdf/engines/dist/lib/pdfium/web/worker-engine.js`), so the worker's
 * base URL is `blob:http://origin/<uuid>`. `blob:` is not a special scheme, so
 * resolving a root-relative path against it does not merely produce the wrong
 * URL — it throws:
 *
 *     new URL('/pdfium.wasm', 'blob:http://localhost:3000/<uuid>')
 *     // TypeError: Failed to construct 'URL': Invalid URL
 *
 * Vite's `?url` import produces exactly that shape in both dev
 * (`/node_modules/…/pdfium.wasm`) and production (`/assets/pdfium-<hash>.wasm`),
 * so passing it through unchanged leaves the wasm fetch failing inside the
 * worker where nothing surfaces it. The visible symptom is a reader that sits on
 * "loading the paper…" forever with a successful PDF request in the network log
 * and no error anywhere — which is how this was found.
 *
 * Kept as a function of its inputs rather than reading `window` directly so the
 * rule can be tested without a document.
 */
export function absoluteAssetUrl(assetUrl: string, origin: string): string {
  return new URL(assetUrl, origin).href
}
