import { useEffect, useRef, useState } from 'react'

/**
 * Client-side infinite scroll over a list that is already in memory.
 *
 * Both surfaces that use this hold their whole list already — the blog's post
 * metadata comes from the route loader, and the Lit Tracker's articles are
 * synced to the client by Zero — so "infinite scroll" means *revealing* more of
 * it as the reader nears the end, never fetching. Renders the first `step`
 * items, then reveals another `step` each time a sentinel element scrolls into
 * view, until all `total` are shown.
 *
 * Shared here rather than living beside either consumer: it is the decided
 * pagination for both (research/ui-ux/pages/lit-tracker/pages/collection-view.md
 * cites the blog list's), and one of the two importing it out of the other's
 * route folder would tie the two pages together for no reason.
 *
 * The initial batch is `step` items, so with server-side rendering the first
 * screenful is real HTML (good for no-JS and crawlers); the observer only takes
 * over after hydration.
 *
 * ## What is counted is batches, not items
 *
 * The state is **how many batches have been asked for**, and the visible count
 * is derived from it. That distinction only matters when `total` can change
 * under the hook — which is exactly what filtering a revealed list does, and why
 * it moved here from the blog, whose list is fixed for the life of the page.
 *
 * Holding an absolute count instead, a collection that started filtered to one
 * match would have captured "show 1", and clearing the filter would leave the
 * reader looking at a single card with the other thirty behind a sentinel they
 * had to scroll to. Counting batches means the floor is always a whole batch:
 * narrowing shows everything that is left, and widening goes straight back to a
 * full first screenful.
 *
 * Environments with no `IntersectionObserver` — jsdom, and anything rendering
 * this on the server — get the first batch and no observer, rather than an
 * error. The reveal is an enhancement on top of a list that is already correct
 * without it.
 *
 * @param total Number of items available.
 * @param step  How many to reveal initially and per reveal.
 * @returns `visibleCount` (how many to render now) and `sentinelRef` (attach to
 *   an element rendered after the last visible item; omit it once all are shown).
 */
export function useIncrementalReveal(total: number, step: number) {
  const [batches, setBatches] = useState(1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const visibleCount = Math.min(batches * step, total)

  useEffect(() => {
    // Nothing left to reveal: no observer needed.
    if (visibleCount >= total) {
      return
    }
    const sentinel = sentinelRef.current
    if (sentinel === null || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setBatches((current) => current + 1)
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, total])

  return { visibleCount, sentinelRef }
}
