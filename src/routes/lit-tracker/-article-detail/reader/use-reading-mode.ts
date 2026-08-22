import type { InteractionManagerCapability } from '@embedpdf/plugin-interaction-manager'
import { useEffect } from 'react'
import { READING_MODE } from './reading-mode'

/**
 * Hands the reading mode to the engine, replacing the one it registered itself.
 *
 * **Timing is the whole of the difficulty**, and it is worth stating because
 * nothing about it is visible in the code. The pointer provider decides a page's
 * `touch-action` once, when it attaches its listeners, and thereafter only when
 * the active mode *changes*. Activating a mode that is already active returns
 * early without emitting, so there is no way to ask the pages to look again.
 *
 * This therefore has to run **before the first page mounts**, and it does, for a
 * structural reason rather than a lucky one: pages are only rendered once the
 * document reports itself ready, and this hook's component mounts as soon as the
 * engine exists — which is a wasm boot and a document fetch earlier. The browser
 * pass checks the outcome rather than the argument, by reading the computed
 * `touch-action` off a page on a cold load.
 *
 * Registering repeatedly is harmless and is not guarded against: the capability
 * exposes no way to read a mode back, and the write is a `Map.set` of the same
 * frozen descriptor. Guarding would mean tracking in this module what the
 * library already stores.
 */
export function useReadingMode(
  interaction: InteractionManagerCapability | null,
): void {
  useEffect(() => {
    interaction?.registerMode(READING_MODE)
  }, [interaction])
}
