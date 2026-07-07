import { createFileRoute, notFound } from '@tanstack/react-router'

/**
 * TEST-ONLY error probe. It exists so the e2e suite can force a top-level
 * throw and assert the root errorComponent's designed fallback (the
 * error-and-not-found feature). It is inert in production:
 *
 * - The throw is gated behind the build-time flag `VITE_E2E_ERROR_PROBE`,
 *   which only the Playwright webServer sets (playwright.config.ts). Vite
 *   inlines `import.meta.env` values at build time, so a production build has
 *   the flag unset and the gate below always takes the `notFound()` branch —
 *   no `VITE_`-prefixed value is even present in the shipped bundle.
 * - Unset (i.e. always, in production): `/error-probe` renders the ordinary
 *   404 page, so it is just another not-found URL a visitor cannot make throw.
 * - Set (e2e only): `beforeLoad` throws, which — since this route defines no
 *   errorComponent of its own — bubbles to the root errorComponent.
 *
 * Kept at the routes root (outside the (personal-site) group) because it
 * carries no page of its own: it never renders successfully by design.
 */
export const Route = createFileRoute('/error-probe')({
  beforeLoad: () => {
    // biome-ignore lint/complexity/useLiteralKeys: vite/client's ImportMetaEnv exposes custom keys only via its index signature, which noPropertyAccessFromIndexSignature forbids reading with dot access
    if (import.meta.env['VITE_E2E_ERROR_PROBE'] !== '1') {
      throw notFound()
    }
    throw new Error(
      'e2e error probe: forced failure to exercise the error-fallback page',
    )
  },
})
