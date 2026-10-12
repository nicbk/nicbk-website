// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Where the engine's WebAssembly comes from: the installed package when there
 * is one (development, tests), the bundled server asset when there is not (the
 * production server — `pdfium-wasm.ts` records why). The second path only runs
 * inside a built server, so it is driven here with the package made
 * unfindable and Nitro's storage stood in for.
 */

const storage = vi.hoisted(() => ({ bytes: null as unknown }))

vi.mock('nitro/storage', () => ({
  useStorage: (base: string) => ({
    getItemRaw: async (key: string) =>
      base === 'assets:pdfium' && key === 'pdfium.wasm' ? storage.bytes : null,
  }),
}))

afterEach(() => {
  vi.doUnmock('node:module')
  vi.resetModules()
  storage.bytes = null
})

/** The module, loaded with `node_modules` either present or not. */
async function loadWith({ installed }: { installed: boolean }) {
  if (!installed) {
    vi.doMock('node:module', () => ({
      createRequire: () => ({
        resolve: () => {
          throw new Error('Cannot find module')
        },
      }),
    }))
  }
  return import('./pdfium-wasm')
}

describe('pdfiumWasm', () => {
  it('reads the installed package’s copy where there is one', async () => {
    const { pdfiumWasm } = await loadWith({ installed: true })
    const bytes = await pdfiumWasm()
    // WebAssembly's magic number: "\0asm".
    expect([...bytes.slice(0, 4)]).toEqual([0x00, 0x61, 0x73, 0x6d])
  })

  it('reads the bundled server asset where there is no package', async () => {
    storage.bytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d])
    const { pdfiumWasm } = await loadWith({ installed: false })
    expect([...(await pdfiumWasm())]).toEqual([0x00, 0x61, 0x73, 0x6d])
  })

  it('accepts the asset as a plain buffer too', async () => {
    storage.bytes = new Uint8Array([1, 2, 3]).buffer
    const { pdfiumWasm } = await loadWith({ installed: false })
    expect([...(await pdfiumWasm())]).toEqual([1, 2, 3])
  })

  it('says so when the bundle is missing it', async () => {
    const { pdfiumWasm } = await loadWith({ installed: false })
    await expect(pdfiumWasm()).rejects.toThrow('pdfium.wasm is missing')
  })
})
