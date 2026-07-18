import { describe, expect, it } from 'vitest'
import { formatPostDate, isoDate } from './format-date'

describe('formatPostDate', () => {
  it('formats a date as "Month D, YYYY" in UTC', () => {
    expect(formatPostDate(new Date('2026-06-15T00:00:00Z'))).toBe(
      'June 15, 2026',
    )
  })

  it('uses the UTC calendar day regardless of local time-of-day', () => {
    // Late-UTC-evening instant: a local-zone formatter could roll to the next
    // day, but the calendar date the author wrote must be preserved.
    expect(formatPostDate(new Date('2026-01-01T23:30:00Z'))).toBe(
      'January 1, 2026',
    )
  })
})

describe('isoDate', () => {
  it('returns the YYYY-MM-DD form', () => {
    expect(isoDate(new Date('2026-06-15T00:00:00Z'))).toBe('2026-06-15')
  })
})
