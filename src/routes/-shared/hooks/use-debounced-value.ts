import { useEffect, useState } from 'react'

/**
 * The value as it was once it stopped changing — a value that lags on purpose.
 *
 * For the case where something downstream should react to where the reader
 * *landed* rather than to every step they took getting there. The Lit Tracker's
 * result count is the motivating one: it feeds an `aria-live` region, and a
 * region whose text changes on every keystroke gives a screen-reader user a new
 * announcement per character while they are still typing — worse than silence,
 * because it talks over them.
 *
 * Deliberately not used to gate anything *visible*. The grid filters from the
 * live value with no delay at all; only the announcement waits. Debouncing what
 * is drawn is the mistake this hook is next door to, and the reason that
 * distinction is written here rather than left to the call site.
 *
 * The pending timer is cleared when the value changes again, so a stream of
 * changes settles into exactly one update `delayMs` after the last of them.
 *
 * @param value   The live value.
 * @param delayMs How long it must hold still before it is reported.
 */
export function useDebouncedValue<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
