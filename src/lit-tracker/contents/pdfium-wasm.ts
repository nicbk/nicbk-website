import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

/**
 * The PDF engine's WebAssembly, as bytes, wherever this server is running
 * (features/a-paper-shows-its-contents).
 *
 * **Why it is loaded by hand.** Left to itself, pdfium finds `pdfium.wasm`
 * beside its own module (`new URL('pdfium.wasm', import.meta.url)`). In
 * development and under test that module is in `node_modules`, and the file is
 * there. The production server is a self-contained bundle, though
 * (`.output/server`, no `node_modules`), and the bundle carries the module's
 * code without the file beside it — found by building it: the reference
 * survives into `.output/server/_libs/@embedpdf/…`, and the only copy of the
 * file is the browser's, under `.output/public/assets`. Every outline would
 * have failed to read in production while passing everywhere else.
 *
 * **So the file is shipped as a Nitro server asset** (`vite.config.ts`,
 * `serverAssets`), which Nitro bundles into the server and serves through its
 * storage layer, and is read here from wherever it can be found: the installed
 * package first — development and tests, where there is no Nitro runtime — then
 * the bundled asset.
 */

/** The server-asset group `vite.config.ts` declares the file under. */
export const PDFIUM_ASSETS = 'pdfium'

export async function pdfiumWasm(): Promise<Uint8Array> {
  const installed = installedPath()
  if (installed) {
    return new Uint8Array(await readFile(installed))
  }

  // Only reachable inside the built server, where Nitro's runtime exists.
  const { useStorage } = await import('nitro/storage')
  // biome-ignore lint/correctness/useHookAtTopLevel: Nitro's storage accessor, not a React hook — it only shares the prefix.
  const bytes = await useStorage(`assets:${PDFIUM_ASSETS}`).getItemRaw(
    'pdfium.wasm',
  )
  if (!bytes) {
    throw new Error('pdfium.wasm is missing from the server bundle')
  }
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}

/** The installed package's copy, or null where there is no `node_modules`. */
function installedPath(): string | null {
  try {
    return createRequire(import.meta.url).resolve(
      '@embedpdf/pdfium/pdfium.wasm',
    )
  } catch {
    return null
  }
}
