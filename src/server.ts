// Environment validation MUST run before anything else server-side, so bad
// configuration fails at startup with a clear error rather than at first
// use — keep this the first import (see src/env.ts).
import './env'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { startJobWorker } from '~/lit-tracker/jobs/worker'

// The background-job queues are drained in this process, per
// research/system-architecture/service-topology.md. Started here rather than on
// first use because nothing in a request path drains them — the work arrives
// from Postgres, so without this they would fill and never empty.
//
// Deliberately not awaited: it retries a database that is not up yet, and the
// site must keep serving the pages that do not need one meanwhile.
void startJobWorker()

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
