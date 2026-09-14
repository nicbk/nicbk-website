// Placeholder configuration for the unit tier: src/env.ts validates the
// environment when it is imported, so anything reaching it would otherwise
// throw here. Nothing in this tier connects to a database, Google, or the
// object store. Shared with the integration tier's setup — see the file's own
// docstring for why the list lives apart from both.
import { applyPlaceholderEnv } from './vitest.env-defaults'

applyPlaceholderEnv()

// Registers @testing-library/jest-dom's matchers (toBeInTheDocument, …) on
// Vitest's expect for every test file.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only auto-registers DOM cleanup when test globals exist;
// this project keeps Vitest globals off, so register it explicitly.
afterEach(() => {
  cleanup()
})

/*
 * `ResizeObserver`, which jsdom does not implement and every browser does.
 *
 * A no-op rather than a working one: it exists so a component that observes an
 * element can mount without throwing. Nothing in the unit tier can assert on a
 * resize anyway — jsdom lays nothing out, so every box it reports is zero, and
 * an observer that fired would only ever deliver that.
 *
 * Stubbed here rather than guarded at each call site. A `typeof ResizeObserver
 * !== 'undefined'` in a component is a branch that exists solely for the test
 * environment, is never taken in production, and quietly turns an absent
 * browser API into silence instead of an error.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
