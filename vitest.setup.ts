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
