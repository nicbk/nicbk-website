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
