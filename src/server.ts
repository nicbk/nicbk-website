// Environment validation MUST run before anything else server-side, so bad
// configuration fails at startup with a clear error rather than at first
// use — keep this the first import (see src/env.ts).
import './env'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
