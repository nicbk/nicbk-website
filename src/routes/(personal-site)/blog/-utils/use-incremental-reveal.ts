import { useEffect, useRef, useState } from 'react'

/**
 * Client-side infinite scroll over an already-loaded, static list.
 *
 * The full blog metadata set is in memory (no network fetch), so "infinite
 * scroll" here just means revealing more of it as the reader nears the end,
 * rather than numbered pagination. Renders the first `step` items, then reveals
 * another `step` each time a sentinel element scrolls into view, until all
 * `total` are shown.
 *
 * The initial batch is `step` items, so with server-side rendering the first
 * screenful is real HTML (good for no-JS and crawlers); the observer only takes
 * over after hydration. When everything already fits in the first batch —
 * including in environments without `IntersectionObserver`, such as jsdom — the
 * effect exits immediately and no observer is created.
 *
 * @param total Number of items available.
 * @param step  How many to reveal initially and per reveal.
 * @returns `visibleCount` (how many to render now) and `sentinelRef` (attach to
 *   an element rendered after the last visible item; omit it once all are shown).
 */
export function useIncrementalReveal(total: number, step: number) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(step, total))
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Nothing left to reveal (or the count shrank): no observer needed.
    if (visibleCount >= total) {
      return
    }
    const sentinel = sentinelRef.current
    if (sentinel === null) {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((current) => Math.min(current + step, total))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, total, step])

  return { visibleCount, sentinelRef }
}
