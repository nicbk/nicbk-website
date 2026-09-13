import type { Job } from 'pg-boss'

/**
 * Runs one handler over a fetched batch.
 *
 * pg-boss hands a worker an array even at the default batch size of one, and
 * settles the whole batch together — so these run in sequence rather than
 * concurrently, and a throw stops the rest. That is the behaviour this
 * project's jobs want: throwing is how a handler asks to be retried, and it
 * must not be ambiguous which jobs that covers.
 *
 * Shared rather than written per pipeline, because the answer is the same for
 * every queue and getting it subtly different on one of them would mean jobs
 * quietly retried that should not have been.
 */
export async function handleEach<T>(
  jobs: Job<T>[],
  run: (data: T) => Promise<void>,
): Promise<void> {
  for (const job of jobs) {
    await run(job.data)
  }
}
