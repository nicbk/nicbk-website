/**
 * Formats a post's frontmatter date for display, e.g. `July 1, 2026`.
 *
 * Fixed to `en-US` and `UTC` on purpose: frontmatter dates are calendar dates
 * (no time/zone), so formatting in the runtime's local zone could shift a post
 * to the previous/next day. UTC keeps the displayed day identical to what the
 * author wrote, everywhere.
 */
export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * The machine-readable `YYYY-MM-DD` form for a `<time dateTime>` attribute
 * (also UTC, for the same reason).
 */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
